# Decisions log

Short notes on choices that aren't obvious from the code. Newest first.

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

## Open for Phase 2 — reading the ER diagram

- `posts.template_id` is marked nullable, but the relationship line says "exactly one". → We make it **nullable**, because posts made from scratch have no template.
- `posts.conversation_id` and `clips.shot_id` have no relationship line on the diagram. → We add both as **nullable foreign keys**.
- Many tables have no `created_at`. → We add `created_at` (and `updated_at` where rows get edited) everywhere, as the brief asks for timestamptz throughout.
- `text_array` → `text[]`. `float` → `double precision`. `shots.duration_sec` is an int while `clips.duration_sec` is a float. → Both become **double precision**.
- `templates` has no `business_id`. → We add a **nullable** `business_id`: null means a system template that everyone can read, and a value means a custom template that only its owner can see.
- RLS on child tables (`slides`, `shots`, `messages`, …) needs to reach `businesses`. → This is still open (see the Phase 1 report).
