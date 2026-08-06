const { supabaseRequest } = require('./_supabase');
const { sendEmail, escapeHtml } = require('./_email');

async function notifyAdmin({ type, title, message, entityType, entityId }) {
  const result = await supabaseRequest('admin_notifications', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ notification_type: type, title, message, entity_type: entityType || null, entity_id: entityId || null })
  });
  if (!result.response.ok) throw new Error('Admin notification could not be saved.');
  const email = process.env.ADMIN_EMAIL || 'vidhugupta1996@gmail.com';
  try {
    await sendEmail({
      to: email, subject: `[Get It Done] ${title}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#12141A"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p>Open the admin account to review this request.</p></div>`,
      text: `${title}\n\n${message}\n\nOpen the Get It Done admin account to review this request.`,
      idempotencyKey: `admin-${type}-${entityId || Date.now()}`
    });
  } catch (error) { console.error('Admin notification email failed:', error.message); }
  return Array.isArray(result.payload) ? result.payload[0] : result.payload;
}

module.exports = { notifyAdmin };
