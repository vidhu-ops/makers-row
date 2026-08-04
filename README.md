# Makers' Row

Design marketplace with live editor, bespoke commissions, and seller listings.

## Run locally

```powershell
cd makers-row
py -m http.server 8765
```

Open http://localhost:8765

## Deploy

Static site — deploy the repo root to Vercel (or any static host). No build step required.

The marketplace UI can run as a static site. The Canva connection uses the included serverless `/api/canva` functions, so deploy the repo to Vercel (or run it with `vercel dev`) for OAuth, asset uploads, and Autofill generation.

### Canva setup

1. Copy `.env.example` to a local environment file or add the variables in Vercel.
2. Set `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI`, and `CANVA_BRAND_TEMPLATE_ID`.
3. For the designer CRM, run `supabase/schema.sql` in the Supabase SQL Editor and set the Supabase variables from `.env.example`.
3. Configure the same redirect URI in the Canva integration settings.
4. Use an Autofill-enabled Canva Brand Template whose field names match `CANVA_AUTOFILL_FIELDS_JSON`.

Never put the Canva client secret in `index.html`, commit it, or share it publicly.

## Dev workflow

Bespoke page fragments live in `_parts/`. Merge them into `index.html` with:

```powershell
py _parts/patch.py
```
