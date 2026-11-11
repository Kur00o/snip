# Snip worker

Python FastAPI service that does the heavy media work, kept off Vercel. Runs on your laptop or a free Colab.

| Job kind          | Tools                                         | Phase |
| ----------------- | --------------------------------------------- | ----- |
| `render_carousel` | Playwright (headless Chromium) → 1080×1350 PNG | 5     |
| `edit_reel`       | FFmpeg (cut, 9:16 reframe, transitions, mix), librosa (beats) | 8 |
| `transcribe`      | whisper.cpp small model → SRT subtitles        | 8     |

`publish` jobs are handled by a Supabase Edge Function, not this worker.

## Run locally

```bash
cd apps/worker
uv sync                      # installs deps into .venv
cp ../../.env.example .env   # fill in SUPABASE_URL and SUPABASE_SECRET_KEY
uv run uvicorn app.main:app --reload --port 8000
```

Check: <http://localhost:8000/health>

## Lint, type-check, test

```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest
```

Memory note (8 GB laptop): run one job at a time, and use the whisper.cpp `small` model.
