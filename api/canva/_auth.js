const crypto = require('crypto');

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function cookie(name, value, maxAge = 3600, secure = false) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function randomToken(size = 32) {
  return crypto.randomBytes(size).toString('base64url');
}

function codeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function oauthStateKey() {
  return crypto.createHash('sha256').update(String(process.env.CANVA_CLIENT_SECRET || '')).digest();
}

function sealOAuthState(verifier) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', oauthStateKey(), iv);
  const body = JSON.stringify({ verifier, issuedAt: Date.now() });
  const encrypted = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}

function openOAuthState(value) {
  const [ivValue, tagValue, encryptedValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !encryptedValue) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', oauthStateKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const body = Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]);
    const parsed = JSON.parse(body.toString('utf8'));
    if (!parsed.verifier || Date.now() - parsed.issuedAt > 10 * 60 * 1000) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function canvaBasicAuth() {
  return 'Basic ' + Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');
}

module.exports = { parseCookies, cookie, randomToken, codeChallenge, canvaBasicAuth, sealOAuthState, openOAuthState };
