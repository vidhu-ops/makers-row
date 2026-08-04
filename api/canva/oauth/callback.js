const { parseCookies, cookie, canvaBasicAuth, openOAuthState } = require('../_auth');

module.exports = async function handler(req, res) {
  const query = new URL(req.url, `http://${req.headers.host}`).searchParams;
  const cookies = parseCookies(req);
  if (query.get('error')) {
    const description = query.get('error_description') || query.get('error');
    res.status(400).send(`Canva authorization failed: ${description}`);
    return;
  }
  const state = openOAuthState(query.get('state'));
  if (!query.get('code') || !state) {
    res.status(400).send('This Canva login session has expired or was opened from the wrong website. Start again from the live Makers Row site.');
    return;
  }
  const redirectUri = process.env.CANVA_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/canva/oauth/callback`;
  const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: { Authorization: canvaBasicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: query.get('code'), redirect_uri: redirectUri, code_verifier: state.verifier })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    res.status(502).json({ error: 'Canva token exchange failed.', details: payload });
    return;
  }
  const secure = req.headers['x-forwarded-proto'] === 'https';
  const headers = [cookie('canva_access_token', payload.access_token, payload.expires_in || 14400, secure)];
  if (payload.refresh_token) headers.push(cookie('canva_refresh_token', payload.refresh_token, 2592000, secure));
  res.setHeader('Set-Cookie', headers);
  res.writeHead(302, { Location: '/?canva=connected' });
  res.end();
};
