const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET required' }); return; }
  try {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const email = params.get('buyer_email');
    const query = email
      ? `orders?buyer_email=eq.${encodeURIComponent(email.trim().toLowerCase())}&order=created_at.desc`
      : 'orders?order=created_at.desc';
    const { response, payload } = await supabaseRequest(query);
    if (!response.ok) { res.status(response.status).json({ error: 'Could not load orders.', details: payload }); return; }
    res.status(200).json({ orders: payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
