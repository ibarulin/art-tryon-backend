// File: api/placeArt.js
// Назначение: принять { interiorImage, artworkImage } (оба base64 без префикса),
// вернуть { finalImage } (пока заглушка = интерьер), чтобы подтвердить рабочий поток.
// Позже сюда подключим реальный движок (без Gemini Vision).

const ALLOWED_ORIGIN = '*'; // после теста сузим до 'https://barulins.art'

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { interiorImage, artworkImage } = req.body || {};

    if (!interiorImage || !artworkImage) {
      return res.status(400).json({
        error: 'Bad request',
        details: 'Both interiorImage and artworkImage are required (base64, without data: prefix).'
      });
    }

    const interiorB64 = stripPrefix(interiorImage);
    const artworkB64 = stripPrefix(artworkImage);

    console.log('placeArt hit', {
      interiorLen: interiorB64?.length || 0,
      artworkLen: artworkB64?.length || 0
    });

    // DEMO ЗАГЛУШКА:
    // Возвращаем интерьер как итоговую картинку — чтобы подтвердить фронт→бэкенд→ответ.
    // На следующем шаге сюда подключим реальный пайплайн.
    return res.status(200).json({
      ok: true,
      note: 'Demo stub: returning interior as finalImage. Next: attach real placement engine.',
      // Возвращаем чистую base64 без префикса — фронт должен добавить data:image/jpeg;base64,
      finalImage: interiorB64
    });

  } catch (err) {
    console.error('placeArt error:', err?.response?.data || err?.message || err);
    const status = Number(err?.response?.status) || 502;
    return res.status(status).json({
      error: 'placeArt failed',
      details: err?.response?.data || err?.message || String(err)
    });
  }
}

function stripPrefix(b64) {
  if (typeof b64 !== 'string') return b64;
  return b64.replace(/^data:[^;]+;base64,/, '');
}
