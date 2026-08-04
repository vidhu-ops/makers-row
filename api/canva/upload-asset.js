const { parseCookies } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  const token = parseCookies(req).canva_access_token;
  if (!token) { res.status(401).json({ error: 'Connect Canva before uploading references.' }); return; }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  if (!body.length) { res.status(400).json({ error: 'Empty asset.' }); return; }
  const name = req.headers['x-asset-name'] || 'reference-upload';
  const response = await fetch('https://api.canva.com/rest/v1/asset-uploads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': JSON.stringify({ name_base64: Buffer.from(name).toString('base64') })
    },
    body
  });
  const payload = await response.json();
  if (!response.ok) { res.status(response.status).json(payload); return; }
  res.status(200).json(payload);
};

module.exports.config = { api: { bodyParser: false } };
