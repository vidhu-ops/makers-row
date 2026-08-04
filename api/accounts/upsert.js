const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.email) { res.status(400).json({ error: 'Email is required.' }); return; }
    const record = {
      email: String(body.email).trim().toLowerCase(),
      name: body.name || null,
      role: body.role === 'creator' ? 'creator' : 'buyer',
      last_seen_at: new Date().toISOString()
    };
    const { response, payload } = await supabaseRequest('accounts?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(record)
    });
    if (!response.ok) { res.status(response.status).json({ error: 'Could not track account.', details: payload }); return; }
    res.status(200).json({ account: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
