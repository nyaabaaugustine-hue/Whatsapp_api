const fs = require('fs');

function buildConversations(raw) {
  const messages = raw.filter(r => r.eventType === 'message' && r.sessionId);
  const bySession = {};
  for (const m of messages) {
    const sid = m.sessionId;
    if (!bySession[sid]) bySession[sid] = [];
    bySession[sid].push(m);
  }
  const convos = Object.entries(bySession).map(([sid, msgs]) => {
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
  return convos;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'drivemond2026';
  const key = req.headers['x-admin-key'];
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const type = (req.query?.type || req.url.split('type=')[1] || '').toString();
  const LOG_FILE = '/tmp/abena_events.jsonl';
  const lines = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean) : [];
  const raw = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const events = raw.map((r) => ({
    session_id: r.sessionId || 'unknown',
    event_type: r.eventType || 'event',
    event_data: r.data || null,
    lead_temperature: r.data?.lead_temperature || (r.eventType === 'booking' ? 'hot' : 'unknown'),
    intent: r.data?.intent || '',
    created_at: r.timestamp || new Date().toISOString(),
  }));

  if (type.includes('events')) {
    return res.status(200).json(events);
  }

  if (type.includes('conversations')) {
    const convos = buildConversations(raw);
    return res.status(200).json(convos);
  }

  if (type.includes('stats')) {
    const conversations = buildConversations(raw);
    const hotLeads = events.filter(e => e.lead_temperature === 'hot').length;
    const warmLeads = events.filter(e => e.lead_temperature === 'warm').length;
    const coldLeads = events.filter(e => e.lead_temperature === 'cold').length;
    const bookings = events.filter(e => e.event_type === 'booking').length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.message_count, 0);
    const out = {
      totalSessions: conversations.length,
      totalMessages,
      hotLeads, warmLeads, coldLeads,
      bookings,
    };
    return res.status(200).json(out);
  }

  return res.status(400).json({ error: 'Bad request' });
}
