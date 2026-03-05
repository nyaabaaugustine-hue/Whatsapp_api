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
          const devAppointments: any[] = [];
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              return res.end();
            }
            // â”€â”€ DEV: /api/log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                  const entry = {
                    eventType: body?.eventType || 'event',
                    data: body?.data || null,
                    sessionId: body?.sessionId || null,
                    timestamp: body?.timestamp || new Date().toISOString(),
                  };
                  devEvents.push(entry);
                  // Optional webhook forwarding
                  const WEBHOOK_URL = env.VITE_WEBHOOK_URL;
                  if (WEBHOOK_URL) {
                    try {
                      await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(entry),
                      });
                    } catch {}
                  }
                  // Persist to Supabase if configured
                  const SUPABASE_URL = env.SUPABASE_URL;
                  const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
                  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
                  const hasSupabase = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));
                  if (hasSupabase) {
                    try {
                      const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
                      const payload = {
                        session_id: entry.sessionId,
                        event_type: entry.eventType,
                        event_data: entry.data,
                        lead_temperature: entry.data?.lead_temperature || (entry.eventType === 'booking' ? 'hot' : 'unknown'),
                        intent: entry.data?.intent || '',
                        created_at: entry.timestamp,
                      };
                      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': key!,
                          'Authorization': `Bearer ${key}`,
                          'Prefer': 'return=representation',
                        },
                        body: JSON.stringify(payload),
                      });
                    } catch {}
                  }
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ success: true }));
                } catch (e: any) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: e?.message ?? 'Server error' }));
                }
              }
            }
            // â”€â”€ DEV: /api/admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              // Try reading from Supabase if configured
              const SUPABASE_URL = env.SUPABASE_URL;
              const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
              const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
              const hasSupabaseForEvents = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));
              let outEvents = events;
              if (hasSupabaseForEvents) {
                try {
                  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
                  const url = `${SUPABASE_URL}/rest/v1/events?select=session_id,event_type,event_data,lead_temperature,intent,created_at&order=created_at.desc&limit=500`;
                  const r = await fetch(url, {
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': key!,
                      'Authorization': `Bearer ${key}`,
                    },
                  });
                  if (r.ok) {
                    const list = await r.json();
                    if (Array.isArray(list) && list.length) outEvents = list;
                  }
                } catch {}
              }
              if (type.includes('events')) {
                res.statusCode = 200;
                return res.end(JSON.stringify(outEvents));
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
            // ── DEV: /api/appointments ───────────────────────────────────────────────
            if (req.url?.startsWith('/api/appointments')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
              const urlObj = new URL(req.url, 'http://localhost');
              const pathOnly = urlObj.pathname;
              const key = (req.headers['x-admin-key'] || '') as string;
              if ((ADMIN_SECRET || '') && key !== (ADMIN_SECRET || '')) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'Unauthorized' }));
              }
              if (req.method === 'GET' && pathOnly === '/api/appointments') {
                const list = devAppointments
                  .map(a => ({ ...a }))
                  .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
                res.statusCode = 200;
                return res.end(JSON.stringify({ appointments: list }));
              }
              if (req.method === 'POST' && pathOnly === '/api/appointments') {
                try {
                  const chunks: Buffer[] = [];
                  await new Promise<void>((resolve, reject) => {
                    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                    req.on('end', () => resolve());
                    req.on('error', (e) => reject(e));
                  });
                  const bodyText = Buffer.concat(chunks).toString('utf-8') || '{}';
                  const body = JSON.parse(bodyText);
                  const startsAtIso: string = body.startsAtIso;
                  const endsAtIso: string = body.endsAtIso || new Date(new Date(startsAtIso).getTime() + 60 * 60 * 1000).toISOString();
                  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                  const appt = {
                    id,
                    customerName: body.customerName || 'Client',
                    phone: body.phone || '',
                    email: body.email || '',
                    carId: body.carId || '',
                    carName: body.carName || '',
                    notes: body.notes || '',
                    location: body.location || 'Drivemond Showroom',
                    startsAtIso,
                    endsAtIso,
                    createdAtIso: new Date().toISOString(),
                    confirmed: true,
                  };
                  devAppointments.push(appt);
                  devEvents.push({
                    eventType: 'appointment',
                    data: { ...appt, intent: 'booking' },
                    sessionId: body.sessionId || null,
                    timestamp: new Date().toISOString(),
                  });
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ appointment: appt }));
                } catch (e: any) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: e?.message ?? 'Server error' }));
                }
              }
              if (req.method === 'GET' && pathOnly === '/api/appointments/ics') {
                const id = urlObj.searchParams.get('id') || '';
                const appt = devAppointments.find(a => a.id === id);
                if (!appt) {
                  res.statusCode = 404;
                  return res.end('NOT FOUND');
                }
                const dtStart = appt.startsAtIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
                const dtEnd = appt.endsAtIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
                const title = appt.carName ? `Viewing: ${appt.carName}` : 'Appointment';
                const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Drivemond//Appointments//EN
BEGIN:VEVENT
UID:${appt.id}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${title}
DESCRIPTION:${(appt.notes || '').replace(/\r?\n/g, '\\n')}
LOCATION:${appt.location || ''}
END:VEVENT
END:VCALENDAR`;
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
                return res.end(ics);
              }
              if (req.method === 'POST' && pathOnly === '/api/appointments/send-reminders') {
                const hours = Number(urlObj.searchParams.get('hours') || '24');
                const now = Date.now();
                const cutoffStart = now;
                const cutoffEnd = now + hours * 60 * 60 * 1000;
                const upcoming = devAppointments.filter(a => {
                  const t = new Date(a.startsAtIso).getTime();
                  return t >= cutoffStart && t <= cutoffEnd && a.email;
                });
                let sent = 0;
                if (upcoming.length && RESEND) {
                  for (const a of upcoming) {
                    try {
                      const r = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${RESEND}`,
                        },
                        body: JSON.stringify({
                          from: 'appointments@drivemond.dev',
                          to: a.email || ADMIN_EMAIL,
                          subject: `Reminder: ${a.carName ? `Viewing ${a.carName}` : 'Appointment'} at ${new Date(a.startsAtIso).toLocaleString()}`,
                          html: `<p>Hi ${a.customerName},</p><p>This is a reminder for your appointment at ${new Date(a.startsAtIso).toLocaleString()}.</p><p>Location: ${a.location || 'Drivemond Showroom'}</p><p>Notes: ${a.notes || '—'}</p>`,
                        }),
                      });
                      if (r.ok) {
                        sent++;
                        devEvents.push({
                          eventType: 'reminder_sent',
                          data: { appointmentId: a.id, email: a.email },
                          sessionId: null,
                          timestamp: new Date().toISOString(),
                        });
                      }
                    } catch {}
                  }
                }
                res.statusCode = 200;
                return res.end(JSON.stringify({ sent }));
              }
            }
            if (req.url?.startsWith('/api/cars')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
              const SUPABASE_URL = env.SUPABASE_URL;
              const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
              const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
              const hasSupabase = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));

              if (req.method === 'GET') {
                if (!hasSupabase) {
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ cars: [] }));
                }
                try {
                const select = [
                  'id',
                  'brand',
                  'model',
                  'year',
                  'price',
                  'color',
                  'fuel',
                  'transmission',
                  'mileage',
                  'image_url',
                  'real_image',
                  'image_urls',
                  'insured',
                  'registered',
                  'status'
                ].join(',');
                  const url = `${SUPABASE_URL}/rest/v1/cars?select=${encodeURIComponent(select)}&order=year.desc,price.desc&limit=200`;
                  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
                  const r = await fetch(url, {
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': key!,
                      'Authorization': `Bearer ${key}`,
                    },
                  });
                  const cars = r.ok ? await r.json() : [];
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ cars }));
                } catch (e: any) {
                  res.statusCode = 502;
                  return res.end(JSON.stringify({ error: e?.message ?? 'Supabase fetch failed' }));
                }
              }

              if (req.method === 'POST' || req.method === 'PATCH') {
                const key = (req.headers['x-admin-key'] || '') as string;
                if ((ADMIN_SECRET || '') && key !== (ADMIN_SECRET || '')) {
                  res.statusCode = 401;
                  return res.end(JSON.stringify({ error: 'Unauthorized' }));
                }

                const chunks: Buffer[] = [];
                await new Promise<void>((resolve, reject) => {
                  req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                  req.on('end', () => resolve());
                  req.on('error', (e) => reject(e));
                });
                const bodyText = Buffer.concat(chunks).toString('utf-8') || '{}';
                const body = JSON.parse(bodyText);

                if (!hasSupabase) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: 'Supabase not configured' }));
                }

                const payload = {
                  brand: body.brand,
                  model: body.model,
                  year: Number(body.year),
                  price: Number(body.price),
                  color: body.color,
                  fuel: body.fuel,
                  transmission: body.transmission,
                  mileage: body.mileage,
                  image_url: body.image_url,
                  real_image: body.real_image || body.image_url,
                  image_urls: Array.isArray(body.image_urls) ? body.image_urls : null,
                  insured: !!body.insured,
                  registered: !!body.registered,
                  status: body.status || 'available',
                };

                const isUpdate = req.method === 'PATCH';
                if (isUpdate && !body?.id) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Missing car id for update' }));
                }
                const sbKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
                const url = isUpdate
                  ? `${SUPABASE_URL}/rest/v1/cars?id=eq.${encodeURIComponent(String(body.id))}`
                  : `${SUPABASE_URL}/rest/v1/cars`;
                try {
                  const r = await fetch(url, {
                    method: isUpdate ? 'PATCH' : 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': sbKey!,
                      'Authorization': `Bearer ${sbKey}`,
                      'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(payload),
                  });
                  if (!r.ok) {
                    const t = await r.text();
                    res.statusCode = r.status;
                    return res.end(JSON.stringify({ error: t.substring(0, 300) }));
                  }
                  const data = await r.json();
                  res.statusCode = 200;
                  return res.end(JSON.stringify({ success: true, car: data?.[0] || null }));
                } catch (e: any) {
                  res.statusCode = 502;
                  return res.end(JSON.stringify({ error: e?.message ?? 'Supabase fetch failed' }));
                }
              }
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
                    "Hello, Abena here from Drivemond.\nTell me your budget and the kind of car you want.";
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

