const { parseCookies } = require('./_auth');

module.exports = async function handler(req, res) {
  const id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('id');
  const token = parseCookies(req).canva_access_token;
  if (!id || !token) { res.status(400).json({ error: 'Missing job or Canva connection.' }); return; }
  const response = await fetch(`https://api.canva.com/rest/v1/autofills/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  res.status(response.status).json(payload);
};
