const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.project_id || !body.message) { res.status(400).json({ error: 'Project and message are required.' }); return; }
    const { response, payload } = await supabaseRequest('project_messages', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ project_id: body.project_id, sender_role: body.sender_role || 'designer', sender_name: body.sender_name || 'Makers Row designer', message: body.message })
    });
    if (!response.ok) { res.status(response.status).json({ error: 'Could not save message.', details: payload }); return; }
    res.status(201).json({ message: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
