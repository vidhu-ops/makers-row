const { supabaseConfig, supabaseRequest } = require('../_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
  try {
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
    const saved=await supabaseRequest('project_files',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({project_id:projectId,file_name:rawName,file_url:fileUrl,file_kind:'deliverable'})});
    if(!saved.response.ok){res.status(saved.response.status).json({error:'File uploaded but could not save project record.',details:saved.payload});return;}
    res.status(201).json({file:Array.isArray(saved.payload)?saved.payload[0]:saved.payload});
  } catch(error){res.status(500).json({error:error.message});}
};

module.exports.config={api:{bodyParser:false}};
