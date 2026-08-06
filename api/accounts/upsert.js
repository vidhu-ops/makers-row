const { supabaseRequest } = require('../_supabase');
const { sendEmail, escapeHtml } = require('../_email');
const { authenticate, sendAuthError } = require('../_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const auth=await authenticate(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.email) { res.status(400).json({ error: 'Email is required.' }); return; }
    if(String(body.email).trim().toLowerCase()!==auth.email){res.status(403).json({error:'You can only update your own account.'});return;}
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
    if (body.is_new_signup && process.env.RESEND_API_KEY) {
      try {
        await sendEmail({
          to: record.email,
          subject: "Welcome to Get It Done",
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#12141A"><h2>Welcome to Get It Done, ${escapeHtml(record.name || 'there')}!</h2><p>Your account is ready. Browse the marketplace, save creative work, add services to your cart, and track every order from your account.</p><p>We're glad you're here.</p><p>Get It Done</p></div>`,
          text: `Welcome to Get It Done, ${record.name || 'there'}! Your account is ready. Browse the marketplace, save creative work, add services to your cart, and track every order from your account.`,
          idempotencyKey: `welcome-${record.email}`
        });
      } catch (error) { console.error('Welcome email failed:', error.message); }
    }
    res.status(200).json({ account: Array.isArray(payload) ? payload[0] : payload });
  } catch (error) { sendAuthError(res,error); }
};

