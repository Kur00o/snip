# Snip

**Your whole social media team, in one chat.** Snip is an AI agent for small businesses and creators (think a café in Pune) who aren't developers. It:

- designs Instagram carousels from scratch or from templates, in your brand's colours and fonts
- writes captions and hashtags in your voice
- coaches you to film real footage for Reels, then auto-edits it: best takes, 9:16, subtitles, beat-synced royalty-free music
- lets you fine-tune by chatting or on a timeline
- schedules and publishes to Instagram, Facebook and YouTube, and tells you weekly what worked

Student project. The entire stack runs at **₹0** on free tiers and open-source tools.

## Status

| Phase | Scope                                                                        | Status |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 1     | Setup: repo, Supabase, Vercel, monorepo scaffold                             | ✅     |
| 2     | Database: migrations, RLS, Storage, Vault, seed templates                    | ✅     |
| 3     | Auth and onboarding, brand kit, setup checklist                              | ✅     |
| 4     | Agent core: LLM router, orchestrator, streaming chat home                    | ✅     |
| 5     | Carousels: tools, HTML templates, Playwright worker, studio                  | ✅     |
| 6     | Scheduling and publishing: Meta + YouTube OAuth, calendar, Edge Function     |        |
| 7     | Landing page                                                                 |        |
| 8     | Reels: script & shot list, upload, FFmpeg/whisper/librosa, Remotion timeline |        |
| 9     | Insights                                                                     |        |
| 10    | Polish, tests, demo                                                          |        |

## Stack

Next.js (App Router, TypeScript, Tailwind) on Vercel · Supabase (Auth, Postgres + RLS, Storage, Vault, pg_cron, Edge Functions) · TypeScript agent with an OpenAI-compatible LLM router (Gemini, NVIDIA API Catalogue, optional Ollama) · Python FastAPI worker (Playwright, FFmpeg, whisper.cpp, librosa) · Remotion timeline.

## Repo layout

```
apps/web            Next.js dashboard and landing page
apps/worker         Python FastAPI render worker (uv)
packages/agent      Orchestrator, tools and LLM router
packages/templates  HTML carousel templates with editable slots
packages/db         Supabase types, status enums, storage path helpers
supabase/           migrations, Edge Functions, SQL tests, CLI config
docs/               architecture, setup guide, decisions
```

## Quick start

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

Full instructions: [docs/setup.md](docs/setup.md) · Architecture: [docs/architecture.md](docs/architecture.md) · Decisions: [docs/decisions.md](docs/decisions.md)

## Rules we keep

- Every LLM call goes through `@snip/agent`'s router. UI code never calls a model provider directly.
- Every agent tool's input and output is validated with Zod (TS) or Pydantic (Python).
- RLS is on for every table. Secrets live only in env vars and Supabase Vault. OAuth tokens never reach the browser.
- The UI is mobile-responsive, keyboard accessible and meets WCAG AA contrast.
