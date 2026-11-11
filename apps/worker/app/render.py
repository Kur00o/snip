"""Headless Chromium (Playwright) that turns slide HTML into 1080x1350 PNGs."""

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from playwright.async_api import Browser, Playwright

WIDTH = 1080
HEIGHT = 1350


class SlideRenderer(Protocol):
    async def render(self, html: str) -> bytes: ...


class PlaywrightRenderer:
    """One browser for the worker's lifetime; one fresh page per slide (low memory)."""

    def __init__(self, executable_path: str | None = None) -> None:
        # Optional: reuse an installed Chrome/Chromium instead of `playwright install`.
        self.executable_path = executable_path or None
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None

    async def start(self) -> None:
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            executable_path=self.executable_path,
            args=["--disable-dev-shm-usage", "--font-render-hinting=none"],
        )

    async def stop(self) -> None:
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()
        self._browser = None
        self._playwright = None

    async def render(self, html: str) -> bytes:
        if self._browser is None:
            await self.start()
        assert self._browser is not None
        page = await self._browser.new_page(
            viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=1
        )
        try:
            # Slides are self-contained; the only network use is Google Fonts and the logo.
            await page.set_content(html, wait_until="networkidle", timeout=30_000)
            await page.evaluate("document.fonts.ready")
            return await page.screenshot(
                type="png", clip={"x": 0, "y": 0, "width": WIDTH, "height": HEIGHT}
            )
        finally:
            await page.close()
