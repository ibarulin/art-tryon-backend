// api/index.js
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    endpoints: ['/api/saveMockup', '/api/placeArt', '/api/tryOn', '/api/ping']
  });
}
