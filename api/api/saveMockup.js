// api/saveMockup.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME; // do24hhn0f
    const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET; // art_tryon_unsigned
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return res.status(500).json({ error: 'Cloudinary env vars missing' });
    }

    const base64 = imageBase64.split(',')[1] || imageBase64;

    const form = new FormData();
    form.append('file', `data:image/png;base64,${base64}`);
    form.append('upload_preset', UPLOAD_PRESET);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const resp = await fetch(uploadUrl, { method: 'POST', body: form });
    const json = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: json.error?.message || 'Cloudinary upload failed'
      });
    }

    return res.status(200).json({ url: json.secure_url, public_id: json.public_id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
