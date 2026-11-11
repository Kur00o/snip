# Decisions log

Short notes on choices that aren't obvious from the code. Newest first.

## Phase 3 — Auth and onboarding (2026-11-12)

- **Auth stays on Supabase**, not Firebase. Supabase already does free Google + email sign-in, the RLS policies expect `auth.uid()`, and Firebase's Google provider never returns the refresh tokens that scheduled YouTube uploads need.
- **`src/proxy.ts`** (Next 16 renamed middleware to proxy) refreshes the session on every request with `getClaims()`. It sends signed-out visitors from app pages to `/login?next=…`, and signed-in visitors from `/login` to `/home`. Pages re-check the session through the data access layer (`lib/auth.ts`), so the proxy is never the only guard.
- **Cache Components.** Anything that reads the session sits behind `<Suspense>`, so the shell (sidebar, headers) is prerendered and the user's data streams in; the build marks these routes ◐. The server Supabase client reads `cookies()` before checking env vars, which lets the build prerender without secrets.
- **Redirects are validated.** `safeNextPath` only accepts same-site relative paths, which blocks open redirects through `?next=`.
- **Email sign-up.** Without custom SMTP, Supabase only sends confirmation emails to project team members. Either turn off "Confirm email" (Authentication → Sign In / Providers → Email) while testing, or add an SMTP provider. The sign-up form handles both cases.
- **Onboarding.** The business row is created when the tone step is saved. Finishing the connect step sets `onboarding_done`. If someone leaves halfway, they come back to where they stopped. The connect step is a placeholder until Phase 6.
- **Brand kit.**
  - **Logos** upload straight from the browser to `brand-assets/<business_id>/logo-<time>.<ext>` through a signed upload URL issued by a Server Action. The previous logo file is then deleted.
  - **Fonts** come from a curated list of Google Fonts. Some also cover Devanagari (Hindi and Marathi).
  - **Text on brand colours** switches between ink and white, whichever gives better contrast.
- **No platform logos.** Instagram, Facebook and YouTube are shown with neutral icons and their names; we don't redraw their logos.
- **Dev previews.** `/dev/home`, `/dev/brand`, `/dev/accounts` and `/dev/onboarding` render the screens with mock data in development only (they return 404 in production). They're used for visual QA without a database session.

## Phase 2 — Database (2026-11-11)

Reading the ER diagram:

- `posts.template_id` is **nullable** (the diagram's line says "exactly one", but posts made from scratch have no template).
- `posts.conversation_id` and `clips.shot_id` are **nullable foreign keys**. The diagram has no line for them.
- Every table gets `created_at`, and rows that get edited also get `updated_at` (kept current by a trigger).
- `text_array` → `text[]`, `float` → `double precision`. `shots.duration_sec` and `clips.duration_sec` are both `double precision`.
- `templates.business_id` is **nullable**: null means a system template everyone can read; a value means the business's own template.

Access control:

- **`business_id` is on every brand-owned table**, children included. RLS is then one check per table: `business_id in (select private.my_business_ids())`. The function runs once per query, not once per row.
- **Composite foreign keys** such as `(post_id, business_id) → posts(id, business_id)` mean a child row can never point at another business's parent. The smoke test checks this.
- **`public.users`** is filled by a trigger on `auth.users`. A trigger on `businesses` creates the one `brand_kits` row each business gets.
- **Server-only writes.** Browsers cannot write these: `social_accounts`, `post_insights`, job status, and any `schedules` status other than `pending`. The OAuth callback, the worker and the Edge Functions write them with the secret key.
- **OAuth tokens are kept in Vault.** `social_accounts.token_secret_id` points at the Vault secret, and that column is not granted to browser roles. `set_social_token`, `get_social_token` and `disconnect_social_account` are executable by `service_role` only.
- **Job queue.** `claim_job(kinds)` uses `FOR UPDATE SKIP LOCKED`, sets `locked_at` and re-claims jobs whose lock is stale (over 15 min old). `complete_job(id, error)` retries up to 3 times, then marks the job `failed`. The browser can queue `render_carousel`, `edit_reel` and `transcribe` jobs; it cannot queue `publish` jobs.
- **Storage.** There are four private buckets: `brand-assets` (10 MB), `clips`, `renders` and `templates`. `clips` and `renders` allow 50 MB per file, the free-tier maximum. Paths start with `<business_id>/`, and policies compare that folder against the caller's businesses. Files under `templates/system/` are readable by any signed-in user. SVG uploads are blocked, because an SVG can carry script.
- **Realtime** is on for `jobs`, `posts`, `slides` and `schedules`, so the studio and calendar update live. RLS still applies to these events.
- **pg_cron and pg_net** are enabled now. The every-minute publish job and the daily insights job are scheduled in Phases 6 and 9, once their Edge Functions exist.
- **`@snip/db`** is a small extra workspace package. It holds the generated `Database` types, Zod enums that mirror the CHECK constraints, and a safe `businessPath()` helper. Web, agent and Edge Functions share it.

## Phase 1 — Setup (2026-11-11)

- **Monorepo with pnpm workspaces** (`apps/web`, `packages/*`). The Python worker sits in `apps/worker` and is managed by `uv`, outside the pnpm workspace. We skipped Turborepo: with three JS packages it adds config without much benefit.
- **Workspace packages ship TypeScript source.** Next.js compiles them through `transpilePackages`, so there is no build step for `@snip/agent` or `@snip/templates`.
- **Fonts are self-hosted with `@fontsource-variable/inter`**, not `next/font/google`. This builds offline and in sandboxes and sends no request to Google at runtime. Satoshi (Fontshare) can replace Inter later by adding the font files under `apps/web/src/fonts`.
- **Teal contrast.** Brand teal `#0F9D8F` reaches only 3.4:1 on white, which fails WCAG AA for body text. So:
  - Labels on teal buttons use ink `#14162B` (5.3:1).
  - Small teal text on light surfaces uses `teal-700 #0A7A6F` (5.2:1).
  - On dark surfaces, teal text uses `teal-300 #2CC3B3` (8.1:1 on ink).
- **Supabase key naming** follows Supabase's current key types: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the browser and `SUPABASE_SECRET_KEY` for the server only.
- **Vercel** is connected by importing the GitHub repo in the Vercel dashboard (root directory `apps/web`). It then deploys on every push to `main`.
