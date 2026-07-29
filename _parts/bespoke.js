/* ============================================================
   BESPOKE SERVICES (Swiggy-style menu)
============================================================ */
const serviceCategories = ['Branding','Social','Presentations','Print','Product','AI Assist'];
const bespokeServices = [
  {id:'s1',cat:'Branding',title:'Logo & brand mark',desc:'Primary logo + 2 concepts, PNG/SVG delivery, one revision round.',price:45,eta:'~60 min',rating:4.9,orders:820,seed:'svc-logo',tags:['popular','best']},
  {id:'s2',cat:'Branding',title:'Brand color & type kit',desc:'Palette, type pairing, and usage notes for your brand.',price:28,eta:'~45 min',rating:4.7,orders:210,seed:'svc-kit',tags:['express']},
  {id:'s3',cat:'Branding',title:'Favicon + app icon set',desc:'App icon, favicon, and social avatar from your mark.',price:18,eta:'~30 min',rating:4.6,orders:140,seed:'svc-favicon',tags:['express']},
  {id:'s4',cat:'Social',title:'Instagram post (single)',desc:'One feed post sized for IG, editable text, brand colors.',price:12,eta:'~25 min',rating:4.8,orders:1100,seed:'svc-ig',tags:['popular','express']},
  {id:'s5',cat:'Social',title:'Instagram story pack (5)',desc:'Five stories with templates + your copy/images.',price:32,eta:'~50 min',rating:4.8,orders:540,seed:'svc-stories',tags:['popular']},
  {id:'s6',cat:'Social',title:'LinkedIn banner + post',desc:'Profile banner and one announcement graphic.',price:22,eta:'~40 min',rating:4.5,orders:190,seed:'svc-li',tags:['express']},
  {id:'s7',cat:'Social',title:'YouTube thumbnail',desc:'Click-focused thumbnail with title treatment.',price:15,eta:'~30 min',rating:4.7,orders:460,seed:'svc-yt',tags:['popular','express']},
  {id:'s8',cat:'Presentations',title:'Pitch deck (up to 10 slides)',desc:'Narrative deck from your outline — clean startup style.',price:85,eta:'~90 min',rating:4.9,orders:310,seed:'svc-deck',tags:['best','popular']},
  {id:'s9',cat:'Presentations',title:'One-pager / one-sheet',desc:'Single-page PDF for investors or sales.',price:35,eta:'~45 min',rating:4.6,orders:175,seed:'svc-onepager',tags:['express']},
  {id:'s10',cat:'Presentations',title:'Slide redesign (3 slides)',desc:'Polish 3 existing slides — layout, type, charts.',price:40,eta:'~50 min',rating:4.7,orders:98,seed:'svc-redesign',tags:[]},
  {id:'s11',cat:'Print',title:'Flyer / poster (A4)',desc:'Print-ready PDF with bleed, for events or promos.',price:30,eta:'~45 min',rating:4.6,orders:240,seed:'svc-flyer',tags:['express']},
  {id:'s12',cat:'Print',title:'Business card (front+back)',desc:'Double-sided card, print-ready CMYK.',price:20,eta:'~35 min',rating:4.5,orders:160,seed:'svc-card',tags:['express']},
  {id:'s13',cat:'Print',title:'Menu / price list design',desc:'Clean menu layout for cafe, salon, or clinic.',price:38,eta:'~55 min',rating:4.4,orders:72,seed:'svc-menu',tags:[]},
  {id:'s14',cat:'Product',title:'Packaging mockup',desc:'Product on packaging mock with your art.',price:42,eta:'~60 min',rating:4.7,orders:130,seed:'svc-pack',tags:['popular']},
  {id:'s15',cat:'Product',title:'App / web hero mock',desc:'Landing hero visual or device mockup.',price:36,eta:'~50 min',rating:4.6,orders:88,seed:'svc-hero',tags:[]},
  {id:'s16',cat:'AI Assist',title:'AI logo concept pack (8)',desc:'Curated AI directions + designer shortlist notes.',price:25,eta:'~35 min',rating:4.5,orders:390,seed:'svc-ailogo',tags:['popular','express']},
  {id:'s17',cat:'AI Assist',title:'Background remove (5 imgs)',desc:'Clean cutouts, transparent PNG.',price:14,eta:'~20 min',rating:4.8,orders:700,seed:'svc-bg',tags:['express','popular']},
  {id:'s18',cat:'AI Assist',title:'Product photo polish (3)',desc:'Lighting/color cleanup for store listings.',price:24,eta:'~40 min',rating:4.6,orders:210,seed:'svc-photo',tags:['express']}
];

let activeSvcCat = 'All';
let activeSvcFilter = 'all';
let pendingService = null;

function svcQty(serviceId){
  const line = cart.find(c=>c.kind==='bespoke' && c.serviceId===serviceId);
  return line ? line.qty : 0;
}

function setSvcCat(cat){
  activeSvcCat = cat;
  renderServices();
}

function setSvcFilter(f){
  activeSvcFilter = f;
  document.querySelectorAll('.svc-filter').forEach(b=>b.classList.toggle('active', b.dataset.filter===f));
  renderServices();
}

function filteredServices(){
  const q = (document.getElementById('svcSearch')?.value||'').toLowerCase();
  return bespokeServices.filter(s=>{
    if(activeSvcCat!=='All' && s.cat!==activeSvcCat) return false;
    if(q && !(s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q))) return false;
    if(activeSvcFilter==='express' && !s.tags.includes('express')) return false;
    if(activeSvcFilter==='popular' && !s.tags.includes('popular')) return false;
    if(activeSvcFilter==='under20' && s.price>=20) return false;
    return true;
  });
}

function renderServices(){
  const catsEl = document.getElementById('svcCats');
  const menuEl = document.getElementById('svcMenu');
  if(!catsEl || !menuEl) return;

  const counts = {All: bespokeServices.length};
  serviceCategories.forEach(c=> counts[c] = bespokeServices.filter(s=>s.cat===c).length);

  catsEl.innerHTML = ['All', ...serviceCategories].map(c=>`
    <button class="svc-cat ${activeSvcCat===c?'active':''}" onclick="setSvcCat('${c}')">
      <span>${c}</span><span class="n">${counts[c]||0}</span>
    </button>`).join('');

  const items = filteredServices();
  if(items.length===0){
    menuEl.innerHTML = `<div class="empty-state">No services match. <button class="btn btn-sm btn-ghost" style="margin-top:10px" onclick="document.getElementById('svcSearch').value='';setSvcFilter('all');setSvcCat('All')">Clear</button></div>`;
    return;
  }

  const grouped = {};
  items.forEach(s=>{ (grouped[s.cat]=grouped[s.cat]||[]).push(s); });

  let html = '';
  Object.keys(grouped).forEach(cat=>{
    html += `<div class="svc-section-title" id="svc-sec-${cat}">${cat}</div>`;
    grouped[cat].forEach(s=>{
      const qty = svcQty(s.id);
      const badges = [
        s.tags.includes('popular') ? '<span class="svc-badge popular">Popular</span>' : '',
        s.tags.includes('express') ? '<span class="svc-badge express">Express</span>' : '',
        s.tags.includes('best') ? '<span class="svc-badge best">Bestseller</span>' : ''
      ].join('');
      const ctrl = qty>0
        ? `<div class="svc-stepper"><button onclick="event.stopPropagation();changeSvcQty('${s.id}',-1)">−</button><span>${qty}</span><button onclick="event.stopPropagation();changeSvcQty('${s.id}',1)">+</button></div>`
        : `<button class="svc-add" onclick="event.stopPropagation();openSvcModal('${s.id}')">ADD</button>`;
      html += `
        <div class="svc-item">
          <div>
            <div class="svc-badges">${badges}</div>
            <h4>${s.title}</h4>
            <div class="svc-rating">★ ${s.rating.toFixed(1)} · ${s.orders}+ orders</div>
            <p class="svc-desc">${s.desc}</p>
            <div><span class="svc-price">$${s.price.toFixed(2)}</span><span class="svc-eta">${s.eta} turnaround</span></div>
          </div>
          <div class="svc-media">
            <img src="https://picsum.photos/seed/${s.seed}/240/240" alt="" loading="lazy">
            ${ctrl}
          </div>
        </div>`;
    });
  });
  menuEl.innerHTML = html;
}

function openSvcModal(id){
  pendingService = bespokeServices.find(s=>s.id===id);
  if(!pendingService) return;
  document.getElementById('svcModalTitle').textContent = pendingService.title;
  document.getElementById('svcModalSub').textContent = `$${pendingService.price.toFixed(2)} · ${pendingService.eta} · Add notes, then keep browsing for more services.`;
  document.getElementById('svcNotes').value = '';
  document.getElementById('svcModal').classList.add('open');
}

function closeSvcModal(){
  document.getElementById('svcModal').classList.remove('open');
  pendingService = null;
}

function confirmAddService(){
  if(!pendingService) return;
  const notes = document.getElementById('svcNotes').value.trim();
  const email = document.getElementById('svcEmail').value.trim();
  const phone = document.getElementById('svcPhone').value.trim();
  const metaParts = [pendingService.eta];
  if(email) metaParts.push(email);
  if(phone) metaParts.push(phone);
  if(notes) metaParts.push(notes.slice(0,60));
  addToCart({
    id:'bespoke_'+pendingService.id,
    serviceId: pendingService.id,
    kind:'bespoke',
    title: pendingService.title,
    price: pendingService.price,
    qty: 1,
    thumb: 'https://picsum.photos/seed/'+pendingService.seed+'/200/200',
    meta: metaParts.join(' · ')
  });
  toast('Added "'+pendingService.title+'" — add more or view cart');
  closeSvcModal();
}

function changeSvcQty(serviceId, delta){
  const line = cart.find(c=>c.kind==='bespoke' && c.serviceId===serviceId);
  if(!line){
    if(delta>0) openSvcModal(serviceId);
    return;
  }
  changeQty(line.id, delta);
}

function updateStickyCart(){
  const bar = document.getElementById('stickyCart');
  if(!bar) return;
  const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const allCount = cart.reduce((s,c)=>s+c.qty,0);
  document.getElementById('stickyCount').textContent = allCount===1 ? '1 item' : allCount+' items';
  document.getElementById('stickyTotal').textContent = '$'+total.toFixed(2);
  const onBespoke = document.getElementById('page-bespoke')?.classList.contains('active');
  bar.classList.toggle('show', onBespoke && allCount>0);
}