# Headless smoke test: loads the page, plays the demo in the shooter look (with the minigun) and the
# island look (with couples together), on desktop and phone sizes, and takes screenshots.
#   python3 tests/smoke.py            (serve the folder on :8765 first for dev.html)
#   PAGE=index.html python3 tests/smoke.py   (built single file, opened from disk)
import asyncio, os, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = pathlib.Path(os.environ.get('THREE_DIR', '/home/claude/vendor/three'))
OUT = pathlib.Path(os.environ.get('SHOTS', '/tmp/claude-0/shots')); OUT.mkdir(parents=True, exist_ok=True)
PAGE = os.environ.get('PAGE', 'dev.html')

async def run(b, name, vp, mobile, style, couples):
    ctx = await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    page = await ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))
    async def route(r):
        url = r.request.url
        if 'cdn.jsdelivr.net/npm/three@0.160.0/' in url:
            await r.fulfill(path=str(VENDOR / url.split('three@0.160.0/')[1]), content_type='application/javascript')
        elif url.startswith('file://') or url.startswith('http://localhost'):
            await r.continue_()
        else:
            await r.abort()
    await page.route('**/*', route)
    await page.goto((ROOT / PAGE).as_uri() if PAGE.startswith('index') else 'http://localhost:8765/' + PAGE)
    await page.wait_for_timeout(1200)
    await page.click(f'#styleSeg [data-style="{style}"]')
    await page.wait_for_timeout(1500)
    tag = f'{name}-{style}'
    await page.screenshot(path=str(OUT / f'{tag}-0-title.png'))
    await page.click('#btnDemo')
    await page.wait_for_selector('#cardSetup:not(.hidden)')
    if couples:
        await page.click('label.toggle')
    await page.screenshot(path=str(OUT / f'{tag}-1-setup.png'))
    await page.click('#btnStart')
    await page.wait_for_timeout(2500)
    await page.screenshot(path=str(OUT / f'{tag}-2-spawn.png'))
    # walk up to a gen-3 ancestor
    await page.evaluate("""() => { const A = window.__A3D; const p = [...A.S.tree.people.values()].find(p => p.gen === 3);
      const ang = Math.atan2(p.z, p.x); const r = p.radius - 2.2;
      A.S.pos.set(Math.cos(ang)*r + 0.3, 0, Math.sin(ang)*r); A.S.yaw = Math.atan2(-(p.x-A.S.pos.x), -(p.z-A.S.pos.z)); A.S.pitch = 0; window.__p = p; }""")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=str(OUT / f'{tag}-3-npc.png'))
    if style == 'platform':
        # jump onto an ancestor's head and collect a coin
        await page.evaluate("""() => { const A = window.__A3D; const p = window.__p; A.S.pos.set(p.x, 0, p.z); A.S.posY = 3.5; A.S.vy = 0; A.S.onGround = false;
          const c = A.S.world.coins.find(c => !c.taken); window.__coin = c; }""")
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(OUT / f'{tag}-4-bounce.png'))
        await page.evaluate("() => { const A = window.__A3D; const c = window.__coin; A.S.pos.set(c.x, 0, c.z); A.S.posY = Math.max(0, c.y - 1); A.S.vy = 0; }")
        await page.wait_for_timeout(300)
        print(tag, 'coins:', await page.evaluate("() => window.__A3D.S.coins"), '| msgs:', (await page.inner_text('#msgs')).replace('\n', ' / ')[:200])
        await page.evaluate("() => { const A = window.__A3D; A.S.pos.set(window.__p.x + 2.5, 0, window.__p.z); A.S.posY = 0; A.S.yaw = Math.atan2(-(window.__p.x - A.S.pos.x), -(window.__p.z - A.S.pos.z)); }")
    if style in ('retro', 'blocks'):
        await page.evaluate("() => { window.__A3D.S.firing = true; }")
        await page.wait_for_timeout(1200 if style != 'blocks' else 300)
        await page.screenshot(path=str(OUT / f'{tag}-4-fire.png'))
        await page.evaluate("() => { window.__A3D.S.firing = false; }")
        print(tag, 'ammo after burst:', await page.inner_text('#sAmmo'), '| msgs:', (await page.inner_text('#msgs')).replace('\n', ' / ')[:160])
    await page.evaluate("() => { const A = window.__A3D; A.openDialog(A.S.world.byId.get(window.__p.id)); }")
    await page.wait_for_timeout(2200)
    await page.screenshot(path=str(OUT / f'{tag}-5-talk.png'))
    for _ in range(14):
        await page.evaluate("() => { const d = document.querySelector('#dialog'); if (!d.classList.contains('hidden')) { d.click(); d.click(); } }")
        await page.wait_for_timeout(40)
    await page.evaluate("() => { const A = window.__A3D; A.S.pos.set(0, 0, 9); A.S.yaw = 0; A.S.pitch = -0.1; }")
    await page.wait_for_timeout(1200)
    await page.screenshot(path=str(OUT / f'{tag}-6-vista.png'))
    await page.evaluate("() => window.__A3D.openMap()")
    await page.wait_for_timeout(400)
    await page.screenshot(path=str(OUT / f'{tag}-7-map.png'))
    await page.evaluate("() => window.__A3D.closeMap()")
    info = await page.evaluate("""() => { const A = window.__A3D; const ppl = [...A.S.tree.people.values()];
      return { npcs: A.S.world.npcs.length, people: ppl.length, rootIsNpc: A.S.world.byId.has(A.S.tree.rootId),
               couplesSideBySide: ppl.filter(p => p.spouseInUnit).length / 2, avatar: !!A.S.avatar, gun: !!A.S.gun }; }""")
    fps = await page.evaluate("""() => new Promise(res => { let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else res(n/2); }; requestAnimationFrame(f); })""")
    print(tag, info, 'fps(swiftshader)', fps)
    print(tag, 'errors:', errors[:10])
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for name, vp, mobile in [('desktop', {'width': 1280, 'height': 720}, False), ('mobile', {'width': 412, 'height': 860}, True)]:
            for style, couples in [('retro', False), ('platform', True), ('blocks', False), ('island', True)]:
                await run(b, name, vp, mobile, style, couples)
        await b.close()
asyncio.run(main())
