// api/placeArt.js — Cloudinary unsigned upload (без public_id)
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
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      return res.status(500).json({ error: 'Cloudinary env vars missing' });
    }

    // Формируем тело запроса для unsigned upload
    const form = new URLSearchParams();
    form.append('upload_preset', preset);
    form.append('folder', 'art-tryon');               // папка в медиабиблиотеке
    form.append('file', 'data:image/jpeg;base64,' + imageBase64); // только base64 без префикса на входе

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;

    const r = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });

    const data = await r.json();

    if (!r.ok) {
      // Пробрасываем сообщение Cloudinary для быстрой диагностики
      return res.status(r.status).json({ error: 'Cloudinary upload failed', details: data });
    }

    // Успех
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
