// api/processImage.js

export default async function handler(req, res) {
  // CORS для браузера (Tilda)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_KEY is missing' });
    }

    // Входные данные
    const { prompt, imageBase64, model } = req.body || {};

    if ((!prompt || typeof prompt !== 'string') && !imageBase64) {
      return res.status(400).json({ error: 'Empty input. Provide prompt and/or imageBase64.' });
    }

    // Базовая валидация размера картинки (примерно до ~8–10 МБ)
    if (imageBase64 && imageBase64.length > 12_000_000) {
      return res.status(413).json({ error: 'Image too large. Please keep it under ~8–10MB base64.' });
    }

    // Модель по умолчанию: можно заменить на доступную из listModels
    const DEFAULT_MODEL = 'gemini-1.5-flash';

    function normalizeModelName(name) {
      // Принимаем варианты: 'models/gemini-1.5-flash' или 'gemini-1.5-flash'
      return (name || DEFAULT_MODEL).toString().replace(/^models\//, '');
    }

    const modelName = normalizeModelName(model);

    // Собираем contents для Gemini
    const parts = [];
    if (prompt && typeof prompt === 'string') {
      parts.push({ text: prompt });
    }
    if (imageBase64) {
      // Убираем возможный префикс data:image/...;base64,
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: 'image/png', // при необходимости измените на 'image/jpeg'
          data: cleanBase64
        }
      });
    }

    const contents = [{ role: 'user', parts }];

    // ВАЖНО: для v1beta используется путь /v1beta/models/{model}:generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log('Using model:', modelName);

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    const data = await r.json();

    if (!r.ok) {
      // Вернём подробности ошибки, чтобы было видно в Postman
      return res.status(r.status || 500).json({
        error: data?.error?.message || 'Gemini request failed',
        details: data || null,
        model: modelName
      });
    }

    // Пытаемся извлечь текст из ответа
    const text =
      data?.candidates?.[0]?.content?.parts?.find?.(p => typeof p.text === 'string')?.text ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '';

    return res.status(200).json({
      ok: true,
      model: modelName,
      text,
      raw: data
    });
  } catch (e) {
    console.error('Unhandled error in /api/processImage:', e);
    return res.status(500).json({ error: 'Unexpected server error', details: String(e) });
  }
}
