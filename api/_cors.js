// api/_cors.js
export function applyCors(req, res) {
  // Разрешаем ваш домен; временно можно '*' для отладки
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin'); // чтобы не кешировалось неверно
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h preflight cache

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // сигнал, что обработали preflight
  }
  return false;
}
