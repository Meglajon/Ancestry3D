# A test driver plays the demo story for real: it steers the Heirloom along the roads, stops to load,
# rams what needs ramming and runs after runners, through the same controls a person has. It reports, for
# every mission, how long it took, how much of each clock was left, and what went wrong.
#   python3 -m http.server 8765 &      (from the repo root)
#   python3 tests/story-bot.py [mission-id ...]
# It does not tell you whether a mission is fun. It tells you whether it is fair, and how long nothing happens.
import asyncio, json, os, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
STUB = (ROOT / 'tests' / 'three-stub.js').read_text()
S = "window.__A3D.storyState()"
SPEED = int(os.environ.get('SPEED', '5'))
TRIES = int(os.environ.get('TRIES', '2'))
ONLY = sys.argv[1:]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        page = await (await b.new_context(viewport={'width': 960, 'height': 540})).new_page()
        errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        page.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))
        async def route(r):
            url = r.request.url
            if 'cdn.jsdelivr.net/npm/three' in url: await r.fulfill(body=STUB, content_type='application/javascript')
            elif url.startswith('http://localhost'): await r.continue_()
            else: await r.abort()
        await page.route('**/*', route)
        await page.goto('http://localhost:8765/dev.html'); await page.wait_for_timeout(800)
        await page.click('#tabs [data-tab="story"]'); await page.click('#btnDemo'); await page.wait_for_selector('#cardSetup:not(.hidden)')
        await page.evaluate("localStorage.clear(); localStorage.setItem('a3d:nocut', '1')"); await page.click('#btnStory'); await page.wait_for_selector('#story'); await page.wait_for_timeout(600)
        ev = lambda js: page.evaluate(f"(() => {{ const s = {S}; {js} }})()")
        async def talk():
            for _ in range(60):
                if not await ev("return s.ui.dialogOpen"): return
                if await page.evaluate("document.querySelectorAll('#stOpts button').length"):
                    await ev("const q = s.step && s.step.step.quiz; document.querySelectorAll('#stOpts button')[q ? q.answer : 0].click();")
                else:
                    await ev("s.ui._advance && s.ui._advance('action'); s.ui._advance && s.ui._advance('action');")
                await page.wait_for_timeout(40)
        await talk()
        missions = await ev("return s.story.missions.map(m => ({ id: m.id, title: m.title, town: m.town, year: m.year, steps: m.steps.map(x => x.t) })).concat(s.story.favours.map(m => ({ id: m.id, title: m.title + ' (favour)', town: m.town, year: m.year, fav: true, steps: m.steps.map(x => x.t) })))")
        past = next(m for m in missions if m['year'] < 1990 and m['year'] > 1900)
        missions += [{ 'id': 'side-' + k, 'title': t, 'town': past['town'], 'year': past['year'], 'fav': True, 'side': k, 'steps': [] } for k, t in (('cup', 'The Heirloom Cup (side)'), ('frenzy', 'Smash-Up (side)'))]
        rows = []
        for m in missions:
            if ONLY and m['id'] not in ONLY and not any(o in m['id'] for o in ONLY): continue
            fails = []
            for attempt in range(TRIES):
                await ev(f"s.debug.bot(false); if (s.ui._cancelSay) s.ui._cancelSay(); s.busy = false; s.mission = null; s.step = null; s.retry = null; s.heat = 0; s.tele = []; s.save.cash = 900; s.player.hearts = 3; s.save.idx = {'s.story.missions.length' if m.get('fav') else 's.story.missions.findIndex(x => x.id === ' + json.dumps(m['id']) + ')'}; s.save.favours = []; s.debug.go({json.dumps(m['town'])}, {m['year']}); s.clock = 12; s.rain = 0; s.rainT = 0; s.rainRoll = 3;")
                await page.wait_for_timeout(300)
                if m.get('side'): await ev(f"s.debug.intoHeirloom(); s.debug.startSide({json.dumps(m['side'])});")
                elif m.get('fav'): await ev(f"const f = s.story.favours.find(x => x.id === {json.dumps(m['id'])}); s.debug.startFav(f);")
                else: await ev("s.debug.startNext();")
                await page.wait_for_timeout(200); await talk()
                await ev(f"s.debug.bot(true, {SPEED});")
                t0 = await ev("return s.t")
                state = 'timeout'
                for tick in range(1500):
                    await page.wait_for_timeout(120)
                    await talk()
                    st = await ev("return { m: !!s.mission, busy: s.busy, step: s.step ? s.step.step.t : null, t: s.t, tele: s.tele.length, fail: s.tele.filter(x => x.fail).map(x => x.fail).pop() || null, dlg: s.ui.dialogOpen }")
                    if os.environ.get('TRACE') and tick % 4 == 0: print('   ', await ev("const T = 32, st = s.step, pp = s.player.vehicle || s.player, f = o => o ? [Math.round(o.x / T), Math.round(o.y / T)] : null; return JSON.stringify({ t: +s.t.toFixed(0), yr: s.city.year, hp: st && st.target && st.target.hp, step: st && st.step.t, me: f(pp), veh: !!s.player.vehicle, sp: Math.round(Math.hypot(pp.vx || 0, pp.vy || 0) / T), loaded: st && st.loaded, timer: st && st.timer && +st.timer.toFixed(0), rival: st && f(st.rival), heat: +s.heat.toFixed(1), sus: st && st.sus != null ? +st.sus.toFixed(2) : undefined, lost: st && st.lost != null ? +st.lost.toFixed(1) : undefined, tgt: st && f(st.target || st.convoy), cvhp: st && st.convoy ? st.convoy.hp : undefined, hunters: s.vehicles.filter(v => v.ai === 'hunt').map(v => [Math.round(v.x / T), Math.round(v.y / T), v.hp]), cops: s.vehicles.filter(v => v.ai === 'cop').length + s.peds.filter(q => q.cop).length, goal: st && f(s.debug.target()) })"))
                    if os.environ.get('SHOTS') and tick % int(os.environ['SHOTS']) == 3: await page.screenshot(path=f"/tmp/diag/bot-{m['id']}-{tick:03}.png")
                    if st['step'] == 'travel': await ev("s.debug.finishStep();")
                    if st['fail']: state = 'FAIL: ' + st['fail']; break
                    if not st['m'] and not st['busy'] and not st['dlg']: state = 'ok'; break
                    if st['t'] - t0 > 420: break
                if state == 'timeout': print('   stuck:', await ev("const st = s.step, pp = s.player.vehicle || s.player, T = 32; return JSON.stringify({ busy: s.busy, dlg: s.ui.dialogOpen, panel: s.ui.panelOpen, transit: !!s.transit, step: st && st.step.t, timer: st && st.timer, k: st && st.k, n: st && st.n, me: [Math.round(pp.x / T), Math.round(pp.y / T)], veh: !!s.player.vehicle, walk: s.bot && s.bot.walk, items: s.items.filter(i => i.step).map(i => [Math.round(i.x / T), Math.round(i.y / T), s.city.at(Math.floor(i.x / T), Math.floor(i.y / T))]), t: s.t })"))
                tele = await ev("return s.tele")
                dur = (await ev("return s.t")) - t0
                if state == 'ok': break
                fails.append(state + ' @' + '/'.join(str(x.get('t')) for x in tele[-1:]))
            await ev("s.debug.bot(false);")
            timed = [x for x in tele if x.get('timer0') and x.get('left') is not None and not x.get('fail')]
            margin = min([x['left'] / x['timer0'] for x in timed], default=None)
            row = { 'id': m['id'], 'title': m['title'], 'year': m['year'], 'state': state, 'secs': round(dur), 'steps': ' '.join(f"{x['t'][:4]}{round(x['dur'])}" + (f"({round(100 * x['left'] / x['timer0'])}%)" if x.get('timer0') and x.get('left') is not None else '') for x in tele if not x.get('fail')),
                    'margin': None if margin is None else round(100 * margin), 'bumps': sum(x.get('bumps', 0) for x in tele), 'walls': sum(x.get('walls', 0) for x in tele), 'rams': sum(x.get('rams', 0) for x in tele), 'unstick': sum(x.get('unstick', 0) for x in tele), 'fails': fails }
            rows.append(row)
            if m.get('side') == 'frenzy': row['steps'] += f" score={[x.get('k') for x in tele]}"
            for x in tele:
                if x.get('fail') and os.environ.get('WHY'): print('   why:', json.dumps(x)[:400])
            print(f"{row['state'][:28]:28} {row['secs']:4}s  {str(row['margin']) + '%' if row['margin'] is not None else '  - ':>5}  w{row['walls']:<2} r{row['rams']:<2} u{row['unstick']:<2} {m['year']} {m['title'][:26]:26} {row['steps']}" + (f"   earlier: {fails}" if fails else ''), flush=True)
        ok = [r for r in rows if r['state'] == 'ok']
        print(f"\n{len(ok)}/{len(rows)} completed; total {sum(r['secs'] for r in ok) // 60} min of play; first-try failures: {sum(1 for r in rows if r['fails'])}")
        (ROOT / 'tests' / 'story-bot.json').write_text(json.dumps(rows, indent=1)) if os.environ.get('SAVE') else None
        for e in errors[:6]: print('ERR', e[:300])
        await b.close()
asyncio.run(main())
