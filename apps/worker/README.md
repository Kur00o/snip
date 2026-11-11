# Snip worker

Python service that does the heavy media work, kept off Vercel. It runs on your laptop or in a free Colab notebook and talks to Supabase with the secret key.

| Job kind          | What it does                                                  | Phase  |
| ----------------- | ------------------------------------------------------------- | ------ |
| `render_carousel` | Playwright (headless Chromium) screenshots slide HTML → 1080×1350 PNG | 5 ✅ |
| `edit_reel`       | FFmpeg (cut, 9:16 reframe, transitions, mix) + librosa (beats) | 8      |
| `transcribe`      | whisper.cpp small model → SRT subtitles                       | 8      |

`publish` jobs are handled by a Supabase Edge Function, not this worker.

## How rendering works

1. The web app saves the slides and queues a `render_carousel` job. The job carries the fully rendered HTML for each slide, built by `@snip/templates`.
2. The worker claims the job with `claim_job`, which uses `FOR UPDATE SKIP LOCKED`. Two workers never get the same job.
3. For each slide, the worker:
   1. opens the HTML in Chromium at 1080×1350
   2. waits for the fonts to load
   3. saves a PNG to `renders/<business_id>/posts/<post_id>/slide-NN-<time>.png`
   4. records the file in `slides.image_path`, and deletes the previous render of that slide (free Storage is only 1 GB)
4. The worker marks the post "Ready to review" and calls `complete_job`. A failed job is retried up to 3 times, then marked failed with the error.

## Run it (Windows, macOS or Linux)

```bash
cd apps/worker
uv sync                              # installs Python deps into .venv
uv run playwright install chromium   # one-time browser download (~150 MB)
```

Create `apps/worker/.env`:

```
SUPABASE_URL=https://vojyxsrlxxrmusrabeem.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...     # Supabase → Project Settings → API Keys → Secret keys
# CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe   # optional: reuse Chrome instead of installing Chromium
```

Then start it. Either command works:

```bash
uv run python -m app.cli                          # poller only (lightest)
uv run uvicorn app.main:app --port 8000           # poller + /health API
```

Leave it running while you use the studio. Check the poller at <http://localhost:8000/health>.

**8 GB laptop tips:** the worker keeps one browser and renders one slide at a time, using about 300 MB. Close it when you're not working on posts.

## Lint, type-check, test

```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest            # the real-render test is skipped if Chromium isn't installed
```
