const { supabaseRequest } = require('./_supabase');
const { authenticate, isAdmin, sendAuthError } = require('./_auth');
const { savePayoutProfile, signedCreatorUrl } = require('./_creator');
const { notifyAdmin } = require('./_notify');
const { sendEmail } = require('./_email');

function bodyOf(req) { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
function cleanName(name) { return String(name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120); }
async function uploadDataUrl(dataUrl, path) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  if (data.length > 6 * 1024 * 1024) throw new Error('Each creator upload must be 6 MB or smaller.');
  const { url, key } = require('./_supabase').supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/creator-assets/${path}`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': match[1], 'x-upsert': 'true' }, body: data
  });
  if (!response.ok) throw new Error('A creator file could not be uploaded.');
  return path;
}

module.exports = async function handler(req, res) {
  try {
    const auth = await authenticate(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const action = url.searchParams.get('action') || 'listings';
    if (req.method === 'GET' && action === 'listings') {
      const query = isAdmin(auth) ? 'creator_listings?select=*&order=created_at.desc' : (auth.account?.role === 'creator' ? `creator_listings?creator_email=eq.${encodeURIComponent(auth.email)}&select=*&order=created_at.desc` : 'creator_listings?status=eq.Live&select=*&order=created_at.desc');
      const result = await supabaseRequest(query); if (!result.response.ok) throw new Error('Creator listings could not be loaded.');
      const listings = await Promise.all((result.payload || []).map(async item => ({ ...item, asset_manifest: (item.asset_manifest || []).map(file => ({ name: file.name, type: file.type })), preview_url: await signedCreatorUrl(item.preview_path) })));
      res.status(200).json({ listings }); return;
    }
    if (req.method === 'GET' && action === 'chat') {
      const creatorEmail = isAdmin(auth) ? String(url.searchParams.get('creator_email') || '').trim().toLowerCase() : auth.email;
      const result = await supabaseRequest(creatorEmail ? `creator_admin_messages?creator_email=eq.${encodeURIComponent(creatorEmail)}&select=*&order=created_at.asc` : 'creator_admin_messages?select=*&order=created_at.asc');
      if (!result.response.ok) throw new Error('Chat could not be loaded.');
      res.status(200).json({ messages: result.payload || [] }); return;
    }
    if (req.method === 'GET' && action === 'notifications') {
      if (!isAdmin(auth)) { res.status(403).json({ error: 'Admin access required.' }); return; }
      const result = await supabaseRequest('admin_notifications?select=*&order=created_at.desc&limit=50');
      if (!result.response.ok) throw new Error('Notifications could not be loaded.');
      res.status(200).json({ notifications: result.payload || [] }); return;
    }
    if (req.method === 'POST' && action === 'payout') {
      if (auth.account?.role !== 'creator' && !isAdmin(auth)) { res.status(403).json({ error: 'A creator account is required.' }); return; }
      const body = bodyOf(req); if (body.terms_accepted !== true) { res.status(400).json({ error: 'You must read and accept the creator terms.' }); return; }
      const profile = await savePayoutProfile(auth.email, body);
      res.status(200).json({ profile }); return;
    }
    if (req.method === 'POST' && action === 'chat') {
      const body = bodyOf(req); const creatorEmail = isAdmin(auth) ? String(body.creator_email || '').trim().toLowerCase() : auth.email;
      if (!creatorEmail || !String(body.message || '').trim()) { res.status(400).json({ error: 'Creator and message are required.' }); return; }
      const senderRole = isAdmin(auth) ? 'admin' : 'creator';
      const result = await supabaseRequest('creator_admin_messages', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ creator_email: creatorEmail, sender_role: senderRole, sender_email: auth.email, message: String(body.message).trim().slice(0, 4000) }) });
      if (!result.response.ok) throw new Error('Message could not be saved.');
      if (senderRole === 'creator') await notifyAdmin({ type: 'creator_chat', title: 'New creator message', message: `${creatorEmail} sent a message to the admin.`, entityType: 'creator', entityId: creatorEmail });
      if (senderRole === 'admin') { try { await sendEmail({ to: creatorEmail, subject: 'New message from Get It Done', html: `<p>You have a new message from the Get It Done admin. Sign in to view and reply.</p>`, text: 'You have a new message from the Get It Done admin. Sign in to view and reply.', idempotencyKey: `creator-chat-${creatorEmail}-${Date.now()}` }); } catch (error) { console.error('Creator chat email failed:', error.message); } }
      res.status(201).json({ message: Array.isArray(result.payload) ? result.payload[0] : result.payload }); return;
    }
    if (req.method === 'POST' && action === 'listing') {
      if (auth.account?.role !== 'creator' && !isAdmin(auth)) { res.status(403).json({ error: 'A creator account is required.' }); return; }
      const body = bodyOf(req); const title = String(body.title || '').trim(); const price = Number(body.price || 0);
      if (!title || !body.category || !body.description || !Number.isFinite(price) || price < 150) { res.status(400).json({ error: 'Title, category, description, and a price of at least INR 150 are required.' }); return; }
      const creatorEmail = auth.email; const stamp = `${Date.now()}-${creatorEmail.replace(/[^a-z0-9]/gi, '-')}`;
      let previewPath = null; if (body.preview?.data) previewPath = await uploadDataUrl(body.preview.data, `${creatorEmail}/${stamp}-preview-${cleanName(body.preview.name)}`);
      const manifest = [];
      for (const asset of Array.isArray(body.assets) ? body.assets.slice(0, 12) : []) {
        if (asset.data) { const path = await uploadDataUrl(asset.data, `${creatorEmail}/${stamp}-${cleanName(asset.name)}`); manifest.push({ name: cleanName(asset.name), type: asset.type || 'application/octet-stream', path }); }
        else if (asset.name) manifest.push({ name: cleanName(asset.name), type: asset.type || 'application/octet-stream' });
      }
      const result = await supabaseRequest('creator_listings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ creator_email: creatorEmail, title, category: String(body.category), description: String(body.description).trim(), price, currency: 'INR', preview_path: previewPath, asset_manifest: manifest, status: 'Live' }) });
      if (!result.response.ok) throw new Error('Listing could not be saved.');
      const listing = Array.isArray(result.payload) ? result.payload[0] : result.payload;
      await notifyAdmin({ type: 'creator_listing', title: 'New creator listing', message: `${creatorEmail} published “${title}” for INR ${price}.`, entityType: 'listing', entityId: listing.id });
      res.status(201).json({ listing: { ...listing, preview_url: await signedCreatorUrl(previewPath) } }); return;
    }
    if (req.method === 'POST' && action === 'notification-read') {
      if (!isAdmin(auth)) { res.status(403).json({ error: 'Admin access required.' }); return; }
      const body = bodyOf(req); if (!body.id) { res.status(400).json({ error: 'Notification id is required.' }); return; }
      const result = await supabaseRequest(`admin_notifications?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ is_read: true }) });
      if (!result.response.ok) throw new Error('Notification could not be updated.'); res.status(200).json({ ok: true }); return;
    }
    res.status(400).json({ error: 'Unsupported creator action.' });
  } catch (error) { console.error(error); sendAuthError(res, error); }
};
