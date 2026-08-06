const { supabaseConfig, supabaseRequest } = require('../_supabase');
const { authenticate, isAdmin, sendAuthError } = require('../_auth');
async function signedFile(file){
  const path=file.file_path||String(file.file_url||'').split('/object/public/project-files/')[1];
  if(!path) return file;
  const {url,key}=supabaseConfig();
  const response=await fetch(`${url}/storage/v1/object/sign/project-files/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify({expiresIn:3600})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.signedURL) return file;
  return {...file,file_url:payload.signedURL.startsWith('http')?payload.signedURL:`${url}/storage/v1${payload.signedURL}`};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET required' }); return; }
  try {
    const auth=await authenticate(req);
    const email = new URL(req.url, `http://${req.headers.host}`).searchParams.get('buyer_email');
    if(!email && !isAdmin(auth)){res.status(403).json({error:'Only the admin can view all projects.'});return;}
    if(email && email.trim().toLowerCase()!==auth.email && !isAdmin(auth)){res.status(403).json({error:'You can only view your own projects.'});return;}
    const query = email
      ? `projects?buyer_email=eq.${encodeURIComponent(email)}&select=*,project_messages(*),project_files(*)&order=updated_at.desc`
      : 'projects?select=*,project_messages(*),project_files(*)&order=updated_at.desc';
    const { response, payload } = await supabaseRequest(query);
    if (!response.ok) { res.status(response.status).json({ error: 'Could not load projects.', details: payload }); return; }
    const projects=await Promise.all((payload||[]).map(async project=>({...project,project_files:await Promise.all((project.project_files||[]).map(signedFile))})));
    res.status(200).json({ projects });
  } catch (error) { sendAuthError(res,error); }
};
