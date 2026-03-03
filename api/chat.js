module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const FREE_LLM_KEY = process.env.APIFREELLM_API_KEY;

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal'
  };

  async function logToSupabase(table, data) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(data)
      });
      if (!r.ok) console.error(`Supabase ${table} error:`, await r.text());
    } catch (e) {
      console.error(`Supabase log error (${table}):`, e.message);
    }
  }

  try {
    const { message, session_id = 'anonymous', user_message = '' } = req.body;

    if (user_message) {
      await logToSupabase('messages', { session_id, role: 'user', content: user_message });
    }

    let response;
    if (FREE_LLM_KEY) {
      response = await fetch('https://apifreellm.com/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FREE_LLM_KEY}`,
        },
        body: JSON.stringify({
          message,
          model: 'apifreellm'
        })
      });
    } else {
      const xfHost = req.headers['x-forwarded-host'] || req.headers.host || '';
      const xfProto = req.headers['x-forwarded-proto'] || 'https';
      const siteUrl = process.env.OPENROUTER_SITE_URL || (xfHost ? `${xfProto}://${Array.isArray(xfHost) ? xfHost[0] : xfHost}` : 'https://localhost:3000');
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': siteUrl,
          'X-Title': 'Abena Car Sales'
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{ role: 'user', content: message }]
        })
      });
    }

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `API error ${response.status}: ${err.substring(0, 200)}` });
    }

    const data = await response.json();
    const reply = FREE_LLM_KEY ? (data.response || '') : (data.choices?.[0]?.message?.content || '');

    let metadata = null;
    const jsonMatches = [...reply.matchAll(/```json\n([\s\S]*?)\n```/g)];
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.lead_temperature || parsed.intent) metadata = parsed;
        if (parsed.action === 'create_booking') {
          await logToSupabase('events', { session_id, event_type: 'booking', event_data: parsed, lead_temperature: 'hot', intent: 'booking' });
        }
        if (parsed.action === 'send_car_images') {
          await logToSupabase('events', { session_id, event_type: 'image_request', event_data: parsed, lead_temperature: metadata?.lead_temperature || 'warm', intent: 'browsing' });
        }
      } catch (e) {}
    }

    await logToSupabase('messages', { session_id, role: 'assistant', content: reply, metadata });

    if (metadata) {
      await logToSupabase('events', {
        session_id,
        event_type: 'chat',
        event_data: { recommended_car_id: metadata.recommended_car_id },
        lead_temperature: metadata.lead_temperature || 'cold',
        intent: metadata.intent || 'browsing'
      });
    }

    return res.status(200).json({ response: reply });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
