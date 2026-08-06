const { supabaseConfig, supabaseRequest } = require('./_supabase');

async function authenticate(req) {
  const header=String(req.headers.authorization||'');
  const token=header.replace(/^Bearer\s+/i,'').trim();
  if(!token) throw Object.assign(new Error('Authentication required.'),{statusCode:401});
  const {url}=supabaseConfig();
  const key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_JWT;
  if(!key) throw Object.assign(new Error('Supabase browser key is not configured.'),{statusCode:500});
  const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.email) throw Object.assign(new Error('Your session has expired. Please sign in again.'),{statusCode:401});
  const email=String(payload.email).trim().toLowerCase();
  const accountResult=await supabaseRequest(`accounts?email=eq.${encodeURIComponent(email)}&limit=1`);
  const account=accountResult.response.ok&&Array.isArray(accountResult.payload)?accountResult.payload[0]||null:null;
  return {token,user:payload,email,account};
}
function isAdmin(auth){
  const configured=String(process.env.ADMIN_EMAIL||'vidhugupta1996@gmail.com').trim().toLowerCase();
  return auth.email===configured;
}
function sendAuthError(res,error){res.status(error.statusCode||500).json({error:error.message||'Authentication failed.'});}
module.exports={authenticate,isAdmin,sendAuthError};
