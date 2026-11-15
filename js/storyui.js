// Story mode screen furniture: the HUD, the dialogue box, the panels (departures, time dial, pedigree,
// pause) and keyboard and touch input. The game itself is in storygame.js.

const CSS = `
#story { position: fixed; inset: 0; z-index: 57; background: #101418; color: #fff; font-family: 'Nunito', system-ui, sans-serif; text-transform: none; touch-action: none; user-select: none; -webkit-user-select: none; overflow: hidden; }
#story.hidden { display: none; }
#story canvas#stCanvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#story .st-top { position: absolute; left: calc(12px + env(safe-area-inset-left, 0px)); top: calc(10px + env(safe-area-inset-top, 0px)); pointer-events: none; }
#story .st-cash { font-family: 'Press Start 2P', monospace; font-size: 18px; color: #7be07b; text-shadow: 2px 2px 0 #06260a, -1px -1px 0 #06260a; }
#story .st-cash.bump { color: #fff7a8; }
#story .st-stat { margin-top: 6px; font-size: 18px; letter-spacing: 2px; text-shadow: 1px 1px 0 #000; height: 22px; }
#story .st-where { margin-top: 4px; font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 17px; color: #ffe9a8; text-shadow: 0 2px 0 #000, 0 0 6px #000; }
#story .st-where small { display: block; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px; color: #d8d2c0; }
#story #stMini { position: absolute; right: calc(12px + env(safe-area-inset-right, 0px)); top: calc(10px + env(safe-area-inset-top, 0px)); width: 132px; height: 132px; border: 3px solid #101010; border-radius: 50%; box-shadow: 0 0 0 2px #e8d8a0, 0 4px 10px rgba(0,0,0,0.6); background: #223; }
#story .st-obj { position: absolute; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); width: min(560px, calc(100% - 330px)); min-width: 220px; text-align: center; pointer-events: none;
  font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 16px; line-height: 1.25; color: #fff; text-shadow: 0 2px 0 #000, 0 0 8px #000; }
#story .st-obj b { color: #ffd84a; font-weight: 700; }
#story .st-obj .tm { display: inline-block; margin-left: 8px; font-family: 'Press Start 2P', monospace; font-size: 13px; color: #fff; background: rgba(0,0,0,0.6); padding: 4px 7px; border-radius: 4px; }
#story .st-obj .tm.low { color: #ff5a4a; }
#story .st-obj small { display: block; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px; color: #d8d2c0; margin-bottom: 2px; letter-spacing: 1px; text-transform: uppercase; }
#story .st-hint { position: absolute; left: 50%; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 15px; color: #1a1a1a; background: #ffd84a; padding: 6px 14px; border-radius: 999px; box-shadow: 0 3px 0 #9a7a10; white-space: nowrap; pointer-events: none; }
#story .st-hint:empty, #story .st-toast:empty, #story .st-dial:empty { display: none; }
#story .st-toast { position: absolute; left: 50%; top: 21%; transform: translateX(-50%); max-width: min(560px, 86%); text-align: center; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 17px; color: #fff; background: rgba(10,12,18,0.78); padding: 8px 16px; border-radius: 12px; pointer-events: none; }
#story .st-dial { position: absolute; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); width: min(380px, 70%); font-family: 'Press Start 2P', monospace; font-size: 10px; color: #a8ecff; text-align: center; text-shadow: 1px 1px 0 #000; pointer-events: none; }
#story .st-dial i { display: block; height: 12px; margin-top: 5px; border: 2px solid #a8ecff; border-radius: 3px; background: rgba(0,0,0,0.5); overflow: hidden; }
#story .st-dial i b { display: block; height: 100%; background: linear-gradient(90deg, #2a8ac8, #a8ecff, #fff); }
#story .st-banner { position: absolute; left: 0; right: 0; top: 40%; text-align: center; pointer-events: none; font-family: 'Press Start 2P', monospace; font-size: clamp(20px, 5.4vw, 44px); line-height: 1.3; color: #ffd84a; text-shadow: 3px 3px 0 #000, -2px -2px 0 #000, 0 0 18px rgba(0,0,0,0.8); opacity: 0; transition: opacity 0.25s; }
#story .st-banner.on { opacity: 1; }
#story .st-banner small { display: block; margin-top: 12px; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: clamp(14px, 2.6vw, 20px); color: #fff; }
#story .st-fade { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity 0.35s; }
#story .st-dlg { position: absolute; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); width: min(720px, calc(100% - 20px)); display: flex; gap: 12px; align-items: flex-start; background: rgba(14,16,24,0.95); border: 3px solid #e8d8a0; border-radius: 12px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); cursor: pointer; }
#story .st-dlg.hidden, #story .st-panel.hidden { display: none; }
#story .st-dlg canvas { width: 84px; height: 84px; image-rendering: pixelated; border: 2px solid #e8d8a0; border-radius: 6px; flex: none; background: #1c1410; }
#story .st-dlg .who { font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 17px; color: #ffd84a; }
#story .st-dlg .who small { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px; color: #b8b2a0; margin-left: 8px; }
#story .st-dlg .txt { font-weight: 700; font-size: 17px; line-height: 1.32; color: #f4f0e4; min-height: 3.9em; margin-top: 3px; white-space: pre-wrap; }
#story .st-dlg.letter .txt { font-family: 'Lora', Georgia, serif; font-style: italic; font-weight: 500; }
#story .st-dlg .opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
#story .st-dlg .opts button, #story .st-panel button { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 15px; color: #1a1a1a; background: #ffd84a; border: none; border-radius: 999px; padding: 8px 14px; box-shadow: 0 3px 0 #9a7a10; cursor: pointer; }
#story .st-dlg .more { float: right; font-size: 12px; color: #b8b2a0; margin-top: 4px; }
#story .st-panel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(6,8,12,0.72); padding: 14px; }
#story .st-card { width: min(560px, 100%); max-height: 100%; overflow-y: auto; background: #f4ecd8; color: #2a2218; border-radius: 14px; border: 4px solid #2a2218; box-shadow: 0 10px 30px rgba(0,0,0,0.6); padding: 16px 18px; touch-action: pan-y; }
#story .st-card h2 { margin: 0 0 4px; font-family: 'Press Start 2P', monospace; font-size: 15px; line-height: 1.4; color: #8a2a1a; }
#story .st-card p { margin: 6px 0; font-weight: 700; font-size: 14px; line-height: 1.35; }
#story .st-card .row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 2px dashed #c8b890; font-weight: 800; font-size: 15px; }
#story .st-card .row span { flex: 1; min-width: 0; }
#story .st-card .row small { display: block; font-weight: 700; font-size: 12px; color: #6a5a40; }
#story .st-card .row.off { opacity: 0.45; }
#story .st-card .row.need { background: #fff2b8; margin: 0 -8px; padding: 8px; border-radius: 8px; }
#story .st-card button.alt { background: #d8ccb0; box-shadow: 0 3px 0 #9a8a68; }
#story .st-card button:disabled { opacity: 0.45; cursor: default; }
#story .st-card .foot { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
#story .st-card canvas { display: block; width: 100%; height: auto; border: 3px solid #2a2218; border-radius: 6px; image-rendering: pixelated; }
#story .st-card.wide { width: min(760px, 100%); }
#story .st-card kbd { font-family: 'Press Start 2P', monospace; font-size: 9px; background: #2a2218; color: #f4ecd8; padding: 3px 5px; border-radius: 3px; }
#story .st-touch { position: absolute; inset: 0; pointer-events: none; display: none; }
#story.touch .st-touch { display: block; }
#story.touch .st-hint { bottom: calc(150px + env(safe-area-inset-bottom, 0px)); }
#story.touch .st-dial { bottom: auto; top: calc(70px + env(safe-area-inset-top, 0px)); }
#story .st-stick { position: absolute; left: 0; bottom: 0; width: 46%; height: 62%; pointer-events: auto; }
#story .st-knob { position: absolute; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.08); display: none; }
#story .st-knob i { position: absolute; left: 50%; top: 50%; width: 42px; height: 42px; margin: -21px 0 0 -21px; border-radius: 50%; background: rgba(255,255,255,0.5); }
#story .st-btn { position: absolute; pointer-events: auto; width: 64px; height: 64px; border-radius: 50%; border: 3px solid rgba(0,0,0,0.6); font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 14px; color: #1a1a1a; background: rgba(255,216,74,0.92); }
#story .st-btn.b2 { background: rgba(232,90,74,0.92); color: #fff; }
#story .st-btn.sm { width: 46px; height: 46px; font-size: 12px; background: rgba(240,236,220,0.9); }
#story.cut .st-menu, #story.cut .st-obj, #story.cut #stMini, #story.cut .st-touch, #story.cut .st-toast, #story.cut .st-hint, #story.cut #stCash, #story.cut #stStat, #story.cut #stWhere, #story.cut #stHint, #story.cut #stToast, #story.cut #stObj, #story.cut #stDial { opacity: 0; pointer-events: none; }
#story .st-menu { position: absolute; right: calc(12px + env(safe-area-inset-right, 0px)); top: calc(152px + env(safe-area-inset-top, 0px)); pointer-events: auto; display: flex; gap: 6px; }
#story .st-menu button { font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 13px; color: #1a1a1a; background: rgba(240,236,220,0.92); border: 2px solid #1a1a1a; border-radius: 8px; padding: 5px 9px; cursor: pointer; }
@media (max-width: 700px) {
  #story #stMini { width: 96px; height: 96px; }
  #story .st-menu { top: calc(114px + env(safe-area-inset-top, 0px)); }
  #story .st-obj { top: calc(154px + env(safe-area-inset-top, 0px)); width: calc(100% - 24px); font-size: 14px; }
  #story .st-toast { top: 30%; font-size: 15px; }
  #story.touch .st-dial { top: calc(214px + env(safe-area-inset-top, 0px)); }
  #story .st-cash { font-size: 14px; }
  #story .st-dlg .txt { font-size: 15px; }
  #story .st-dlg canvas { width: 60px; height: 60px; }
}
@media (max-height: 480px) {
  #story .st-toast { top: 22%; font-size: 14px; }
  #story #stMini { width: 104px; height: 104px; }
  #story .st-menu { top: calc(8px + env(safe-area-inset-top, 0px)); right: calc(126px + env(safe-area-inset-right, 0px)); flex-direction: column; gap: 4px; }
  #story .st-menu button { padding: 3px 8px; font-size: 12px; }
  #story .st-obj { top: calc(8px + env(safe-area-inset-top, 0px)); width: calc(100% - 440px); font-size: 13px; }
  #story .st-banner { top: 30%; }
  #story .st-dlg { bottom: 6px; padding: 8px; }
  #story .st-dlg .txt { font-size: 15px; min-height: 3.2em; }
}
`;

const HTML = `
<canvas id="stCanvas"></canvas>
<div class="st-top"><div class="st-cash" id="stCash">£0</div><div class="st-stat" id="stStat"></div><div class="st-where" id="stWhere"></div></div>
<canvas id="stMini" width="132" height="132"></canvas>
<div class="st-menu"><button data-act="dial" title="Time dial (T)">⏱ Dial</button><button data-act="brief" title="Mission: read it again (B)">📋</button><button data-act="map" title="Town map (M)">🗺</button><button data-act="pedigree" title="Pedigree (P)">📜</button><button data-act="pause" title="Menu (Esc)">☰</button></div>
<div class="st-obj" id="stObj"></div>
<div class="st-toast" id="stToast"></div>
<div class="st-hint" id="stHint"></div>
<div class="st-dial" id="stDial"></div>
<div class="st-banner" id="stBanner"></div>
<div class="st-touch"><div class="st-stick" id="stStick"><div class="st-knob" id="stKnob"><i></i></div></div>
  <button class="st-btn" data-act="action" style="right:22px;bottom:96px">GO</button>
  <button class="st-btn b2" data-act="brake" style="right:96px;bottom:34px">BRAKE</button>
  <button class="st-btn sm" data-act="call" style="right:26px;bottom:176px">CAR</button></div>
<div class="st-dlg hidden" id="stDlg"><canvas width="96" height="96" id="stFace"></canvas><div style="flex:1;min-width:0"><div class="who" id="stWho"></div><div class="txt" id="stTxt"></div><div class="opts" id="stOpts"></div><div class="more" id="stMore"></div></div></div>
<div class="st-panel hidden" id="stPanel"></div>
<div class="st-fade" id="stFade"></div>`;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const escapeText = esc;

/** Build (once) and show the story screen. Returns the ui object the game drives. */
export function mountStoryUi() {
  if (!document.getElementById('stStyle')) { const st = document.createElement('style'); st.id = 'stStyle'; st.textContent = CSS; document.head.appendChild(st); }
  let root = document.getElementById('story');
  if (root) root.remove();
  root = document.createElement('div');
  root.id = 'story';
  root.innerHTML = HTML;
  document.body.appendChild(root);
  const $ = id => root.querySelector('#' + id);
  const canvas = $('stCanvas');
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  root.classList.toggle('touch', touch);

  const input = { keys: new Set(), stick: { x: 0, y: 0, active: false }, queue: [], brake: false, touch };
  const press = act => { input.queue.push(act); };
  const KEYMAP = { KeyE: 'action', Enter: 'action', KeyT: 'dial', KeyH: 'call', KeyP: 'pedigree', Escape: 'pause', KeyF: 'action', KeyM: 'map', Tab: 'map', KeyR: 'retry', KeyB: 'brief', KeyJ: 'brief' };
  const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'Tab', 'KeyM', ...Object.keys(KEYMAP)]);
  const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  const onKey = e => {
    if (typing()) return;
    const down = e.type === 'keydown';
    if (/^Digit[1-9]$/.test(e.code) && down) { press('opt' + (+e.code.slice(5) - 1)); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (down) { if (!e.repeat && KEYMAP[e.code]) press(KEYMAP[e.code]); if (!e.repeat && e.code === 'Space') press('space'); input.keys.add(e.code); }
    else input.keys.delete(e.code);
  };
  const onBlur = () => input.keys.clear();
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  window.addEventListener('blur', onBlur);

  // Touch stick
  const stick = $('stStick'), knob = $('stKnob');
  let stickId = null, sx0 = 0, sy0 = 0;
  const stickMove = e => {
    for (const t of e.changedTouches) if (t.identifier === stickId) {
      const dx = t.clientX - sx0, dy = t.clientY - sy0, d = Math.hypot(dx, dy), m = Math.min(1, d / 44);
      input.stick.x = d ? dx / d * m : 0; input.stick.y = d ? dy / d * m : 0; input.stick.active = m > 0.18;
      knob.firstElementChild.style.transform = `translate(${input.stick.x * 30}px, ${input.stick.y * 30}px)`;
    }
    e.preventDefault();
  };
  stick.addEventListener('touchstart', e => { const t = e.changedTouches[0]; stickId = t.identifier; const r = stick.getBoundingClientRect(); sx0 = t.clientX; sy0 = t.clientY; knob.style.display = 'block'; knob.style.left = (sx0 - r.left) + 'px'; knob.style.top = (sy0 - r.top) + 'px'; e.preventDefault(); }, { passive: false });
  stick.addEventListener('touchmove', stickMove, { passive: false });
  const stickEnd = e => { for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; input.stick.x = input.stick.y = 0; input.stick.active = false; knob.style.display = 'none'; } };
  stick.addEventListener('touchend', stickEnd); stick.addEventListener('touchcancel', stickEnd);
  for (const b of root.querySelectorAll('[data-act]')) {
    const act = b.dataset.act;
    if (act === 'brake') {
      b.addEventListener('touchstart', e => { input.brake = true; e.preventDefault(); }, { passive: false });
      b.addEventListener('touchend', () => { input.brake = false; });
      b.addEventListener('mousedown', () => { input.brake = true; }); b.addEventListener('mouseup', () => { input.brake = false; });
    } else b.addEventListener('click', e => { press(act); e.stopPropagation(); b.blur(); });
  }

  // ---- HUD setters (only touch the DOM when something changed) ----
  const memo = {};
  const setHtml = (id, html) => { if (memo[id] !== html) { memo[id] = html; $(id).innerHTML = html; } };
  let toastT = 0, bannerT = 0;
  const ui = {
    root, canvas, ctx: canvas.getContext('2d'), mini: $('stMini').getContext('2d'), input, touch,
    cash(n, bump) { setHtml('stCash', '£' + Math.round(n).toLocaleString('en-GB')); if (bump) { $('stCash').classList.add('bump'); setTimeout(() => $('stCash').classList.remove('bump'), 500); } },
    stat(hearts, stars) { setHtml('stStat', '<span style="color:#ff6a6a">' + '♥'.repeat(Math.max(0, hearts)) + '</span><span style="color:#5a3a3a">' + '♥'.repeat(Math.max(0, 3 - hearts)) + '</span>' + (stars > 0 ? ' <span style="color:#8ab4ff">' + '★'.repeat(stars) + '</span>' : '')); },
    where(town, sub) { setHtml('stWhere', esc(town) + '<small>' + esc(sub) + '</small>'); },
    objective(html) { setHtml('stObj', html); },
    hint(text) { setHtml('stHint', esc(text || '')); },
    dial(html) { setHtml('stDial', html); },
    toast(text, ms = 3200) { setHtml('stToast', esc(text)); clearTimeout(toastT); toastT = setTimeout(() => setHtml('stToast', ''), ms); },
    banner(title, sub = '', color = '#ffd84a', ms = 2800) {
      const el = $('stBanner'); el.style.color = color; el.innerHTML = esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : ''); el.classList.add('on');
      clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('on'), ms);
    },
    fade(on, color = '#fff') { const el = $('stFade'); el.style.background = color; el.style.opacity = on ? '1' : '0'; },
    dialogOpen: false, panelOpen: false,
    /**
     * Show one page of speech. Resolves with the chosen option's index (or -1 when there are none).
     * opts: { who, sub, text, options: [string], portrait(ctx, frame), letter }
     */
    say(o) {
      return new Promise(resolve => {
        const dlg = $('stDlg'), txt = $('stTxt'), optsEl = $('stOpts'), face = $('stFace').getContext('2d');
        ui.dialogOpen = true;
        dlg.classList.remove('hidden'); dlg.classList.toggle('letter', !!o.letter);
        $('stWho').innerHTML = esc(o.who || '') + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '');
        optsEl.innerHTML = '';
        let shown = 0, frame = 0, done = false, timer = 0;
        const full = o.text || '';
        const finish = idx => { if (done) return; done = true; clearInterval(timer); ui.dialogOpen = false; ui._advance = null; dlg.onclick = null; dlg.classList.add('hidden'); resolve(idx); };
        const reveal = () => {
          shown = full.length; txt.textContent = full;
          if (o.options?.length && !optsEl.children.length) o.options.forEach((label, i) => { const b = document.createElement('button'); b.textContent = (touch ? '' : (i + 1) + '. ') + label; b.onclick = e => { e.stopPropagation(); finish(i); }; optsEl.appendChild(b); });
          $('stMore').textContent = o.options?.length ? '' : touch ? 'tap ▶' : 'E ▶';
        };
        $('stMore').textContent = '';
        timer = setInterval(() => {
          frame++;
          if (shown < full.length) { shown = Math.min(full.length, shown + 3); txt.textContent = full.slice(0, shown); if (o.blip && frame % 2 === 0 && /[a-z]/i.test(full[shown - 1] || '')) o.blip(); if (shown >= full.length) reveal(); }
          if (o.portrait) o.portrait(face, shown < full.length ? frame : (frame % 40 === 0 ? 7 : 0));
        }, 28);
        if (o.portrait) o.portrait(face, 0);
        ui._advance = act => {
          if (shown < full.length) { reveal(); return; }
          if (o.options?.length) { const m = /^opt(\d)$/.exec(act || ''); if (m && +m[1] < o.options.length) finish(+m[1]); return; }
          finish(-1);
        };
        dlg.onclick = () => ui._advance('action');
        ui._cancelSay = () => finish(-2);
      });
    },
    /** A modal card. html is the card's inside; handlers maps data-go values to callbacks. */
    panel(html, handlers = {}, wide = false) {
      const p = $('stPanel');
      p.innerHTML = '<div class="st-card' + (wide ? ' wide' : '') + '">' + html + '</div>';
      p.classList.remove('hidden');
      ui.panelOpen = true;
      p.onclick = e => {
        const b = e.target.closest('[data-go]');
        if (b && !b.disabled) { const [k, arg] = b.dataset.go.split(':'); handlers[k]?.(arg); }
        else if (e.target === p) handlers.close?.();
      };
      ui._panelClose = handlers.close || (() => ui.closePanel());
    },
    closePanel() { $('stPanel').classList.add('hidden'); $('stPanel').innerHTML = ''; ui.panelOpen = false; ui._panelClose = null; },
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(root.clientWidth * dpr)), h = Math.max(1, Math.round(root.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      return { w, h, dpr };
    },
    destroy() {
      window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); window.removeEventListener('blur', onBlur);
      clearTimeout(toastT); clearTimeout(bannerT);
      ui._cancelSay?.();
      root.remove();
    },
  };
  return ui;
}
