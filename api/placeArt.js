// api/placeArt.js
import { applyCors } from './_cors';

function applyInlineCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // preflight обработан
  }
  return false;
}

export default async function handler(req, res) {
  // Пытаемся применить ваш общий CORS-хелпер (если есть)
  try {
    if (typeof applyCors === 'function') {
      if (applyCors(req, res)) return;
    }
  } catch (_) {
    // игнорируем и используем инлайн-CORS ниже
  }
  if (applyInlineCors(req, res)) return;

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
