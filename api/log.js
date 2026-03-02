const fs = require('fs');
const path = require('path');

// Use /tmp for writable storage on Vercel
const LOG_FILE = '/tmp/abena_events.jsonl';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: return all logs
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(LOG_FILE)) return res.status(200).json({ events: [] });
      const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      return res.status(200).json({ events });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: append event
  if (req.method === 'POST') {
    try {
      const event = { ...req.body, serverTimestamp: new Date().toISOString() };
      fs.appendFileSync(LOG_FILE, JSON.stringify(event) + '\n');
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
