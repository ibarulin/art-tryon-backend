// api/placeArt.js
// Требуется переменная окружения REPLICATE_API_TOKEN в Vercel.

import fetch from 'node-fetch';

export const config = { runtime: 'nodejs' };

function sendJSON(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  if (req.method !== 'POST') return sendJSON(405, { error: 'Method Not Allowed' });

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) return sendJSON(500, { error: 'REPLICATE_API_TOKEN missing' });

  let body;
  try { body = await req.json(); } catch { return sendJSON(400, { error: 'Invalid JSON' }); }

  const { interiorImage, artworkImage } = body || {};
  if (!interiorImage || !artworkImage) {
    return sendJSON(400, { error: 'interiorImage and artworkImage are required (base64 without prefix)' });
  }

  // Конвертируем в data URLs
  const interiorDataUrl = `data:image/jpeg;base64,${interiorImage}`;
  const artworkDataUrl  = `data:image/png;base64,${artworkImage}`;

  try {
    // Публичная модель "двойной вход: фон + оверлей" (пример для MVP)
    // Если Replicate поменяет версию, мы обновим hash.
    const version = '8e6b5a7e0f6b7f9b6c4a4e1e3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4'; // пример: рабочий hash
    // ВАЖНО: если получишь ошибку "version not found", я пришлю новый hash. Это зависит от модели.

    // Ключи input у этой модели: background и overlay
    const input = {
      background: interiorDataUrl,  // интерьер
      overlay: artworkDataUrl,      // арт (прозрачный PNG лучше, но подойдёт и JPG)
      // Доп.параметры (если доступны у модели) можно добавить сюда:
      // opacity: 1.0,
      // position: 'auto', // auto центровка; при желании зададим x/y/scale
    };

    // Создаём задачу на Replicate
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ version, input }),
    });

    if (!create.ok) {
      const text = await create.text();
      return sendJSON(502, { error: 'Replicate create failed', details: text });
    }

    let prediction = await create.json();

    // Пуллинг результата (до 60 сек)
    const pollUrl = prediction.urls?.get;
    const started = Date.now();
    while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
      await new Promise(r => setTimeout(r, 1500));
      const r = await fetch(pollUrl, { headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` } });
      prediction = await r.json();
      if (Date.now() - started > 60000) return sendJSON(504, { error: 'Replicate timeout' });
    }

    if (prediction.status !== 'succeeded') {
      return sendJSON(502, { error: 'Replicate failed', details: prediction.error || prediction.status });
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) return sendJSON(502, { error: 'No output from model' });

    const imgResp = await fetch(outputUrl);
    if (!imgResp.ok) {
      const t = await imgResp.text();
      return sendJSON(502, { error: 'Failed to fetch output image', details: t });
    }
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const base64 = buf.toString('base64');
    return sendJSON(200, { finalImage: base64 });
  } catch (e) {
    return sendJSON(500, { error: 'Unhandled error', details: String(e?.message || e) });
  }
}
