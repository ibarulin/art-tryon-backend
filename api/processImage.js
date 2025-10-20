export default async function handler(req, res) {  
  // CORS  
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');  
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  
  if (req.method === 'OPTIONS') return res.status(200).end();  
  
  if (req.method !== 'POST') {  
    res.setHeader('Allow', ['POST', 'OPTIONS']);  
    return res.status(405).json({ error: 'Method Not Allowed' });  
  }  
  
  try {  
    const apiKey = process.env.GEMINI_API_KEY;  
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });  
  
    const body = req.body || {};  
    const {  
      prompt = '',  
      // base64 изображения(й). Можно одно строкой или массив строк.  
      imageBase64,  
      // mime типа(ов) — например "image/png" или "image/jpeg"  
      mimeType = 'image/jpeg',  
      // имя модели — по умолчанию стабильная  
      model = 'models/gemini-2.5-flash',  
      temperature = 0.8  
    } = body;  
  
    // Нормализуем вход для изображений  
    const images = Array.isArray(imageBase64) ? imageBase64 : (imageBase64 ? [imageBase64] : []);  
  
    // Формируем parts для Gemini  
    const parts = [];  
    if (prompt) parts.push({ text: prompt });  
  
    for (const b64 of images) {  
      // удаляем возможный префикс data:...;base64,  
      const cleaned = typeof b64 === 'string' ? b64.replace(/^data:.*;base64,/, '') : '';  
      parts.push({  
        inlineData: {  
          data: cleaned,  
          mimeType  
        }  
      });  
    }  
  
    if (parts.length === 0) {  
      return res.status(400).json({ error: 'Empty input. Provide prompt and/or imageBase64.' });  
    }  
  
    const url = `https://generativelanguage.googleapis.com/v1beta/${encodeURIComponent(model)}:generateContent`;  
    const r = await fetch(url, {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
        'x-goog-api-key': apiKey  
      },  
      body: JSON.stringify({  
        contents: [{ parts }],  
        generationConfig: { temperature }  
      })  
    });  
  
    const text = await r.text();  
    let json; try { json = JSON.parse(text); } catch {}  
  
    if (!r.ok) {  
      return res.status(r.status).json({  
        error: 'Gemini request failed',  
        details: json || text  
      });  
    }  
  
    // Достаём текстовый ответ  
    let outputText = '';  
    try {  
      outputText = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';  
    } catch (e) {}  
  
    return res.status(200).json({  
      model,  
      outputText,  
      raw: json  
    });  
  } catch (e) {  
    return res.status(500).json({ error: 'Unexpected error', details: e?.message || String(e) });  
  }  
}  
