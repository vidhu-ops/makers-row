const { supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET required' }); return; }
  try {
    const email = new URL(req.url, `http://${req.headers.host}`).searchParams.get('buyer_email');
    const query = email
      ? `projects?buyer_email=eq.${encodeURIComponent(email)}&select=*&order=updated_at.desc`
      : 'projects?select=*&order=updated_at.desc';
    const { response, payload } = await supabaseRequest(query);
    if (!response.ok) { res.status(response.status).json({ error: 'Could not load projects.', details: payload }); return; }
    res.status(200).json({ projects: payload });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
