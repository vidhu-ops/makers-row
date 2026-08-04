const { cookie, randomToken, codeChallenge, sealOAuthState } = require('../_auth');

module.exports = async function handler(req, res) {
  if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET) {
    res.status(500).json({ error: 'Canva environment variables are not configured.' });
    return;
  }
  const verifier = randomToken(48);
  const state = sealOAuthState(verifier);
  const redirectUri = process.env.CANVA_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/canva/oauth/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CANVA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'design:content:write design:meta:read brandtemplate:meta:read brandtemplate:content:read asset:write',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge(verifier),
    state
  });
  const secure = req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', [cookie('canva_oauth_state', state, 600, secure), cookie('canva_code_verifier', verifier, 600, secure)]);
  res.writeHead(302, { Location: `https://www.canva.com/api/oauth/authorize?${params.toString()}` });
  res.end();
};
