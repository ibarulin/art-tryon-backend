// api/tryOn.js
export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type. Use application/json' });
    }

    const { interior_url, art_url } = req.body || {};

    // Basic validation
    if (!interior_url || !art_url) {
      return res.status(400).json({ error: 'interior_url and art_url are required' });
    }
    const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
    if (!isHttp(interior_url) || !isHttp(art_url)) {
      return res.status(400).json({ error: 'Both interior_url and art_url must be http(s) URLs' });
    }

    // Mock composition: just echo back the art_url as the "result"
    const result_url = art_url;

    // Optional: minimal log
    console.log('[TRYON MOCK] ok', { interior: interior_url.slice(0, 60), art: art_url.slice(0, 60) });

    return res.status(200).json({
      ok: true,
      result_url,
      mode: 'mock',
      note: 'This is a placeholder. Replace with real model integration when ready.'
    });
  } catch (err) {
    console.error('[TRYON MOCK] error', err);
    return res.status(500).json({
      error: 'compose_failed',
      details: err?.message || String(err)
    });
  }
}
