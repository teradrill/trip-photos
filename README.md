# Trip Memories

Small private photo/video album app.

## Setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill values from Supabase.
4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Create a **private** Storage bucket named `trip-media`.
6. Configure Google OAuth in Supabase Authentication → Providers → Google. Add the Supabase callback URL shown on that page to your Google OAuth client's authorized redirect URIs.
7. In Supabase Authentication → URL Configuration, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
8. Run `npm run dev`.

## Deploy
Push to GitHub, import the repository in Vercel, add every `.env.example` variable in Vercel Project Settings → Environment Variables, then deploy. Update Supabase Site URL and Redirect URLs to your Vercel domain.

## Security notes
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.
- This starter uses private storage and creates short-lived signed URLs only after server-side permission checks.
- Upload route is capped at 4 MB because Vercel serverless request bodies have platform limits. For larger videos, switch to direct/resumable Supabase Storage uploads with matching storage RLS policies.
- ZIP downloads are capped at 100 MB total per request.
- Test with separate accounts before sharing the site.
