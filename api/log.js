module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const hasSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

  try {
    if (req.method === 'GET') {
      if (!hasSupabase) return res.status(200).json({ events: [] });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const events = r.ok ? await r.json() : [];
      return res.status(200).json({ events });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const bodyText = Buffer.concat(chunks).toString('utf8') || '{}';
    const body = JSON.parse(bodyText);
    if (!hasSupabase) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const supabaseHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    };

    const eventType = body?.eventType || 'event';
    const data = body?.data || null;
    const sessionId = body?.sessionId || null;
    const timestamp = body?.timestamp || new Date().toISOString();

    if (eventType === 'message' && data?.text) {
      await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          role: data?.sender === 'user' ? 'user' : 'assistant',
          content: data?.text || '',
          metadata: data?.metadata || null,
          created_at: timestamp
        })
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          event_type: eventType,
          event_data: data,
          lead_temperature: data?.lead_temperature || null,
          intent: data?.intent || null,
          created_at: timestamp
        })
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
