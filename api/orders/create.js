const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.order_number || !body.buyer_email || !Array.isArray(body.items)) {
      res.status(400).json({ error: 'Order number, buyer email, and items are required.' }); return;
    }
    const record = {
      order_number: String(body.order_number),
      buyer_email: String(body.buyer_email).trim().toLowerCase(),
      buyer_name: body.buyer_name || null,
      total: Number(body.total || 0),
      currency: body.currency === 'INR' ? 'INR' : 'USD',
      status: 'received',
      items: body.items
    };
    const { response, payload } = await supabaseRequest('orders?on_conflict=order_number', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(record)
    });
    if (!response.ok) { res.status(response.status).json({ error: 'Could not save order.', details: payload }); return; }
    res.status(201).json({ order: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
