// api/tryOn.js — серверный композитинг (без ML)
import sharp from 'sharp';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

async function fetchBuffer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

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
    const {
      interior_url, art_url,
      x = 0.5, y = 0.5,        // позиция центра (0..1)
      scale = 0.5,             // доля ширины интерьера (0.05..1)
      opacity = 1.0            // 0..1
    } = req.body || {};

    if (!interior_url || !art_url) {
      return res.status(400).json({ error: 'interior_url and art_url are required' });
    }

    // Загружаем исходники
    const [interiorBuf, artBuf] = await Promise.all([
      fetchBuffer(interior_url),
      fetchBuffer(art_url)
    ]);

    // Метаданные интерьера
    const interiorMeta = await sharp(interiorBuf).metadata();
    const W = interiorMeta.width || 1024;
    const H = interiorMeta.height || 768;

    // Масштаб арта
    const clampedScale = Math.min(Math.max(Number(scale) || 0.5, 0.05), 1);
    const targetArtWidth = Math.max(1, Math.round(W * clampedScale));

    const artResized = await sharp(artBuf)
      .resize({ width: targetArtWidth, withoutEnlargement: true })
      .toBuffer();

    const artMeta = await sharp(artResized).metadata();
    const aw = artMeta.width || targetArtWidth;
    const ah = artMeta.height || Math.round(targetArtWidth * 0.75);

    // Позиция центра → координаты левого верхнего угла
    const cx = Math.min(Math.max(Number(x) || 0.5, 0), 1) * W;
    const cy = Math.min(Math.max(Number(y) || 0.5, 0), 1) * H;

    const left = Math.round(cx - aw / 2);
    const top  = Math.round(cy - ah / 2);

    // Прозрачность
    const op = Math.min(Math.max(Number(opacity) || 1, 0), 1);
    const artWithOpacity = op < 1
      ? await sharp(artResized)
          .ensureAlpha()
          .joinChannel(
            await sharp({
              create: { width: aw, height: ah, channels: 1, background: Math.round(op * 255) }
            }).png().toBuffer()
          )
          .toBuffer()
      : artResized;

    // Композитинг
    const out = await sharp(interiorBuf)
      .composite([{ input: artWithOpacity, left, top }])
      .jpeg({ quality: 90 })
      .toBuffer();

    // Возвращаем в data URL (не нужно доп. хранилище)
    const base64 = out.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return res.status(200).json({
      ok: true,
      result_url: dataUrl,
      debug: { W, H, aw, ah, left, top, x, y, scale: clampedScale, opacity: op }
    });
  } catch (e) {
    return res.status(500).json({ error: 'compose_failed', details: String(e) });
  }
}
