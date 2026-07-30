# Makers' Row

Design marketplace with live editor, bespoke commissions, and seller listings.

**Repository:** https://github.com/vidhu-ops/makers-row

## Run locally

```powershell
cd makers-row
py -m http.server 8765
```

Open http://localhost:8765

## Deploy

Static site — deploy the repo root to Vercel (or any static host). No build step required.

## Dev workflow

Bespoke page fragments live in `_parts/`. Merge them into `index.html` with:

```powershell
py _parts/patch.py
```
