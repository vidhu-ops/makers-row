const crypto = require('crypto');
const { supabaseRequest } = require('./_supabase');
const { sendEmail, escapeHtml } = require('./_email');

const CASHFREE_VERSION = process.env.CASHFREE_API_VERSION || '2025-01-01';
function config() {
  const environment = process.env.CASHFREE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const base = environment === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) throw new Error('Cashfree server credentials are not configured.');
  return { environment, base, id: process.env.CASHFREE_CLIENT_ID, secret: process.env.CASHFREE_CLIENT_SECRET };
}
function appUrl() { return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''); }
function manualPaymentConfig() {
  return {
    enabled: true,
    upi_id: process.env.UPI_ID || 'vidhugupta1996@oksbi',
    qr_image_url: process.env.UPI_QR_IMAGE_URL || 'https://makers-row-final-iebk.vercel.app/assets/upi-qr-cropped.png',
    account_name: process.env.BANK_ACCOUNT_NAME || '',
    account_number: process.env.BANK_ACCOUNT_NUMBER || '',
    ifsc: process.env.BANK_IFSC || '',
    bank_name: process.env.BANK_NAME || ''
  };
}
async function bodyText(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks=[]; for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
async function cashfree(path, options = {}) {
  const c = config();
  const response = await fetch(c.base + path, { ...options, headers: { 'Content-Type':'application/json', 'x-api-version':CASHFREE_VERSION, 'x-client-id':c.id, 'x-client-secret':c.secret, 'x-request-id':crypto.randomUUID(), 'x-idempotency-key':options.idempotencyKey || crypto.randomUUID(), ...(options.headers || {}) } });
  const raw = await response.text(); let payload = {}; try { payload = raw ? JSON.parse(raw) : {}; } catch (error) { payload = { raw }; }
  if (!response.ok) throw new Error(payload.message || payload.type || `Cashfree request failed (${response.status}).`);
  return payload;
}
async function saveOrder(record) {
  const result = await supabaseRequest('orders?on_conflict=order_number', { method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=representation'}, body:JSON.stringify(record) });
  if (!result.response.ok) throw new Error(result.payload.message || result.payload.error || 'Could not save order.');
  return Array.isArray(result.payload) ? result.payload[0] : result.payload;
}
async function updateOrder(orderNumber, update) {
  const result = await supabaseRequest(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify({...update,updated_at:new Date().toISOString()}) });
  if (!result.response.ok) throw new Error(result.payload.message || result.payload.error || 'Could not update order.');
  return Array.isArray(result.payload) ? result.payload[0] : result.payload;
}
function receipt(order, label='Payment confirmed') {
  const items=(order.items||[]).map(item=>`<li>${escapeHtml(item.title)} × ${Number(item.qty||1)}</li>`).join('');
  return { subject:`Makers' Row receipt · ${order.order_number}`, html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#12141A"><h2>${escapeHtml(label)}</h2><p>Hi ${escapeHtml(order.buyer_name||'there')},</p><p>Your payment for <strong>${escapeHtml(order.order_number)}</strong> was confirmed.</p><ul>${items}</ul><p><strong>Total paid: ₹${Number(order.total||0).toLocaleString('en-IN')}</strong></p><p>Ready files will appear in your account. Bespoke work will be delivered within the day.</p><p>Makers' Row</p></div>`, text:`${label}\n\nHi ${order.buyer_name||'there'}, your payment for ${order.order_number} was confirmed. Total paid: ₹${Number(order.total||0).toLocaleString('en-IN')}. Ready files will appear in your account. Bespoke work will be delivered within the day.` };
}
async function sendReceipt(order) { return sendEmail({...receipt(order),to:order.buyer_email,idempotencyKey:`receipt-${order.order_number}`}); }
async function createManualPayment(req,res) {
  const raw=await bodyText(req); const data=raw?JSON.parse(raw):{};
  if(!data.order_number||!data.buyer_email||!Array.isArray(data.items)||!Number(data.total)){res.status(400).json({error:'Order number, buyer email, items, and total are required.'});return;}
  if(!manualPaymentConfig().enabled){res.status(503).json({error:'Manual payment details have not been configured yet.'});return;}
  const orderNumber=String(data.order_number).replace(/[^A-Za-z0-9_-]/g,'').slice(0,45);
  const record=await saveOrder({order_number:orderNumber,buyer_email:String(data.buyer_email).trim().toLowerCase(),buyer_name:data.buyer_name||null,total:Number(data.total),currency:'INR',status:'received',payment_method:'upi_or_bank_transfer',payment_status:'pending',items:data.items});
  res.status(201).json({order:record,order_id:orderNumber,payment:manualPaymentConfig()});
}
async function submitManualProof(req,res) {
  const raw=await bodyText(req); const data=raw?JSON.parse(raw):{};
  if(!data.order_number||!data.payment_reference){res.status(400).json({error:'Order number and UTR/payment reference are required.'});return;}
  const order=await updateOrder(String(data.order_number),{payment_status:'submitted',payment_reference:String(data.payment_reference).trim().slice(0,120),payment_proof_url:data.payment_proof_url||null,payment_submitted_at:new Date().toISOString()});
  res.status(200).json({order,message:'Payment proof submitted. Your order will be released after admin confirmation.'});
}
async function approveManualPayment(req,res) {
  const raw=await bodyText(req); const data=raw?JSON.parse(raw):{};
  const adminEmail=String(data.admin_email||'').trim().toLowerCase();
  const configuredAdmin=String(process.env.ADMIN_EMAIL||'vidhugupta1996@gmail.com').trim().toLowerCase();
  if(adminEmail!==configuredAdmin){res.status(403).json({error:'Admin approval is required.'});return;}
  if(!data.order_number){res.status(400).json({error:'Order number is required.'});return;}
  const order=await updateOrder(String(data.order_number),{status:'in_progress',payment_status:'paid',payment_verified_at:new Date().toISOString(),admin_note:data.admin_note||null});
  if(order?.buyer_email){try{await sendReceipt(order);}catch(error){console.error('Receipt email failed:',error.message);}}
  res.status(200).json({order});
}
async function createPayment(req,res) {
  const raw=await bodyText(req); const data=raw?JSON.parse(raw):{};
  if(!data.order_number||!data.buyer_email||!Array.isArray(data.items)||!Number(data.total)){res.status(400).json({error:'Order number, buyer email, items, and total are required.'});return;}
  const orderNumber=String(data.order_number).replace(/[^A-Za-z0-9_-]/g,'').slice(0,45);
  const record=await saveOrder({order_number:orderNumber,buyer_email:String(data.buyer_email).trim().toLowerCase(),buyer_name:data.buyer_name||null,total:Number(data.total),currency:'INR',status:'received',items:data.items});
  const payment=await cashfree('/orders',{method:'POST',idempotencyKey:`makers-row-${orderNumber}`,body:JSON.stringify({order_id:orderNumber,order_amount:Math.max(1,Math.round(Number(data.total)*100)/100),order_currency:'INR',customer_details:{customer_id:String(data.buyer_email).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,50)||`buyer${Date.now()}`,customer_name:data.buyer_name||'Makers Row buyer',customer_email:String(data.buyer_email).trim().toLowerCase(),customer_phone:data.phone||'9999999999'},order_note:`Makers' Row order ${orderNumber}`,order_meta:{return_url:`${appUrl()}/?payment=return&order_id=${encodeURIComponent(orderNumber)}`,notify_url:`${appUrl()}/api/commerce?action=webhook`}})});
  res.status(200).json({order:record,order_id:payment.order_id||orderNumber,payment_session_id:payment.payment_session_id,mode:config().environment});
}
function validSignature(req,raw) {
  const signature=req.headers['x-webhook-signature'], timestamp=req.headers['x-webhook-timestamp']; if(!signature||!timestamp||!raw)return false;
  const expected=crypto.createHmac('sha256',process.env.CASHFREE_CLIENT_SECRET).update(String(timestamp)+raw).digest('base64');
  return signature.length===expected.length&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
async function webhook(req,res) {
  const raw=req.rawBody?Buffer.from(req.rawBody).toString('utf8'):await bodyText(req); if(!validSignature(req,raw)){res.status(401).json({error:'Invalid Cashfree webhook signature.'});return;}
  const event=JSON.parse(raw), orderData=event.data?.order||{}, payment=event.data?.payment||{}, orderId=orderData.order_id; if(!orderId){res.status(400).json({error:'Cashfree order id is missing.'});return;}
  const success=payment.payment_status==='SUCCESS'||event.type==='PAYMENT_SUCCESS_WEBHOOK'; const updated=await updateOrder(orderId,{status:success?'in_progress':'received'});
  if(success&&updated?.buyer_email){try{await sendReceipt(updated);}catch(error){console.error('Receipt email failed:',error.message);}}
  res.status(200).json({received:true});
}
async function verifyPayment(req,res) {
  const orderId=new URL(req.url,`http://${req.headers.host}`).searchParams.get('order_id'); if(!orderId){res.status(400).json({error:'order_id is required.'});return;}
  const payment=await cashfree(`/orders/${encodeURIComponent(orderId)}`,{method:'GET'}); const paid=payment.order_status==='PAID'; let order=null;
  if(paid){order=await updateOrder(orderId,{status:'in_progress'});if(order?.buyer_email){try{await sendReceipt(order);}catch(error){console.error('Receipt email failed:',error.message);}}}
  res.status(200).json({paid,order_status:payment.order_status,order});
}
module.exports=async function handler(req,res){try{const action=new URL(req.url,`http://${req.headers.host}`).searchParams.get('action')||'create-payment';if(action==='payment-config'&&req.method==='GET'){res.status(200).json(manualPaymentConfig());return;}if(action==='create-payment'&&req.method==='POST')return createPayment(req,res);if(action==='create-manual-payment'&&req.method==='POST')return createManualPayment(req,res);if(action==='submit-manual-proof'&&req.method==='POST')return submitManualProof(req,res);if(action==='approve-manual-payment'&&req.method==='POST')return approveManualPayment(req,res);if(action==='webhook'&&req.method==='POST')return webhook(req,res);if(action==='verify-payment'&&req.method==='GET')return verifyPayment(req,res);res.status(405).json({error:'Unsupported commerce action.'});}catch(error){console.error(error);res.status(500).json({error:error.message});}};
module.exports.config={api:{bodyParser:false}};
