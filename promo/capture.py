# Records the promo's game footage, a frame at a time on a fake clock, from the demo family's story.
#   python -m http.server 8765 --bind 127.0.0.1     (from the repo root)
#   python promo/capture.py <clip> <out-dir>        clip: cut | chase | finale
# cut     the opening scene: Silas ("one name at a time", "erase a family from history") and Dorothy
# chase   the Heirloom running down a grey van with the law on its tail, then a jump back in time
# finale  Engine No. 1 running through the centuries with the Heirloom after it
import asyncio, json, sys, pathlib
from gamecap import open_story, ev, Rec, async_playwright

CLIP, OUT = sys.argv[1], pathlib.Path(sys.argv[2])

# Lines from the opening, cut down to the part that fits a 20-second trailer. The words are the game's own.
TRIM = {
    'Then we take them OUT': 'Then we take them OUT of the registers. One name at a time.',
    'Nobody has ever thought to forbid it': 'Start the time engine. We are going to erase a family from history.',
    'He has a time machine': 'He has a time machine. So have I.',
}


async def talk(page):
    for _ in range(80):
        if not await ev(page, "return s.ui.dialogOpen"): return
        await ev(page, "const q = s.step && s.step.step.quiz; const b = document.querySelectorAll('#stOpts button'); if (b.length) b[q ? q.answer : 0].click(); else if (s.ui._advance) { s.ui._advance('action'); s.ui._advance('action'); }")
        await page.clock.run_for(60)


async def cut(page):
    await page.clock.pause_at(await page.evaluate('Date.now()') + 50)
    await ev(page, "const say = s.ui.say; s.ui.say = o => { const t = %s; for (const k in t) if ((o.text || '').startsWith(k)) o.text = t[k]; return say(o); };" % json.dumps(TRIM))
    want = {'blank:angry': 'silas_out', 'blank:grin:Start': 'silas_erase', 'dot:angry': 'dorothy', 'dot:set': 'dorothy_tm'}
    lengths = {'silas_out': 110, 'silas_erase': 125, 'dorothy': 80, 'dorothy_tm': 80}
    # a still of the office before anyone speaks, for the cold open
    r = Rec(page, OUT / 'office')
    await r.tick(45)
    for _ in range(400):
        if not await ev(page, "return !!s.cut"): break
        if not await ev(page, "return s.ui.dialogOpen"):
            await page.clock.run_for(40); continue
        who = await ev(page, "return s.cut.who + ':' + s.cut.mood + ':' + document.getElementById('stTxt').textContent.slice(0, 5)")
        key = next((v for k, v in want.items() if who.startswith(k)), None)
        if key and not (OUT / key).exists():
            r = Rec(page, OUT / key)
            await r.tick(lengths[key])
        await ev(page, "s.ui._advance && s.ui._advance('action'); s.ui._advance && s.ui._advance('action');")
        await page.clock.run_for(60)
    print('cut done', sorted(p.name for p in OUT.iterdir()))


async def into_mission(page, pick):
    await page.clock.pause_at(await page.evaluate('Date.now()') + 50)
    await page.clock.run_for(800)
    await talk(page)
    m = await ev(page, f"const m = s.story.missions.find({pick}); return m && {{ id: m.id, town: m.town, year: m.year, i: s.story.missions.indexOf(m) }}")
    print('mission', m)
    await ev(page, f"s.save.cash = 900; s.player.hearts = 3; s.save.idx = {m['i']}; s.save.favours = []; s.debug.go({json.dumps(m['town'])}, {m['year']}); s.clock = 12.5; s.rain = 0; s.rainT = 0; s.rainRoll = 3;")
    await page.clock.run_for(400)
    await ev(page, "s.debug.startNext();")
    await page.clock.run_for(300)
    await talk(page)
    return m


async def to_step(page, kind):
    for _ in range(30):
        t = await ev(page, "return s.step ? s.step.step.t : null")
        if t == kind: return True
        await ev(page, "s.debug.finishStep();")
        await page.clock.run_for(400)
        await talk(page)
    return False


async def bot_on(page):
    # the test driver steers; the game then runs on the clock's own time, so playback speed is the frame step
    await ev(page, "s.debug.intoHeirloom(); s.debug.bot(true, 1); s.speed = 0; s.player.hearts = 3;")


async def close_in(page, limit_s=40):
    for _ in range(int(limit_s * 5)):
        d = await ev(page, "const t = s.step && (s.step.target || s.debug.target()); const p = s.player.vehicle || s.player; return t ? Math.hypot(t.x - p.x, t.y - p.y) / 32 : 999")
        if d < 7: return d
        await page.clock.run_for(200)
        await ev(page, "s.player.hearts = 3;")
    return None


async def chase(page):
    await into_mission(page, "m => m.year >= 1930 && m.year < 2000 && m.steps.some(x => x.t === 'chase')")
    print('at chase', await to_step(page, 'chase'))
    await bot_on(page)
    await ev(page, "s.debug.warp(); s.heat = 2; s.heatCalm = -20;")   # start on the van's tail, with the law already out
    await page.clock.run_for(1800)
    print('closed in', await close_in(page))
    await page.add_style_tag(content="#story .st-hint { display: none !important; }")
    r = Rec(page, OUT / 'chase', step_ms=1000 / 30 * 1.5)
    for k in range(180):
        await r.tick()
        # the law stays on your tail but never quite nicks you, and the van never quite gives up the register
        if k % 5 == 0: await ev(page, "s.player.hearts = 3; s.bust = 0; s.heat = Math.max(s.heat, 1.6); s.heatCalm = -20; if (s.step && s.step.target && s.step.target.hp < 2) s.step.target.hp = 4;")
    # and then back in time, mid-chase: the transit is the game's own year counter
    old = await ev(page, "return s.city.town.id")
    await ev(page, f"s.heat = 0; s.hopping = true; s.debug.travel({json.dumps(old)}, 1844, 'jump'); setTimeout(() => {{ s.hopping = false; }}, 1600);")
    r = Rec(page, OUT / 'jump', step_ms=1000 / 30)
    await r.tick(150)


async def finale(page):
    await into_mission(page, "m => m.id === 'blank-page'")
    print('at chase', await to_step(page, 'chase'))
    await bot_on(page)
    print('closed in', await close_in(page, 60))
    r = Rec(page, OUT / 'finale', step_ms=1000 / 30 * 1.4)
    for k in range(540):
        await r.tick()
        if k % 30 == 0:
            info = await ev(page, "s.player.hearts = 3; const st = s.step; return st ? [st.step.t, st.target && st.target.hp, st.hops || 0, s.city.year] : null")
            print(k, info)
            if not info or info[0] != 'chase': break


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b, page, errors = await open_story(p, cuts=(CLIP == 'cut'))
        await {'cut': cut, 'chase': chase, 'finale': finale}[CLIP](page)
        print('errors', errors)
        await b.close()

asyncio.run(main())
