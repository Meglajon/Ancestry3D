// Story mode ("Relative Speed"): a top-down driving game played across the towns and years of your own
// family tree. On foot or at the wheel, mission by mission, by air to other countries and by ink to other
// centuries. The plot is in storyplot.js, the towns in storycity.js, the drawings in storyart.js.
import { displayName, hashString, seededRandom, collectAncestors, lifespan } from './ancestry.js';
import { computeTraits } from './traits.js';
import { lookFor } from './outfits.js';
import { drawPortrait } from './textures.js';
import { buildDialogue, voiceLine } from './dialogue.js';
import { buildStory, eraOf, ERA_NAMES, eraWords, fareBetween, inkCost, residentsOf, oddJob } from './storyplot.js';
import { buildTown, TILE, G, DIRS, laneOffset, drawGround, drawTall, renderMiniMap } from './storycity.js';
import { VEHICLES, trafficMix, trafficCount, paintFor, drawVehicle, drawSmoke, strangerLook, lookSummary, drawPerson, drawItem, drawMarker, FIXED_LOOKS, drawPortraitExtras } from './storyart.js';
import { mountStoryUi, escapeText } from './storyui.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const plainText = s => String(s).replace(/[«»]/g, '');
const T = TILE;
let S = null;
export const storyOpen = () => !!S;
export const storyState = () => S;

// ---------------- Sound ----------------
let AC = null;
function beep(freq = 440, dur = 0.06, type = 'square', vol = 0.04, slide = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), AC.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0005, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* no sound */ }
}
const sfx = {
  pick: () => { beep(880, 0.05); setTimeout(() => beep(1320, 0.09), 50); },
  cash: () => [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => beep(f, 0.08, 'square', 0.035), i * 60)),
  pass: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'square', 0.04), i * 110)),
  fail: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.035), i * 150)),
  bump: () => beep(110, 0.1, 'sawtooth', 0.06, -50),
  door: () => beep(180, 0.05, 'triangle', 0.05),
  talk: () => beep(300 + Math.random() * 200, 0.03, 'square', 0.02),
  jump: () => { beep(200, 0.7, 'sawtooth', 0.05, 1800); setTimeout(() => beep(1600, 0.5, 'sine', 0.05, -1200), 300); },
  siren: () => beep(700, 0.25, 'sine', 0.025, 300),
  ring: () => { beep(1400, 0.05, 'square', 0.03); setTimeout(() => beep(1400, 0.05, 'square', 0.03), 90); },
};

// ---------------- Open / close ----------------
/** Start (or carry on) the story for one person in one file. store = { get, set } over localStorage. */
export function openStory({ data, rootId, store, key, onClose }) {
  closeStory(true);
  const tree = collectAncestors(data, rootId, 12);
  computeTraits(tree, data);
  const story = buildStory(data, rootId, { tree });
  const ui = mountStoryUi();
  S = {
    data, tree, story, ui, store, key: (key || 'a3d') + ':story:' + rootId, onClose, t: 0, last: performance.now(), raf: 0,
    save: null, city: null, mini: null, player: null, heirloom: null, vehicles: [], peds: [], items: [], floats: [], sparks: [],
    mission: null, step: null, busy: false, heat: 0, heatCalm: 0, bust: 0, dial: null, target: null, near: null,
    view: { x: 0, y: 0, z: 1, w: 1, h: 1 }, spawnT: 0, names: [], flash: 0, looks: new Map(), ringT: 0, paused: false,
  };
  let save = null;
  try { save = JSON.parse(store?.get(S.key) || 'null'); } catch (e) { save = null; }
  if (!save || save.v !== 1 || !story.towns.has(save.town)) save = { v: 1, cash: 40, idx: 0, proofs: [], town: story.home.id, year: story.now, oddN: 0, fresh: true };
  save.idx = clamp(save.idx, 0, story.missions.length);
  S.save = save;
  const hero = tree.people.get(rootId);
  S.player = { x: 0, y: 0, ang: 0, vehicle: null, hearts: 3, walk: 0, look: lookSummary(lookFor(hero)), down: 0, invuln: 0, moving: false };
  enterTown(story.towns.get(save.town), save.year, save.fresh ? 'start' : 'load');
  // Hooks for the headless test (tests/story-smoke.py): jump to the current target, finish a step, travel.
  S.debug = {
    warp() { if (S.step?.step.need === 'heirloom' || ['carry', 'chase'].includes(S.step?.step.t)) this.intoHeirloom(); const t = stepTarget() || idleTarget(); if (!t) return; const P = S.player, sp = freeSpotNear(t.x, t.y, 0); if (P.vehicle) { const r = roadNear(t.x, t.y); P.vehicle.x = r.x; P.vehicle.y = r.y; P.vehicle.speed = P.vehicle.vx = P.vehicle.vy = 0; P.x = r.x; P.y = r.y; } else { P.x = sp.x; P.y = sp.y; } S.view.x = P.x; S.view.y = P.y; },
    finishStep() { const st = S.step; if (!st) return; const s = st.step; if (s.t === 'talk') return; if (s.t === 'chase' && st.target) { st.target.hp = 0; return; } if (s.t === 'escape') { S.heat = 0; return; } if (s.t === 'travel') { enterTown(S.story.towns.get(s.town), s.year, 'hub'); return; } nextStep(); },
    intoHeirloom() { const P = S.player; if (P.vehicle) return; P.x = S.heirloom.x; P.y = S.heirloom.y; enterVehicle(S.heirloom); },
    go(townId, year) { enterTown(S.story.towns.get(townId), year, 'hub'); },
    startNext() { const n = nextStory(); if (n && isHere(n) && !S.mission) startMission(n); },
  };
  const onResize = () => S && S.ui.resize();
  window.addEventListener('resize', onResize);
  S.onResize = onResize;
  S.raf = requestAnimationFrame(loop);
  if (save.fresh) { save.fresh = false; S.ui.banner('RELATIVE SPEED', `A story for the ${story.surname} family`, '#ffd84a', 3600); }
  return S;
}

export function closeStory(silent) {
  if (!S) return;
  const s = S;
  persist();
  cancelAnimationFrame(s.raf);
  window.removeEventListener('resize', s.onResize);
  s.ui.destroy();
  S = null;
  if (!silent) s.onClose?.();
}
function persist() { if (S?.store) { S.save.town = S.city.town.id; S.save.year = S.city.year; S.store.set(S.key, JSON.stringify(S.save)); } }

// ---------------- People and looks ----------------
function personLook(id) {
  if (!S.looks.has(id)) { const p = S.tree.people.get(id); S.looks.set(id, p ? lookFor(p) : null); }
  return S.looks.get(id);
}
function speaker(who) {
  if (who === 'dot') return { who: 'Dot Quill', sub: 'County Archivist, retired', look: FIXED_LOOKS.dot };
  if (who === 'blank') return { who: 'Silas Blank', sub: 'Blank & Void', look: FIXED_LOOKS.blank };
  if (who === 'letter') return { who: 'A letter', sub: '', letter: true };
  if (who === 'note') return { who: '', sub: '', note: true };
  const p = S.tree.people.get(who), ch = S.story.chapters.find(c => c.id === who);
  return { who: p ? displayName(p.indi) : 'Somebody', sub: [ch ? 'your ' + ch.rel : '', p ? lifespan(p.indi) : ''].filter(Boolean).join(' · '), look: personLook(who), person: p };
}
async function say(who, text, options) {
  const sp = speaker(who);
  const body = sp.person ? voiceLine(sp.person, text) : plainText(text);
  sfx.talk();
  return S.ui.say({
    who: sp.who, sub: sp.sub, text: body, options, letter: sp.letter,
    portrait: (ctx, frame) => { if (sp.look) { drawPortrait(ctx, sp.look, 96, frame); drawPortraitExtras(ctx, who, sp.look, 96); } else drawPortraitExtras(ctx, sp.letter ? 'letter' : 'note', null, 96); },
  });
}
async function runLines(lines) {
  const tok = S;
  for (const l of lines || []) {
    if (S !== tok) return;
    if (l.greet) {
      const p = S.tree.people.get(l.who);
      const pages = p ? buildDialogue(p, { data: S.data, tree: S.tree }).pages.slice(0, 2) : [];
      for (const pg of pages) { if (S !== tok) return; const sp = speaker(l.who); await S.ui.say({ who: sp.who, sub: sp.sub, text: pg, portrait: (ctx, f) => sp.look && drawPortrait(ctx, sp.look, 96, f) }); }
    } else await say(l.who, l.text);
  }
}

// ---------------- Towns ----------------
function lotPt(kind, who) {
  const giver = S.mission?.def.giver.who;
  return S.city.lot(kind, who || (S.tree.people.has(giver) ? giver : S.story.hero.id));
}
function freeSpotNear(x, y, r = 1) {
  const c = S.city;
  for (let ring = r; ring < 8; ring++) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, px = x + Math.cos(a) * ring * T, py = y + Math.sin(a) * ring * T;
    if (!circleSolid(px, py, 12)) return { x: px, y: py };
  }
  return { x, y };
}
function roadNear(x, y) {
  const c = S.city, tx = Math.floor(x / T), ty = Math.floor(y / T);
  for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (c.at(tx + dx, ty + dy) === G.ROAD) return { x: (tx + dx + 0.5) * T, y: (ty + dy + 0.5) * T, horiz: c.at(tx + dx + 1, ty + dy) === G.ROAD && c.at(tx + dx - 1, ty + dy) === G.ROAD };
  }
  return { x, y, horiz: true };
}
function makeVehicle(type, x, y, ang, extra = {}) {
  const rnd = seededRandom(hashString(type + Math.round(x) + ':' + Math.round(y) + S.vehicles.length));
  const v = { type, x, y, ang, vx: 0, vy: 0, speed: 0, hp: VEHICLES[type].hp, color: paintFor(type, rnd), ai: null, hitCd: 0, charge: 0, stuck: 0, ...extra };
  S.vehicles.push(v);
  return v;
}
function parkHeirloom(x, y) {
  const r = roadNear(x, y), h = S.heirloom;
  const off = laneOffset(S.city, r.horiz ? 0 : 1);
  h.x = r.x + (r.horiz ? 0 : off[0] * 0.2); h.y = r.y; h.ang = r.horiz ? 0 : Math.PI / 2; h.vx = h.vy = h.speed = 0;
}

function enterTown(town, year, where) {
  const P = S.player, old = S.city;
  const keep = where === 'jump' && P.vehicle === S.heirloom;
  if (old && S.mission && S.step?.step.t !== 'travel') failMission('You left before the job was done.');
  S.city = buildTown(town, year);
  S.mini = renderMiniMap(S.city, 2);
  const c = S.city;
  S.vehicles = [];
  S.peds = []; S.items = []; S.floats = []; S.sparks = [];
  const h = S.heirloom || { type: 'heirloom', x: 0, y: 0, ang: 0, vx: 0, vy: 0, speed: 0, hp: VEHICLES.heirloom.hp, color: paintFor('heirloom'), ai: null, hitCd: 0, charge: 0, stuck: 0 };
  S.heirloom = h; h.charge = 0;
  S.vehicles.push(h);
  if (keep) { h.x = clamp(h.x, T, c.wpx - T); h.y = clamp(h.y, T, c.hpx - T); }
  else {
    P.vehicle = null;
    const at = where === 'hub' ? c.lot('hub') : where === 'start' ? c.homeFor(S.story.hero.id) : where === 'police' ? c.lot('police') : where === 'infirmary' ? c.lot('infirmary') : c.lot('garage');
    const sp = freeSpotNear(at.x, at.y, 0);
    P.x = sp.x; P.y = sp.y; P.ang = Math.PI / 2;
    const g = where === 'start' || where === 'load' ? c.lot('garage') : at;
    parkHeirloom(g.x + (where === 'start' ? 0 : 2 * T), g.y + (where === 'start' ? -T : 0));
  }
  // parked vehicles to borrow
  const mix = trafficMix(year);
  [['works', 1], ['farm', 0], ['pub', 2], ['hub', 0], ['school', 1]].forEach(([k, n], i) => {
    const l = c.lots[k]; if (!l) return;
    const px = l.x - 2.2 * T, py = l.y;
    if (!circleSolid(px, py, 16)) makeVehicle(mix[(i + n) % mix.length][0], px, py, 0, { parked: true });
  });
  S.names = residentsOf(S.data, town, year, 40);
  S.heat = 0; S.bust = 0;
  S.view.x = P.x; S.view.y = P.y;
  spawnNpcs();
  for (let i = 0; i < 14; i++) spawnWalker(true);
  S.ui.where(town.name + (town.nation && town.nation !== town.name ? ', ' + town.nation : ''), `${year} · ${ERA_NAMES[c.era]}`);
  if (old) S.ui.banner(town.name, `${year} · ${ERA_NAMES[c.era]}`, '#ffe9a8', 2600);
  persist();
}

// Who is standing about waiting for you: mission givers, and any ancestor whose chapter is here and now.
function spawnNpcs() {
  S.peds = S.peds.filter(p => !p.npc);
  const c = S.city, st = S.story;
  const here = m => m && m.town === c.town.id && m.year === c.year;
  const next = st.missions[S.save.idx];
  const add = (who, lotKind, giver) => {
    if (S.peds.some(p => p.npc && p.who === who)) return;
    const l = who === 'dot' ? c.lot(lotKind) : c.lot(lotKind, who);
    const sp = freeSpotNear(l.x, l.y - (lotKind === 'home' || lotKind === 'garage' ? 0 : 0), 0);
    const look = who === 'dot' ? { female: true, skin: '#eccdb4', hair: '#dcdcd4', top: '#7a4a8a', skirt: '#4a3a5a', r: 1 } : lookSummary(personLook(who));
    S.peds.push({ npc: true, who, giver, x: sp.x, y: sp.y, ang: Math.PI / 2, look, walk: 0, down: 0, name: who === 'dot' ? 'Dot Quill' : displayName(S.tree.people.get(who).indi) });
  };
  if (c.town.id === st.home.id && c.year === st.now && (S.save.idx > 0 || (S.mission && S.mission.i >= 1))) add('dot', 'garage', false);
  for (const ch of st.chapters) if (ch.town.id === c.town.id && ch.year === c.year && S.save.idx > (st.missions.find(m => m.chapter === ch.index)?.index ?? 1e9)) add(ch.id, 'home', false);
  if (here(next) && next.giver.who !== 'auto' && !S.mission) {
    const who = next.giver.who;
    const ex = S.peds.find(p => p.npc && p.who === who);
    if (ex) { const l = c.lot(next.giver.at, who); const sp = freeSpotNear(l.x, l.y, 0); ex.x = sp.x; ex.y = sp.y; ex.giver = true; }
    else if (who === 'dot' && next.giver.at === 'phone') S.peds.push({ npc: true, who: 'dot', giver: true, phone: true, x: c.lot('phone').x, y: c.lot('phone').y, ang: 0, look: null, name: 'A note from Dot' });
    else add(who, next.giver.at, true);
  }
}

// ---------------- Collision ----------------
function circleSolid(x, y, r) {
  const c = S.city;
  if (x < r || y < r || x > c.wpx - r || y > c.hpx - r) return true;
  const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!c.solid(tx, ty)) continue;
    const nx = clamp(x, tx * T, tx * T + T), ny = clamp(y, ty * T, ty * T + T);
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
  }
  return false;
}
function vehicleSolid(v, x, y, ang) {
  const st = VEHICLES[v.type], o = st.len * 0.28, r = st.wid * 0.46, cx = Math.cos(ang) * o, cy = Math.sin(ang) * o;
  return circleSolid(x + cx, y + cy, r) || circleSolid(x - cx, y - cy, r);
}
function moveWalker(p, dx, dy, r = 8) {
  if (!circleSolid(p.x + dx, p.y, r)) p.x += dx;
  if (!circleSolid(p.x, p.y + dy, r)) p.y += dy;
}

// ---------------- Vehicles ----------------
function driveVehicle(v, ctrl, dt) {
  const st = VEHICLES[v.type];
  const rough = S.city.rough(v.x, v.y);
  const maxV = st.max * T * (rough ? 0.6 : 1) * (v.dead ? 0 : 1) * (ctrl.cap || 1);
  if (ctrl.thr > 0) v.speed += st.acc * T * ctrl.thr * dt * (v.speed < 0 ? 2.2 : 1);
  else if (ctrl.thr < 0) v.speed += st.acc * T * ctrl.thr * dt * (v.speed > 0 ? 2.4 : 0.7);
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 2.6 * T * dt);
  if (ctrl.brake) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 15 * T * dt);
  if (v.speed > maxV) v.speed = Math.max(maxV, v.speed - 12 * T * dt);
  v.speed = Math.max(v.speed, -maxV * 0.38);
  const sf = clamp(Math.abs(v.speed) / (3.2 * T), 0, 1) * (v.speed < 0 ? -1 : 1);
  const newAng = v.ang + ctrl.steer * st.turn * sf * dt * (ctrl.brake ? 1.35 : 1);
  if (!vehicleSolid(v, v.x, v.y, newAng)) v.ang = newAng;
  const k = 1 - Math.exp(-(ctrl.brake ? st.grip * 0.45 : st.grip) * dt);
  v.vx += (Math.cos(v.ang) * v.speed - v.vx) * k; v.vy += (Math.sin(v.ang) * v.speed - v.vy) * k;
  let hit = 0;
  const nx = v.x + v.vx * dt;
  if (vehicleSolid(v, nx, v.y, v.ang)) { hit = Math.max(hit, Math.abs(v.vx)); v.vx *= -0.25; v.speed *= 0.45; } else v.x = nx;
  const ny = v.y + v.vy * dt;
  if (vehicleSolid(v, v.x, ny, v.ang)) { hit = Math.max(hit, Math.abs(v.vy)); v.vy *= -0.25; v.speed *= 0.45; } else v.y = ny;
  if (v.hitCd > 0) v.hitCd -= dt;
  if (hit > 3.5 * T) wallHit(v, hit);
  return hit;
}
function wallHit(v, hit) {
  if (v !== S.player.vehicle) return;
  sfx.bump(); spark(v.x + Math.cos(v.ang) * 20, v.y + Math.sin(v.ang) * 20, 6);
  gentleBump(hit);
  if (v !== S.heirloom && hit > 7 * T) damage(v, 1);
}
function damage(v, n) {
  if (v === S.heirloom || v.dead) return;
  v.hp -= n;
  if (v.hp <= 0) { v.dead = true; v.ai = null; if (S.player.vehicle === v) { S.ui.toast(`The ${VEHICLES[v.type].name} has had enough. Press H to call the Heirloom.`); leaveVehicle(true); } }
}
function gentleBump(hit) {
  const m = S.mission, st = S.step;
  if (!m || !st || !st.step.gentle || !st.loaded || hit < 3.2 * T || st.bumpCd > 0) return;
  st.bumpCd = 1; st.bumps = (st.bumps || 0) + 1;
  if (st.bumps >= 3) failMission(st.step.passenger ? 'Your passenger got out and walked.' : 'It is in pieces.');
  else S.ui.toast(`Careful! (${st.bumps}/3)`, 1500);
}
function spark(x, y, n = 5, col = '#ffe08a') { for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = 40 + Math.random() * 120; S.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.35 + Math.random() * 0.2, col }); } }
function float(x, y, text, col = '#fff') { S.floats.push({ x, y, text, t: 2.2, col }); }

// Traffic follows the lanes from junction to junction.
const hasNode = (i, j) => i >= 0 && j >= 0 && i < S.city.xs.length && j < S.city.ys.length;
const nodeC = (i, j) => ({ x: (S.city.xs[i] + 1) * T, y: (S.city.ys[j] + 1) * T });
function lanePt(i, j, dir, sign) { const c = nodeC(i, j), lo = laneOffset(S.city, dir); return { x: c.x + DIRS[dir][0] * 1.7 * T * sign + lo[0], y: c.y + DIRS[dir][1] * 1.7 * T * sign + lo[1] }; }
function planLeg(v) {
  let opts = [0, 1, 2, 3].filter(d => d !== (v.dir + 2) % 4 && hasNode(v.ni + DIRS[d][0], v.nj + DIRS[d][1]));
  if (!opts.length) opts = [(v.dir + 2) % 4];
  let nd;
  const P = S.player, score = d => { const n = nodeC(v.ni + DIRS[d][0], v.nj + DIRS[d][1]); return Math.hypot(n.x - P.x, n.y - P.y); };
  if (v.ai === 'flee') nd = opts.slice().sort((a, b) => score(b) - score(a))[Math.random() < 0.8 ? 0 : opts.length - 1];
  else if (v.ai === 'cop') nd = opts.slice().sort((a, b) => score(a) - score(b))[0];
  else nd = opts.includes(v.dir) && Math.random() < 0.55 ? v.dir : opts[Math.floor(Math.random() * opts.length)];
  v.nd = nd;
  v.wp = [lanePt(v.ni, v.nj, v.dir, -1), lanePt(v.ni, v.nj, nd, 1)];
}
function aiDrive(v, dt) {
  const st = VEHICLES[v.type], P = S.player;
  if (!v.wp || !v.wp.length) planLeg(v);
  let tgt = v.wp[0];
  const fast = v.ai === 'flee' || v.ai === 'cop';
  if (v.ai === 'cop') { const pp = P.vehicle || P; if (Math.hypot(pp.x - v.x, pp.y - v.y) < 5.5 * T) tgt = pp; }
  const dx = tgt.x - v.x, dy = tgt.y - v.y, d = Math.hypot(dx, dy);
  const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
  if (tgt === v.wp[0] && (d < 0.75 * T || (d < 2.4 * T && dx * fx + dy * fy < 0))) {
    v.wp.shift();
    if (!v.wp.length) { v.dir = v.nd; v.ni += DIRS[v.dir][0]; v.nj += DIRS[v.dir][1]; planLeg(v); }
    tgt = v.wp[0];
  }
  const want = Math.atan2(tgt.y - v.y, tgt.x - v.x), da = angDiff(want, v.ang);
  let cruise = st.max * T * (fast ? (v.fast ? 1.06 : 1) : 0.5);
  if (Math.abs(da) > 0.45) cruise = Math.min(cruise, (fast ? 5.5 : 2.4) * T);
  // anything in the way?
  let blocked = false;
  if (!fast && !(v.push > 0)) {
    const reach = st.len / 2 + 1.5 * T + Math.abs(v.speed) * 0.45;
    const test = (ox, oy, rad) => { const rx = ox - v.x, ry = oy - v.y, f = rx * fx + ry * fy, l = -rx * fy + ry * fx; return f > 0 && f < reach + rad && Math.abs(l) < 0.5 * T + rad * 0.5; };
    for (const o of S.vehicles) if (o !== v && test(o.x, o.y, VEHICLES[o.type].len * 0.3)) { blocked = true; break; }
    if (!blocked && !P.vehicle && test(P.x, P.y, 6)) blocked = true;
    if (!blocked) for (const p of S.peds) if (!p.npc && test(p.x, p.y, 4) && S.city.at(Math.floor(p.x / T), Math.floor(p.y / T)) === G.ROAD) { blocked = true; break; }
  }
  if (blocked) { v.stuck += dt; if (v.stuck > 7) { v.push = 1.6; v.stuck = 0; } } else v.stuck = Math.max(0, v.stuck - dt * 2);
  if (v.push > 0) v.push -= dt;
  const thr = blocked ? 0 : v.speed < cruise ? 1 : v.speed > cruise * 1.15 ? -0.6 : 0;
  const hit = driveVehicle(v, { thr, steer: clamp(da * 2.6, -1, 1), brake: blocked }, dt);
  // wedged against a wall: back out
  if (fast) {
    if (Math.abs(v.speed) < 0.8 * T) v.wedge = (v.wedge || 0) + dt; else v.wedge = 0;
    if (v.wedge > 1.2) { v.ang = want; v.speed = 3 * T; v.vx = Math.cos(want) * v.speed; v.vy = Math.sin(want) * v.speed; const r = roadNear(v.x, v.y); if (hit || v.wedge > 3) { v.x = r.x; v.y = r.y; } v.wedge = 0; }
  }
}
function spawnTraffic(target) {
  const c = S.city, P = S.player, n = S.vehicles.filter(v => v.ai === 'traffic').length;
  if (n >= target) return;
  const vr = Math.hypot(S.view.w, S.view.h) / 2 / S.view.z + 2 * T;
  for (let tries = 0; tries < 8; tries++) {
    const i = Math.floor(Math.random() * c.xs.length), j = Math.floor(Math.random() * c.ys.length), d = Math.floor(Math.random() * 4);
    if (!hasNode(i + DIRS[d][0], j + DIRS[d][1])) continue;
    const p = lanePt(i, j, d, 1), dp = Math.hypot(p.x - P.x, p.y - P.y);
    if (dp < vr || dp > 34 * T) continue;
    if (S.vehicles.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 3.5 * T)) continue;
    const mix = trafficMix(c.year), tot = mix.reduce((a, m) => a + m[1], 0);
    let r = Math.random() * tot, type = mix[0][0];
    for (const m of mix) { r -= m[1]; if (r <= 0) { type = m[0]; break; } }
    const v = makeVehicle(type, p.x, p.y, Math.atan2(DIRS[d][1], DIRS[d][0]), { ai: 'traffic', dir: d, ni: i + DIRS[d][0], nj: j + DIRS[d][1] });
    v.color = paintFor(type, Math.random);
    return;
  }
}
function spawnAi(type, nearPt, ai, extra = {}) {
  const c = S.city, P = S.player;
  let best = null, bd = 1e9;
  for (let i = 0; i < c.xs.length; i++) for (let j = 0; j < c.ys.length; j++) {
    const n = nodeC(i, j), d = Math.hypot(n.x - nearPt.x, n.y - nearPt.y) + (extra.minPlayer && Math.hypot(n.x - P.x, n.y - P.y) < extra.minPlayer ? 1e6 : 0);
    if (d < bd) { bd = d; best = [i, j]; }
  }
  const [i, j] = best;
  const dirs = [0, 1, 2, 3].filter(d => hasNode(i + DIRS[d][0], j + DIRS[d][1]));
  const far = d => { const n = nodeC(i + DIRS[d][0], j + DIRS[d][1]); return Math.hypot(n.x - P.x, n.y - P.y); };
  dirs.sort((a, b) => ai === 'flee' ? far(b) - far(a) : far(a) - far(b));
  const d = dirs[0], p = lanePt(i, j, d, 1);
  for (const o of S.vehicles) if (o.ai === 'traffic' && Math.hypot(o.x - p.x, o.y - p.y) < 3 * T) o.gone = true;
  return makeVehicle(type, p.x, p.y, Math.atan2(DIRS[d][1], DIRS[d][0]), { ai, dir: d, ni: i + DIRS[d][0], nj: j + DIRS[d][1], ...extra });
}

function collideVehicles() {
  const vs = S.vehicles, pv = S.player.vehicle;
  for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) {
    const A = vs[a], B = vs[b], ra = (VEHICLES[A.type].len + VEHICLES[A.type].wid) * 0.23, rb = (VEHICLES[B.type].len + VEHICLES[B.type].wid) * 0.23;
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = ra + rb;
    if (d >= min || d < 0.01) continue;
    const nx = dx / d, ny = dy / d, push = (min - d) / 2;
    if (!vehicleSolid(A, A.x - nx * push, A.y - ny * push, A.ang)) { A.x -= nx * push; A.y -= ny * push; }
    if (!vehicleSolid(B, B.x + nx * push, B.y + ny * push, B.ang)) { B.x += nx * push; B.y += ny * push; }
    const vn = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
    if (vn <= 0) continue;
    const wa = A.parked ? 0.8 : 0.5, wb = 1 - wa + (B.parked ? 0.3 : 0);
    A.vx -= nx * vn * wb * 1.1; A.vy -= ny * vn * wb * 1.1; B.vx += nx * vn * wa * 1.1; B.vy += ny * vn * wa * 1.1;
    A.speed = A.vx * Math.cos(A.ang) + A.vy * Math.sin(A.ang); B.speed = B.vx * Math.cos(B.ang) + B.vy * Math.sin(B.ang);
    if (A !== pv && B !== pv) continue;
    const other = A === pv ? B : A;
    if (vn < 2.2 * T) continue;
    sfx.bump(); spark((A.x + B.x) / 2, (A.y + B.y) / 2, 8);
    if (other.ai === 'flee') {
      if (other.hitCd <= 0 && vn > 2.8 * T) { other.hp -= 1; other.hitCd = 0.9; float(other.x, other.y - 30, other.hp > 0 ? 'CRUNCH!' : 'GOT IT!', '#ffd84a'); if (S.step) S.step.hits = (S.step.hits || 0) + 1; }
    } else {
      if (vn > 4 * T) { offence(other.ai === 'cop' ? 0.7 : 0.2); damage(pv, 1); if (other.ai === 'traffic' && Math.random() < 0.5) float(other.x, other.y - 26, quip(), '#fff'); }
      gentleBump(vn);
    }
    other.parked = false;
  }
}
const QUIPS = { modern: ['Oi! I\'ve got a dashcam!', 'Are you blind?', 'That\'s coming off your insurance!', 'Unbelievable!'], retro: ['Oi! Watch it, sunshine!', 'I only waxed that Sunday!', 'Road hog!', 'I\'ve got your number!'],
  vintage: ['I say! Steady on!', 'Road hog!', 'You\'ll frighten the horses!', 'Fetch a constable!'], victorian: ['Have a care, you ruffian!', 'Mind the horse!', 'I shall summon a constable!', 'Well, I never!'],
  georgian: ['Have a care, sirrah!', 'What devilry is that?', 'Mind my horse, you rogue!', 'Call out the watch!'], early: ['God save us, what is it?', 'Witchcraft!', 'Have a care, I pray thee!', 'Call the watch!'] };
const quip = () => { const q = QUIPS[S.city.era]; return q[Math.floor(Math.random() * q.length)]; };

// ---------------- Walkers ----------------
const WALKABLE = new Set([G.PAVE, G.PLAZA, G.APRON]);
function spawnWalker(anywhere) {
  const c = S.city, P = S.player;
  const vr = Math.hypot(S.view.w, S.view.h) / 2 / S.view.z + T;
  for (let tries = 0; tries < 10; tries++) {
    const tx = Math.floor(P.x / T + (Math.random() - 0.5) * 50), ty = Math.floor(P.y / T + (Math.random() - 0.5) * 50);
    if (c.at(tx, ty) !== G.PAVE) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.5) * T;
    if (!anywhere && Math.hypot(x - P.x, y - P.y) < vr) continue;
    const used = new Set(S.peds.map(p => p.rid).filter(Boolean));
    const res = Math.random() < 0.6 ? S.names.find(n => !used.has(n.id)) : null;
    const rnd = Math.random;
    const look = strangerLook(rnd, c.year, res ? res.sex === 'F' : undefined);
    if (res) { if (res.age < 14) look.r = 0.72; else if (res.age > 62) look.hair = '#c8c8c0'; }
    S.peds.push({ x, y, dir: Math.floor(Math.random() * 4), ang: 0, sp: (1.6 + Math.random() * 0.9) * T * (look.r || 1), walk: Math.random() * 6, look, down: 0, cross: 0,
      rid: res?.id, name: res ? res.name : null, sub: res ? `${res.age}${res.job ? ' · ' + res.job.toLowerCase() : ''}` : null });
    return;
  }
}
function updateWalker(p, dt) {
  const c = S.city;
  if (p.down > 0) { p.down -= dt; return; }
  if (p.cop) return updateConstable(p, dt);
  // dive out of the way of the player's car
  const pv = S.player.vehicle;
  if (pv && Math.abs(pv.speed) > 3 * T) {
    const rx = p.x - pv.x, ry = p.y - pv.y, fx = Math.cos(pv.ang), fy = Math.sin(pv.ang), f = rx * fx + ry * fy, l = -rx * fy + ry * fx;
    if (f > 0 && f < 3.2 * T && Math.abs(l) < 0.9 * T) { const s = (l >= 0 ? 1 : -1) * 5.5 * T * dt; moveWalker(p, -fy * s, fx * s); p.walk += dt * 20; return; }
  }
  const [dx, dy] = DIRS[p.dir];
  const ahead = c.at(Math.floor((p.x + dx * 0.7 * T) / T), Math.floor((p.y + dy * 0.7 * T) / T));
  const ok = d => WALKABLE.has(c.at(Math.floor((p.x + DIRS[d][0] * 0.8 * T) / T), Math.floor((p.y + DIRS[d][1] * 0.8 * T) / T)));
  if (p.cross > 0) p.cross -= p.sp * dt;
  else if (!WALKABLE.has(ahead)) {
    const far = c.at(Math.floor((p.x + dx * 3.2 * T) / T), Math.floor((p.y + dy * 3.2 * T) / T));
    if (ahead === G.ROAD && WALKABLE.has(far) && Math.random() < 0.5) p.cross = 3.3 * T;
    else { const side = [(p.dir + 1) % 4, (p.dir + 3) % 4].filter(ok); p.dir = side.length ? side[Math.floor(Math.random() * side.length)] : (p.dir + 2) % 4; return; }
  } else if (Math.random() < dt * 0.12) { const side = [(p.dir + 1) % 4, (p.dir + 3) % 4].filter(ok); if (side.length) p.dir = side[0]; }
  const [mx, my] = DIRS[p.dir];
  // keep to the middle of the pavement
  const cx = (Math.floor(p.x / T) + 0.5) * T, cy = (Math.floor(p.y / T) + 0.5) * T;
  moveWalker(p, mx * p.sp * dt + (my ? (cx - p.x) * dt * 2 : 0), my * p.sp * dt + (mx ? (cy - p.y) * dt * 2 : 0));
  p.ang = Math.atan2(my, mx); p.walk += dt * 9;
}
function nearCar(v, p, margin) {
  const st = VEHICLES[v.type], rx = p.x - v.x, ry = p.y - v.y, fx = Math.cos(v.ang), fy = Math.sin(v.ang);
  return Math.abs(rx * fx + ry * fy) < st.len / 2 + margin && Math.abs(-rx * fy + ry * fx) < st.wid / 2 + margin;
}
function knockDown(p, v) {
  p.down = 2.6; const a = Math.atan2(p.y - v.y, p.x - v.x);
  moveWalker(p, Math.cos(a) * 26, Math.sin(a) * 26);
  float(p.x, p.y - 22, p.cop ? 'Right, that\'s it!' : quip(), '#fff'); sfx.bump();
  if (v === S.player.vehicle) offence(p.cop ? 1 : 0.5);
}

// ---------------- The law ----------------
function offence(n) { S.heat = Math.min(3, S.heat + n); S.heatCalm = 0; }
function updateHeat(dt) {
  const P = S.player, c = S.city, stars = Math.ceil(S.heat - 0.001);
  const footEra = c.year < 1900;
  if (S.heat > 0) {
    S.heatCalm += dt;
    if (S.heatCalm > 7) S.heat = Math.max(0, S.heat - dt / 4.5);
    const cops = S.vehicles.filter(v => v.ai === 'cop').length + S.peds.filter(p => p.cop).length;
    if (cops < stars + (footEra ? 1 : 0) && (S.copT = (S.copT || 0) - dt) <= 0) {
      S.copT = 2.5;
      if (footEra) {
        const sp = freeSpotNear(P.x + (Math.random() < 0.5 ? -1 : 1) * 11 * T, P.y + (Math.random() - 0.5) * 12 * T, 0);
        S.peds.push({ cop: true, x: sp.x, y: sp.y, ang: 0, walk: 0, down: 0, sp: 4.3 * T, look: { skin: '#e6bf9e', hair: '#2a1c14', top: c.year < 1829 ? '#5a3a2a' : '#1a2238', hat: c.year < 1829 ? '#2a2420' : '#141a2c', badge: c.year < 1829 ? null : '#c8c8d0', r: 1.05 } });
      } else {
        const v = spawnAi(c.year >= 1950 ? 'police' : 'vintage', P, 'cop', { minPlayer: 9 * T });
        if (c.year < 1950) v.color = '#101014';
      }
      if (Math.random() < 0.5) sfx.siren();
    }
    // nicked if they have you boxed in
    const px = P.vehicle || P, slow = P.vehicle ? Math.abs(P.vehicle.speed) < 1.3 * T : true;
    let close = false;
    for (const v of S.vehicles) if (v.ai === 'cop' && Math.hypot(v.x - px.x, v.y - px.y) < 2.4 * T) close = true;
    for (const p of S.peds) if (p.cop && !(p.down > 0) && Math.hypot(p.x - px.x, p.y - px.y) < (P.vehicle ? 1.9 : 0.9) * T) close = true;
    S.bust = close && slow ? S.bust + dt : Math.max(0, S.bust - dt * 0.5);
    if (S.bust > (P.vehicle ? 1.5 : 0.5)) nicked();
  } else {
    S.bust = 0;
    for (const v of S.vehicles) if (v.ai === 'cop') { v.ai = 'traffic'; v.wp = null; }
    for (const p of S.peds) if (p.cop) { p.cop = false; p.dir = 0; p.sp = 2 * T; p.cross = 0; }
  }
}
function updateConstable(p, dt) {
  const P = S.player, t = P.vehicle || P, a = Math.atan2(t.y - p.y, t.x - p.x);
  moveWalker(p, Math.cos(a) * p.sp * dt, Math.sin(a) * p.sp * dt);
  p.ang = a; p.walk += dt * 14;
}
function respawnAt(kind) {
  const P = S.player, l = S.city.lot(kind), sp = freeSpotNear(l.x, l.y, 0);
  if (P.vehicle) { P.vehicle.driver = null; P.vehicle = null; }
  P.x = sp.x; P.y = sp.y; P.down = 0; P.hearts = 3; P.invuln = 2;
  parkHeirloom(l.x + 2 * T, l.y + T);
  S.heat = 0; S.bust = 0;
  S.vehicles = S.vehicles.filter(v => v.ai !== 'cop'); S.peds = S.peds.filter(p => !p.cop);
  S.view.x = P.x; S.view.y = P.y;
}
function nicked() {
  const fine = Math.min(S.save.cash, Math.round(20 + S.save.cash * 0.08));
  S.save.cash -= fine;
  if (S.mission) failMission('You were nicked.', true);
  respawnAt('police');
  S.ui.banner('NICKED!', `Fined £${fine} by ${eraWords(S.city.year).law}`, '#8ab4ff');
  sfx.fail(); persist();
}
function flattened() {
  const fee = Math.min(S.save.cash, 30);
  S.save.cash -= fee;
  if (S.mission) failMission('You were flattened.', true);
  respawnAt('infirmary');
  S.ui.banner('FLATTENED!', `Patched up at ${S.city.lot('infirmary').name}${fee ? ' for £' + fee : ''}`, '#ff8a7a');
  sfx.fail(); persist();
}

// ---------------- Missions ----------------
const manh = (a, b) => (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / T;
function nextStory() { return S.story.missions[S.save.idx] || null; }
const isHere = m => m && m.town === S.city.town.id && m.year === S.city.year;

async function startMission(def) {
  const tok = S;
  S.busy = true;
  if (S.player.vehicle) S.player.vehicle.speed = 0;
  await runLines(def.intro);
  if (S !== tok) return;
  S.busy = false;
  S.mission = { def, i: -1 };
  if (def.title) S.ui.banner(def.title, def.act, '#ffd84a', 2000);
  spawnNpcs();
  nextStep();
}
function clearStep() {
  const st = S.step;
  if (st) { S.items = S.items.filter(i => !i.step); if (st.target) st.target.gone = true; S.peds = S.peds.filter(p => !p.stepPed); }
  S.step = null;
}
function nextStep() {
  const m = S.mission; if (!m) return;
  clearStep();
  m.i++;
  if (m.i >= m.def.steps.length) { passMission(); return; }
  spawnNpcs();
  enterStep(m.def.steps[m.i]);
}
function enterStep(step) {
  const P = S.player, c = S.city, pp = P.vehicle || P;
  const st = S.step = { step, k: 0, loaded: false, wait: 0, timer: null, bumps: 0, bumpCd: 0, done: false };
  let tiles = 0, stops = 0;
  if (step.t === 'goto') tiles = manh(pp, lotPt(step.at));
  else if (step.t === 'carry') { const a = lotPt(step.from), b = lotPt(step.to); tiles = manh(pp, a) + manh(a, b) * (step.n * 2 - 1); stops = step.n * 2; S.mission.total = manh(a, b);
    if (step.passenger) { const sp = freeSpotNear(a.x, a.y - 0.2 * T, 0); const giver = S.peds.find(p => p.npc && p.name && p.name.split(' ')[0] === step.passenger); st.pass = { stepPed: true, x: sp.x + 14, y: sp.y, ang: Math.PI / 2, walk: 0, down: 0, look: giver?.look || strangerLook(Math.random, c.year), name: step.passenger }; S.peds.push(st.pass); } }
  else if (step.t === 'race') { let prev = pp; for (const s of step.stops) { const l = lotPt(s); tiles += manh(prev, l); prev = l; } stops = step.stops.length; }
  else if (step.t === 'collect') {
    const l = lotPt(step.around), kind = /sheep|pigs|truants/.test(step.label) ? step.label : 'page';
    let guard = 0;
    while (S.items.filter(i => i.step).length < step.n && guard++ < 600) {
      const a = Math.random() * 7, r = (3 + Math.random() * (step.radius - 3)) * T, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r;
      const tt = c.at(Math.floor(x / T), Math.floor(y / T));
      if (circleSolid(x, y, 14) || (tt !== G.ROAD && tt !== G.PAVE && tt !== G.PLAZA && tt !== G.YARD && tt !== G.GRASS && tt !== G.FIELD && tt !== G.APRON)) continue;
      if (S.items.some(i => Math.hypot(i.x - x, i.y - y) < 2.5 * T)) continue;
      S.items.push({ step: true, x, y, kind, n: S.items.length });
    }
    st.n = S.items.filter(i => i.step).length;
    tiles = manh(pp, l) + st.n * step.radius * 1.5;
  } else if (step.t === 'chase') {
    const horse = c.year < 1900;
    st.target = spawnAi(step.boss ? 'engine1' : horse ? 'erasercoach' : 'eraser', lotPt(step.from), 'flee', { fast: !!step.fast });
    st.target.hp = step.hp; st.maxHp = step.hp; st.timer = 70 + step.hp * 14;
  } else if (step.t === 'escape') { S.heat = Math.max(S.heat, step.heat); S.heatCalm = 0; }
  if (step.timed) st.timer = Math.round(14 + tiles / 5.0 * step.timed + stops * 3.5);
  st.timer0 = st.timer;
}
function stepTarget() {
  const st = S.step; if (!st) return null;
  const s = st.step;
  if (s.t === 'goto' || s.t === 'talk') return lotPt(s.at, S.tree.people.has(s.who) ? s.who : undefined);
  if (s.t === 'carry') return lotPt(st.loaded ? s.to : s.from);
  if (s.t === 'race') return lotPt(s.stops[st.k]);
  if (s.t === 'chase') return st.target;
  if (s.t === 'collect') { let best = null, bd = 1e9; const pp = S.player.vehicle || S.player; for (const i of S.items) if (i.step) { const d = dist(i, pp); if (d < bd) { bd = d; best = i; } } return best; }
  if (s.t === 'travel') return travelTarget(s.town, s.year);
  return null;
}
// Where to go to make a journey: the hub for another town; nowhere in particular for another year.
function travelTarget(townId, year) { return townId !== S.city.town.id ? S.city.lot('hub') : null; }

function updateMission(dt) {
  const st = S.step, P = S.player; if (!st || st.done) return;
  const s = st.step, pv = P.vehicle, pp = pv || P, speed = pv ? Math.abs(pv.speed) : 0;
  if (st.bumpCd > 0) st.bumpCd -= dt;
  if (st.timer != null) { st.timer -= dt; if (st.timer <= 0) { failMission(s.t === 'chase' ? 'They got away.' : 'Too late.'); return; } }
  const tgt = stepTarget();
  const near = (r1, r2) => tgt && dist(tgt, pp) < (pv ? r2 : r1) * T;
  if (s.t === 'goto') {
    if (near(1.5, 2.7) && (!s.need || pv === S.heirloom)) nextStep();
  } else if (s.t === 'talk') {
    if (near(1.7, 2.9) && speed < 2 * T) { st.done = true; converse(s); }
  } else if (s.t === 'race') {
    if (near(1.5, 2.7)) { st.k++; sfx.pick(); float(tgt.x, tgt.y - 20, `${st.k}/${s.stops.length}`, '#ffd84a'); if (st.k >= s.stops.length) nextStep(); }
  } else if (s.t === 'carry') {
    if (near(1.4, 2.8)) {
      if (!pv) st.needWheels = true;
      else if (speed < 1.8 * T) {
        st.wait += dt;
        if (st.wait > 0.55) {
          st.wait = 0; st.loaded = !st.loaded; sfx.door();
          if (st.pass) { if (st.loaded) S.peds = S.peds.filter(p => p !== st.pass); else { st.pass.x = tgt.x; st.pass.y = tgt.y; S.peds.push(st.pass); } }
          if (!st.loaded) { st.k++; float(tgt.x, tgt.y - 20, s.n > 1 ? `${st.k}/${s.n}` : 'Delivered', '#ffd84a'); sfx.pick(); if (st.k >= s.n) nextStep(); else if (st.pass) st.pass = null; }
          else float(tgt.x, tgt.y - 20, s.passenger ? 'In you get' : 'Loaded', '#fff');
        }
      }
    } else { st.wait = 0; st.needWheels = false; }
  } else if (s.t === 'collect') {
    for (const it of S.items) if (it.step && dist(it, pp) < (pv ? 1.5 : 1.0) * T) { it.gone = true; st.k++; sfx.pick(); float(it.x, it.y - 16, `${st.k}/${st.n}`, '#ffd84a'); }
    S.items = S.items.filter(i => !i.gone);
    if (st.k >= st.n) nextStep();
  } else if (s.t === 'chase') {
    const v = st.target;
    if (v.hp <= 0 && !st.stopped) { st.stopped = 0.01; v.ai = null; v.dead = true; S.ui.toast(`You have ${s.drop}.`, 2600); sfx.cash(); }
    if (st.stopped) { st.stopped += dt; st.timer = null; if (st.stopped > 1.3) { v.ai = null; st.target = null; nextStep(); } }
  } else if (s.t === 'travel') {
    if (S.city.town.id === s.town && S.city.year === s.year) nextStep();
  } else if (s.t === 'escape') {
    if (S.heat <= 0) nextStep();
  }
}
async function converse(s) {
  const tok = S;
  S.busy = true;
  if (S.player.vehicle) { S.player.vehicle.speed = 0; S.player.vehicle.vx = S.player.vehicle.vy = 0; }
  for (const line of s.lines || []) { if (S !== tok) return; await say(s.who, line); }
  if (s.quiz && S === tok) {
    let first = true;
    for (;;) {
      const pick = await say(s.who, s.quiz.q, s.quiz.options);
      if (S !== tok) return;
      if (pick === s.quiz.answer || pick < 0) { await say(s.who, first ? 'Right first time. Nobody but family would know that.' : 'There. Now you sound like one of us.'); if (first) { earn(25); } break; }
      first = false;
      await say(s.who, 'No. Any stranger off the road would say that. Think on, and try again.');
      if (S !== tok) return;
    }
  }
  if (S !== tok) return;
  S.busy = false;
  nextStep();
}
function earn(n) { if (n > 0) { S.save.cash += n; S.ui.cash(S.save.cash, true); sfx.cash(); } }
async function passMission() {
  const tok = S, m = S.mission, def = m.def;
  clearStep();
  S.mission = null;
  S.busy = true;
  if (S.player.vehicle) S.player.vehicle.speed *= 0.3;
  await runLines(def.outro);
  if (S !== tok) return;
  S.busy = false;
  let cash = def.reward.cash || 0;
  if (def.reward.perTile) cash = Math.max(25, Math.round((m.total || 20) * def.reward.perTile / 5) * 5);
  earn(cash);
  if (def.reward.proof && !S.save.proofs.includes(def.reward.proof.id)) S.save.proofs.push(def.reward.proof.id);
  if (!def.odd) S.save.idx = Math.max(S.save.idx, def.index + 1);
  S.player.hearts = 3; S.heat = 0;
  S.ui.banner(def.id === 'case-closed' ? 'CASE CLOSED' : 'MISSION PASSED', `+£${cash}` + (def.reward.proof ? ` · Proof: ${def.reward.proof.title}` : ''), '#7be07b', 3600);
  sfx.pass();
  persist(); spawnNpcs();
  if (def.id === 'case-closed') setTimeout(() => S === tok && S.ui.toast('Every town and every year is open. Go and meet the family.', 6000), 3800);
}
function failMission(reason, quiet) {
  if (!S.mission) return;
  clearStep();
  S.mission = null;
  if (!quiet) { S.ui.banner('MISSION FAILED', reason, '#ff5a4a', 3000); sfx.fail(); }
  spawnNpcs();
}

// ---------------- Getting about: tickets and the time dial ----------------
function unlocked() {
  const st = S.story, done = S.save.idx >= st.missions.length;
  const towns = new Map([[st.home.id, st.home]]), years = new Map([[st.now, ['Present day']]]);
  const upto = done ? st.missions.length - 1 : S.save.idx;
  const addYear = (y, label) => { if (!years.has(y)) years.set(y, []); if (label && !years.get(y).includes(label)) years.get(y).push(label); };
  st.missions.forEach((m, i) => {
    if (i > upto) return;
    towns.set(m.town, st.towns.get(m.town));
    const ch = m.chapter != null ? st.chapters[m.chapter] : null;
    addYear(m.year, ch ? `${ch.name}, ${st.towns.get(m.town).name}` : m.year === st.now ? null : `${m.title}, ${st.towns.get(m.town).name}`);
    for (const s of m.steps) if (s.t === 'travel') { towns.set(s.town, st.towns.get(s.town)); const c2 = st.chapters.find(c => c.town.id === s.town && c.year === s.year); addYear(s.year, c2 ? `${c2.name}, ${c2.town.name}` : null); }
  });
  return { towns: [...towns.values()], years: [...years.entries()].sort((a, b) => b[0] - a[0]) };
}
function wanted() { // the town and year the story wants next
  const s = S.step?.step;
  if (s?.t === 'travel') return { town: s.town, year: s.year };
  if (S.mission) return null;
  const n = nextStory();
  return n ? { town: n.town, year: n.year } : null;
}
function openDepartures() {
  const c = S.city, w = eraWords(c.year), u = unlocked(), want = wanted();
  const mode = c.air ? '✈' : '⚓';
  const rows = u.towns.filter(t => t.id !== c.town.id).map(t => {
    const fare = fareBetween(c.town, t), abroad = t.country !== c.town.country;
    return `<div class="row${want?.town === t.id ? ' need' : ''}"><span>${escapeText(t.name)}<small>${escapeText(t.nation)} · ${abroad ? (c.air ? 'by air' : 'by ' + w.boat) : c.year >= 1840 ? 'by train' : 'by coach'}</small></span><b>£${fare}</b><button data-go="go:${t.id}" ${S.save.cash < fare ? 'disabled' : ''}>Go</button></div>`;
  }).join('');
  S.ui.panel(`<h2>${mode} Departures</h2><p>${escapeText(c.town.name)}, ${c.year}. The Heirloom travels as freight. You arrive in the same year you left.</p>${rows || '<p>Nowhere else to go yet. The story will open more places.</p>'}<div class="foot"><button class="alt" data-go="close">Stay here</button></div>`, {
    close: () => S.ui.closePanel(),
    go: id => { const t = S.story.towns.get(id), fare = fareBetween(c.town, t); if (S.save.cash < fare) return; S.ui.closePanel(); S.save.cash -= fare; travel(t, c.year, 'hub'); },
  });
}
function travel(town, year, where) {
  const tok = S;
  S.busy = true;
  S.ui.fade(true, where === 'jump' ? '#eaffff' : '#000');
  if (where === 'jump') sfx.jump(); else sfx.door();
  setTimeout(() => {
    if (S !== tok) return;
    enterTown(town, year, where);
    S.ui.fade(false, where === 'jump' ? '#eaffff' : '#000');
    S.busy = false;
  }, where === 'jump' ? 420 : 700);
}
function openDial() {
  const c = S.city, u = unlocked(), want = wanted();
  const rows = u.years.map(([y, labels]) => {
    const cost = inkCost(c.year, y), cur = y === c.year;
    return `<div class="row${cur ? ' off' : ''}${want && want.year === y && !cur ? ' need' : ''}"><span>${y}<small>${escapeText(labels.join(' · ') || ERA_NAMES[eraOf(y)])}</small></span><b>${cur ? 'now' : '£' + cost}</b><button data-go="set:${y}" ${cur ? 'disabled' : ''}>${S.dial === y ? 'Set ✓' : 'Set'}</button></div>`;
  }).join('');
  S.ui.panel(`<h2>⏱ The Parish Engine</h2><p>Set a year, then get the Heirloom up to full speed on a straight road and hold it there. You stay in ${escapeText(c.town.name)}; only the year changes. Ink is paid for when you jump.</p>${rows}<div class="foot"><button class="alt" data-go="clear">Clear the dial</button><button class="alt" data-go="close">Close</button></div>`, {
    close: () => S.ui.closePanel(),
    clear: () => { S.dial = null; S.ui.closePanel(); },
    set: y => { S.dial = +y; S.ui.closePanel(); S.ui.toast(`Dial set to ${y}. ${S.player.vehicle === S.heirloom ? 'Foot down.' : 'Get in the Heirloom and put your foot down.'}`); sfx.pick(); },
  });
}
function openPedigree() {
  const st = S.story;
  const rows = st.proofs.map(p => { const got = S.save.proofs.includes(p.id); return `<div class="row${got ? '' : ' off'}"><span>${got ? '✔' : '□'} ${escapeText(p.title)}<small>${got ? escapeText(p.detail || '') : 'Not yet proven'}</small></span></div>`; }).join('');
  const n = Math.min(S.save.idx, st.missions.length);
  S.ui.panel(`<h2>📜 The ${escapeText(st.surname)} pedigree</h2><p>${S.save.proofs.length} of ${st.proofs.length} proofs lodged · ${n} of ${st.missions.length} missions passed · £${S.save.cash}</p>${rows}<div class="foot"><button class="alt" data-go="close">Close</button></div>`, { close: () => S.ui.closePanel() });
}
function openPause() {
  const k = (a, b) => `<p><kbd>${a}</kbd> ${b}</p>`;
  S.ui.panel(`<h2>Relative Speed</h2><p>${escapeText(S.story.missions[S.save.idx]?.brief || 'Free roam: every town, every year.')}</p>
    ${S.ui.touch ? '<p>Left thumb steers and walks. GO talks, gets in and out and starts jobs. CAR calls the Heirloom.</p>' : k('WASD / arrows', 'walk, drive') + k('E', 'talk, get in or out, start a job') + k('Space', 'handbrake') + k('T', 'time dial') + k('H', 'call the Heirloom (£10)') + k('P', 'pedigree') }
    <div class="foot"><button data-go="close">Resume</button><button class="alt" data-go="quit">Save and leave</button><button class="alt" data-go="reset">Restart the story</button></div>`, {
    close: () => S.ui.closePanel(),
    quit: () => { S.ui.closePanel(); closeStory(); },
    reset: () => { S.ui.panel('<h2>Restart the story?</h2><p>Your cash, proofs and progress for this person will be wiped.</p><div class="foot"><button data-go="yes">Restart</button><button class="alt" data-go="close">Keep playing</button></div>', {
      close: () => S.ui.closePanel(),
      yes: () => { const { data, store, onClose } = S, rootId = S.story.hero.id, key = S.key.replace(/:story:.*$/, ''); store?.set(S.key, ''); S.store = null; closeStory(true); openStory({ data, rootId, store, key, onClose }); },
    }); },
  });
}
function callHeirloom() {
  const P = S.player, h = S.heirloom;
  if (P.vehicle === h || S.busy) return;
  if (dist(P.vehicle || P, h) < 4 * T) { S.ui.toast('The Heirloom is right there.'); return; }
  const fee = S.save.cash >= 10 ? 10 : 0;
  S.save.cash -= fee;
  const pp = P.vehicle || P;
  parkHeirloom(pp.x + Math.cos(P.ang) * 2 * T, pp.y + Math.sin(P.ang) * 2 * T);
  S.flash = 0.5; spark(h.x, h.y, 14, '#a8ecff'); sfx.pick();
  S.ui.toast(`The Heirloom skips a minute to catch you up${fee ? ' (£10 of ink)' : ''}.`);
}

// ---------------- Player ----------------
function enterVehicle(v) {
  const P = S.player;
  if (v.ai === 'flee' || v.ai === 'cop' || v.dead) return;
  if (v.ai === 'traffic') {
    const sp = freeSpotNear(v.x - Math.sin(v.ang) * 26, v.y + Math.cos(v.ang) * 26, 0);
    S.peds.push({ x: sp.x, y: sp.y, dir: 0, ang: 0, sp: 2.2 * T, walk: 0, look: strangerLook(Math.random, S.city.year), down: 0, cross: 0 });
    float(sp.x, sp.y - 20, `Oi! That's my ${eraWords(S.city.year).ride}!`); offence(0.34);
  }
  v.ai = null; v.parked = false; v.wp = null;
  P.vehicle = v; sfx.door();
}
function leaveVehicle(force) {
  const P = S.player, v = P.vehicle; if (!v) return;
  if (!force && Math.abs(v.speed) > 2.5 * T) { S.ui.toast('Slow down first.', 1200); return; }
  const side = VEHICLES[v.type].wid / 2 + 15;
  for (const s of [1, -1]) {
    const x = v.x - Math.sin(v.ang) * side * s, y = v.y + Math.cos(v.ang) * side * s;
    if (!circleSolid(x, y, 9)) { P.x = x; P.y = y; P.vehicle = null; sfx.door(); return; }
  }
  const sp = freeSpotNear(v.x, v.y, 1); P.x = sp.x; P.y = sp.y; P.vehicle = null;
}
function findNear() {
  const P = S.player, pv = P.vehicle, pp = pv || P, c = S.city, slow = !pv || Math.abs(pv.speed) < 2 * T;
  const within = (o, a, b) => Math.hypot(o.x - pp.x, o.y - pp.y) < (pv ? b : a) * T;
  if (!S.mission && slow) {
    for (const p of S.peds) if (p.npc && within(p, 1.8, 3)) {
      const next = nextStory();
      if (p.giver && isHere(next)) return { label: p.phone ? 'Read the note' : `Talk to ${p.name.split(' ')[0]}`, go: () => startMission(next) };
      if (!pv && p.who !== 'dot') return { label: `Chat with ${p.name.split(' ')[0]}`, go: () => chat(p.who) };
      if (!pv && p.who === 'dot') return { label: 'Talk to Dot', go: () => dotHint() };
    }
    if (within(c.lots.market, 1.8, 3)) return { label: 'Odd jobs board (£)', go: () => startMission(oddJob(c.town, c.year, hashString(c.town.id + c.year) + (S.save.oddN = (S.save.oddN || 0) + 1))) };
  }
  if (slow && within(c.lots.hub, 2, 3.2) && !(S.step && S.step.loaded)) return { label: c.air ? 'Departures ✈' : 'Tickets ⚓', go: openDepartures };
  if (!pv) {
    let best = null, bd = 1.9 * T;
    for (const v of S.vehicles) { const d = dist(v, P) - VEHICLES[v.type].len * 0.25; if (d < bd && v.ai !== 'flee' && v.ai !== 'cop' && !v.dead) { bd = d; best = v; } }
    if (best) return { label: best === S.heirloom ? 'Get in the Heirloom' : `Borrow the ${VEHICLES[best.type].name}`, go: () => enterVehicle(best) };
    return null;
  }
  return slow ? { label: '', go: () => leaveVehicle() } : null;
}
async function chat(who) {
  const tok = S, p = S.tree.people.get(who); if (!p) return;
  S.busy = true;
  const pages = buildDialogue(p, { data: S.data, tree: S.tree }).pages, sp = speaker(who);
  for (const pg of pages.slice(0, 7)) { if (S !== tok) return; await S.ui.say({ who: sp.who, sub: sp.sub, text: pg, portrait: (ctx, f) => drawPortrait(ctx, sp.look, 96, f) }); }
  if (S === tok) S.busy = false;
}
async function dotHint() {
  const tok = S, n = nextStory();
  S.busy = true;
  await say('dot', n ? `${n.brief} ${isHere(n) ? '' : `That's ${S.story.towns.get(n.town).name}, ${n.year}.`} And mind the paintwork.` : `Nothing left to prove, dear. Go and visit them. Take your time; you've got all of it.`);
  if (S === tok) S.busy = false;
}

function updatePlayer(dt) {
  const P = S.player, inp = S.ui.input, k = inp.keys;
  let kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  let ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  if (P.invuln > 0) P.invuln -= dt;
  if (P.down > 0) { P.down -= dt; return; }
  const v = P.vehicle;
  if (!v) {
    if (inp.stick.active) { kx = inp.stick.x; ky = inp.stick.y; }
    const m = Math.hypot(kx, ky);
    P.moving = m > 0.1;
    if (P.moving) {
      const sp = (k.has('ShiftLeft') || k.has('ShiftRight') ? 6.2 : 4.7) * T * Math.min(1, m);
      moveWalker(P, kx / m * sp * dt, ky / m * sp * dt);
      P.ang = Math.atan2(ky, kx); P.walk += dt * 13;
    }
    // traffic can knock you over
    if (P.invuln <= 0) for (const o of S.vehicles) if (o.ai && Math.abs(o.speed) > 3 * T && nearCar(o, P, 4)) {
      P.hearts--; P.down = 1.2; P.invuln = 2.5; sfx.bump(); const a = Math.atan2(P.y - o.y, P.x - o.x); moveWalker(P, Math.cos(a) * 30, Math.sin(a) * 30);
      if (P.hearts <= 0) flattened();
      break;
    }
    return;
  }
  let ctrl;
  if (inp.stick.active) {
    const want = Math.atan2(inp.stick.y, inp.stick.x), da = angDiff(want, v.ang), mag = Math.hypot(inp.stick.x, inp.stick.y);
    const rev = Math.abs(da) > 2.3 && v.speed < 2 * T;
    ctrl = { thr: rev ? -mag : mag * (Math.abs(da) > 1.2 ? 0.5 : 1), steer: rev ? clamp(-angDiff(want + Math.PI, v.ang) * 2.5, -1, 1) * -1 : clamp(da * 2.4, -1, 1), brake: inp.brake };
  } else ctrl = { thr: -ky, steer: kx, brake: k.has('Space') || inp.brake };
  driveVehicle(v, ctrl, dt);
  P.x = v.x; P.y = v.y; P.ang = v.ang;
  // knock people over
  if (Math.abs(v.speed) > 2.4 * T) for (const p of S.peds) if (!p.npc && !p.stepPed && !(p.down > 0) && nearCar(v, p, 5)) knockDown(p, v);
  // the Parish Engine
  if (v === S.heirloom) {
    const st = VEHICLES.heirloom, armed = S.dial != null && S.dial !== S.city.year;
    if (armed && Math.abs(v.speed) > st.max * T * 0.84) v.charge = Math.min(1, v.charge + dt / 2.3); else v.charge = Math.max(0, v.charge - dt / 1.7);
    if (v.charge >= 1) {
      const cost = inkCost(S.city.year, S.dial);
      v.charge = 0;
      if (S.save.cash < cost) { S.ui.toast(`Not enough ink: that jump costs £${cost}. Odd jobs pay (look for £ in the market place).`, 4200); S.dial = null; }
      else { S.save.cash -= cost; const y = S.dial; S.dial = null; spark(v.x, v.y, 30, '#a8ecff'); travel(S.city.town, y, 'jump'); }
    }
  }
}

// ---------------- Frame ----------------
function handleQueue() {
  const ui = S.ui, q = ui.input.queue;
  while (q.length) {
    const act = q.shift();
    if (ui.dialogOpen) { if (act === 'action' || act === 'space' || /^opt/.test(act)) ui._advance?.(act); continue; }
    if (ui.panelOpen) { if (act === 'pause' || act === 'dial' || act === 'pedigree') ui._panelClose?.(); continue; }
    if (S.busy) continue;
    if (act === 'action') S.near?.go();
    else if (act === 'dial') openDial();
    else if (act === 'pedigree') openPedigree();
    else if (act === 'pause') openPause();
    else if (act === 'call') callHeirloom();
  }
}
function update(dt) {
  const P = S.player, c = S.city;
  S.t += dt;
  // a story mission that starts itself
  const next = nextStory();
  if (!S.mission && !S.busy && next && next.giver.who === 'auto' && isHere(next)) { startMission(next); return; }
  updatePlayer(dt);
  if (S.busy) return;
  for (const v of S.vehicles) if (v !== P.vehicle) { if (v.ai) aiDrive(v, dt); else driveVehicle(v, { thr: 0, steer: 0, brake: true }, dt); }
  collideVehicles();
  for (const p of S.peds) if (!p.npc && !p.stepPed) updateWalker(p, dt);
  updateHeat(dt);
  updateMission(dt);
  if (!S || S.busy) return;
  // population
  const pp = P.vehicle || P;
  S.vehicles = S.vehicles.filter(v => !v.gone && (v === S.heirloom || v === P.vehicle || v === S.step?.target || v.ai === 'cop' || dist(v, pp) < (v.ai ? 40 : 60) * T));
  S.peds = S.peds.filter(p => p.npc || p.stepPed || p.cop || dist(p, pp) < 34 * T);
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = 0.35; spawnTraffic(trafficCount(c.year)); if (S.peds.filter(p => !p.npc).length < (c.year < 1714 ? 10 : c.year < 1837 ? 14 : 22)) spawnWalker(false); }
  for (const f of S.floats) { f.t -= dt; f.y -= 14 * dt; }
  S.floats = S.floats.filter(f => f.t > 0);
  for (const s of S.sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  S.sparks = S.sparks.filter(s => s.t > 0);
  if (S.flash > 0) S.flash -= dt;
  // the phone box rings until you answer it
  if (S.step?.step.t === 'goto' && S.step.step.at === 'phone') { S.ringT -= dt; if (S.ringT <= 0) { S.ringT = 1.6; const l = c.lot('phone'); float(l.x, l.y - 18, 'RING RING', '#ffd84a'); if (dist(l, pp) < 12 * T) sfx.ring(); } }
  S.near = findNear();
  S.target = S.step ? stepTarget() : idleTarget();
}
function idleTarget() {
  const n = nextStory(); if (!n) return null;
  if (isHere(n)) return S.peds.find(p => p.npc && p.giver) || null;
  return travelTarget(n.town, n.year);
}
function hud() {
  const ui = S.ui, P = S.player, c = S.city, st = S.step, m = S.mission;
  ui.cash(S.save.cash);
  ui.stat(P.hearts, Math.ceil(S.heat - 0.001));
  let obj = '';
  const guide = (town, year) => {
    const t = S.story.towns.get(town);
    if (town !== c.town.id) return `Buy a ticket to <b>${escapeText(t.name)}</b> at ${escapeText(c.lots.hub.name)}` + (year !== c.year ? `, then jump to <b>${year}</b>` : '');
    if (year !== c.year) return S.dial === year ? `Dial set: get the Heirloom up to full speed for <b>${year}</b>` : `Set the dial to <b>${year}</b> (${ui.touch ? '⏱' : 'T'}), then drive the Heirloom flat out`;
    return '';
  };
  if (m && st) {
    const s = st.step;
    let text = escapeText(s.text || '');
    if (s.t === 'travel') text = guide(s.town, s.year) || text;
    if (s.t === 'carry') text += ` <b>${st.loaded ? '▶ deliver' : '▶ collect'}${s.n > 1 ? ` ${Math.min(st.k + 1, s.n)}/${s.n}` : ''}</b>`;
    if (s.t === 'collect') text += ` <b>${st.k}/${st.n}</b>`;
    if (s.t === 'race') text += ` <b>${st.k}/${s.stops.length}</b>`;
    if (s.t === 'chase' && st.target) text += ` <b>${'■'.repeat(Math.max(0, st.target.hp))}${'□'.repeat(Math.max(0, st.maxHp - st.target.hp))}</b>`;
    if (s.gentle && st.loaded) text += ` <b>${'♦'.repeat(3 - st.bumps)}</b>`;
    if (s.need === 'heirloom' && P.vehicle !== S.heirloom) text += ' <b>(in the Heirloom)</b>';
    if (st.needWheels) text += ' <b>(you need wheels for this)</b>';
    const tm = st.timer != null ? `<span class="tm${st.timer < 15 ? ' low' : ''}">${Math.floor(st.timer / 60)}:${String(Math.floor(st.timer % 60)).padStart(2, '0')}</span>` : '';
    obj = `<small>${escapeText(m.def.title)}</small>${text}${tm}`;
  } else if (!S.busy) {
    const n = nextStory();
    if (!n) obj = '<small>Free roam</small>Every town and every year in your tree is open';
    else if (isHere(n)) { const g = S.peds.find(p => p.npc && p.giver); obj = `<small>Next: ${escapeText(n.title)}</small>${g ? (g.phone ? 'There is a note pinned up at ' + escapeText(c.lots.phone.name) : 'Find <b>' + escapeText(g.name) + '</b>') : ''}`; }
    else obj = `<small>Next: ${escapeText(n.title)}</small>${guide(n.town, n.year)}`;
  }
  ui.objective(obj);
  ui.hint(S.busy || ui.panelOpen || ui.dialogOpen || !S.near || !S.near.label ? '' : (ui.touch ? 'GO: ' : 'E: ') + S.near.label);
  const h = S.heirloom;
  if (S.dial != null && S.dial !== c.year) ui.dial(`DIAL ${S.dial} · INK £${inkCost(c.year, S.dial)}<i><b style="width:${Math.round(h.charge * 100)}%"></b></i>`); else ui.dial('');
}

function render() {
  const ui = S.ui, g = ui.ctx, P = S.player, c = S.city;
  const { w, h, dpr } = ui.resize();
  const pp = P.vehicle || P, sp = P.vehicle ? Math.abs(P.vehicle.speed) / (15 * T) : 0;
  const base = clamp(Math.min(w, h) / (15.5 * T), 0.75 * dpr, 2.2 * dpr);
  const V = S.view;
  V.w = w; V.h = h;
  const zt = base * (1 - 0.3 * clamp(sp, 0, 1));
  V.z += (zt - V.z) * 0.06; if (!V.init) { V.z = zt; V.init = true; }
  const lead = P.vehicle ? 0.22 : 0;
  const tx = pp.x + (P.vehicle ? P.vehicle.vx * lead : 0), ty = pp.y + (P.vehicle ? P.vehicle.vy * lead : 0);
  V.x += (tx - V.x) * 0.14; V.y += (ty - V.y) * 0.14;
  const z = V.z, t = S.t;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  drawGround(g, c, V);
  const world = () => { g.setTransform(z, 0, 0, z, w / 2 - V.x * z, h / 2 - V.y * z); };
  const at = (x, y, ang, fn) => { g.save(); g.translate(x, y); if (ang) g.rotate(ang); fn(); g.restore(); };
  world();
  // markers on the ground
  const tgt = S.target;
  if (tgt && !tgt.type) at(tgt.x, tgt.y, 0, () => drawMarker(g, t, tgt.kind && !tgt.name ? '#ffd84a' : '#ffd84a', tgt.npc ? 20 : S.step?.step.t === 'collect' ? 14 : 30));
  if (S.step?.step.t === 'race') { const s = S.step.step; for (let i = S.step.k + 1; i < s.stops.length; i++) { const l = lotPt(s.stops[i]); at(l.x, l.y, 0, () => { g.globalAlpha = 0.35; drawMarker(g, t + i, '#ffffff', 22); g.globalAlpha = 1; }); } }
  if (!S.mission) { at(c.lots.market.x, c.lots.market.y, 0, () => drawMarker(g, t, '#7be07b', 22, '£')); }
  at(c.lots.hub.x, c.lots.hub.y, 0, () => drawMarker(g, t + 0.5, '#a8d8ff', 24, c.air ? '✈' : '⚓'));
  for (const it of S.items) at(it.x, it.y, 0, () => drawItem(g, it.kind, t, it.n));
  for (const p of S.peds) if (p.look) at(p.x, p.y, p.ang, () => drawPerson(g, p, t));
  for (const v of S.vehicles) {
    at(v.x, v.y, v.ang, () => { drawVehicle(g, v, t); });
    if (v.dead || (v.ai === 'flee' && v.hp <= 2)) at(v.x, v.y, 0, () => drawSmoke(g, t, v.dead ? 1 : 0.6));
  }
  if (!P.vehicle && !(P.invuln > 0 && Math.floor(t * 12) % 2)) at(P.x, P.y, P.ang, () => drawPerson(g, { look: P.look, walk: P.moving ? P.walk : 0, down: P.down > 0 ? 0.3 : 0 }, t));
  if (S.step?.target) { const v = S.step.target; at(v.x, v.y, 0, () => drawMarker(g, t, '#ff5a4a', 34)); }
  for (const s of S.sparks) { g.fillStyle = s.col; g.globalAlpha = clamp(s.t * 3, 0, 1); g.fillRect(s.x - 2, s.y - 2, 4, 4); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawTall(g, c, V, t);
  // labels over everything
  world();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = (x, y, text, col = '#fff', size = 12) => { g.font = `700 ${size}px "Fredoka", "Nunito", sans-serif`; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); };
  for (const k in c.lots) { const l = c.lots[k]; if (k !== 'phone' && Math.abs(l.x - pp.x) < 11 * T && Math.abs(l.y - pp.y) < 8 * T) label(l.x, l.y - 4, l.name.replace(/^the /, '').replace(/^./, ch => ch.toUpperCase()), '#ffe9a8', 11); }
  for (const p of S.peds) {
    if (p.npc && p.giver && !S.mission) { const y = p.y - 34 - Math.abs(Math.sin(t * 3)) * 6; label(p.x, y, '!', '#ffd84a', 26); }
    if (p.name && dist(p, pp) < (p.npc ? 6 : 2.6) * T && p.look) { label(p.x, p.y - 20, p.name, '#fff', 11); if (p.sub && dist(p, pp) < 2.6 * T) label(p.x, p.y - 32, p.sub, '#d8d2c0', 9); }
  }
  for (const f of S.floats) { g.globalAlpha = clamp(f.t, 0, 1); label(f.x, f.y, f.text, f.col, 12); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  // arrow to the target when it is off screen
  if (tgt) {
    const sx = (tgt.x - V.x) * z + w / 2, sy = (tgt.y - V.y) * z + h / 2, m = 46 * dpr;
    if (sx < m || sy < m || sx > w - m || sy > h - m) {
      const a = Math.atan2(sy - h / 2, sx - w / 2), r = Math.min((w / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const ax = w / 2 + Math.cos(a) * r, ay = h / 2 + Math.sin(a) * r, col = tgt.type ? '#ff5a4a' : '#ffd84a';
      g.save(); g.translate(ax, ay); g.rotate(a); g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(16 * dpr, 0); g.lineTo(-10 * dpr, -11 * dpr); g.lineTo(-4 * dpr, 0); g.lineTo(-10 * dpr, 11 * dpr); g.closePath(); g.stroke(); g.fill(); g.restore();
      g.font = `700 ${12 * dpr}px "Fredoka", sans-serif`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr;
      const dtl = Math.round(Math.hypot(tgt.x - pp.x, tgt.y - pp.y) / T * 4) + 'm';
      g.strokeText(dtl, ax - Math.cos(a) * 26 * dpr, ay - Math.sin(a) * 26 * dpr); g.fillText(dtl, ax - Math.cos(a) * 26 * dpr, ay - Math.sin(a) * 26 * dpr);
    }
  }
  // the Engine winding up
  const ch = S.heirloom.charge;
  if (ch > 0.02) { const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7); gr.addColorStop(0, 'rgba(160,236,255,0)'); gr.addColorStop(1, `rgba(160,236,255,${ch * 0.75})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  if (S.flash > 0) { g.fillStyle = `rgba(200,240,255,${S.flash})`; g.fillRect(0, 0, w, h); }
  if (S.heat > 0 && Math.floor(t * 3) % 2) { g.fillStyle = 'rgba(60,110,255,0.07)'; g.fillRect(0, 0, w, h); }
  miniMap(pp, tgt);
}
function miniMap(pp, tgt) {
  const m = S.ui.mini, c = S.city, R = 66, sc = 2.6;
  m.save(); m.clearRect(0, 0, 132, 132);
  m.beginPath(); m.arc(R, R, R, 0, 7); m.clip();
  m.fillStyle = '#2a6aa8'; m.fillRect(0, 0, 132, 132);
  const px = pp.x / T, py = pp.y / T;
  m.imageSmoothingEnabled = false;
  m.drawImage(S.mini, R - px * sc, R - py * sc, c.W * sc, c.H * sc);
  const dot = (o, col, r = 3.5, ring) => {
    let x = R + (o.x / T - px) * sc, y = R + (o.y / T - py) * sc; const d = Math.hypot(x - R, y - R);
    if (d > R - 6) { x = R + (x - R) / d * (R - 6); y = R + (y - R) / d * (R - 6); }
    m.fillStyle = col; m.beginPath(); m.arc(x, y, r, 0, 7); m.fill(); m.lineWidth = 1.5; m.strokeStyle = ring || '#000'; m.stroke();
  };
  dot(c.lots.hub, '#a8d8ff', 3);
  if (!S.mission) dot(c.lots.market, '#7be07b', 3);
  if (S.player.vehicle !== S.heirloom) dot(S.heirloom, '#e8c040', 3.5);
  for (const v of S.vehicles) if (v.ai === 'cop') dot(v, '#4a7aff', 3);
  for (const p of S.peds) if (p.cop) dot(p, '#4a7aff', 2.5);
  for (const i of S.items) if (i.step) dot(i, '#fff', 2);
  if (tgt) dot(tgt, tgt.type ? '#ff5a4a' : '#ffd84a', 4.5, '#fff');
  m.fillStyle = '#fff'; m.strokeStyle = '#000'; m.lineWidth = 2;
  m.translate(R, R); m.rotate(S.player.ang); m.beginPath(); m.moveTo(7, 0); m.lineTo(-5, -5); m.lineTo(-2, 0); m.lineTo(-5, 5); m.closePath(); m.stroke(); m.fill();
  m.restore();
}

function loop(now) {
  if (!S) return;
  const s = S;
  s.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016);
  s.last = now;
  try {
    handleQueue();
    if (!S) return;
    if (!s.ui.panelOpen && !s.ui.dialogOpen) update(dt); else s.t += dt * 0.0001;
    if (!S) return;
    hud();
    render();
  } catch (e) {
    console.error(e);
    s.err = (s.err || 0) + 1;
    if (s.err < 3) s.ui.toast('Something went wrong: ' + e.message, 6000);
  }
}
