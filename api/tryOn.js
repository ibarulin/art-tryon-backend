// api/tryOn.js
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
  // Сначала пробуем общий CORS-хелпер (если есть)
  try {
    if (typeof applyCors === 'function') {
      if (applyCors(req, res)) return;
    }
  } catch (_) {
    // игнорируем и применяем инлайн CORS ниже
  }
  if (applyInlineCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { interior_url, art_url } = req.body || {};
    const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
    if (!isHttp(interior_url) || !isHttp(art_url)) {
      return res.status(400).json({ error: 'interior_url and art_url must be http(s) URLs' });
    }

    // Мок‑ответ: пока просто возвращаем art_url как result_url
    return res.status(200).json({
      ok: true,
      result_url: art_url,
      mode: 'mock'
    });
  } catch (err) {
    console.error('[TRYON MOCK] error', err);
    return res.status(500).json({ error: 'compose_failed', details: err?.message || String(err) });
  }
}
