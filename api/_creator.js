const { supabaseConfig, supabaseRequest } = require('./_supabase');

const TERMS_VERSION = 'creator-70-2026-08';

async function savePayoutProfile(email, body) {
  const record = {
    creator_email: email,
    account_name: String(body.account_name || '').trim(),
    bank_name: String(body.bank_name || '').trim() || null,
    account_number: String(body.account_number || '').trim() || null,
    ifsc_code: String(body.ifsc_code || '').trim().toUpperCase() || null,
    upi_id: String(body.upi_id || '').trim() || null,
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
    updated_at: new Date().toISOString()
  };
  if (!record.account_name || (!record.upi_id && (!record.account_number || !record.ifsc_code))) {
    throw new Error('Creator payout details require an account name and either a UPI ID or bank account plus IFSC.');
  }
  const result = await supabaseRequest('creator_payout_profiles?on_conflict=creator_email', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(record)
  });
  if (!result.response.ok) throw new Error('Creator payout details could not be saved.');
  return Array.isArray(result.payload) ? result.payload[0] : result.payload;
}

async function signedCreatorUrl(path) {
  if (!path) return null;
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/creator-assets/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ expiresIn: 3600 })
  });
  const payload = await response.json().catch(() => ({}));
  return response.ok && payload.signedURL ? (payload.signedURL.startsWith('http') ? payload.signedURL : `${url}/storage/v1${payload.signedURL}`) : null;
}

module.exports = { TERMS_VERSION, savePayoutProfile, signedCreatorUrl };
