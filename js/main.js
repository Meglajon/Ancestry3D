// Ancestry: A Battle in Time — drive through a GEDCOM family tree's towns and years (Story mode), roll round it
// as the person at its root (the Fluffy garden), or look at it (Visualisation).
import * as THREE from 'three';
import { parseGedcom, decodeGedcomBytes } from './gedcom.js';
import { genAt, collectAncestors, layoutAncestors, displayName, firstName, lifespan, relationship, countAncestors, birthYear, hashString } from './ancestry.js';
import { buildDialogue, bumpQuip, foundSpeech } from './dialogue.js';
import { buildFlatWorld, drawFluffyPortrait } from './fluffy.js';
import { createMissions } from './missions.js';
import { computeTraits } from './traits.js';
import { openViz, vizOpen, vizView } from './viz.js';
import { openStory, closeStory, storyOpen, storyState } from './storygame.js';

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
const desktop = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------------- State ----------------
// The 3D looks (Retro and Island) have gone: the garden of fluffy balls is the one way to walk round the tree.
const GEN_NAMES = g => g === 0 ? 'YOU' : g === 1 ? 'PARENTS' : g === 2 ? 'GRANDPARENTS' : g === 3 ? 'GREAT-GRANDPARENTS' : g === 4 ? '2X GREAT-GRANDPARENTS' : `${g - 2}X GREAT-GRANDPARENTS`;
const LOOK_NOTES = {
  fluffy: 'Fluffy: a top-down 2D garden where you and every ancestor are round, fluffy balls. Their fur takes the colours of their period clothes, with their hair (or hat) as a tuft on top. Roll along the paths, bump into people to make them squeak, and chat to them all.',
};
const LOGOS = {
  fluffy: ['<span class="l1">Ancestry</span><span class="l2">A Battle in Time</span>', 'Four hundred years of family. One very old car.'],
};
const S = {
  data: null, fileName: '', fileKey: '', rootId: null, maxGen: 8,
  style: 'fluffy', theme: 'fluffy', couples: false, builtCouples: null,
  tree: null, world: null, running: false, paused: true,
  yaw: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), bob: 0,
  keys: new Set(), run: false, stick: { x: 0, y: 0, active: false },
  target: null, talkingTo: null, waypoint: null, met: new Set(), lastGen: -1,
  mapZoom: 1, quipAt: new Map(), quipN: 0,
  flatCam: { x: 0, z: 0, scale: 40 }, flatZoom: 1, step: 0,
};

// ---------------- Canvas ----------------
const flatCanvas = $('flat');
const flatCtx = flatCanvas.getContext('2d');

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const fdpr = Math.min(2, window.devicePixelRatio || 1);
  flatCanvas.width = Math.round(w * fdpr); flatCanvas.height = Math.round(h * fdpr);
  if (!$('automap').classList.contains('hidden')) drawMap();
}
window.addEventListener('resize', resize);

// ---------------- Audio (tiny synth, no files) ----------------
let actx = null;
function audio() {
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  return actx;
}
function beep(freq = 440, dur = 0.05, type = 'square', vol = 0.05, slide = 0) {
  const a = audio(); if (!a) return;
  try {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  } catch (e) { /* audio is optional */ }
}
const sfx = {
  select: () => { beep(880, 0.07, 'sine', 0.06); setTimeout(() => beep(1320, 0.09, 'sine', 0.05), 70); },
  meet: () => [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.09, 'sine', 0.05), i * 70)),
  blip: (female) => beep((female ? 620 : 420) + Math.random() * 240, 0.045, 'triangle', 0.045, (Math.random() - 0.5) * 300),
  step: () => beep(180 + Math.random() * 40, 0.04, 'sine', 0.03),
  map: () => beep(660, 0.1, 'sine', 0.04, 300),
  bonk: () => beep(160, 0.08, 'square', 0.05, -60),
};

// ---------------- Messages ----------------
const msgs = [];
function message(text) {
  msgs.push({ text, t: performance.now() });
  if (msgs.length > 4) msgs.shift();
  renderMsgs();
}
function renderMsgs() {
  const now = performance.now();
  while (msgs.length && now - msgs[0].t > 5000) msgs.shift();
  $('msgs').innerHTML = msgs.map(m => `<div>${escapeHtml(m.text)}</div>`).join('');
}
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- Look ----------------
function applyStyle() {
  S.style = S.theme = 'fluffy';
  store.set('a3d:style', 'fluffy');
  document.body.classList.add('island', 'fluffy');   // 'island' carries the cozy menu styles
  $('logo').innerHTML = LOGOS.fluffy[0];
  $('tagline').textContent = LOGOS.fluffy[1];
  $('lookNote').textContent = LOOK_NOTES.fluffy;
  resize();
}
function refreshResume() {
  // A different couples layout or shape needs the garden rebuilt, so offer ENTER rather than RESUME.
  const same = S.running && S.builtCouples === S.couples && S.builtShape === S.shape;
  $('cardResume').style.display = same ? '' : 'none';
}
for (const b of $('shapeSeg').querySelectorAll('button')) b.onclick = () => {
  S.shape = b.dataset.shape;
  store.set('a3d:shape', S.shape);
  $('shapeSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  sfx.select();
  refreshResume();
  if (!S.running && S.booted) buildAttract();
};
$('couplesToggle').addEventListener('change', e => {
  S.couples = e.target.checked;
  store.set('a3d:couples', S.couples ? '1' : '0');
  sfx.select();
  refreshResume();
  if (!S.running && S.booted) buildAttract();
});

// ---------------- Menu: loading a tree ----------------
function loadStatus(text, error = false) {
  $('loadStatus').textContent = text;
  $('loadStatus').style.color = error ? '#ff6a3a' : '';
}
async function loadText(text, name) {
  loadStatus('Reading…');
  await new Promise(r => setTimeout(r, 20));
  let data;
  try { data = parseGedcom(text); } catch (e) { loadStatus(`Could not read ${name}: ${e.message}`, true); return; }
  if (!data.individuals.size) { loadStatus('No people found in that file. Is it a GEDCOM (.ged)?', true); return; }
  S.data = data; S.fileName = name; S.fileKey = 'a3d:' + hashString(text.length + name + text.slice(0, 2000));
  loadStatus(`Loaded ${name}: ${data.individuals.size} people, ${data.families.size} families.`);
  const savedRoot = store.get(S.fileKey + ':root');
  S.rootId = savedRoot && data.individuals.has(savedRoot) ? savedRoot : bestDefaultRoot(data);
  $('cardSetup').classList.remove('hidden');
  $('rootSearch').value = '';
  renderRootList();
  updateGenInfo();
  $('cardSetup').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// The first individual is usually the "home person"; fall back to whoever has most known ancestors.
function bestDefaultRoot(data) {
  const first = data.individuals.keys().next().value;
  if (countAncestors(data, first, 4) > 3) return first;
  let best = first, bestN = 0, n = 0;
  for (const id of data.individuals.keys()) {
    if (n++ > 3000) break;
    const c = countAncestors(data, id, 6);
    if (c > bestN) { best = id; bestN = c; }
  }
  return best;
}

function renderRootList() {
  const q = $('rootSearch').value.trim().toLowerCase();
  const list = $('rootList');
  const out = [];
  if (S.rootId) out.push(S.data.individuals.get(S.rootId));
  for (const indi of S.data.individuals.values()) {
    if (out.length >= 60) break;
    if (indi.id === S.rootId) continue;
    const n = displayName(indi).toLowerCase();
    if (!q || n.includes(q)) out.push(indi);
  }
  list.innerHTML = '';
  for (const indi of out) {
    const d = document.createElement('div');
    if (indi.id === S.rootId) d.className = 'sel';
    d.innerHTML = `<span>${escapeHtml(displayName(indi))}</span><span>${escapeHtml(lifespan(indi))}</span>`;
    d.onclick = () => { S.rootId = indi.id; sfx.select(); renderRootList(); updateGenInfo(); };
    list.appendChild(d);
  }
}

function updateGenInfo() {
  S.maxGen = +$('genRange').value;
  $('genVal').textContent = S.maxGen;
  $('genInfo').style.color = '';
  if (!S.data || !S.rootId) return;
  const n = countAncestors(S.data, S.rootId, S.maxGen) - 1;
  const root = S.data.individuals.get(S.rootId);
  $('storyInfo').textContent = `You play as ${displayName(root)}. The plot is the same for every family; the people, towns, years, jobs and events come from this file.`;
  $('genInfo').textContent = S.tab === 'viz'
    ? `${n} ancestor${n === 1 ? '' : 's'} of ${displayName(root)} within ${S.maxGen} generations.`
    : `You play as ${displayName(root)}. ${n} ancestor${n === 1 ? '' : 's'} will be waiting.${n > 1500 ? ' That is a lot; fewer generations will run faster on a phone.' : ''}`;
}

// No accept filter on the input: Android doesn't know the .ged type and greys those files out in its picker.
$('fileInput').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = ''; // lets the same file be picked again after an error
  if (!f) return;
  if (/\.zip$/i.test(f.name)) { loadStatus('That is a .zip file. Unzip it first, then load the .ged file inside.', true); return; }
  loadStatus('Reading…');
  let buf;
  // Files still in Google Drive or another cloud app can fail to read or arrive empty on phones.
  try { buf = await f.arrayBuffer(); } catch (err) { loadStatus(`Could not open ${f.name}. Download it to your phone (e.g. the Downloads folder) and pick it from there.`, true); return; }
  if (!buf.byteLength) { loadStatus(`${f.name} is empty. If it is in Google Drive or email, download it to your phone first, then pick it again.`, true); return; }
  const text = decodeGedcomBytes(buf);
  if (text.length < 4.5e6 && store.set('a3d:last', text)) store.set('a3d:lastName', f.name);
  loadText(text, f.name);
});
async function demoText() {
  if (window.DEMO_GEDCOM) return window.DEMO_GEDCOM;
  return (await fetch('sample/demo.ged')).text();
}
$('btnDemo').onclick = async () => {
  sfx.select();
  try { loadText(await demoText(), 'Demo family (fictional)'); } catch (e) { loadStatus('Could not load the demo file.', true); }
};
if (store.get('a3d:last')) {
  $('btnLast').classList.remove('hidden');
  $('btnLast').textContent = `Reload ${(store.get('a3d:lastName') || 'last tree').slice(0, 26)}`;
  $('btnLast').onclick = () => { sfx.select(); loadText(store.get('a3d:last'), store.get('a3d:lastName') || 'last tree'); };
}
$('rootSearch').addEventListener('input', renderRootList);
$('genRange').addEventListener('input', updateGenInfo);
$('btnStart').onclick = () => {
  sfx.select();
  startGame().catch(err => {
    // Show what went wrong on the menu instead of leaving the loading screen up forever.
    console.error(err);
    $('loading').classList.add('hidden');
    $('genInfo').textContent = `Could not build the garden: ${err.message}. Try fewer generations.`;
    $('genInfo').style.color = '#ff6a3a';
  });
};
$('btnResume').onclick = () => { sfx.select(); closeMenu(); };

// ---------------- Menu tabs: Play and Visualisation ----------------
const VIZ_NOTES = {
  galaxy: 'Your family as a galaxy of stars in 3D, with you as the sun. Spin it, tap stars, or take the fly-through and record it.',
  tree: 'A tree with you as the trunk that grows back in time, generation by generation, along a timeline. Record it as a video.',
};
function setTab(tab) {
  S.tab = tab === 'viz' || tab === 'story' ? tab : 'play';
  store.set('a3d:tab', S.tab);
  document.body.classList.toggle('tab-viz', S.tab === 'viz');
  document.body.classList.toggle('tab-story', S.tab === 'story');
  $('tabs').querySelectorAll('button').forEach(b => { const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  updateGenInfo();
}
function setVizKind(kind) {
  S.vizKind = kind === 'tree' ? 'tree' : 'galaxy';
  store.set('a3d:viz', S.vizKind);
  $('vizSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.viz === S.vizKind));
  $('vizNote').textContent = VIZ_NOTES[S.vizKind];
  $('scopeField').classList.toggle('hidden', S.vizKind !== 'galaxy');
  $('verseField').classList.toggle('hidden', S.vizKind !== 'tree');
}
for (const b of $('tabs').querySelectorAll('button')) b.onclick = () => { sfx.select(); setTab(b.dataset.tab); };
for (const b of $('vizSeg').querySelectorAll('button')) b.onclick = () => { sfx.select(); setVizKind(b.dataset.viz); };
for (const b of $('scopeSeg').querySelectorAll('button')) b.onclick = () => {
  sfx.select(); S.vizScope = b.dataset.scope;
  $('scopeSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
};
$('btnViz').onclick = () => {
  if (!S.data || !S.rootId) return;
  sfx.select();
  store.set(S.fileKey + ':root', S.rootId);
  S.vizOpen = true;
  openViz({ kind: S.vizKind, scope: S.vizScope, data: S.data, rootId: S.rootId, maxGen: S.maxGen, onClose: () => { S.vizOpen = false; } });
};

// Story mode: "A Battle in Time", a top-down driving story played through this family's towns and years.
$('btnStory').onclick = () => {
  if (!S.data || !S.rootId) return;
  sfx.select();
  store.set(S.fileKey + ':root', S.rootId);
  $('storyInfo').style.color = '';
  try {
    S.storyOpen = true;
    openStory({ data: S.data, rootId: S.rootId, store, key: S.fileKey, onClose: () => { S.storyOpen = false; } });
  } catch (err) {
    console.error(err);
    S.storyOpen = false;
    $('storyInfo').textContent = `Could not start the story: ${err.message}`;
    $('storyInfo').style.color = '#ff6a3a';
  }
};

// ---------------- Building the level ----------------
function buildLevel(tree) {
  S.tree = tree;
  S.world = buildFlatWorld(tree);
}

async function startGame() {
  $('loading').classList.remove('hidden');
  await new Promise(r => setTimeout(r, 30));
  try { await Promise.all(['700 16px "Fredoka"', '16px "Press Start 2P"', '800 16px "Nunito"'].map(f => document.fonts.load(f))); } catch (e) { /* fallback fonts */ }
  store.set(S.fileKey + ':root', S.rootId);
  const tree = layoutAncestors(collectAncestors(S.data, S.rootId, S.maxGen), { couples: S.couples, shape: S.shape });
  computeTraits(tree, S.data);
  buildLevel(tree);
  S.builtCouples = S.couples; S.builtShape = S.shape;
  S.met = new Set(JSON.parse(store.get(S.fileKey + ':met:' + S.rootId) || '[]'));
  S.missions = createMissions({ tree, store, key: S.fileKey + ':missions:' + S.rootId });
  S.missionsShown = '';
  for (const id of S.met) { const n = S.world.byId.get(id); if (n) n.met = true; }
  S.pos.set(tree.hub.x, 0, tree.hub.z); S.vel.set(0, 0, 0);
  S.flatCam = { x: tree.hub.x, z: tree.hub.z, scale: flatScale() };
  S.waypoint = null;
  S.world.beacon.visible = false;
  S.lastGen = -1;
  $('compass').classList.add('hidden');
  $('loading').classList.add('hidden');
  S.running = true;
  refreshResume();
  closeMenu();
  const root = tree.people.get(S.rootId);
  message(`You are ${displayName(root.indi)}. ${S.world.npcs.length} ancestors are waiting.`);
  setTimeout(() => message('Roll out along the paths to go back in time.'), 1200);
  updateStatus();
  if (!S.loopStarted) { S.loopStarted = true; requestAnimationFrame(loop); }
}

function openMenu() {
  S.paused = true;
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  closeDialog(true);
  closeMap();
  refreshResume();
}
function closeMenu() {
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('touch').classList.remove('hidden');
  S.paused = false;
  resize();
}

// ---------------- Input ----------------
const isTyping = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'range';
const playing = () => S.running && !S.paused && !S.talkingTo && $('automap').classList.contains('hidden') && $('menu').classList.contains('hidden');
document.addEventListener('keydown', e => {
  if (isTyping()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  if (!S.running) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    e.preventDefault();
    if (S.talkingTo) closeDialog();
    else if (!$('automap').classList.contains('hidden')) closeMap();
    else if ($('menu').classList.contains('hidden')) openMenu();
    return;
  }
  if (!$('menu').classList.contains('hidden')) return;
  if (k === 'tab' || k === 'm') { e.preventDefault(); toggleMap(); return; }
  if (S.talkingTo) {
    if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); advanceDialog(); }
    const n = parseInt(k, 10);
    if (n >= 1 && n <= 9) { const b = $('dOpts').querySelectorAll('button')[n - 1]; if (b) b.click(); }
    return;
  }
  if ((k === 'e' || k === ' ' || k === 'enter') && S.target) { e.preventDefault(); openDialog(S.target); return; }
  S.keys.add(k);
  if (e.key === 'Shift') S.run = true;
});
document.addEventListener('keyup', e => {
  S.keys.delete(e.key.toLowerCase());
  if (e.key === 'Shift') S.run = false;
});
window.addEventListener('blur', () => { S.keys.clear(); });

// Touch: left = virtual stick, right = tap to chat
const stickEl = $('stick'), knob = stickEl.querySelector('.knob');
let stickId = null, stickOrigin = null, lookId = null, lookLast = null;
$('tLeft').addEventListener('pointerdown', e => {
  stickId = e.pointerId; stickOrigin = { x: e.clientX, y: e.clientY };
  stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px';
  stickEl.classList.remove('hidden'); S.stick.active = true;
  $('tLeft').setPointerCapture(e.pointerId);
});
$('tLeft').addEventListener('pointermove', e => {
  if (e.pointerId !== stickId) return;
  let dx = e.clientX - stickOrigin.x, dy = e.clientY - stickOrigin.y;
  const len = Math.hypot(dx, dy), max = 50;
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  S.stick.x = dx / max; S.stick.y = dy / max;
});
const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; S.stick = { x: 0, y: 0, active: false }; stickEl.classList.add('hidden'); knob.style.transform = ''; };
$('tLeft').addEventListener('pointerup', endStick);
$('tLeft').addEventListener('pointercancel', endStick);
let lookTapStart = 0, lookMoved = 0;
$('tRight').addEventListener('pointerdown', e => { lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; lookTapStart = performance.now(); lookMoved = 0; $('tRight').setPointerCapture(e.pointerId); });
$('tRight').addEventListener('pointermove', e => {
  if (e.pointerId !== lookId || S.talkingTo) return;
  const dx = e.clientX - lookLast.x, dy = e.clientY - lookLast.y;
  lookMoved += Math.abs(dx) + Math.abs(dy);
  lookLast = { x: e.clientX, y: e.clientY };
});
const endLook = e => {
  if (e.pointerId !== lookId) return;
  lookId = null;
  // A quick tap on the right side talks to whoever is in front of you.
  if (performance.now() - lookTapStart < 250 && lookMoved < 10 && S.target && !S.talkingTo) openDialog(S.target);
  else if (performance.now() - lookTapStart < 250 && lookMoved < 10) flatTap(lookLast.x, lookLast.y);
};
$('tRight').addEventListener('pointerup', endLook);
$('tRight').addEventListener('pointercancel', endLook);
$('tTalk').addEventListener('click', () => { if (S.target) openDialog(S.target); });
$('tMap').addEventListener('click', () => toggleMap());
$('tMenu').addEventListener('click', () => openMenu());
$('tRun').addEventListener('click', () => { S.run = !S.run; $('tRun').classList.toggle('on', S.run); });

// ---------------- Movement & collision ----------------
function movePlayer(dt) {
  if (S.talkingTo || S.paused || !$('automap').classList.contains('hidden')) { S.vel.multiplyScalar(0.8); return; }
  const k = S.keys;
  let fwd = 0, strafe = 0;
  if (k.has('w') || k.has('arrowup')) fwd += 1;
  if (k.has('s') || k.has('arrowdown')) fwd -= 1;
  if (k.has('a') || k.has('q')) strafe -= 1;
  if (k.has('d')) strafe += 1;
  // top-down: every key moves in its own screen direction
  if (k.has('arrowleft')) strafe -= 1;
  if (k.has('arrowright')) strafe += 1;
  let run = S.run;
  if (S.stick.active) {
    fwd -= S.stick.y; strafe += S.stick.x;
    if (Math.hypot(S.stick.x, S.stick.y) > 0.95) run = true;
  }
  const len = Math.hypot(fwd, strafe);
  if (len > 1) { fwd /= len; strafe /= len; }
  const speed = run ? 8 : 4.2;
  const wantX = strafe * speed, wantZ = -fwd * speed;
  S.vel.x += (wantX - S.vel.x) * Math.min(1, dt * 10);
  S.vel.z += (wantZ - S.vel.z) * Math.min(1, dt * 10);
  S.pos.x += S.vel.x * dt;
  S.pos.z += S.vel.z * dt;
  const push = (x, z, min) => {
    const dx = S.pos.x - x, dz = S.pos.z - z, d = Math.hypot(dx, dz);
    if (d < min && d > 0.0001) { S.pos.x = x + dx / d * min; S.pos.z = z + dz / d * min; }
  };
  // rolling into someone makes them squeak and bounce
  for (const n of S.world.npcs) {
    if (!n.near) continue;
    const d = Math.hypot(S.pos.x - n.person.x, S.pos.z - n.person.z);
    if (d < 1.34 && Math.hypot(S.vel.x, S.vel.z) > 3 && n.flinch <= 0) {
      n.flinch = 0.45; sfx.bonk();
      const now = performance.now();
      if (now - (S.quipAt.get(n.person.id) || 0) > 3000) { S.quipAt.set(n.person.id, now); message(`${firstName(n.person.indi)}: "${bumpQuip(n.person, S.quipN++)}"`); }
    }
    push(n.person.x, n.person.z, 1.3);
  }
  for (const c of S.world.colliders) if (Math.abs(c.x - S.pos.x) < 2 && Math.abs(c.z - S.pos.z) < 2) push(c.x, c.z, c.r + 0.3);
  const r = Math.hypot(S.pos.x, S.pos.z), maxR = S.world.wallRadius - 0.6;
  if (r > maxR) { S.pos.x *= maxR / r; S.pos.z *= maxR / r; }
  const sp = Math.hypot(S.vel.x, S.vel.z);
  const prevBob = S.bob;
  S.bob += sp * dt * 2.6;
  S.step += sp * dt * 1.6;
  if (sp > 1 && Math.floor(prevBob / Math.PI) !== Math.floor(S.bob / Math.PI)) sfx.step();
}

// ---------------- NPC behaviour ----------------

// Fluffy look: no camera direction, so whoever is closest within reach is the one you can talk to.
function updateNPCs(t, dt) {
  let best = null, bestD = 2.3;
  for (const n of S.world.npcs) {
    const p = n.person;
    const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z);
    n.dist = d;
    n.near = d < 3;
    if (n.flinch > 0) n.flinch -= dt;
    if (!n.waved && d < 5) { n.waved = true; n.wave = 0.55; }
    if (n.wave > 0) n.wave -= dt;
    if (d < bestD) { bestD = d; best = n; }
  }
  S.target = best;
  $('nametag').classList.add('hidden');
  if (best && !S.talkingTo) {
    $('prompt').textContent = desktop() ? `Press E to chat with ${firstName(best.person.indi)}` : `Tap to chat with ${firstName(best.person.indi)}`;
    $('prompt').classList.remove('hidden');
    $('tTalk').classList.remove('hidden');
  } else { $('prompt').classList.add('hidden'); $('tTalk').classList.add('hidden'); }
}

// ---------------- Dialogue ----------------
const D = { pages: [], links: [], page: 0, shown: 0, full: '', timer: 0, npc: null, portraitFrame: -1 };

function openDialog(npc) {
  if (S.talkingTo) return;
  S.talkingTo = npc; npc.talking = true;
  const dlg = buildDialogue(npc.person, { data: S.data, tree: S.tree });
  Object.assign(D, { pages: dlg.pages, links: dlg.links, page: 0, npc, portraitFrame: -1, mission: null });
  // missions: finding someone you were sent to look for, and being asked to find someone else
  const done = S.missions.check(npc.person);
  if (done.length) { D.pages.unshift(foundSpeech(npc.person, done[0].giverName)); missionReward(done, npc); }
  const offer = S.missions.offer(npc.person);
  if (offer) { D.pages.push(offer.speech); D.mission = offer; }
  const indi = npc.person.indi;
  $('dWho').textContent = displayName(indi);
  const rel = relationship(npc.person.gen, indi.sex).replace(/^./, c => c.toUpperCase());
  $('dRel').textContent = [rel, lifespan(indi), `Gen ${npc.person.gen}`].filter(Boolean).join(' · ');
  S.world.setLineage(npc.person.id);
  $('dialog').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  showPage();
  if (!npc.met) {
    npc.met = true; S.met.add(npc.person.id);
    store.set(S.fileKey + ':met:' + S.rootId, JSON.stringify([...S.met]));
    sfx.meet();
    message(`You met ${displayName(indi)}! (${S.met.size}/${S.world.npcs.length}) +5 XP`);
    S.missions.addXP(5);
    if (S.met.size >= S.world.npcs.length) setTimeout(() => message('You have met every ancestor. 100% kin!'), 400);
  }
  updateStatus();
}

function showPage() {
  D.full = D.pages[D.page] || '';
  D.shown = 0;
  $('dText').textContent = '';
  renderOpts();
}
function renderOpts() {
  const opts = $('dOpts');
  opts.innerHTML = '';
  const last = D.page >= D.pages.length - 1;
  const add = (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = e => { e.stopPropagation(); fn(); }; opts.appendChild(b); };
  if (!last) add('Next ▶', 'next', advanceDialog);
  if (last && D.mission) {
    add('I\'ll do it! ✓', 'next', () => {
      S.missions.accept(D.mission);
      message(`New mission: ${D.mission.label}`);
      sfx.select();
      D.mission = null; renderMissions(true); closeDialog();
    });
    add('Not now', '', () => { S.missions.decline(D.mission); D.mission = null; renderOpts(); });
  }
  if (last) for (const l of D.links) add(l.label, '', () => { setWaypoint(l.id); closeDialog(); });
  if (D.page > 0) add('◀ Back', 'bye', () => { D.page--; showPage(); });
  add('See you!', 'bye', () => closeDialog());
  const pg = document.createElement('span'); pg.className = 'pager'; pg.textContent = `${D.page + 1}/${D.pages.length}`; opts.appendChild(pg);
}
function advanceDialog() {
  if (D.shown < D.full.length) { D.shown = D.full.length; $('dText').textContent = D.full; return; }
  if (D.page < D.pages.length - 1) { D.page++; showPage(); }
  else closeDialog();
}
function closeDialog(silent) {
  if (!S.talkingTo) return;
  S.talkingTo.talking = false;
  S.talkingTo = null;
  $('dialog').classList.add('hidden');
  if (!silent) { $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden'); }
}
$('dialog').addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') advanceDialog(); });

function tickDialog(dt) {
  if (!S.talkingTo) return;
  D.timer += dt;
  if (D.shown < D.full.length) {
    const before = D.shown;
    D.shown = Math.min(D.full.length, D.shown + dt * 45);
    if (Math.floor(D.shown / 3) !== Math.floor(before / 3)) sfx.blip(D.npc.look.female);
    $('dText').textContent = D.full.slice(0, Math.floor(D.shown));
  }
  const frame = Math.floor(D.timer * 8);
  if (frame !== D.portraitFrame) {
    D.portraitFrame = frame;
    const talking = D.shown < D.full.length;
    const f = talking ? frame : (frame % 10 === 9 ? 9 : 0);
    drawFluffyPortrait($('dPortrait').getContext('2d'), D.npc.look, 96, f);
  }
}

// ---------------- Missions ----------------
const MISSION_XP = 50;
function missionReward(done, npc) {
  const n = done.length;
  S.missions.addXP(MISSION_XP * n);
  for (const m of done) message(`Mission complete: ${m.label}! +${MISSION_XP * n} XP`);
  [784, 988, 1175, 1568, 2093].forEach((f, i) => setTimeout(() => beep(f, 0.1, 'sine', 0.05), i * 80));
  renderMissions(true);
}
function renderMissions(force) {
  if (!S.missions) return;
  const list = S.missions.active;
  const html = list.length ? `<b>Missions</b>${list.map(m => `<div>• ${escapeHtml(m.label)}</div>`).join('')}` : '';
  if (!force && html === S.missionsShown) return;
  S.missionsShown = html;
  $('missions').innerHTML = html;
  $('missions').classList.toggle('hidden', !html);
}

// ---------------- Waypoints & status ----------------
function setWaypoint(id) {
  const n = S.world.byId.get(id);
  if (!n) return;
  S.waypoint = n;
  S.world.beacon.position.set(n.person.x, 20, n.person.z);
  S.world.beacon.visible = true;
  $('compass').classList.remove('hidden');
  message(`Waypoint: ${displayName(n.person.indi)}`);
  sfx.select();
}

function updateCompass() {
  if (!S.waypoint) return;
  const p = S.waypoint.person;
  const dx = p.x - S.pos.x, dz = p.z - S.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 2.5) { S.waypoint = null; S.world.beacon.visible = false; $('compass').classList.add('hidden'); return; }
  const rel = Math.atan2(-dx, -dz); // the garden is seen from above, so the arrow is a plain bearing
  $('compass').querySelector('.arrow').style.transform = `rotate(${-rel}rad)`;
  $('compass').querySelector('.dist').textContent = `${firstName(p.indi)} ${Math.round(d)}m`;
}

let lastStatus = 0;
function updateStatus(t = 0) {
  if (!S.tree || !S.world.rootLook) return;
  const gen = genAt(S.tree, S.pos.x, S.pos.z);
  if (gen !== S.lastGen && S.lastGen !== -1 && gen > 0) message(`Gen ${gen}: ${GEN_NAMES(gen).toLowerCase().replace(/^./, c => c.toUpperCase())}`);
  S.lastGen = gen;
  const total = S.world.npcs.length;
  const root = S.tree.people.get(S.rootId).indi;
  renderMissions();
  $('iName').textContent = firstName(root);
  $('iInfo').textContent = `Gen ${gen} · Met ${S.met.size}/${total} · ⭐ ${S.missions.state.xp} XP`;
  drawFluffyPortrait($('iFace').getContext('2d'), S.world.rootLook, 64, Math.floor(t * 2) % 10 === 9 ? 9 : 0);
}

// ---------------- Automap ----------------
const mapCanvas = $('mapCanvas');
function toggleMap() { if ($('automap').classList.contains('hidden')) openMap(); else closeMap(); }
function openMap() {
  $('automap').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  sfx.map();
  drawMap();
}
function closeMap() {
  if ($('automap').classList.contains('hidden')) return;
  $('automap').classList.add('hidden');
  $('mapResults').classList.add('hidden');
  if ($('menu').classList.contains('hidden')) {
    $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden');
  }
}
$('mapClose').onclick = closeMap;
$('mapZoom').onclick = () => { S.mapZoom = S.mapZoom >= 4 ? 0.5 : S.mapZoom * 2; drawMap(); };
function mapTransform() {
  const w = mapCanvas.clientWidth, h = mapCanvas.clientHeight;
  const fit = Math.min(w, h) / (S.tree.worldRadius * 2.2);
  const scale = fit * S.mapZoom;
  const cx = S.mapZoom <= 1 ? 0 : S.pos.x, cz = S.mapZoom <= 1 ? 0 : S.pos.z;
  return { w, h, scale, X: x => w / 2 + (x - cx) * scale, Y: z => h / 2 + (z - cz) * scale };
}
function drawMap() {
  if (!S.tree) return;
  const isl = true;
  const C = { bg: '#4cc3e6', land: '#7fd062', edge: '#f3e2b0', ring: 'rgba(243,226,176,0.95)', pat: '#3f7fd8', mat: '#e8507a', dot: '#ffffff', met: '#ffb020', you: '#ff6a2a', label: '#4a3020', link: '#ffb84a' };
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  mapCanvas.width = mapCanvas.clientWidth * dpr; mapCanvas.height = mapCanvas.clientHeight * dpr;
  const c = mapCanvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { w, h, scale, X, Y } = mapTransform();
  c.fillStyle = C.bg; c.fillRect(0, 0, w, h);
  if (C.land) { c.fillStyle = C.edge; c.beginPath(); c.arc(X(0), Y(0), (S.tree.worldRadius + 5) * scale, 0, Math.PI * 2); c.fill(); c.fillStyle = C.land; c.beginPath(); c.arc(X(0), Y(0), (S.tree.worldRadius + 1.5) * scale, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = isl ? Math.max(2, scale * 0.9) : 1;
  c.strokeStyle = C.edge;
  if (!isl) { c.beginPath(); c.arc(X(0), Y(0), S.tree.worldRadius * scale, 0, Math.PI * 2); c.stroke(); }
  c.strokeStyle = C.ring;
  for (const gd of S.tree.guides) {
    c.beginPath();
    if (gd.kind === 'row') { c.moveTo(X(gd.x0), Y(gd.z + 1.45)); c.lineTo(X(gd.x1), Y(gd.z + 1.45)); }
    else c.arc(X(gd.cx), Y(gd.cz), (gd.r - 1.45) * scale, gd.t0, gd.t0 + gd.tl);
    c.stroke();
  }
  c.lineWidth = Math.max(1, scale * 0.15);
  for (const e of S.tree.edges) {
    const a = S.tree.people.get(e.child), b = S.tree.people.get(e.parent);
    c.strokeStyle = e.side === 'paternal' ? C.pat : C.mat;
    c.beginPath(); c.moveTo(X(a.x), Y(a.z)); c.lineTo(X(b.x), Y(b.z)); c.stroke();
  }
  const dot = Math.max(2, Math.min(7, scale * 0.6));
  for (const n of S.world.npcs) {
    const x = X(n.x ?? n.person.x), y = Y(n.z ?? n.person.z);
    c.fillStyle = n === S.waypoint || n.met ? C.met : C.dot;
    if (isl) { c.beginPath(); c.arc(x, y, dot / 2 + 0.5, 0, 7); c.fill(); c.strokeStyle = 'rgba(74,48,32,0.6)'; c.lineWidth = 1; c.stroke(); }
    else c.fillRect(x - dot / 2, y - dot / 2, dot, dot);
    if (n === S.waypoint) { c.strokeStyle = C.met; c.lineWidth = 2; c.strokeRect(x - dot * 1.5, y - dot * 1.5, dot * 3, dot * 3); }
  }
  if (scale > 7) {
    c.font = isl ? '700 13px Fredoka, Nunito, sans-serif' : '16px VT323, monospace'; c.fillStyle = C.label; c.textAlign = 'center';
    for (const n of S.world.npcs) c.fillText(firstName(n.person.indi), X(n.person.x), Y(n.person.z) - dot - 3);
  }
  const px = X(S.pos.x), py = Y(S.pos.z);
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  c.strokeStyle = C.you; c.fillStyle = C.you; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(px + fx * 12, py + fz * 12);
  c.lineTo(px - fx * 8 + fz * 6, py - fz * 8 - fx * 6);
  c.lineTo(px - fx * 4, py - fz * 4);
  c.lineTo(px - fx * 8 - fz * 6, py - fz * 8 + fx * 6);
  c.closePath(); if (isl) c.fill(); else c.stroke();
}
mapCanvas.addEventListener('click', e => {
  const { X, Y } = mapTransform();
  const rect = mapCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let best = null, bd = 22;
  for (const n of S.world.npcs) {
    const d = Math.hypot(X(n.person.x) - mx, Y(n.person.z) - my);
    if (d < bd) { bd = d; best = n; }
  }
  if (best) { setWaypoint(best.person.id); drawMap(); }
});
$('mapSearch').addEventListener('input', () => {
  const q = $('mapSearch').value.trim().toLowerCase();
  const res = $('mapResults');
  if (!q) { res.classList.add('hidden'); return; }
  // search names, birthplaces and jobs (handy for missions)
  const about = n => {
    const indi = n.person.indi, b = indi.events.find(e => ['BIRT', 'CHR', 'BAPM'].includes(e.tag));
    return { place: b?.place || '', jobs: indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value).join(', ') };
  };
  const found = S.world.npcs.filter(n => { const a = about(n); return (displayName(n.person.indi) + ' ' + a.place + ' ' + a.jobs).toLowerCase().includes(q); }).slice(0, 30);
  res.innerHTML = '';
  for (const n of found) {
    const d = document.createElement('div');
    const a = about(n), extra = !displayName(n.person.indi).toLowerCase().includes(q) ? (a.place.toLowerCase().includes(q) ? ` · born ${a.place.split(',')[0]}` : a.jobs ? ` · ${a.jobs}` : '') : '';
    d.textContent = `${displayName(n.person.indi)}  ${lifespan(n.person.indi)}  · gen ${n.person.gen}${extra}`;
    d.onclick = () => { setWaypoint(n.person.id); $('mapSearch').value = ''; res.classList.add('hidden'); drawMap(); };
    res.appendChild(d);
  }
  if (!found.length) res.innerHTML = '<div>Nobody by that name here.</div>';
  res.classList.remove('hidden');
});

// ---------------- Camera & main loop ----------------
// Fluffy look: pixels per metre at zoom 1, so about 16 m fit across the short side of the screen.
function flatScale() { return Math.max(26, Math.min(64, Math.min(window.innerWidth, window.innerHeight) / 13)) * S.flatZoom; }
function placeCamera(dt) {
  const c = S.flatCam;
  let x = S.pos.x, z = S.pos.z, scale = flatScale();
  if (S.talkingTo) { x = (x + S.talkingTo.person.x) / 2; z = (z + S.talkingTo.person.z) / 2 + 1.2; scale *= 1.35; }
  else { x += S.vel.x * 0.25; z += S.vel.z * 0.25; }
  const k = Math.min(1, dt * 5);
  c.x += (x - c.x) * k; c.z += (z - c.z) * k; c.scale += (scale - c.scale) * Math.min(1, dt * 4);
}
function renderFlat(t) {
  const dpr = flatCanvas.width / Math.max(1, window.innerWidth);
  flatCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const talking = S.talkingTo && D.shown < D.full.length;
  S.world.draw(flatCtx, {
    w: window.innerWidth, h: window.innerHeight, t, cam: S.flatCam,
    player: { x: S.pos.x, z: S.pos.z, vx: S.vel.x, vz: S.vel.z, step: S.step },
    target: S.target, waypoint: S.waypoint, talkingTo: S.talkingTo, mouth: talking ? Math.abs(Math.sin(t * 14)) : 0,
  });
}
// Tap or click in the garden: talk to someone close by, or set a waypoint to whoever you tapped.
function flatTap(cx, cy) {
  if (!S.world?.flat || !playing()) return;
  const c = S.flatCam, w = window.innerWidth, h = window.innerHeight;
  const x = c.x + (cx - w / 2) / c.scale, z = c.z + (cy - h / 2) / c.scale;
  let best = null, bd = 1.1;
  for (const n of S.world.npcs) { const d = Math.hypot(n.person.x - x, n.person.z - 0.4 - z); if (d < bd) { bd = d; best = n; } }
  if (!best) return;
  if (best.dist < 2.6) openDialog(best); else setWaypoint(best.person.id);
}
flatCanvas.addEventListener('click', e => flatTap(e.clientX, e.clientY));
window.addEventListener('wheel', e => {
  if (!playing()) return;
  S.flatZoom = Math.max(0.45, Math.min(2.2, S.flatZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
}, { passive: true });

let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!S.world || !S.running || S.vizOpen || S.storyOpen) return;
  const t = now / 1000;
  if (!S.paused) {
    movePlayer(dt);
    updateNPCs(t, dt);
    tickDialog(dt);
    updateCompass();
    if (now - lastStatus > 250) { lastStatus = now; updateStatus(t); renderMsgs(); if (!$('automap').classList.contains('hidden')) drawMap(); }
  }
  S.world.update(t);
  placeCamera(dt);
  renderFlat(t);
}

// ---------------- Attract mode: the demo family's garden drifting by behind the title screen ----------------
let attractData = null, attractLoop = false;
async function buildAttract() {
  if (S.running) return;
  try { attractData ||= parseGedcom(await demoText()); } catch (e) { return; }
  if (S.running) return;
  const tree = layoutAncestors(collectAncestors(attractData, attractData.individuals.keys().next().value, 6), { couples: S.couples, shape: S.shape });
  computeTraits(tree, attractData);
  buildLevel(tree);
  if (attractLoop) return;
  attractLoop = true;
  const t0 = performance.now();
  const spin = now => {
    if (S.running) { attractLoop = false; return; }
    requestAnimationFrame(spin);
    if (S.vizOpen || S.storyOpen) return;
    const t = (now - t0) / 1000;
    // the garden drifting slowly round the plaza
    S.flatCam = { x: S.tree.hub.x + Math.cos(t * 0.06) * 9, z: S.tree.hub.z + Math.sin(t * 0.06) * 9, scale: flatScale() * 0.8 };
    S.pos.set(S.tree.hub.x, 0, S.tree.hub.z); S.vel.set(0, 0, 0);
    for (const n of S.world.npcs) n.dist = Math.hypot(n.person.x - S.pos.x, n.person.z - S.pos.z);
    renderFlat(t);
  };
  requestAnimationFrame(spin);
}

// Defaults for a first visit: the Fluffy look, the Tree layout and couples standing together.
S.couples = store.get('a3d:couples') !== '0';
S.shape = ['circle', 'half', 'tree'].includes(store.get('a3d:shape')) ? store.get('a3d:shape') : 'tree';
$('shapeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.shape === S.shape));
$('couplesToggle').checked = S.couples;
applyStyle();
S.vizScope = 'ancestors';
setVizKind(store.get('a3d:viz'));
setTab(store.get('a3d:tab'));
S.booted = true;
buildAttract();
// expose for debugging / tests
window.__A3D = { S, setTab, openViz, vizOpen, vizView, openStory, closeStory, storyOpen, storyState, startGame, loadText, openDialog, setWaypoint, openMap, closeMap, applyStyle };
