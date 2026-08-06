const { supabaseRequest } = require('../_supabase');
const { authenticate, isAdmin, sendAuthError } = require('../_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET required' }); return; }
  try {
    const auth=await authenticate(req);
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const requestedEmail = params.get('buyer_email');
    if(!requestedEmail && !isAdmin(auth)){res.status(403).json({error:'Only the admin can view all orders.'});return;}
    const email = requestedEmail ? requestedEmail.trim().toLowerCase() : null;
    if(email && email!==auth.email && !isAdmin(auth)){res.status(403).json({error:'You can only view your own orders.'});return;}
    const query = email
      ? `orders?buyer_email=eq.${encodeURIComponent(email.trim().toLowerCase())}&order=created_at.desc`
      : 'orders?order=created_at.desc';
    const { response, payload } = await supabaseRequest(query);
    if (!response.ok) { res.status(response.status).json({ error: 'Could not load orders.', details: payload }); return; }
    res.status(200).json({ orders: payload });
  } catch (error) { sendAuthError(res,error); }
};
