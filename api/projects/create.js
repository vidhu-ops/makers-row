const { supabaseRequest } = require('../_supabase');
const { authenticate, sendAuthError } = require('../_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const auth=await authenticate(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.buyer_email || !body.service_title || !body.brief) {
      res.status(400).json({ error: 'Buyer email, service, and brief are required.' }); return;
    }
    if(String(body.buyer_email).trim().toLowerCase()!==auth.email){res.status(403).json({error:'A project must belong to the signed-in buyer.'});return;}
    const { response, payload } = await supabaseRequest('projects', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        buyer_email: body.buyer_email,
        buyer_name: body.buyer_name || null,
        service_id: body.service_id || null,
        service_title: body.service_title,
        style: body.style || null,
        brief: body.brief,
        phone: body.phone || null,
        reference_names: body.reference_names || [],
        status: 'new'
      })
    });
    if (!response.ok) { res.status(response.status).json({ error: 'Could not create project.', details: payload }); return; }
    res.status(201).json({ project: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { sendAuthError(res,error); }
};
