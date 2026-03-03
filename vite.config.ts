import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const FREE_LLM = env.VITE_APIFREELLM_API_KEY;
  const OPENROUTER = env.VITE_OPENROUTER_API_KEY;
  const RESEND = env.VITE_RESEND_API_KEY;
  const ADMIN_EMAIL = env.VITE_ADMIN_EMAIL || 'josemorgan120@gmail.com';
  const ADMIN_SECRET = env.VITE_ADMIN_SECRET || 'drivemond2026';
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-api-middleware',
        configureServer(server) {
          // In-memory event store for local dev
          const devEvents: any[] = [];
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              return res.end();
            }
            // ── DEV: /api/log ───────────────────────────────────────────────
            if (req.url?.startsWith('/api/log')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              if (req.method === 'GET') {
                res.statusCode = 200;
                return res.end(JSON.stringify({ events: devEvents }));
              }
              if (req.method === 'POST') {
                try {
                  const chunks: Buffer[] = [];
                  await new Promise<void>((resolve, reject) => {
                    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                    req.on('end', () => resolve());
                    req.on('error', (e) => reject(e));
                  });
                  const bodyText = Buffer.concat(chunks).toString('utf-8') || '{}';
                  const body = JSON.parse(bodyText);
                  devEvents.push({
                    eventType: body?.eventType || 'event',
                    data: body?.data || null,
                    sessionId: body?.sessionId || null,
                    timestamp: body?.timestamp || new Date().toISOString(),
                  });
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ success: true }));
                } catch (e: any) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: e?.message ?? 'Server error' }));
                }
              }
            }
            // ── DEV: /api/admin ─────────────────────────────────────────────
            if (req.url?.startsWith('/api/admin') && req.method === 'GET') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
              const key = (req.headers['x-admin-key'] || '') as string;
              if ((ADMIN_SECRET || '') && key !== (ADMIN_SECRET || '')) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'Unauthorized' }));
              }
              const urlObj = new URL(req.url, 'http://localhost');
              const type = urlObj.searchParams.get('type') || '';
              const events = devEvents.map((r) => ({
                session_id: r.sessionId || 'unknown',
                event_type: r.eventType || 'event',
                event_data: r.data || null,
                lead_temperature: r.data?.lead_temperature || (r.eventType === 'booking' ? 'hot' : 'unknown'),
                intent: r.data?.intent || '',
                created_at: r.timestamp || new Date().toISOString(),
              }));
              if (type.includes('events')) {
                res.statusCode = 200;
                return res.end(JSON.stringify(events));
              }
              if (type.includes('conversations')) {
                const messages = devEvents.filter(r => r.eventType === 'message' && r.sessionId);
                const bySession: Record<string, any[]> = {};
                for (const m of messages) {
                  const sid = m.sessionId;
                  if (!bySession[sid]) bySession[sid] = [];
                  bySession[sid].push(m);
                }
                const convos = Object.entries(bySession).map(([sid, msgs]) => {
                  msgs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  return {
                    session_id: sid,
                    started_at: msgs[0]?.timestamp || new Date().toISOString(),
                    last_message_at: msgs[msgs.length - 1]?.timestamp || new Date().toISOString(),
                    message_count: msgs.length,
                    messages: msgs.map(mm => ({
                      session_id: sid,
                      role: mm.data?.sender === 'user' ? 'user' : 'assistant',
                      content: mm.data?.text || '',
                      metadata: null,
                      created_at: mm.timestamp || new Date().toISOString(),
                    })),
                  };
                });
                res.statusCode = 200;
                return res.end(JSON.stringify(convos));
              }
              if (type.includes('stats')) {
                const messages = devEvents.filter(r => r.eventType === 'message' && r.sessionId);
                const sessions = Array.from(new Set(messages.map((m: any) => m.sessionId)));
                const hotLeads = events.filter(e => e.lead_temperature === 'hot').length;
                const warmLeads = events.filter(e => e.lead_temperature === 'warm').length;
                const coldLeads = events.filter(e => e.lead_temperature === 'cold').length;
                const bookings = events.filter(e => e.event_type === 'booking').length;
                const totalMessages = messages.length;
                const out = {
                  totalSessions: sessions.length,
                  totalMessages,
                  hotLeads, warmLeads, coldLeads,
                  bookings,
                };
                res.statusCode = 200;
                return res.end(JSON.stringify(out));
              }
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Bad request' }));
            }
            if (req.url === '/api/email' && req.method === 'POST') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              try {
                const chunks: Buffer[] = [];
                await new Promise<void>((resolve, reject) => {
                  req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                  req.on('end', () => resolve());
                  req.on('error', (e) => reject(e));
                });
                const bodyText = Buffer.concat(chunks).toString('utf-8') || '{}';
                const body = JSON.parse(bodyText);
                const RESEND_API_KEY = RESEND;
                if (!RESEND_API_KEY) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: 'Email provider not configured' }));
                }
                const r = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                  },
                  body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: body?.to || ADMIN_EMAIL,
                    subject: body?.subject || 'Chat Transcript',
                    html: body?.html || '<p>No content</p>',
                  }),
                });
                if (!r.ok) {
                  const t = await r.text();
                  res.statusCode = r.status;
                  return res.end(JSON.stringify({ error: t.substring(0, 300) }));
                }
                const data = await r.json();
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, id: data.id }));
              } catch (e: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: e?.message ?? 'Server error' }));
              }
            }
            if (req.url === '/api/chat' && req.method === 'POST') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              try {
                const chunks: Buffer[] = [];
                await new Promise<void>((resolve, reject) => {
                  req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                  req.on('end', () => resolve());
                  req.on('error', (e) => reject(e));
                });
                const bodyText = Buffer.concat(chunks).toString('utf-8') || '{}';
                const body = JSON.parse(bodyText);
                const message: string = body?.message ?? '';
                const freeKey = FREE_LLM;
                const orKey = OPENROUTER;
                let response: Response | null = null;
                if (freeKey) {
                  response = await fetch('https://apifreellm.com/api/v1/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freeKey}`,
                    },
                    body: JSON.stringify({
                      message,
                      model: 'apifreellm',
                    }),
                  });
                } else if (orKey) {
                  response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${orKey}`,
                      'HTTP-Referer': 'http://localhost:3000',
                      'X-Title': 'Abena Car Sales (Local Dev)',
                    },
                    body: JSON.stringify({
                      model: 'openrouter/auto',
                      messages: [{ role: 'user', content: message }],
                    }),
                  });
                } else {
                  const reply =
                    "Hey! 👋 Abena here from Drivemond.\n\nLocal demo is running without AI right now.\nTell me your budget and car type, and I’ll suggest options.";
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ response: reply }));
                }
                if (!response.ok) {
                  const errText = await response.text();
                  res.statusCode = response.status;
                  return res.end(JSON.stringify({ error: `API error ${response.status}: ${errText.substring(0, 200)}` }));
                }
                const data = await response.json();
                const reply = freeKey ? (data.response || 'Sorry, I could not generate a response.') : (data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.');
                res.statusCode = 200;
                return res.end(JSON.stringify({ response: reply }));
              } catch (e: any) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: e?.message ?? 'Server error' }));
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      hmr: true,
      // Custom dev API middleware above handles /api routes
    },
  };
});
