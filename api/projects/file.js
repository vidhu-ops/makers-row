const { supabaseConfig, supabaseRequest } = require('../_supabase');
const { sendEmail, escapeHtml } = require('../_email');
const { authenticate, isAdmin, sendAuthError } = require('../_auth');
async function signedDeliveryUrl(base,key,path,fallback){
  const response=await fetch(`${base}/storage/v1/object/sign/project-files/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify({expiresIn:604800})});
  const payload=await response.json().catch(()=>({}));
  return response.ok&&payload.signedURL?(payload.signedURL.startsWith('http')?payload.signedURL:`${base}/storage/v1${payload.signedURL}`):fallback;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
    const auth=await authenticate(req); if(!isAdmin(auth)){res.status(403).json({error:'Only the admin can upload deliverables.'});return;}
    const url = new URL(req.url, `http://${req.headers.host}`);
    const projectId = url.searchParams.get('project_id');
    if (!projectId) { res.status(400).json({ error: 'Project id is required.' }); return; }
    const chunks=[]; for await (const chunk of req) chunks.push(chunk);
    const body=Buffer.concat(chunks);
    if(!body.length){ res.status(400).json({error:'Empty file.'}); return; }
    const rawName=String(req.headers['x-file-name']||'deliverable').replace(/[^a-zA-Z0-9._-]/g,'-');
    const path=`${projectId}/${Date.now()}-${rawName}`;
    const {url:base,key}=supabaseConfig();
    const upload=await fetch(`${base}/storage/v1/object/project-files/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':req.headers['content-type']||'application/octet-stream','x-upsert':'true'},body});
    const uploadText=await upload.text();
    if(!upload.ok){let details=uploadText;try{details=JSON.parse(uploadText)}catch(error){} res.status(upload.status).json({error:'Could not upload file.',details});return;}
    const fileUrl=`${base}/storage/v1/object/public/project-files/${path}`;
    const deliveryUrl=await signedDeliveryUrl(base,key,path,fileUrl);
    const saved=await supabaseRequest('project_files',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({project_id:projectId,file_name:rawName,file_path:path,file_url:fileUrl,file_kind:'deliverable'})});
    if(!saved.response.ok){res.status(saved.response.status).json({error:'File uploaded but could not save project record.',details:saved.payload});return;}
    try {
      const project=await supabaseRequest(`projects?id=eq.${encodeURIComponent(projectId)}&select=buyer_email,buyer_name,service_title`);
      const buyer=Array.isArray(project.payload)?project.payload[0]:project.payload;
      if(buyer?.buyer_email&&process.env.RESEND_API_KEY){
        await sendEmail({
          to:buyer.buyer_email,
          subject:`Your Get It Done file is ready  -  ${buyer.service_title||'Bespoke project'}`,
          html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#12141A"><h2>Your finished work is ready</h2><p>Hi ${escapeHtml(buyer.buyer_name||'there')},</p><p>Your ${escapeHtml(buyer.service_title||'bespoke project')} has a new deliverable: <strong>${escapeHtml(rawName)}</strong>.</p><p><a href="${escapeHtml(deliveryUrl)}">Open your file</a></p><p>You can also find it in your Get It Done account.</p></div>`,
          text:`Your finished work is ready. Open ${rawName}: ${deliveryUrl}`,
          idempotencyKey:`deliverable-${projectId}-${rawName}`
        });
      }
    } catch(error){ console.error('Deliverable email failed:',error.message); }
    res.status(201).json({file:Array.isArray(saved.payload)?saved.payload[0]:saved.payload});
  } catch(error){sendAuthError(res,error);}
};

module.exports.config={api:{bodyParser:false}};

