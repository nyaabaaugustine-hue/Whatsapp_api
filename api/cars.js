module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasSupabase = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'drivemond2026';

  try {
    if (req.method === 'GET') {
      if (!hasSupabase) return res.status(200).json({ cars: [] });
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
        'insured',
        'registered'
      ].join(',');
      const url = `${SUPABASE_URL}/rest/v1/cars?select=${encodeURIComponent(select)}&order=year.desc,price.desc&limit=200`;
      const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
      const r = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      const cars = r.ok ? await r.json() : [];
      return res.status(200).json({ cars });
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const adminKey = req.headers['x-admin-key'];
      if (ADMIN_SECRET && adminKey !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

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
        insured: !!body.insured,
        registered: !!body.registered,
      };

      const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
      const isUpdate = req.method === 'PATCH';
      if (isUpdate && !body.id) {
        return res.status(400).json({ error: 'Missing car id for update.' });
      }
      const url = isUpdate
        ? `${SUPABASE_URL}/rest/v1/cars?id=eq.${encodeURIComponent(String(body.id))}`
        : `${SUPABASE_URL}/rest/v1/cars`;
      const r = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(r.status).json({ error: t.substring(0, 300) });
      }
      const data = await r.json();
      return res.status(200).json({ success: true, car: data?.[0] || null });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
};
