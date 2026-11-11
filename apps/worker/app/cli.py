"""Run only the job poller (no HTTP server): `uv run python -m app.cli`."""

import asyncio
import contextlib
import logging
import signal

from app.config import get_settings
from app.poller import Poller
from app.render import PlaywrightRenderer
from app.supabase import SupabaseClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def run() -> None:
    settings = get_settings()
    if not settings.is_configured:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/worker/.env first.")
    db = SupabaseClient(settings.supabase_url, settings.supabase_secret_key.get_secret_value())
    renderer = PlaywrightRenderer(settings.chromium_path)
    poller = Poller(db, renderer, settings.job_kinds, settings.poll_interval_sec)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):  # Windows has no signal handlers
            loop.add_signal_handler(sig, poller.stop)
    try:
        await poller.run_forever()
    finally:
        await renderer.stop()
        await db.close()


def main() -> None:
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(run())


if __name__ == "__main__":
    main()
