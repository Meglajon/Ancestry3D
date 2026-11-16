# Shared helpers for recording real Story-mode footage, frame by frame, on a fake clock.
# The game is served from the repo root (python -m http.server 8765) and driven through its own debug hooks.
import pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
STUB = (ROOT / 'tests' / 'three-stub.js').read_text()
S = "window.__A3D.storyState()"
FPS = 30


async def open_story(p, cuts=True, vp=(1280, 720), scale=1.5):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=scale)
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))

    async def route(r):
        url = r.request.url
        if 'cdn.jsdelivr.net/npm/three' in url: await r.fulfill(body=STUB, content_type='application/javascript')
        elif url.startswith('http://127.0.0.1') or 'fonts.googleapis' in url or 'fonts.gstatic' in url: await r.continue_()
        else: await r.abort()   # no OpenStreetMap: the towns are drawn from the game's own street plans
    await page.route('**/*', route)
    await page.clock.install()
    await page.goto('http://127.0.0.1:8765/dev.html')
    await page.wait_for_timeout(900)
    await page.evaluate("document.fonts.ready")
    await page.click('#tabs [data-tab="story"]')
    await page.click('#btnDemo')
    await page.wait_for_selector('#cardSetup:not(.hidden)')
    await page.evaluate("localStorage.clear(); localStorage.setItem('a3d:nocut', %s)" % ("'0'" if cuts else "'1'"))
    await page.click('#btnStory')
    await page.wait_for_selector('#story')
    return b, page, errors


class Rec:
    """Advance the fake clock one frame at a time and save each frame as a JPEG."""
    def __init__(self, page, out, step_ms=1000 / FPS):
        self.page, self.out, self.step, self.n = page, pathlib.Path(out), step_ms, 0
        self.out.mkdir(parents=True, exist_ok=True)

    async def tick(self, frames=1, shoot=True):
        for _ in range(frames):
            await self.page.clock.run_for(round(self.step))
            if shoot:
                await self.page.screenshot(path=str(self.out / f'{self.n:05d}.jpg'), type='jpeg', quality=93)
                self.n += 1

    async def skip(self, ms):
        await self.page.clock.run_for(int(ms))


async def ev(page, js):
    return await page.evaluate(f"(() => {{ const s = {S}; {js} }})()")
