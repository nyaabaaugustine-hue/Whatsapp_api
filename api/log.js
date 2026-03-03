const fs = require('fs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const LOG_FILE = '/tmp/abena_events.jsonl';

  try {
    if (req.method === 'GET') {
      if (!fs.existsSync(LOG_FILE)) return res.status(200).json({ events: [] });
      const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
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
    const record = {
      eventType: body?.eventType || 'event',
      data: body?.data || null,
      sessionId: body?.sessionId || null,
      timestamp: body?.timestamp || new Date().toISOString(),
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
