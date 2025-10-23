// api/placeArt.js
import { applyCors } from './_cors';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid imageBase64' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UNSIGNED_PRESET;
    if (!cloudName || !uploadPreset) {
      return res.status(500).json({ error: 'Missing Cloudinary env vars' });
    }

    const form = new URLSearchParams();
    form.append('file', imageBase64);
    form.append('upload_preset', uploadPreset);

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await resp.json();

    if (!resp.ok) {
      console.error('Cloudinary error:', data);
      return res.status(502).json({
        error: 'cloudinary_upload_failed',
        details: data?.error?.message || data
      });
    }

    return res.status(200).json({
      url: data.secure_url,
      public_id: data.public_id
    });
  } catch (err) {
    console.error('placeArt error:', err);
    return res.status(500).json({ error: 'upload_failed', details: err?.message || String(err) });
  }
}
