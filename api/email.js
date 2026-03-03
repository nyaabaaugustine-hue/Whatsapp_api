module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'josemorgan120@gmail.com';
  try {
    const { to = ADMIN_EMAIL, subject = 'Chat Transcript', html = '<p>No content</p>' } = req.body || {};
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email provider not configured' });
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t.substring(0, 300) });
    }
    const data = await r.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
