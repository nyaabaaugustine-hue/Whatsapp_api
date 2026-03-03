module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const status = {
      ok: true,
      timestamp: new Date().toISOString(),
      env: {
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
        freellm: Boolean(process.env.APIFREELLM_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
      }
    };
    return res.status(200).json(status);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'Server error' });
  }
}
