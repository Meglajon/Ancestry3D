# Headless test of Story mode: opens the game with the demo family, starts the story, plays through the
# first mission with real key presses where it can and the debug hooks where it cannot, visits another
# town and another century, and takes screenshots on desktop and phone sizes.
#   python3 -m http.server 8765 &      (from the repo root)
#   python3 tests/story-smoke.py
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('SHOTS', '/tmp/story-shots')); OUT.mkdir(parents=True, exist_ok=True)
PAGE = os.environ.get('PAGE', 'dev.html')
STUB = (ROOT / 'tests' / 'three-stub.js').read_text()
ONLY = os.environ.get('ONLY')

async def open_story(b, name, vp, mobile):
    ctx = await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    page = await ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))
    async def route(r):
        url = r.request.url
        if 'cdn.jsdelivr.net/npm/three' in url: await r.fulfill(body=STUB, content_type='application/javascript')
        elif url.startswith('file://') or url.startswith('http://localhost'): await r.continue_()
        else: await r.abort()
    await page.route('**/*', route)
    await page.goto((ROOT / PAGE).as_uri() if PAGE.startswith('index') else 'http://localhost:8765/' + PAGE)
    await page.wait_for_timeout(800)
    await page.click('#tabs [data-tab="story"]')
    await page.click('#btnDemo')
    await page.wait_for_selector('#cardSetup:not(.hidden)')
    await page.evaluate("localStorage.clear()")
    await page.screenshot(path=str(OUT / f'{name}-0-menu.png'))
    await page.click('#btnStory')
    await page.wait_for_selector('#story')
    await page.wait_for_timeout(700)
    return ctx, page, errors

S = "window.__A3D.storyState()"
async def talk_through(page, limit=40):
    for _ in range(limit):
        if not await page.evaluate(f"{S}.ui.dialogOpen"): break
        n = await page.evaluate("document.querySelectorAll('#stOpts button').length")
        if n:
            await page.evaluate(f"(() => {{ const s = {S}; const q = s.step && s.step.step.quiz; document.querySelectorAll('#stOpts button')[q ? q.answer : 0].click(); }})()")
        else:
            await page.keyboard.press('e'); await page.wait_for_timeout(60); await page.keyboard.press('e')
        await page.wait_for_timeout(140)

async def run(b, name, vp, mobile):
    ctx, page, errors = await open_story(b, name, vp, mobile)
    shot = lambda tag: page.screenshot(path=str(OUT / f'{name}-{tag}.png'))
    info = await page.evaluate(f"(() => {{ const s = {S}; return {{ missions: s.story.missions.length, chapters: s.story.chapters.length, town: s.city.town.name, year: s.city.year, W: s.city.W, H: s.city.H, b: s.city.buildings.length }}; }})()")
    print(name, info)
    await shot('1-letter')
    await talk_through(page)
    await page.wait_for_timeout(500)
    await shot('2-street')
    # walk a little with the keyboard
    if not mobile:
        await page.keyboard.down('d'); await page.wait_for_timeout(600); await page.keyboard.up('d')
    # then let the debug hooks finish each step of the first mission
    for i in range(12):
        st = await page.evaluate(f"(() => {{ const s = {S}; return s.mission ? s.step && s.step.step.t : null; }})()")
        if st is None: break
        await page.evaluate(f"{S}.debug.warp()")
        await page.wait_for_timeout(500)
        await talk_through(page)
        if st == 'chase':
            await shot('3-chase')
            await page.evaluate(f"{S}.debug.finishStep()")
        await page.wait_for_timeout(1500)
        await talk_through(page)
    await page.wait_for_timeout(600)
    st = await page.evaluate(f"(() => {{ const s = {S}; return {{ idx: s.save.idx, cash: s.save.cash, proofs: s.save.proofs.length }}; }})()")
    print(name, 'after mission 1', st)
    assert st['idx'] >= 1 and st['proofs'] >= 1, st
    await shot('4-passed')
    # get in the Heirloom and drive
    await page.evaluate(f"{S}.debug.intoHeirloom()")
    if not mobile:
        await page.keyboard.down('w'); await page.wait_for_timeout(1800); await shot('5-driving'); await page.keyboard.up('w')
    # play every remaining mission through the debug hooks, taking a picture in each new town and year
    seen = set()
    for n in range(80):
        s = await page.evaluate(f"(() => {{ const s = {S}; const m = s.story.missions[s.save.idx]; return m ? {{ id: m.id, town: m.town, year: m.year, here: s.city.town.id === m.town && s.city.year === m.year, active: !!s.mission, busy: s.busy, step: s.step ? s.step.step.t : null }} : null; }})()")
        if s is None: break
        if not s['active'] and not s['busy']:
            if not s['here']:
                await page.evaluate(f"{S}.debug.go('{s['town']}', {s['year']})")
                await page.wait_for_timeout(1300)
                key = f"{s['town']}-{s['year']}"
                if key not in seen and len(seen) < 9: seen.add(key); await page.wait_for_timeout(700); await shot(f'6-{len(seen)}-{key}')
                continue
            await page.evaluate(f"{S}.debug.startNext()")
            await page.wait_for_timeout(300)
        await talk_through(page)
        if s['step'] in ('collect', 'carry', 'race') and s['id'] not in seen and len(seen) < 14: seen.add(s['id']); await page.wait_for_timeout(300); await shot(f"7-{s['id']}-{s['step']}")
        await page.evaluate(f"(() => {{ const s = {S}; if (s.mission && !s.busy) {{ s.debug.warp(); }} }})()")
        await page.wait_for_timeout(350)
        await talk_through(page)
        await page.evaluate(f"(() => {{ const s = {S}; if (s.mission && !s.busy && s.step && !s.step.done) s.debug.finishStep(); }})()")
        await page.wait_for_timeout(450)
        await talk_through(page)
    end = await page.evaluate(f"(() => {{ const s = {S}; return {{ idx: s.save.idx, of: s.story.missions.length, cash: s.save.cash, proofs: s.save.proofs.length, ofProofs: s.story.proofs.length }}; }})()")
    print(name, 'end', end)
    await page.wait_for_timeout(800)
    await shot('8-end')
    # panels
    await page.evaluate(f"{S}.ui.input.queue.push('pedigree')"); await page.wait_for_timeout(300); await shot('9-pedigree')
    await page.evaluate(f"{S}.ui.input.queue.push('pedigree')"); await page.wait_for_timeout(200)
    await page.evaluate(f"{S}.ui.input.queue.push('dial')"); await page.wait_for_timeout(300); await shot('9-dial')
    await page.evaluate(f"{S}.ui.input.queue.push('dial')"); await page.wait_for_timeout(200)
    assert end['idx'] == end['of'], end
    for e in errors: print('  ', name, e)
    await ctx.close()
    return errors

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        errs = []
        runs = [('desktop', {'width': 1280, 'height': 720}, False), ('phone', {'width': 844, 'height': 390}, True)]
        for name, vp, mobile in runs:
            if ONLY and name != ONLY: continue
            errs += await run(b, name, vp, mobile)
        await b.close()
        print('errors:', len(errs))
        sys.exit(1 if errs else 0)
asyncio.run(main())
