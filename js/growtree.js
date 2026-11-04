// Growing tree: your ancestors drawn as a real tree with you as the trunk, growing along a timeline.
//  - 'back' (the default): the year counts back from your birth and the branches grow up out of you,
//    a generation at a time, until the oldest ancestors bloom at the tips.
//  - 'forward': history plays forward. The oldest ancestors appear first and their branches grow down,
//    meeting at each marriage, until every line arrives at you.
// Height is the year each person was born (or simply their generation), and width is shared out like the
// courtyard wedges, so big branches get more room. Anyone alive in the year on the clock glows.
// The art (seasons, light, blossoms, butterflies and so on) is in treeart.js; Bible verses in verses.js.
import { collectAncestors, displayName, firstName, lifespan, relationship, findEvent, seededRandom, hashString } from './ancestry.js';
import { estimateYears, personLines } from './vizkit.js';
import { makeLook, seasonKey, EST_FLOWER, paintBackdrop, vignette, BranchBatch, addLeaf, drawGlow, drawFlowerFast, Life, bezierAt, bezTangent } from './treeart.js';
import { VerseReader } from './verses.js';

function bezierPoint(p, t) {
  const u = 1 - t;
  return [u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]];
}
// The part of a cubic bezier between t0 and t1, as a new cubic.
function bezierSub(p, t0, t1) {
  const split = (q, t) => {
    const l = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const P0 = [q[0], q[1]], P1 = [q[2], q[3]], P2 = [q[4], q[5]], P3 = [q[6], q[7]];
    const A = l(P0, P1), B = l(P1, P2), C = l(P2, P3), D = l(A, B), E = l(B, C), F = l(D, E);
    return { left: [...P0, ...A, ...D, ...F], right: [...F, ...E, ...C, ...P3] };
  };
  let q = p;
  if (t1 < 1) q = split(q, t1).left;
  if (t0 > 0) q = split(q, t0 / t1).right;
  return q;
}

export function createGrowTree(host, opts) {
  const { data, rootId, maxGen = 10, onFrame = () => {}, onEnd = () => {}, onSelect = () => {} } = opts;
  let reader = opts.verses?.length ? new VerseReader(opts.verses) : null;
  const tree = collectAncestors(data, rootId, maxGen);
  const people = [...tree.people.values()];
  const years = estimateYears(data, people.map(p => p.id));
  const thisYear = new Date().getFullYear();
  // births and deaths, filling any gaps down the tree from you
  const byGen = people.slice().sort((a, b) => a.gen - b.gen);
  for (const p of byGen) {
    const y = years.get(p.id);
    p.birth = y?.birth ?? null; p.death = y?.death ?? null; p.est = !!y?.est;
    if (p.birth == null) {
      const c = p.primaryChild && tree.people.get(p.primaryChild);
      p.birth = c ? c.birth - (p.indi.sex === 'M' ? 30 : 27) : thisYear - 30;
      p.est = true;
    }
  }
  // a child can't be born before a parent, even in a muddled file
  for (const p of byGen) { const c = p.primaryChild && tree.people.get(p.primaryChild); if (c && p.birth > c.birth - 14) p.birth = c.birth - 14; }
  for (const p of people) p.end = p.death ?? (p.birth < thisYear - 95 ? p.birth + 70 : thisYear);

  // width shares, like the courtyard wedges: each person's share is split between their parents by how
  // many lines lie behind each of them
  const weight = new Map();
  const w = id => { if (weight.has(id)) return weight.get(id); const p = tree.people.get(id); let s = 0; for (const q of p.layoutParents) s += w(q); const v = Math.max(1, s); weight.set(id, v); return v; };
  w(rootId);
  const assign = (id, a, b) => {
    const p = tree.people.get(id); p.a = a; p.b = b; p.u = (a + b) / 2;
    const tot = p.layoutParents.reduce((s, q) => s + w(q), 0) || 1;
    let x = a;
    for (const q of p.layoutParents) { const span = (b - a) * w(q) / tot; assign(q, x, x + span); x += span; }
  };
  assign(rootId, 0, 1);
  for (const p of people) p.weight = w(p.id);
  const root = tree.people.get(rootId);
  const yMin = Math.min(...people.map(p => p.birth)), yMax = root.birth;
  const edges = tree.edges.map(e => ({ c: tree.people.get(e.child), p: tree.people.get(e.parent), side: e.side }))
    .filter(e => e.p.primaryChild === e.c.id); // pedigree collapse: draw each ancestor once, from the child they're laid out above
  const events = [];
  for (const p of people) {
    const pl = personLines(p.indi);
    events.push({ year: p.birth, p, kind: 'born', text: `${p.est ? 'c.' : ''}${p.birth} · ${displayName(p.indi)} born${pl.birthPlace ? ' in ' + pl.birthPlace : ''}` });
    if (p.death) { const d = findEvent(p.indi, 'DEAT', 'BURI'); const pl2 = d?.place ? d.place.split(',')[0].trim() : ''; events.push({ year: p.death, p, kind: 'died', text: `${p.death} · ${firstName(p.indi)} ${p.indi.surname || ''} died${pl2 ? ' in ' + pl2 : ''}`.replace(/\s+/g, ' ') }); }
  }
  events.sort((a, b) => a.year - b.year);
  const maxGenFound = Math.max(1, ...people.map(p => p.gen));

  // ---- canvas and view ----
  const canvas = document.createElement('canvas');
  canvas.className = 'vizGL';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const view = { s: 1, tx: 0, ty: 0 };
  function resize() {
    W = host.clientWidth || window.innerWidth; H = host.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const state = { dir: 'back', spacing: 'year', T: yMax, playing: false, speed: 1, popAt: new Map(), selected: null,
    season: seasonKey(opts.style), hour: opts.hour ?? 12, autoDay: !!opts.autoDay, versesOn: opts.versesOn !== false };
  const life = new Life(hashString(rootId));
  // leaves along each branch, placed once so they don't jump about
  for (const e of edges) {
    const r = seededRandom(hashString(e.p.id + 'leaves'));
    const n = Math.max(2, Math.min(7, Math.round(7 - Math.log2(e.p.weight + 1))));
    e.leaves = Array.from({ length: n }, (_, i) => ({ s: 0.3 + (i + r()) / n * 0.65, side: i % 2 ? 1 : -1, size: 0.75 + r() * 0.5, ang: 0.5 + r() * 0.7, ci: Math.floor(r() * 4) }));
    e.branch = { e, q: null, wWorld: 1, full: false };
  }
  for (const p of people) p.spin = (hashString(p.id) % 100) / 100;
  const span = Math.max(30, yMax - yMin);
  const yearsPerSecond = () => (span / 28) * state.speed;
  const startYear = () => state.dir === 'back' ? yMax + 1 : yMin - 3;
  const endYear = () => state.dir === 'back' ? yMin - 3 : yMax + 2;

  // layout in screen space (before pan/zoom): x across the canopy, y by birth year or by generation
  // the bottom holds the meadow (with the verse written on it) above the control bar
  const inset = () => (opts.bottomInset?.() ?? 110);
  const verseBand = () => (state.versesOn && reader ? (W < 600 ? 86 : 70) : 0);
  const pad = () => ({ l: Math.max(54, W * 0.06), r: Math.max(24, W * 0.04), t: Math.max(134, H * 0.16), b: inset() + verseBand() + 56 });
  function layout() {
    const P = pad(), cw = W - P.l - P.r, ch = H - P.t - P.b;
    const yOf = p => state.spacing === 'gen' ? P.t + ch - (p.gen / maxGenFound) * ch : P.t + ((p.birth - yMin) / Math.max(1, yMax - yMin)) * ch;
    for (const p of people) { p.sx = P.l + p.u * cw; p.sy = yOf(p); p.room = (p.b - p.a) * cw; }
    return { P, cw, ch, yearY: y => P.t + ((y - yMin) / Math.max(1, yMax - yMin)) * ch };
  }
  const X = x => x * view.s + view.tx, Y = y => y * view.s + view.ty;
  const branchWidth = p => (1.4 + Math.sqrt(p.weight) * 1.9) * Math.min(1.6, Math.max(0.7, W / 1100)) * Math.sqrt(view.s);

  function curveFor(e) {
    const c = e.c, p = e.p, dy = c.sy - p.sy;
    return [X(c.sx), Y(c.sy), X(c.sx), Y(c.sy - dy * 0.55), X(p.sx), Y(p.sy + dy * 0.45), X(p.sx), Y(p.sy)];
  }
  // how much of a branch has grown at year T (0..1 from child to parent)
  // Each branch eases in and out: it starts slowly, speeds up through the middle and slows as it reaches the
  // next blossom (smootherstep: no sudden starts or stops).
  const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * k * (k * (k * 6 - 15) + 10);
  function grown(e, T) {
    const c = e.c.birth, p = e.p.birth;
    if (state.dir === 'back') { if (T >= c) return [0, 0]; return [0, ease((c - T) / Math.max(1, c - p))]; }
    if (T <= p) return [1, 1];
    return [1 - ease((T - p) / Math.max(1, c - p)), 1];
  }
  const visible = (p, T) => state.dir === 'back' ? T <= p.birth || p === root : T >= p.birth;

  // ---- drawing ----
  const SHADOW = 'rgba(20,14,30,0.7)';
  // text with a soft dark outline (much cheaper than a blurred shadow)
  function text(str, x, y, font, color, align = 'left', base = 'top') {
    ctx.font = font; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
    ctx.strokeStyle = SHADOW; ctx.lineWidth = 3; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  let lastDraw = performance.now();
  function draw() {
    const now = performance.now(), t = now / 1000, dt = Math.min(0.1, (now - lastDraw) / 1000); lastDraw = now;
    if (state.autoDay) state.hour = (state.hour + dt * 24 / 80) % 24; // a whole day in 80 seconds
    const T = state.T, st = makeLook(state.season, state.hour);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const title = `The family tree of ${displayName(root.indi)}`;
    const showVerse = state.versesOn && reader;
    const { P, yearY } = layout();
    const k = Math.sqrt(view.s);
    const groundW = root.sy + 30;
    const groundY = Y(groundW), trunkX = X(root.sx);
    const lx = st.sun.x < 0.5 ? -1 : 1;

    paintBackdrop(ctx, W, H, st, t, groundY, trunkX, dpr);

    // timeline grid
    if (state.spacing === 'year') {
      const step = span > 400 ? 100 : span > 160 ? 50 : 25;
      for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
        const sy = Y(yearY(y));
        if (sy < 40 || sy > groundY - 20) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
        text(String(y), 8, sy - 7, '600 11px Nunito, system-ui, sans-serif', 'rgba(255,255,255,0.75)', 'left', 'middle');
      }
    } else {
      for (let g = 0; g <= maxGenFound; g++) {
        const sy = Y(P.t + (H - P.t - P.b) - (g / maxGenFound) * (H - P.t - P.b));
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
        text(g ? `Gen ${g}` : 'You', 8, sy - 7, '600 11px Nunito, system-ui, sans-serif', 'rgba(255,255,255,0.75)', 'left', 'middle');
      }
    }
    if (state.spacing === 'year' && T > yMin - 3 && T < yMax + 1) {
      const sy = Y(yearY(T));
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(255,224,140,0)'); g.addColorStop(0.5, 'rgba(255,224,140,0.6)'); g.addColorStop(1, 'rgba(255,224,140,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }

    // trunk: wide where it meets the ground, narrowing up to you
    if (visible(root, T)) {
      const tw = branchWidth(root), ry = Y(root.sy);
      const tb = new BranchBatch();
      tb.branch([trunkX - lx * tw * 0.3, groundY + 8, trunkX, groundY - (groundY - ry) * 0.3, trunkX, ry + (groundY - ry) * 0.3, trunkX, ry], 0, 1, tw * 1.9, tw * 1.05, st, lx);
      tb.flush(ctx);
      // roots spreading into the grass
      ctx.strokeStyle = st.bark[1]; ctx.lineCap = 'round';
      for (const d of [-1, 1]) { ctx.lineWidth = tw * 0.45; ctx.beginPath(); ctx.moveTo(trunkX, groundY); ctx.quadraticCurveTo(trunkX + d * tw * 1.2, groundY + 4, trunkX + d * tw * 2.4, groundY + 10); ctx.stroke(); }
    }
    // branches, thickest first, then their leaves
    const order = edges.slice().sort((a, b) => b.p.weight - a.p.weight);
    const branches = [];
    const grownNow = new Map();
    const batch = new BranchBatch(), tips = [];
    for (const e of order) {
      const [t0, t1] = grown(e, T);
      grownNow.set(e, [t0, t1]);
      const c = e.c, p = e.p, dy = c.sy - p.sy;
      e.branch.q = [c.sx, c.sy, c.sx, c.sy - dy * 0.55, p.sx, p.sy + dy * 0.45, p.sx, p.sy];
      e.branch.full = t1 - t0 > 0.999;
      if (t1 - t0 <= 0.001) continue;
      const wb = branchWidth(e.p);
      e.branch.wWorld = wb / view.s; e.branch.w = wb;
      if (e.branch.full) branches.push(e.branch);
      const growingTip = e.branch.full ? 0 : state.dir === 'back' ? 1 : -1;
      const tip = batch.branch(curveFor(e), t0, t1, wb * 1.3, wb * 0.72, st, lx, growingTip);
      if (tip) tips.push(tip);
    }
    batch.flush(ctx);
    // a small bud with a soft glow on every shoot that's still growing
    for (const [x, y, w] of tips) {
      const r = Math.max(1.6, w * 0.42);
      drawGlow(ctx, x, y, r * 4, '255,240,190', 0.55);
      ctx.fillStyle = st.leaves[2]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = st.leaves[3]; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 7); ctx.fill();
    }
    // leaves are gathered into one path per colour and filled in a few calls
    const leafPaths = st.leaves.map(() => new Path2D());
    for (const e of order) {
      const [t0, t1] = grownNow.get(e);
      if (t1 - t0 <= 0.001) continue;
      const q = curveFor(e), wb = branchWidth(e.p);
      const base = Math.max(3.5, Math.min(9, e.p.room * 0.1)) * k;
      for (const L of e.leaves) {
        const into = state.dir === 'back' ? t1 - L.s : L.s - t0;
        if (into <= 0) continue;
        const grow = Math.min(1, into / 0.12);
        const [x, y] = bezierAt(q, L.s), [tx, ty] = bezTangent(q, L.s);
        const nx = -ty * L.side, ny = tx * L.side;
        const lit = (nx * -lx) > 0 ? 1 : 0;
        addLeaf(leafPaths[(L.ci + lit) % st.leaves.length], x + nx * wb * 0.45, y + ny * wb * 0.45, base * L.size * grow, Math.atan2(ny, nx) - L.side * L.ang * 0.5 - 0.3);
      }
    }
    st.leaves.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(leafPaths[i]); });

    // people: a cluster of leaves and an opening blossom; a glow if they're alive in the year on the clock
    const labelled = [], flowers = [];
    const env = { X, Y, k, st, groundY: groundW, topY: P.t, groundSpan: [P.l - 30, W - P.r + 30], midX: W / 2, flowers, branches,
      bezWorld: (b, s) => bezierAt(b.q, s), bezTanWorld: (b, s) => bezTangent(b.q, s) };
    const shown = [];
    const crown = st.leaves.map(() => new Path2D());
    for (const p of people) {
      if (!visible(p, T)) { state.popAt.delete(p.id); continue; }
      if (!state.popAt.has(p.id)) { state.popAt.set(p.id, now); if (state.playing && p !== root) life.bloom(p.sx, p.sy, env); }
      const age = (now - state.popAt.get(p.id)) / 1000;
      const open = Math.min(1, age / 1.1);
      const r = Math.max(4, Math.min(16, p.room * 0.32)) * k * (p === root ? 1.45 : 1);
      const x = X(p.sx), y = Y(p.sy);
      flowers.push([p.sx, p.sy]);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      shown.push([p, x, y, r, open]);
      if (p !== root) for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.85 + p.spin;
        addLeaf(crown[(i + (Math.cos(a) * -lx > 0 ? 1 : 0)) % st.leaves.length], x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.95 * Math.min(1, open * 2), a);
      }
    }
    for (const [p, x, y, r] of shown) if (T >= p.birth && T <= p.end && p !== root) drawGlow(ctx, x, y, r * 2.4, '255,236,150');
    st.leaves.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(crown[i]); });
    for (const [p, x, y, r, open] of shown) {
      const female = p.indi.sex === 'F';
      const pal = p.est ? EST_FLOWER : female ? st.female : st.male;
      drawFlowerFast(ctx, x, y, r, open, female, pal, st.centre, p.spin * 6.28, st.dark > 0.45);
      if (p === state.selected) { ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, 7); ctx.stroke(); }
      p.hitR = Math.max(12, r * 1.2);
      if (p.room * view.s > 46 || p === root || p === state.selected) labelled.push([p, x, y, r]);
    }
    life.update(state.playing || life.flies.length || life.bits.length ? dt : 0, env);
    life.drawMeadow(ctx, env);
    life.drawCreatures(ctx, env, t);

    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
    for (const [p, x, y, r] of labelled) {
      const roomy = p.room * view.s > 110 || p === root;
      ctx.font = `700 ${roomy ? 13 : 11}px Fredoka, Nunito, system-ui, sans-serif`;
      const name = fitText(roomy ? displayName(p.indi) : firstName(p.indi), Math.max(70, p.room * view.s * 0.96));
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,24,40,0.75)'; ctx.fillStyle = '#fff8e6';
      ctx.strokeText(name, x, y + r + 3); ctx.fillText(name, x, y + r + 3);
      if (roomy) { ctx.font = '600 10px Nunito, system-ui, sans-serif'; const l = p === root ? 'You' : lifespan(p.indi) || (p.est ? `c.${p.birth}` : ''); ctx.strokeText(l, x, y + r + 18); ctx.fillStyle = '#d8dcf0'; ctx.fillText(l, x, y + r + 18); }
    }
    drawSparkles(dt, t, shown, new Set(labelled.map(l => l[0])));
    vignette(ctx, W, H, st);

    // title, year, the latest events and the verse (drawn on the canvas, so they are in recordings too)
    const narrow = W < 600;
    text(title, 16, 60, '700 18px Fredoka, Nunito, system-ui, sans-serif', '#fff8e8');
    if (!narrow) text(state.dir === 'back' ? 'Growing back in time from you' : 'History playing forward to you', 16, 84, '600 12px Nunito, system-ui, sans-serif', 'rgba(255,248,232,0.85)');
    const yearSize = Math.max(34, Math.min(64, W * 0.07));
    text(String(Math.round(Math.max(yMin - 3, Math.min(yMax + 2, T)))), W - 16, 10, `700 ${yearSize}px Fredoka, Nunito, system-ui, sans-serif`, 'rgba(255,240,200,0.95)', 'right');
    // the latest births and deaths: under the year on wide screens, under the title on phones
    const passed = state.dir === 'back' ? events.filter(e => e.year >= T && e.year <= yMax + 1).slice(0, 3) : events.filter(e => e.year <= T).slice(-3).reverse();
    const tx = narrow ? 16 : W - 16, ty = narrow ? 86 : 18 + yearSize, maxW = narrow ? W - 32 : W * 0.42;
    passed.forEach((e, i) => {
      ctx.globalAlpha = 1 - i * 0.25;
      const font = `${i ? 600 : 700} ${i ? 11 : 13}px Nunito, system-ui, sans-serif`;
      ctx.font = font;
      let str = e.text;
      while (str.length > 8 && ctx.measureText(str).width > maxW) str = str.slice(0, -2);
      if (str !== e.text) str = str.trimEnd() + '…';
      text(str, tx, ty + i * 16, font, e.kind === 'died' ? '#e4def4' : '#fff4cc', narrow ? 'left' : 'right');
    });
    ctx.globalAlpha = 1;
    // the verse, written across the meadow just above the controls
    if (showVerse) {
      reader.update(dt);
      const band = verseBand(), top = H - inset() - band - 4;
      reader.draw(ctx, W / 2, top, Math.min(W - 40, 820), { ink: '#fffaf0', outline: 'rgba(24,30,16,0.75)' });
    }
  }

  // Shortens a label with an ellipsis so long names don't run into their neighbours.
  function fitText(str, maxW) {
    if (ctx.measureText(str).width <= maxW) return str;
    let s2 = str;
    while (s2.length > 3 && ctx.measureText(s2 + '…').width > maxW) s2 = s2.slice(0, -1);
    return s2.trimEnd() + '…';
  }

  // ---- sparkles: names too small to show take turns twinkling into view, so nobody stays nameless ----
  const sparkles = [];
  let sparkQueue = [], sparkClock = 0;
  const SPARK_LIFE = 3.2;
  function drawSparkles(dt, t, shown, labelledSet) {
    const hidden = shown.filter(([p]) => !labelledSet.has(p));
    const hiddenSet = new Set(hidden.map(h => h[0]));
    for (const s of sparkles) s.age += dt;
    for (let i = sparkles.length - 1; i >= 0; i--) if (sparkles[i].age > SPARK_LIFE || !hiddenSet.has(sparkles[i].p)) sparkles.splice(i, 1);
    // a few at a time, more on a bigger tree, each starting a moment after the last
    const want = Math.max(1, Math.min(5, Math.round(hidden.length / 14)));
    sparkClock -= dt;
    if (hidden.length && sparkles.length < want && sparkClock <= 0) {
      sparkClock = 0.45;
      const pos = new Map(hidden.map(([p, x, y]) => [p, [x, y]]));
      for (let tries = 0; tries < 12; tries++) {
        // everyone gets a turn before anyone has a second one
        if (!sparkQueue.length) {
          sparkQueue = hidden.map(h => h[0]);
          for (let i = sparkQueue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sparkQueue[i], sparkQueue[j]] = [sparkQueue[j], sparkQueue[i]]; }
        }
        const p = sparkQueue.shift();
        if (!pos.has(p) || sparkles.some(s => s.p === p)) continue;
        const [x, y] = pos.get(p);
        // keep sparkling names apart so their labels don't overlap
        if (sparkles.some(s => { const q = pos.get(s.p); return q && Math.abs(q[0] - x) < 170 && Math.abs(q[1] - y) < 50; })) { sparkQueue.push(p); continue; }
        sparkles.push({ p, age: 0, spin: Math.random() * 6 });
        break;
      }
    }
    if (!sparkles.length) return;
    const byP = new Map(hidden.map(h => [h[0], h]));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
    for (const s of sparkles) {
      const h = byP.get(s.p); if (!h) continue;
      const [p, x, y, r] = h;
      const a = s.age < 0.5 ? s.age / 0.5 : s.age > SPARK_LIFE - 0.7 ? Math.max(0, (SPARK_LIFE - s.age) / 0.7) : 1;
      const ease = a * a * (3 - 2 * a);
      // a golden glow and little four-pointed stars twinkling round the blossom
      drawGlow(ctx, x, y, r * 3.2 + 8, '255,226,140', ease);
      for (let i = 0; i < 5; i++) {
        const ang = s.spin + i * 1.2566 + t * 0.8, rr = r * 1.4 + 6 + Math.sin(t * 3 + i) * 3;
        const tw = Math.max(0, Math.sin(t * 7 + i * 1.7 + s.spin));
        star(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, (2.2 + tw * 3) * (0.6 + 0.4 * ease), ease * (0.35 + 0.65 * tw));
      }
      // the name and dates, rising slightly into place
      const ly = y + r + 4 + (1 - ease) * 6;
      ctx.globalAlpha = ease;
      ctx.font = '700 13px Fredoka, Nunito, system-ui, sans-serif';
      const name = fitText(displayName(p.indi), 190);
      const life = lifespan(p.indi) || (p.est ? `c.${p.birth}` : '');
      // a soft dark backing so a sparkling name reads clearly over busy branches
      const bw = ctx.measureText(name).width + 16, bh = life ? 32 : 19;
      ctx.globalAlpha = ease * 0.55; ctx.fillStyle = '#1a1206';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - bw / 2, ly - 3, bw, bh, 8) : ctx.rect(x - bw / 2, ly - 3, bw, bh); ctx.fill();
      ctx.globalAlpha = ease;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(40,24,6,0.85)'; ctx.fillStyle = '#ffe9a8';
      ctx.strokeText(name, x, ly); ctx.fillText(name, x, ly);
      if (life) { ctx.font = '600 10px Nunito, system-ui, sans-serif'; ctx.strokeText(life, x, ly + 15); ctx.fillStyle = '#fff6dc'; ctx.fillText(life, x, ly + 15); }
      ctx.globalAlpha = 1;
    }
  }
  function star(x, y, s, alpha) {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha; ctx.fillStyle = '#fff8d8';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.6); ctx.quadraticCurveTo(x, y, x + s * 1.6, y); ctx.quadraticCurveTo(x, y, x, y + s * 1.6); ctx.quadraticCurveTo(x, y, x - s * 1.6, y); ctx.quadraticCurveTo(x, y, x, y - s * 1.6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ---- interaction: drag to pan, wheel or pinch to zoom, tap to read about someone ----
  const pointers = new Map();
  let drag = null, pinch = null, downAt = null;
  const onDown = e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: view.tx, ty: view.ty }; drag = null; }
  };
  const onMove = e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const s = Math.max(0.5, Math.min(8, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      zoomAt(pinch.cx, pinch.cy, s, pinch);
    } else if (drag) { view.tx = drag.tx + e.clientX - drag.x; view.ty = drag.ty + e.clientY - drag.y; }
  };
  const onUp = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) drag = null;
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 400) tap(e.clientX, e.clientY);
    downAt = null;
  };
  function zoomAt(cx, cy, s, base = view) {
    const rect = canvas.getBoundingClientRect();
    const px = cx - rect.left, py = cy - rect.top;
    const wx = (px - base.tx) / base.s, wy = (py - base.ty) / base.s;
    view.s = s; view.tx = px - wx * s; view.ty = py - wy * s;
  }
  const onWheel = e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.max(0.5, Math.min(8, view.s * (e.deltaY > 0 ? 0.88 : 1.14)))); };
  function tap(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const mx = cx - rect.left, my = cy - rect.top;
    let best = null, bd = Infinity;
    for (const p of people) {
      if (!visible(p, state.T) || !p.hitR) continue;
      const d = Math.hypot(X(p.sx) - mx, Y(p.sy) - my);
      if (d < p.hitR && d < bd) { bd = d; best = p; }
    }
    state.selected = best;
    if (!best) { onSelect(null); return; }
    const info = personLines(best.indi);
    onSelect({ ...info, rel: best === root ? 'You' : relationship(best.gen, best.indi.sex).replace(/^./, c => c.toUpperCase()),
      estimated: best.est ? `born around ${best.birth} (estimated)` : '' });
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', () => { view.s = 1; view.tx = 0; view.ty = 0; });

  // ---- loop ----
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (state.playing) {
      state.T += (state.dir === 'back' ? -1 : 1) * yearsPerSecond() * dt;
      const end = endYear();
      if ((state.dir === 'back' && state.T <= end) || (state.dir === 'forward' && state.T >= end)) { state.T = end; state.playing = false; onEnd(); }
    }
    draw();
    onFrame(state);
  }
  state.T = startYear();
  raf = requestAnimationFrame(frame);

  return {
    canvas, range: [yMin - 3, yMax + 2], count: people.length,
    get state() { return state; },
    play() { const end = endYear(); if (Math.abs(state.T - end) < 0.5) state.T = startYear(); state.playing = true; },
    pause() { state.playing = false; },
    restart() { state.T = startYear(); state.popAt.clear(); life.reset(); },
    seek(year) { state.T = year; state.popAt.clear(); life.reset(); },
    setDirection(d) { state.dir = d === 'forward' ? 'forward' : 'back'; state.T = startYear(); state.popAt.clear(); life.reset(); },
    setStyle(name) { state.season = seasonKey(name); },
    setHour(h) { state.hour = ((+h % 24) + 24) % 24; },
    setAutoDay(on) { state.autoDay = !!on; },
    setVersesOn(on) { state.versesOn = !!on; },
    setVerses(list) { reader = list?.length ? new VerseReader(list) : null; },
    setSpacing(s) { state.spacing = s === 'gen' ? 'gen' : 'year'; },
    setSpeed(x) { state.speed = x; },
    resetView() { view.s = 1; view.tx = 0; view.ty = 0; },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}
