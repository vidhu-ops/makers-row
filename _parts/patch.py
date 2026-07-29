from pathlib import Path

root = Path(__file__).resolve().parents[1]
parts = root / "_parts"
text = (root / "index.html").read_text(encoding="utf-8")
css = (parts / "bespoke.css").read_text(encoding="utf-8")
html = (parts / "bespoke.html").read_text(encoding="utf-8")
js = (parts / "bespoke.js").read_text(encoding="utf-8")

# --- CSS ---
css_start = text.index("  /* ---------- BESPOKE ---------- */")
css_end = text.index("  /* ---------- SELL ---------- */")
text = text[:css_start] + css.rstrip() + "\n\n" + text[css_end:]

# --- HTML ---
h0 = text.index("<!-- ============ BESPOKE ============ -->")
h1 = text.index("<!-- ============ SELL ============ -->")
text = text[:h0] + html.rstrip() + "\n\n" + text[h1:]

# --- showPage ---
old_show = """function showPage(id){
  document.querySelectorAll('section.page').forEach(s=>s.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
  const btn = document.querySelector('nav.tabs button[data-page=\"'+id+'\"]');
  if(btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'instant' in window ? 'instant':'auto'});
  if(id==='editor' && fabricCanvas){ setTimeout(()=>fabricCanvas.renderAll(),50); }
}"""
new_show = """function showPage(id){
  document.querySelectorAll('section.page').forEach(s=>s.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
  const btn = document.querySelector('nav.tabs button[data-page=\"'+id+'\"]');
  if(btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'instant' in window ? 'instant':'auto'});
  if(id==='editor' && fabricCanvas){ setTimeout(()=>fabricCanvas.renderAll(),50); }
  if(id==='bespoke'){ renderServices(); }
  updateStickyCart();
}"""
if old_show not in text:
    raise SystemExit("showPage not found")
text = text.replace(old_show, new_show)

# --- addToCart ---
old_add = """function addToCart(entry){
  const existing = cart.find(c=>c.kind==='product' && c.title===entry.title && c.kind!=='bespoke');
  if(existing && entry.kind==='product'){ existing.qty += 1; }
  else { cart.push(entry); }
  renderCart();
}"""
new_add = """function addToCart(entry){
  if(entry.kind==='product'){
    const existing = cart.find(c=>c.kind==='product' && c.title===entry.title);
    if(existing){ existing.qty += 1; }
    else { cart.push(entry); }
  } else if(entry.kind==='bespoke' && entry.serviceId){
    const existing = cart.find(c=>c.kind==='bespoke' && c.serviceId===entry.serviceId);
    if(existing){ existing.qty += (entry.qty||1); }
    else { cart.push(entry); }
  } else {
    cart.push(entry);
  }
  renderCart();
}"""
if old_add not in text:
    raise SystemExit("addToCart not found")
text = text.replace(old_add, new_add)

# --- qty controls for bespoke ---
old_qty = """      <div class=\"qty-ctrl\">
        ${line.kind==='bespoke' ? '' : `<button onclick=\"changeQty('${line.id}',-1)\">−</button><span class=\"mono\">${line.qty}</span><button onclick=\"changeQty('${line.id}',1)\">+</button>`}
      </div>"""
new_qty = """      <div class=\"qty-ctrl\">
        <button onclick=\"changeQty('${line.id}',-1)\">−</button><span class=\"mono\">${line.qty}</span><button onclick=\"changeQty('${line.id}',1)\">+</button>
      </div>"""
if old_qty not in text:
    raise SystemExit("qty line not found")
text = text.replace(old_qty, new_qty)

# --- renderCart hook ---
old_tot = "document.getElementById('receiptTotal').textContent = '$'+total.toFixed(2);\n}"
new_tot = "document.getElementById('receiptTotal').textContent = '$'+total.toFixed(2);\n  updateStickyCart();\n  if(document.getElementById('page-bespoke').classList.contains('active')) renderServices();\n}"
if old_tot not in text:
    raise SystemExit("receipt total not found")
text = text.replace(old_tot, new_tot, 1)

# --- replace bespoke JS ---
js_start = text.index("/* ============================================================\n   BESPOKE\n============================================================ */")
js_end = text.index("/* ============================================================\n   SELL\n============================================================ */")
text = text[:js_start] + js.rstrip() + "\n\n" + text[js_end:]

# --- init ---
old_init = """document.addEventListener('DOMContentLoaded', ()=>{
  renderMarket();
  renderCart();
  initEditor();
  updateSellPreview();
});"""
new_init = """document.addEventListener('DOMContentLoaded', ()=>{
  renderMarket();
  renderCart();
  initEditor();
  updateSellPreview();
  renderServices();
  updateStickyCart();
});"""
if old_init not in text:
    raise SystemExit("init not found")
text = text.replace(old_init, new_init)

# cleanup unused
text = text.replace("let bespokeFileCount = 0;\n", "")

(root / "index.html").write_text(text, encoding="utf-8")
print("PATCHED", len(text))