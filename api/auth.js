const { supabaseConfig, supabaseRequest } = require('./_supabase');
const { savePayoutProfile } = require('./_creator');
const { notifyAdmin } = require('./_notify');

function authKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_JWT;
}
async function authRequest(path, body) {
  const { url } = supabaseConfig();
  const key = authKey();
  if (!key) throw new Error('Supabase browser key is not configured.');
  const response = await fetch(`${url}/auth/v1/${path}`, { method:'POST', headers:{'Content-Type':'application/json', apikey:key, Authorization:`Bearer ${key}`}, body:JSON.stringify(body) });
  const text = await response.text(); let payload={}; try{payload=text?JSON.parse(text):{};}catch(error){payload={raw:text};}
  return {response,payload};
}
async function profile(email) {
  const result=await supabaseRequest(`accounts?email=eq.${encodeURIComponent(email)}&limit=1`);
  return result.response.ok && Array.isArray(result.payload) ? result.payload[0] || null : null;
}
async function upsertProfile(email,name,role) {
  const result=await supabaseRequest('accounts?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({email,name:name||null,role:role==='creator'?'creator':'buyer',last_seen_at:new Date().toISOString()})});
  if(!result.response.ok) throw new Error('Account profile could not be saved.');
  return Array.isArray(result.payload)?result.payload[0]:result.payload;
}
module.exports=async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'POST required'});return;}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
    if(!email||password.length<6){res.status(400).json({error:'Valid email and a password of at least 6 characters are required.'});return;}
    if(body.action==='signup'){
      const requestedRole=body.role==='creator'?'creator':'buyer';
      if(requestedRole==='creator'){
        if(body.terms_accepted!==true) { res.status(400).json({error:'Creator terms must be read and accepted before signing up.'});return; }
        if(!body.account_name || (!body.upi_id && (!body.account_number || !body.ifsc_code))) { res.status(400).json({error:'Creator signup requires payout details: account name and either UPI ID or bank account plus IFSC.'});return; }
      }
      const {url}=supabaseConfig(); const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_JWT;
      if(!serviceKey) throw new Error('Supabase server key is not configured.');
      const create=await fetch(`${url}/auth/v1/admin/users`,{method:'POST',headers:{'Content-Type':'application/json',apikey:serviceKey,Authorization:`Bearer ${serviceKey}`},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{name:body.name||'',role:body.role==='creator'?'creator':'buyer'}})});
      const createText=await create.text(); let createPayload={}; try{createPayload=createText?JSON.parse(createText):{};}catch(error){createPayload={};}
      if(!create.ok){res.status(create.status).json({error:createPayload.msg||createPayload.message||'Could not create account.'});return;}
      const account=await upsertProfile(email,body.name,requestedRole);
      if(requestedRole==='creator') await savePayoutProfile(email,body);
      if(requestedRole==='creator') await notifyAdmin({type:'creator_signup',title:'New creator signup',message:`${email} joined as a creator and accepted the 70% payout terms.`,entityType:'account',entityId:email});
      const login=await authRequest('token?grant_type=password',{email,password});
      const session=login.response.ok?{access_token:login.payload.access_token,refresh_token:login.payload.refresh_token,expires_at:login.payload.expires_at}:null;
      res.status(201).json({account,session,user:login.response.ok?login.payload.user:(createPayload.user||createPayload)}); return;
    }
    if(body.action==='login'){
      const result=await authRequest('token?grant_type=password',{email,password});
      if(!result.response.ok){res.status(401).json({error:result.payload.error_description||result.payload.msg||'Email or password is incorrect.'});return;}
      const account=await profile(email);
      if(!account){res.status(403).json({error:'This login has no Makers\' Row profile yet. Please sign up once.'});return;}
      res.status(200).json({account,session:{access_token:result.payload.access_token,refresh_token:result.payload.refresh_token,expires_at:result.payload.expires_at},user:result.payload.user}); return;
    }
    res.status(400).json({error:'Unsupported auth action.'});
  }catch(error){console.error(error);res.status(500).json({error:error.message});}
};

