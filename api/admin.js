module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    const { type } = req.query;

    if (type === 'stats') {
      const [mRes, eRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/messages?select=session_id,role,created_at`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/events?select=event_type,lead_temperature,intent,created_at`, { headers })
      ]);
      const messages = await mRes.json();
      const events = await eRes.json();
      const sessions = [...new Set(messages.map(m => m.session_id))];
      return res.status(200).json({
        totalSessions: sessions.length,
        totalMessages: messages.length,
        hotLeads: events.filter(e => e.lead_temperature === 'hot').length,
        warmLeads: events.filter(e => e.lead_temperature === 'warm').length,
        coldLeads: events.filter(e => e.lead_temperature === 'cold').length,
        bookings: events.filter(e => e.event_type === 'booking').length
      });
    }

    if (type === 'events') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/events?order=created_at.desc&limit=200`, { headers });
      return res.status(200).json(await r.json());
    }

    if (type === 'conversations') {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?select=session_id,role,content,metadata,created_at&order=created_at.asc`,
        { headers }
      );
      const messages = await r.json();
      const grouped = {};
      messages.forEach(m => {
        if (!grouped[m.session_id]) grouped[m.session_id] = [];
        grouped[m.session_id].push(m);
      });
      const conversations = Object.entries(grouped).map(([session_id, msgs]) => ({
        session_id,
        started_at: msgs[0]?.created_at,
        last_message_at: msgs[msgs.length - 1]?.created_at,
        message_count: msgs.length,
        messages: msgs
      }));
      return res.status(200).json(conversations.reverse());
    }

    return res.status(400).json({ error: 'Invalid type. Use: stats, events, conversations' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
