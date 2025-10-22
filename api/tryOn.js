// api/tryOn.js — mock: проверка цепочки "интерьер + арт"
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
    const { interior_url, art_url, prompt } = req.body || {};
    if (!interior_url || !art_url) {
      return res.status(400).json({ error: 'interior_url and art_url are required' });
    }

    // Пока возвращаем art_url как результат — для проверки цепочки.
    return res.status(200).json({
      ok: true,
      result_url: art_url,
      debug: { interior_url, art_url, prompt: prompt || null }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', details: String(e) });
  }
}
