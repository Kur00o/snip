"""Real Playwright render. Skipped when Chromium isn't installed.

Install it with `uv run playwright install chromium`.
"""

import asyncio
import os
import struct

import pytest

from app.render import HEIGHT, WIDTH, PlaywrightRenderer

SLIDE = """<!doctype html><html><head><style>
html,body{margin:0;width:1080px;height:1350px}
body{background:#0F9D8F;color:#14162B;font:800 120px sans-serif}
</style></head><body><p style="padding:96px">Monsoon menu</p></body></html>"""


def png_size(data: bytes) -> tuple[int, int]:
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", data[16:24])


def test_renders_a_1080_by_1350_png():
    async def go() -> bytes:
        renderer = PlaywrightRenderer(os.environ.get("CHROMIUM_PATH"))
        try:
            await renderer.start()
        except Exception as error:  # browser binaries missing in this environment
            pytest.skip(f"Chromium not available: {error}")
        try:
            return await renderer.render(SLIDE)
        finally:
            await renderer.stop()

    image = asyncio.run(go())
    assert png_size(image) == (WIDTH, HEIGHT)
    assert len(image) > 2_000
