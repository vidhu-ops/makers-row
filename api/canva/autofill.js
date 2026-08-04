const { parseCookies } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  const token = parseCookies(req).canva_access_token;
  if (!token) { res.status(401).json({ error: 'Connect Canva before creating a draft.' }); return; }
  if (!process.env.CANVA_BRAND_TEMPLATE_ID) { res.status(500).json({ error: 'CANVA_BRAND_TEMPLATE_ID is not configured.' }); return; }
  const input = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const map = JSON.parse(process.env.CANVA_AUTOFILL_FIELDS_JSON || '{"title":"TITLE","brief":"BRIEF","style":"STYLE","reference1":"REFERENCE_1","reference2":"REFERENCE_2","reference3":"REFERENCE_3"}');
  const data = {};
  if (input.title && map.title) data[map.title] = { type: 'text', text: input.title };
  if (input.brief && map.brief) data[map.brief] = { type: 'text', text: input.brief };
  if (input.style && map.style) data[map.style] = { type: 'text', text: input.style };
  (input.assetIds || []).forEach((assetId, index) => {
    const field = map[`reference${index + 1}`];
    if (assetId && field) data[field] = { type: 'image', asset_id: assetId };
  });
  const response = await fetch('https://api.canva.com/rest/v1/autofills', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_template_id: process.env.CANVA_BRAND_TEMPLATE_ID, data })
  });
  const payload = await response.json();
  if (!response.ok) { res.status(response.status).json(payload); return; }
  res.status(200).json(payload);
};
