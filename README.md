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

The marketplace UI runs as a static site with a small Supabase-backed serverless API for accounts, orders, client projects, messages, and deliverable files. It is designed to stay within Vercel Hobby's serverless function limit.

## Payments and email

Cashfree checkout is handled by `api/commerce.js`. Add the Cashfree sandbox or production credentials, `APP_URL`, `RESEND_API_KEY`, and a verified `RESEND_FROM_EMAIL` in Vercel Environment Variables. Cashfree webhook URL:

```text
https://your-domain.vercel.app/api/commerce?action=webhook
```

The Cashfree dashboard should use the same webhook URL and `2025-01-01` webhook version. Resend requires a verified sending domain for a custom `from` address. Run `supabase/schema.sql` before using the order and project APIs.

Manual UPI / bank transfer checkout is also available. Configure `ADMIN_EMAIL`, `UPI_ID` and/or `UPI_QR_IMAGE_URL`, and the bank fields from `.env.example`. Customers submit their UTR after paying; the signed-in admin confirms the matching payment from Creator Studio → Client CRM. Run the updated `supabase/schema.sql` before using this flow. Manual UPI payments cannot be automatically verified by the browser, so orders remain pending until admin approval.

Account signup and login use Supabase Auth through `api/auth.js`. The public `accounts` table stores profile data (email, name, and role); passwords are handled by Supabase Auth and are not stored in the app or browser local storage.

## Dev workflow

Bespoke page fragments live in `_parts/`. Merge them into `index.html` with:

```powershell
py _parts/patch.py
```
