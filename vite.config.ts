import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              return res.end();
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
                const RESEND_API_KEY = process.env.RESEND_API_KEY;
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
                    to: body?.to || process.env.ADMIN_EMAIL || 'josemorgan120@gmail.com',
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
                const freeKey = process.env.APIFREELLM_API_KEY;
                const orKey = process.env.OPENROUTER_API_KEY;
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
