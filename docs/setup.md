# Setup guide

Everything runs on free tiers. You need Node 22+ and pnpm 10 (`corepack enable`). For the worker you need Python 3.11+ and [uv](https://docs.astral.sh/uv/).

## 1. Clone and install

```bash
git clone https://github.com/Kur00o/snip.git
cd snip
pnpm install
cp .env.example apps/web/.env.local   # fill in values as each phase needs them
pnpm dev                              # http://localhost:3000
```

## 2. Checks

```bash
pnpm check        # prettier + eslint + tsc + vitest
pnpm build        # production build of apps/web
```

Worker:

```bash
cd apps/worker
uv sync
uv run ruff check . && uv run mypy app && uv run pytest
uv run uvicorn app.main:app --reload --port 8000
```

## 3. Supabase

The hosted project is named `snip` and lives in the Mumbai region (`ap-south-1`). Migrations live in `supabase/migrations` and Edge Functions live in `supabase/functions`. Use the CLI through npx:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push               # apply migrations
npx supabase functions deploy publish
```

Running the full local Supabase stack needs Docker and is heavy on an 8 GB laptop, so develop against the hosted project instead.

## 4. Vercel (one-time import)

1. Go to <https://vercel.com/new> and import `Kur00o/snip` from GitHub.
2. **Root Directory:** `apps/web`. Leave "Include files outside the root directory" **on**, because the app uses `packages/*`.
3. Framework preset: **Next.js**. Leave the build and install commands at their defaults; Vercel detects pnpm from `pnpm-lock.yaml`.
4. Add the environment variables from `.env.example` (only the web ones) under Settings → Environment Variables.
5. Deploy. From then on, every push to `main` redeploys automatically, and pull requests get preview URLs.

## 5. API keys you will need (later phases)

| Key                    | Where                                  | Phase                  |
| ---------------------- | -------------------------------------- | ---------------------- |
| Gemini API key         | <https://aistudio.google.com/apikey>   | 4                      |
| NVIDIA API key         | <https://build.nvidia.com>             | 4                      |
| Meta app ID and secret | <https://developers.facebook.com/apps> | 6                      |
| Google OAuth client    | Google Cloud Console → APIs & Services | 3 (login), 6 (YouTube) |
