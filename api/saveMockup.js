// api/saveMockup.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Надёжный парсинг JSON (req.body может прийти строкой)
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { imageBase64 } = body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

  // Временный лог чтобы убедиться, что env видны
  console.log('ENV CHECK', { CLOUD_NAME, UPLOAD_PRESET });

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return res.status(500).json({ error: 'Cloudinary env vars missing' });
  }

  // Уберём префикс data URL, если он есть
  const base64 = imageBase64.split(',')[1] || imageBase64;

  // Node 20 на Vercel: fetch и FormData доступны глобально
  const form = new FormData();
  form.append('file', `data:image/png;base64,${base64}`);
  form.append('upload_preset', UPLOAD_PRESET);

  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const resp = await fetch(uploadUrl, { method: 'POST', body: form });
    const json = await resp.json();

    if (!resp.ok || !json.secure_url) {
      return res
        .status(resp.status)
        .json({ error: json.error?.message || 'Cloudinary upload failed', cloudinary: json });
    }

    return res.status(200).json({ url: json.secure_url, public_id: json.public_id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
