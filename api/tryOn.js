// api/tryOn.js
import { applyCors } from './_cors';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { interior_url, art_url } = req.body || {};
    const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
    if (!isHttp(interior_url) || !isHttp(art_url)) {
      return res.status(400).json({ error: 'interior_url and art_url must be http(s) URLs' });
    }

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
