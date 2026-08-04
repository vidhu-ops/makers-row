const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') { res.status(405).json({ error: 'PATCH required' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.id) { res.status(400).json({ error: 'Project id is required.' }); return; }
    const allowed = ['status', 'revision_count', 'admin_email', 'title', 'brief'];
    const update = Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
    update.updated_at = new Date().toISOString();
    const { response, payload } = await supabaseRequest(`projects?id=eq.${encodeURIComponent(body.id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update)
    });
    if (!response.ok) { res.status(response.status).json({ error: 'Could not update project.', details: payload }); return; }
    res.status(200).json({ project: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
