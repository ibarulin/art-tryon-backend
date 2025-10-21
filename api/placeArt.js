// api/placeArt.js — Cloudinary signed upload (устойчиво, без проблем с display name)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary env vars missing' });
    }

    // Параметры загрузки
    const folder = 'art-tryon';
    const timestamp = Math.floor(Date.now() / 1000);

    // Подписываем параметры folder + timestamp
    const crypto = await import('node:crypto');
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    // Формируем тело запроса
    const form = new URLSearchParams();
    form.append('file', 'data:image/jpeg;base64,' + imageBase64); // base64 без префикса приходит с фронта
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const r = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: 'Cloudinary upload failed', details: data });
    }

    return res.status(200).json({
      ok: true,
      url: data.secure_url,
      public_id: data.public_id,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      format: data.format
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', details: String(e) });
  }
}
