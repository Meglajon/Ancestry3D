// Ancestry 3D — walk around a GEDCOM family tree as the person at its root.
import * as THREE from 'three';
import { parseGedcom, decodeGedcomBytes } from './gedcom.js';
import { genAt, collectAncestors, layoutAncestors, displayName, firstName, lifespan, relationship, countAncestors, birthYear, hashString } from './ancestry.js';
import { buildWorld, GEN_NAMES, THEMES } from './world.js';
import { buildDialogue, shotQuip, stompQuip, bumpQuip } from './dialogue.js';
import { drawPortrait, drawIslandPortrait } from './textures.js';
import { buildIslandFigure } from './npc.js';
import { createMinigun, createImpacts, traceShot } from './weapon.js';
import { buildFlatWorld, drawFluffyPortrait } from './fluffy.js';
import { computeTraits } from './traits.js';
import { openViz, vizOpen, vizView } from './viz.js';

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
const desktop = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------------- State ----------------
const STYLES = { retro: 480, island: 1200, fluffy: 1200 };
const THEME_OF = { retro: 'doom', island: 'island', fluffy: 'fluffy' };
// Looks that were merged or retired map onto the ones that replaced them.
const OLD_STYLES = { chunky: 'retro', sharp: 'retro', action: 'island', platform: 'island', blocks: 'island' };
const LOOK_NOTES = {
  retro: 'Retro: a hellish 90s courtyard seen through your own eyes. Carry a minigun, blow up toxic barrels and top up on boxes of bullets. Shot ancestors flinch and tell you off.',
  island: 'Island: a cozy island seen from behind your own villager. Jump onto floating brick platforms, collect coins and bounce on your ancestors\' heads, then stop for a chat.',
  fluffy: 'Fluffy: a top-down 2D garden where you and every ancestor are round, fluffy balls. Their fur takes the colours of their period clothes, with their hair (or hat) as a tuft on top. Roll along the paths, bump into people to make them squeak, and chat to them all.',
};
const LOGOS = {
  retro: ['ANCESTRY<br>3D', 'WALK AMONG YOUR ANCESTORS'],
  island: ['Ancestry<br>Island', 'Come and meet the family'],
  fluffy: ['Ancestry<br>Fluffs', 'Roll round and meet the family'],
};
const S = {
  data: null, fileName: '', fileKey: '', rootId: null, maxGen: 8,
  style: 'retro', theme: 'doom', pixelWidth: 480, couples: false, builtTheme: null, builtCouples: null,
  tree: null, world: null, running: false, paused: true,
  yaw: 0, pitch: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), bob: 0,
  keys: new Set(), run: false, stick: { x: 0, y: 0, active: false }, firing: false,
  target: null, talkingTo: null, waypoint: null, met: new Set(), lastGen: -1,
  mapZoom: 1, avatar: null, avatarYaw: 0, gun: null, impacts: null,
  face: { gaze: 0, nextGaze: 0, grinUntil: 0 }, quipAt: new Map(), quipN: 0,
  posY: 0, vy: 0, onGround: true, jumpQueued: false, coins: 0,
  flatCam: { x: 0, z: 0, scale: 40 }, flatZoom: 1, step: 0,
};
// Island and Fluffy share the cozy menu, round characters and friendlier sounds.
const cute = () => S.theme === 'island' || S.theme === 'fluffy';
// The Island look has jumping, floating platforms and coins.
const platform = () => S.theme === 'island';
// The Fluffy look is a top-down 2D garden drawn on its own canvas.
const flat = () => S.theme === 'fluffy';

// ---------------- Renderer ----------------
const canvas = $('game');
const flatCanvas = $('flat');
const flatCtx = flatCanvas.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const fdpr = Math.min(2, window.devicePixelRatio || 1);
  flatCanvas.width = Math.round(w * fdpr); flatCanvas.height = Math.round(h * fdpr);
  const iw = Math.min(S.pixelWidth, w * Math.min(2, window.devicePixelRatio || 1));
  const scale = w / iw;
  renderer.setSize(Math.round(w / scale), Math.round(h / scale), false);
  camera.aspect = w / h;
  // Keep a usable horizontal field of view on tall phone screens.
  const hfov = (cute() ? 70 : 78) * Math.PI / 180;
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180 / Math.PI;
  camera.fov = Math.max(cute() ? 55 : 68, Math.min(96, vfov));
  camera.updateProjectionMatrix();
  if (S.gun) { S.gun.camera.aspect = w / h; S.gun.camera.fov = Math.max(60, Math.min(90, vfov * 0.85)); S.gun.camera.updateProjectionMatrix(); }
  if (!$('automap').classList.contains('hidden')) drawMap();
}
window.addEventListener('resize', resize);
// Phones drop the WebGL context when short of memory; preventDefault lets three.js restore it.
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  message('Graphics were reset by the phone. If the world looks wrong, open the menu and try fewer generations.');
});

// ---------------- Audio (tiny synth, no files) ----------------
let actx = null, noiseBuf = null;
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
function bang() {
  const a = audio(); if (!a) return;
  try {
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 0.12, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    }
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    src.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 1800 + Math.random() * 600;
    g.gain.value = 0.18;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
    beep(90 + Math.random() * 20, 0.05, 'square', 0.05, -40);
  } catch (e) { /* optional */ }
}
const sfx = {
  select: () => cute() ? (beep(880, 0.07, 'sine', 0.06), setTimeout(() => beep(1320, 0.09, 'sine', 0.05), 70)) : (beep(660, 0.06), setTimeout(() => beep(990, 0.08), 60)),
  meet: () => (cute() ? [784, 988, 1175, 1568] : [523, 659, 784, 1046]).forEach((f, i) => setTimeout(() => beep(f, 0.09, cute() ? 'sine' : 'square', 0.05), i * 70)),
  blip: (female) => cute()
    ? beep((female ? 620 : 420) + Math.random() * 240, 0.045, 'triangle', 0.045, (Math.random() - 0.5) * 300)
    : beep(female ? 520 + Math.random() * 80 : 220 + Math.random() * 60, 0.03, 'square', 0.025),
  step: () => cute() ? beep(180 + Math.random() * 40, 0.04, 'sine', 0.03) : beep(70 + Math.random() * 20, 0.05, 'triangle', 0.04),
  map: () => cute() ? beep(660, 0.1, 'sine', 0.04, 300) : beep(330, 0.08, 'sawtooth', 0.03, 200),
  jump: () => beep(320, 0.16, 'square', 0.04, 500),
  land: () => beep(110, 0.05, 'triangle', 0.05),
  bonk: () => beep(160, 0.08, 'square', 0.05, -60),
  stomp: () => { beep(240, 0.06, 'square', 0.05, -120); setTimeout(() => beep(520, 0.08, 'square', 0.04, 300), 60); },
  coin: () => { beep(988, 0.05, 'square', 0.035); setTimeout(() => beep(1319, 0.12, 'square', 0.035), 55); },
  ouch: () => beep(cute() ? 700 : 300, 0.12, 'square', 0.04, -150),
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

// ---------------- Look / style ----------------
function applyStyle(style, { silent = false } = {}) {
  if (!STYLES[style]) style = 'retro';
  const prevTheme = S.theme;
  S.style = style;
  S.theme = THEME_OF[style];
  S.pixelWidth = STYLES[style];
  store.set('a3d:style', style);
  document.body.classList.toggle('island', cute());
  document.body.classList.toggle('fluffy', flat());
  $('logo').innerHTML = LOGOS[style][0];
  $('tagline').textContent = LOGOS[style][1];
  $('lookNote').textContent = LOOK_NOTES[style];
  $('styleSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.style === style));
  if (!silent) sfx.select();
  resize();
  if (prevTheme !== S.theme) {
    if (!S.running && S.booted) buildAttract();
    refreshResume();
  }
}
function refreshResume() {
  // A different world look or couples layout needs the courtyard rebuilt, so offer ENTER rather than RESUME.
  const same = S.running && S.builtTheme === S.theme && S.builtCouples === S.couples && S.builtShape === S.shape;
  $('cardResume').style.display = same ? '' : 'none';
}
for (const b of $('styleSeg').querySelectorAll('button')) b.onclick = () => applyStyle(b.dataset.style);
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
    $('genInfo').textContent = `Could not build the courtyard: ${err.message}. Try fewer generations.`;
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
  S.tab = tab === 'viz' ? 'viz' : 'play';
  store.set('a3d:tab', S.tab);
  document.body.classList.toggle('tab-viz', S.tab === 'viz');
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

// ---------------- Building the level ----------------
function clearScene() {
  scene.traverse(o => { if (o.geometry && !o.isSprite) o.geometry.dispose(); });
  scene.clear();
  S.avatar = null;
}

function buildLevel(tree) {
  clearScene();
  S.tree = tree;
  if (flat()) { S.world = buildFlatWorld(tree); return; }
  S.world = buildWorld(scene, tree, { theme: S.theme });
  const crowd = tree.people.size;
  const far = THEMES[S.theme].fogFar;
  // Fog doubles as a draw distance: tighter for very big trees so phones keep up.
  scene.fog.far = Math.min(crowd > 1200 ? far * 0.68 : crowd > 500 ? far * 0.8 : far, Math.max(36, tree.worldRadius + (cute() ? 20 : 0)));
  scene.fog.near = scene.fog.far * (cute() ? 0.35 : 0.12);
  camera.far = S.world.skyRadius * 2.2;
  camera.updateProjectionMatrix();
}

async function startGame() {
  $('loading').classList.remove('hidden');
  await new Promise(r => setTimeout(r, 30));
  try { await Promise.all(['700 16px "Fredoka"', '16px "Press Start 2P"', '800 16px "Nunito"'].map(f => document.fonts.load(f))); } catch (e) { /* fallback fonts */ }
  store.set(S.fileKey + ':root', S.rootId);
  const tree = layoutAncestors(collectAncestors(S.data, S.rootId, S.maxGen), { couples: S.couples, shape: S.shape });
  computeTraits(tree, S.data);
  buildLevel(tree);
  S.builtTheme = S.theme; S.builtCouples = S.couples; S.builtShape = S.shape;
  const rootLook = S.world.rootLook;
  // You are the root person: in the island look you see yourself; in the shooter looks you hold the minigun.
  if (cute()) {
    if (!flat()) {
      S.avatar = buildIslandFigure(rootLook, S.world.material, { legs: true });
      scene.add(S.avatar.root);
    }
    S.gun = null;
    S.impacts = null;
  } else {
    S.gun = createMinigun(rootLook.skin);
    S.impacts = createImpacts(scene);
    resize();
  }
  $('ammoCell').style.display = S.gun && S.gun.state.ammo == null ? 'none' : '';
  S.met = new Set(JSON.parse(store.get(S.fileKey + ':met:' + S.rootId) || '[]'));
  for (const id of S.met) { const n = S.world.byId.get(id); if (n) n.met = true; }
  S.pos.set(tree.hub.x, 0, tree.hub.z); S.vel.set(0, 0, 0); S.posY = 0; S.vy = 0; S.coins = 0; S.onGround = true;
  S.camInit = false; S.flatCam = { x: tree.hub.x, z: tree.hub.z, scale: flatScale() };
  S.yaw = 0; // facing your father's side
  S.avatarYaw = Math.PI;
  S.pitch = cute() ? 0 : -0.05;
  S.waypoint = null;
  S.world.beacon.visible = false;
  S.lastGen = -1;
  S.firing = false;
  $('compass').classList.add('hidden');
  $('loading').classList.add('hidden');
  S.running = true;
  refreshResume();
  closeMenu();
  const root = tree.people.get(S.rootId);
  message(`You are ${displayName(root.indi)}. ${S.world.npcs.length} ancestors are waiting.`);
  setTimeout(() => message(flat() ? 'Roll out along the paths to go back in time.' : cute() ? 'Walk out along the paths to go back in time.' : 'Walk outward to go back in time.'), 1200);
  if (platform()) setTimeout(() => message('Jump with Space or JUMP. Hop on the brick platforms for coins.'), 2600);
  updateStatus();
  if (!S.loopStarted) { S.loopStarted = true; requestAnimationFrame(loop); }
}

function openMenu() {
  S.paused = true;
  S.firing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('resume').classList.add('hidden');
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
  if (desktop()) requestLock();
}

// ---------------- Input ----------------
const isTyping = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'range';
const playing = () => S.running && !S.paused && !S.talkingTo && $('automap').classList.contains('hidden') && $('menu').classList.contains('hidden');
function requestLock() { if (flat()) return; try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch (e) { /* ignore */ } }
canvas.addEventListener('click', () => { if (!S.paused && !S.talkingTo) requestLock(); });
$('resume').addEventListener('click', () => { $('resume').classList.add('hidden'); requestLock(); });
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) S.firing = false;
  if (!document.pointerLockElement && desktop() && playing()) $('resume').classList.remove('hidden');
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || S.talkingTo) return;
  S.yaw -= e.movementX * 0.0022;
  S.pitch = Math.max(-1.2, Math.min(1.2, S.pitch - e.movementY * 0.0022));
});
document.addEventListener('mousedown', e => { if (e.button === 0 && document.pointerLockElement === canvas && S.gun && playing()) S.firing = true; });
document.addEventListener('mouseup', e => { if (e.button === 0) S.firing = false; });
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
  if (k === ' ' && platform()) { e.preventDefault(); S.jumpQueued = true; return; }
  if ((k === 'e' || k === ' ' || k === 'enter') && S.target) { e.preventDefault(); openDialog(S.target); return; }
  if (k === 'control' && S.gun) { S.firing = true; return; }
  S.keys.add(k);
  if (e.key === 'Shift') S.run = true;
});
document.addEventListener('keyup', e => {
  S.keys.delete(e.key.toLowerCase());
  if (e.key === 'Shift') S.run = false;
  if (e.key === 'Control') S.firing = false;
});
window.addEventListener('blur', () => { S.keys.clear(); S.firing = false; });

// Touch: left = virtual stick, right = look
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
  if (flat()) { lookLast = { x: e.clientX, y: e.clientY }; return; }
  S.yaw -= dx * 0.006; S.pitch = Math.max(-1.1, Math.min(1.1, S.pitch - dy * 0.005));
  lookLast = { x: e.clientX, y: e.clientY };
});
const endLook = e => {
  if (e.pointerId !== lookId) return;
  lookId = null;
  // A quick tap on the right side talks to whoever is in front of you.
  if (performance.now() - lookTapStart < 250 && lookMoved < 10 && S.target && !S.talkingTo) openDialog(S.target);
  else if (flat() && performance.now() - lookTapStart < 250 && lookMoved < 10) flatTap(lookLast.x, lookLast.y);
};
$('tRight').addEventListener('pointerup', endLook);
$('tRight').addEventListener('pointercancel', endLook);
$('tTalk').addEventListener('click', () => { if (S.target) openDialog(S.target); });
$('tMap').addEventListener('click', () => toggleMap());
$('tMenu').addEventListener('click', () => openMenu());
$('tRun').addEventListener('click', () => { S.run = !S.run; $('tRun').classList.toggle('on', S.run); });
$('tJump').addEventListener('pointerdown', e => { e.preventDefault(); if (playing()) S.jumpQueued = true; });
$('tFire').addEventListener('pointerdown', e => { e.preventDefault(); $('tFire').setPointerCapture(e.pointerId); if (playing()) S.firing = true; });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('tFire').addEventListener(ev, () => { S.firing = false; });

// ---------------- Movement & collision ----------------
function movePlayer(dt) {
  if (S.talkingTo || S.paused || !$('automap').classList.contains('hidden')) { S.vel.multiplyScalar(0.8); return; }
  const k = S.keys;
  let fwd = 0, strafe = 0;
  if (k.has('w') || k.has('arrowup')) fwd += 1;
  if (k.has('s') || k.has('arrowdown')) fwd -= 1;
  if (k.has('a') || k.has('q')) strafe -= 1;
  if (k.has('d')) strafe += 1;
  if (flat()) {
    // top-down: every key moves in its own screen direction
    S.yaw = 0;
    if (k.has('arrowleft')) strafe -= 1;
    if (k.has('arrowright')) strafe += 1;
  } else {
    if (k.has('arrowleft')) S.yaw += 2.4 * dt;
    if (k.has('arrowright')) S.yaw -= 2.4 * dt;
  }
  let run = S.run;
  if (S.stick.active) {
    fwd -= S.stick.y; strafe += S.stick.x;
    if (Math.hypot(S.stick.x, S.stick.y) > 0.95) run = true;
  }
  const len = Math.hypot(fwd, strafe);
  if (len > 1) { fwd /= len; strafe /= len; }
  const speed = flat() ? (run ? 8 : 4.2) : cute() ? (run ? 7.5 : 3.8) : (run ? 9 : 4.6);
  const sin = Math.sin(S.yaw), cos = Math.cos(S.yaw);
  // camera looks along -Z rotated by yaw
  const wantX = (-sin * fwd + cos * strafe) * speed;
  const wantZ = (-cos * fwd - sin * strafe) * speed;
  S.vel.x += (wantX - S.vel.x) * Math.min(1, dt * 10);
  S.vel.z += (wantZ - S.vel.z) * Math.min(1, dt * 10);
  S.pos.x += S.vel.x * dt;
  S.pos.z += S.vel.z * dt;
  const push = (x, z, min) => {
    const dx = S.pos.x - x, dz = S.pos.z - z, d = Math.hypot(dx, dz);
    if (d < min && d > 0.0001) { S.pos.x = x + dx / d * min; S.pos.z = z + dz / d * min; }
  };
  if (flat()) {
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
  } else for (const n of S.world.npcs) if (n.near && S.posY < 1.2) push(n.person.x, n.person.z, 0.85);
  for (const c of S.world.colliders) if (S.posY > 1.2) c.skip = true; else c.skip = false;
  for (const c of S.world.colliders) if (!c.skip && !(c.barrel && !c.barrel.alive) && Math.abs(c.x - S.pos.x) < 2 && Math.abs(c.z - S.pos.z) < 2) push(c.x, c.z, c.r + 0.3);
  // boxes of bullets
  if (S.gun?.kind === 'minigun') for (const a of S.world.pickups || []) {
    if (a.taken || Math.abs(a.x - S.pos.x) > 0.9 || Math.abs(a.z - S.pos.z) > 0.9) continue;
    if (S.gun.state.ammo >= S.gun.state.maxAmmo) continue;
    S.world.takeAmmo(a);
    S.gun.state.ammo = Math.min(S.gun.state.maxAmmo, S.gun.state.ammo + 150);
    message('Picked up a box of bullets.');
    beep(520, 0.05, 'square', 0.05); setTimeout(() => beep(780, 0.08, 'square', 0.05), 60);
  }
  if (platform()) jumpPhysics(dt);
  const r = Math.hypot(S.pos.x, S.pos.z), maxR = S.world.wallRadius - 0.6;
  if (r > maxR) { S.pos.x *= maxR / r; S.pos.z *= maxR / r; }
  const sp = Math.hypot(S.vel.x, S.vel.z);
  const prevBob = S.bob;
  S.bob += sp * dt * (cute() ? 2.6 : 1.9);
  S.step += sp * dt * 1.6;
  if (sp > 1 && S.onGround && Math.floor(prevBob / Math.PI) !== Math.floor(S.bob / Math.PI)) sfx.step();
}

// ---------------- Platform look: jumping, platforms, coins, head bounces ----------------
function platformUnder(x, z) {
  // top of the highest platform under (x, z), or 0 for the grass
  let best = 0;
  for (const p of S.world.platforms) {
    let inside;
    if (p.round) inside = Math.hypot(x - p.x, z - p.z) < p.round;
    else {
      const c = Math.cos(p.rot || 0), sn = Math.sin(p.rot || 0), dx = x - p.x, dz = z - p.z;
      const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      inside = Math.abs(lx) < p.hw + 0.25 && Math.abs(lz) < p.hd + 0.25;
    }
    if (inside && p.top <= S.posY + 0.35 && p.top > best) best = p.top;
  }
  return best;
}
function blockedBy(x, z, y) {
  // the side of a platform the player would walk into (feet below its top, head above its bottom)
  for (const p of S.world.platforms) {
    if (p.round) continue;
    const c = Math.cos(p.rot || 0), sn = Math.sin(p.rot || 0), dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    if (Math.abs(lx) < p.hw + 0.3 && Math.abs(lz) < p.hd + 0.3 && y < p.top - 0.35 && y + 1.5 > p.top - 1) return p;
  }
  return null;
}
function jumpPhysics(dt) {
  // walls of platforms: undo the horizontal step
  const hit = blockedBy(S.pos.x, S.pos.z, S.posY);
  if (hit) { S.pos.x -= S.vel.x * dt; S.pos.z -= S.vel.z * dt; }
  if (S.jumpQueued && S.onGround) { S.vy = 9.2; S.onGround = false; sfx.jump(); }
  S.jumpQueued = false;
  const prevY = S.posY;
  S.vy -= 26 * dt;
  S.posY += S.vy * dt;
  // bonk the underside of a platform
  if (S.vy > 0) for (const p of S.world.platforms) {
    if (p.round) continue;
    const bottom = p.top - 1;
    const c = Math.cos(p.rot || 0), sn = Math.sin(p.rot || 0), dx = S.pos.x - p.x, dz = S.pos.z - p.z;
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    if (Math.abs(lx) < p.hw && Math.abs(lz) < p.hd && prevY + 1.6 <= bottom && S.posY + 1.6 > bottom) { S.posY = bottom - 1.6; S.vy = 0; sfx.bonk(); }
  }
  const floor = platformUnder(S.pos.x, S.pos.z);
  if (S.posY <= floor) { if (!S.onGround && S.vy < -4) sfx.land(); S.posY = floor; S.vy = 0; S.onGround = true; }
  else if (S.posY > floor + 0.05) S.onGround = false;
  // bounce on an ancestor's head
  if (S.vy < 0) for (const n of S.world.npcs) {
    if (n.dist > 1.2) continue;
    const head = 1.55 * (n.fig.inner.scale.x / 1.15);
    if (Math.hypot(n.person.x - S.pos.x, n.person.z - S.pos.z) < 0.7 && S.posY < head + 0.25 && prevY >= head - 0.1) {
      S.vy = 10.5; S.posY = head; S.onGround = false;
      n.flinch = 0.5; sfx.stomp();
      const now = performance.now();
      if (now - (S.quipAt.get(n.person.id) || 0) > 2500) { S.quipAt.set(n.person.id, now); message(`${firstName(n.person.indi)}: "${stompQuip(n.person, S.quipN++)}"`); }
      break;
    }
  }
  // coins
  const coins = S.world.coins || [];
  for (const c of coins) {
    if (c.taken) continue;
    if (Math.abs(c.x - S.pos.x) < 0.8 && Math.abs(c.z - S.pos.z) < 0.8 && c.y > S.posY - 0.3 && c.y < S.posY + 1.9) {
      c.taken = true; S.coins++; sfx.coin();
      if (S.coins % 50 === 0) message(`${S.coins} coins! Granny would be proud.`);
    }
  }
}

function updateAvatar(dt) {
  const a = S.avatar;
  if (!a) return;
  const sp = Math.hypot(S.vel.x, S.vel.z);
  let want = S.avatarYaw;
  if (S.talkingTo) { const p = S.talkingTo.person; want = Math.atan2(p.x - S.pos.x, p.z - S.pos.z); }
  else if (sp > 0.4) want = Math.atan2(S.vel.x, S.vel.z);
  S.avatarYaw += angleDiff(want, S.avatarYaw) * Math.min(1, dt * 10);
  a.root.rotation.y = S.avatarYaw;
  const swing = Math.sin(S.bob * 2) * Math.min(1, sp / 3.5);
  const air = platform() && !S.onGround;
  a.root.position.set(S.pos.x, (platform() ? S.posY : 0) + (air ? 0 : Math.abs(Math.sin(S.bob * 2)) * 0.06 * Math.min(1, sp / 3.5)), S.pos.z);
  if (air) { a.legL.rotation.x = 0.6; a.legR.rotation.x = -0.4; a.armR.rotation.x = 0; a.armR.rotation.z = 2.6; a.armL.rotation.z = -0.6; }
  else {
    a.armR.rotation.z = 0.25; a.armL.rotation.z = -0.25;
    a.legL.rotation.x = swing * 0.7; a.legR.rotation.x = -swing * 0.7;
    a.armL.rotation.x = -swing * 0.6; a.armR.rotation.x = swing * 0.6;
  }
  a.inner.scale.y = a.inner.scale.x * (1 + Math.sin(performance.now() / 500) * 0.01);
}

// ---------------- NPC behaviour ----------------
function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

// Fluffy look: no camera direction, so whoever is closest within reach is the one you can talk to.
function updateFlatNPCs(t, dt) {
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

function updateNPCs(t, dt) {
  if (flat()) return updateFlatNPCs(t, dt);
  const camDir = new THREE.Vector3(-Math.sin(S.yaw), 0, -Math.cos(S.yaw));
  let best = null, bestScore = Infinity, look = null, lookScore = Infinity;
  const visR = scene.fog.far + 4;
  const talkR = cute() ? 2.8 : 3.4;
  for (const n of S.world.npcs) {
    const p = n.person;
    const dx = p.x - S.pos.x, dz = p.z - S.pos.z;
    const d = Math.hypot(dx, dz);
    n.dist = d;
    n.near = d < 3;
    const vis = d < visR;
    n.fig.root.visible = vis;
    if (!vis) continue;
    const fig = n.fig;
    fig.setDetail(d < 16 || n.talking);
    if (n.flinch > 0) n.flinch -= dt;
    if (d >= 16) {
      n.yaw += angleDiff(n.baseYaw, n.yaw) * Math.min(1, dt);
      fig.root.rotation.y = n.yaw;
      continue;
    }
    const toPlayer = Math.atan2(S.pos.x - p.x, S.pos.z - p.z);
    // body: turn toward you when close, otherwise drift back to facing their child
    const wantYaw = d < 5 || n.talking || n.flinch > 0 ? toPlayer : n.baseYaw;
    n.yaw += angleDiff(wantYaw, n.yaw) * Math.min(1, dt * (d < 5 ? 4 : 1.5));
    fig.root.rotation.y = n.yaw;
    const headWant = d < 10 ? Math.max(-1.1, Math.min(1.1, angleDiff(toPlayer, n.yaw))) : 0;
    fig.head.rotation.y += (headWant - fig.head.rotation.y) * Math.min(1, dt * 6);
    fig.inner.scale.y = fig.inner.scale.x * (1 + Math.sin(t * 2 + n.phase) * (cute() ? 0.025 : 0.012));
    fig.inner.rotation.z = Math.sin(t * 0.7 + n.phase) * 0.015;
    fig.inner.position.y = 0;
    if (!n.waved && d < 6.5) { n.waved = true; n.wave = 1.6; }
    if (n.wave > 0) n.wave -= dt;
    const rest = n.armRest;
    if (n.flinch > 0) {
      // hands up, little hop
      const k = Math.min(1, n.flinch * 3);
      fig.armR.rotation.z = rest + 2.4 * k; fig.armL.rotation.z = -rest - 2.4 * k;
      fig.armR.rotation.x = fig.armL.rotation.x = 0;
      fig.head.rotation.x = -0.25 * k;
      fig.inner.position.y = Math.sin(Math.min(1, (0.5 - n.flinch) / 0.5) * Math.PI) * 0.18;
    } else if (n.talking) {
      fig.armR.rotation.x = -0.5 + Math.sin(t * 5) * 0.35;
      fig.armL.rotation.x = -0.3 + Math.sin(t * 4 + 1) * 0.25;
      fig.armR.rotation.z = rest + 0.1; fig.armL.rotation.z = -rest - 0.1;
      fig.head.rotation.x = Math.sin(t * 6) * 0.06;
      if (cute()) fig.inner.position.y = Math.abs(Math.sin(t * 7)) * 0.04;
    } else if (n.wave > 0) {
      fig.armR.rotation.z = 2.6 + Math.sin(t * 14) * 0.35;
      fig.armR.rotation.x = 0;
    } else {
      fig.armR.rotation.x *= 0.9; fig.armL.rotation.x *= 0.9;
      fig.armR.rotation.z += (rest - fig.armR.rotation.z) * Math.min(1, dt * 6);
      fig.armL.rotation.z += (-rest - fig.armL.rotation.z) * Math.min(1, dt * 6);
      fig.head.rotation.x *= 0.9;
    }
    const dirAngle = Math.acos(Math.max(-1, Math.min(1, (dx * camDir.x + dz * camDir.z) / (d || 1))));
    if (d < talkR && dirAngle < (cute() ? 1.3 : 0.9)) {
      const score = d + dirAngle * 2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (d < 18 && dirAngle < 0.12 + 0.6 / Math.max(1, d)) {
      const s = dirAngle * 10 + d * 0.1;
      if (s < lookScore) { lookScore = s; look = n; }
    }
  }
  S.target = best;
  const show = best || look;
  if (show && !S.talkingTo) {
    const indi = show.person.indi;
    $('nametag').innerHTML = `${escapeHtml(displayName(indi))}<small>${escapeHtml(lifespan(indi) || '')}${show.met ? ' ✓' : ''}</small>`;
    $('nametag').classList.remove('hidden');
  } else $('nametag').classList.add('hidden');
  if (best && !S.talkingTo) {
    $('prompt').textContent = cute() ? (desktop() ? `Press E to chat` : `Tap to chat`) : (desktop() ? `Press E to talk` : `Tap to talk`);
    $('prompt').classList.remove('hidden');
    $('tTalk').classList.remove('hidden');
  } else { $('prompt').classList.add('hidden'); $('tTalk').classList.add('hidden'); }
}

// ---------------- Minigun ----------------
const fwdV = new THREE.Vector3();
function updateGun(dt) {
  if (!S.gun) return;
  const trigger = S.firing && playing();
  const shots = S.gun.update(dt, trigger, Math.hypot(S.vel.x, S.vel.z));
  const G = S.gun;
  for (let i = 0; i < shots * G.pellets; i++) {
    if (i % G.pellets === 0) { if (G.kind === 'arm') beep(90, 0.06, 'triangle', 0.08, -30); else bang(); }
    camera.getWorldDirection(fwdV);
    fwdV.x += (Math.random() - 0.5) * G.spread; fwdV.y += (Math.random() - 0.5) * G.spread; fwdV.z += (Math.random() - 0.5) * G.spread;
    fwdV.normalize();
    const hit = traceShot(camera.position, fwdV, S.world.npcs, S.world.wallRadius, G.range, S.world.shootables || []);
    if (!hit) continue;
    if (hit.prop) { blowUp(hit.prop); continue; }
    if (!G.melee || hit.npc) S.impacts.spawn(hit.point.addScaledVector(fwdV, -0.15));
    if (hit.npc) {
      const n = hit.npc;
      if (n.flinch <= 0) sfx.ouch();
      n.flinch = 0.5;
      const now = performance.now();
      if (now - (S.quipAt.get(n.person.id) || 0) > 3500) {
        S.quipAt.set(n.person.id, now);
        message(`${firstName(n.person.indi)}: "${shotQuip(n.person, S.quipN++)}"`);
      }
    }
  }
  if (shots) { S.pitch = Math.min(1.2, S.pitch + 0.002 * shots); S.face.grinUntil = performance.now() + 600; }
  S.impacts.update(dt);
  if (S.gun.state.ammo != null) $('sAmmo').textContent = Math.floor(S.gun.state.ammo);
}

// A toxic barrel bursting: noise, dust, and everyone nearby jumps out of their skin.
function blowUp(b) {
  S.world.explodeBarrel?.(b);
  boomSound();
  for (let k = 0; k < 6; k++) S.impacts.spawn(new THREE.Vector3(b.x + (Math.random() - 0.5) * 1.6, 0.3 + Math.random() * 1.4, b.z + (Math.random() - 0.5) * 1.6));
  S.face.grinUntil = performance.now() + 900;
  for (const n of S.world.npcs) {
    if (n.dist > 40 || Math.hypot(n.person.x - b.x, n.person.z - b.z) > 6) continue;
    n.flinch = 0.6;
    const now = performance.now();
    if (now - (S.quipAt.get(n.person.id) || 0) > 3500 && Math.random() < 0.5) { S.quipAt.set(n.person.id, now); message(`${firstName(n.person.indi)}: "${shotQuip(n.person, S.quipN++)}"`); }
  }
  // set off barrels right next to it, one after another
  for (const o of S.world.shootables || []) if (o.alive && o !== b && Math.hypot(o.x - b.x, o.z - b.z) < 1.6) setTimeout(() => blowUp(o), 180);
}
function boomSound() {
  const a = audio(); if (!a) return;
  try {
    const len = a.sampleRate * 0.6, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0.5;
    src.connect(f).connect(g).connect(a.destination); src.start();
  } catch (e) { /* optional */ }
}

// ---------------- Dialogue ----------------
const D = { pages: [], links: [], page: 0, shown: 0, full: '', timer: 0, npc: null, portraitFrame: -1 };

function openDialog(npc) {
  if (S.talkingTo) return;
  if (document.pointerLockElement) document.exitPointerLock();
  S.firing = false;
  S.talkingTo = npc; npc.talking = true;
  const dlg = buildDialogue(npc.person, { data: S.data, tree: S.tree });
  Object.assign(D, { pages: dlg.pages, links: dlg.links, page: 0, npc, portraitFrame: -1 });
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
    S.face.grinUntil = performance.now() + 1500;
    message(`You met ${displayName(indi)}! (${S.met.size}/${S.world.npcs.length})`);
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
  if (last) for (const l of D.links) add(l.label, '', () => { setWaypoint(l.id); closeDialog(); });
  if (D.page > 0) add('◀ Back', 'bye', () => { D.page--; showPage(); });
  add(cute() ? 'See you!' : 'Bye', 'bye', () => closeDialog());
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
  if (!silent && desktop()) requestLock();
}
$('dialog').addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') advanceDialog(); });

function tickDialog(dt) {
  if (!S.talkingTo) return;
  D.timer += dt;
  if (D.shown < D.full.length) {
    const before = D.shown;
    D.shown = Math.min(D.full.length, D.shown + dt * (cute() ? 45 : 55));
    if (Math.floor(D.shown / 3) !== Math.floor(before / 3)) sfx.blip(D.npc.look.female);
    $('dText').textContent = D.full.slice(0, Math.floor(D.shown));
  }
  const frame = Math.floor(D.timer * 8);
  if (frame !== D.portraitFrame) {
    D.portraitFrame = frame;
    const talking = D.shown < D.full.length;
    const f = talking ? frame : (frame % 10 === 9 ? 9 : 0);
    if (flat()) drawFluffyPortrait($('dPortrait').getContext('2d'), D.npc.look, 96, f);
    else if (cute()) drawIslandPortrait($('dPortrait').getContext('2d'), D.npc.look, 96, f);
    else drawPortrait($('dPortrait').getContext('2d'), D.npc.look, 96, f);
  }
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
  const bearing = Math.atan2(-dx, -dz); // yaw that would face the target
  const rel = angleDiff(bearing, S.yaw);
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
  let near = null;
  for (const n of S.world.npcs) if (!near || n.dist < near.dist) near = n;
  const root = S.tree.people.get(S.rootId).indi;
  if (cute()) {
    $('iName').textContent = firstName(root);
    $('iInfo').textContent = `Gen ${gen} · Met ${S.met.size}/${total}`;
    $('pCoins').textContent = S.coins;
    const fr = Math.floor(t * 2) % 10 === 9 ? 9 : 0;
    if (flat()) drawFluffyPortrait($('iFace').getContext('2d'), S.world.rootLook, 64, fr);
    else drawIslandPortrait($('iFace').getContext('2d'), S.world.rootLook, 64, fr);
    return;
  }
  $('sGen').textContent = gen;
  $('sMet').textContent = `${S.met.size}/${total}`;
  if (near) {
    const y = birthYear(near.person.indi);
    $('sEra').textContent = y ? String(y) : '----';
    $('sLines').textContent = near.person.lines;
  }
  // The status-bar face is you: it glances about and grins when firing or meeting someone.
  const now = performance.now();
  if (now > S.face.nextGaze) { S.face.gaze = [-1, 0, 0, 1][Math.floor(Math.random() * 4)]; S.face.nextGaze = now + 800 + Math.random() * 1600; }
  const look = Object.assign({}, S.world.rootLook, { gaze: S.face.gaze, grin: now < S.face.grinUntil });
  drawPortrait($('sFace').getContext('2d'), look, 64, Math.floor(t * 2));
}

// ---------------- Automap ----------------
const mapCanvas = $('mapCanvas');
function toggleMap() { if ($('automap').classList.contains('hidden')) openMap(); else closeMap(); }
function openMap() {
  if (document.pointerLockElement) document.exitPointerLock();
  S.firing = false;
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
    if (desktop()) requestLock();
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
  const isl = cute();
  const C = isl
    ? { bg: '#4cc3e6', land: '#7fd062', edge: '#f3e2b0', ring: 'rgba(243,226,176,0.95)', pat: '#3f7fd8', mat: '#e8507a', dot: '#ffffff', met: '#ffb020', you: '#ff6a2a', label: '#4a3020', link: '#ffb84a' }
    : { bg: '#000', land: null, edge: '#7a4a1a', ring: '#1e4a1e', pat: '#3a78ff', mat: '#ff3a2a', dot: '#e8e8e8', met: '#ffd030', you: '#4cff4c', label: '#c8c8c8', link: '#ffd030' };
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
    const x = X(n.person.x), y = Y(n.person.z);
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
  const found = S.world.npcs.filter(n => displayName(n.person.indi).toLowerCase().includes(q)).slice(0, 30);
  res.innerHTML = '';
  for (const n of found) {
    const d = document.createElement('div');
    d.textContent = `${displayName(n.person.indi)}  ${lifespan(n.person.indi)}  · gen ${n.person.gen}`;
    d.onclick = () => { setWaypoint(n.person.id); $('mapSearch').value = ''; res.classList.add('hidden'); drawMap(); };
    res.appendChild(d);
  }
  if (!found.length) res.innerHTML = '<div>Nobody by that name here.</div>';
  res.classList.remove('hidden');
});

// ---------------- Camera & main loop ----------------
// Fluffy look: pixels per metre at zoom 1, so about 16 m fit across the short side of the screen.
function flatScale() { return Math.max(26, Math.min(64, Math.min(window.innerWidth, window.innerHeight) / 13)) * S.flatZoom; }
function placeFlatCamera(dt) {
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
  if (!flat() || !S.world?.flat || !playing()) return;
  const c = S.flatCam, w = window.innerWidth, h = window.innerHeight;
  const x = c.x + (cx - w / 2) / c.scale, z = c.z + (cy - h / 2) / c.scale;
  let best = null, bd = 1.1;
  for (const n of S.world.npcs) { const d = Math.hypot(n.person.x - x, n.person.z - 0.4 - z); if (d < bd) { bd = d; best = n; } }
  if (!best) return;
  if (best.dist < 2.6) openDialog(best); else setWaypoint(best.person.id);
}
flatCanvas.addEventListener('click', e => flatTap(e.clientX, e.clientY));
window.addEventListener('wheel', e => {
  if (!flat() || !playing()) return;
  S.flatZoom = Math.max(0.45, Math.min(2.2, S.flatZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
}, { passive: true });

function placeCamera(dt) {
  if (flat()) return placeFlatCamera(dt);
  if (cute()) {
    // Third person: orbit behind your avatar. Pitch tilts the camera up and down.
    let dist = 6, elev = Math.max(0.08, Math.min(1.1, 0.38 - S.pitch * 0.6)), yaw = S.yaw;
    if (S.talkingTo) {
      const p = S.talkingTo.person;
      const want = Math.atan2(-(p.x - S.pos.x), -(p.z - S.pos.z));
      S.yaw += angleDiff(want + 0.7, S.yaw) * Math.min(1, dt * 4);
      yaw = S.yaw; dist = 4.6; elev = 0.26;
    }
    const target = new THREE.Vector3(S.pos.x, 1.15 + (platform() ? S.posY * 0.8 : 0), S.pos.z);
    if (S.talkingTo) target.lerp(new THREE.Vector3(S.talkingTo.person.x, 1.2, S.talkingTo.person.z), 0.62);
    const want = new THREE.Vector3(
      target.x + Math.sin(yaw) * Math.cos(elev) * dist,
      target.y + Math.sin(elev) * dist,
      target.z + Math.cos(yaw) * Math.cos(elev) * dist);
    if (!S.camInit) { camera.position.copy(want); S.camInit = true; }
    camera.position.lerp(want, Math.min(1, dt * 8));
    camera.lookAt(target);
    return;
  }
  const bobY = Math.sin(S.bob * 2) * 0.06 * Math.min(1, Math.hypot(S.vel.x, S.vel.z) / 4);
  camera.position.set(S.pos.x, 1.62 + bobY, S.pos.z);
  if (S.talkingTo) {
    const p = S.talkingTo.person;
    const wantYaw = Math.atan2(-(p.x - S.pos.x), -(p.z - S.pos.z));
    S.yaw += angleDiff(wantYaw, S.yaw) * Math.min(1, dt * 5);
    S.pitch += (-0.04 - S.pitch) * Math.min(1, dt * 5);
  }
  camera.rotation.set(S.pitch, S.yaw, 0, 'YXZ');
}

let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!S.world || !S.running || S.vizOpen) return;
  const t = now / 1000;
  if (!S.paused) {
    movePlayer(dt);
    updateAvatar(dt);
    updateNPCs(t, dt);
    tickDialog(dt);
    updateCompass();
    if (now - lastStatus > 250) { lastStatus = now; updateStatus(t); renderMsgs(); if (!$('automap').classList.contains('hidden')) drawMap(); }
  }
  S.world.update(t);
  placeCamera(dt);
  if (flat()) { renderFlat(t); return; }
  updateGun(dt);
  renderer.clear();
  renderer.render(scene, camera);
  if (S.gun && !S.talkingTo) {
    renderer.clearDepth();
    renderer.render(S.gun.scene, S.gun.camera);
  }
}

// Status bar stone texture
(function stoneBg() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const x = c.getContext('2d');
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { const v = 80 + Math.random() * 30; x.fillStyle = `rgb(${v},${v * 0.9},${v * 0.8})`; x.fillRect(i, j, 1, 1); }
  document.documentElement.style.setProperty('--stone', `url(${c.toDataURL()})`);
})();
(function dirtBg() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const v = Math.random(); x.fillStyle = v < 0.2 ? '#3a2a1a' : v < 0.6 ? '#4a3622' : '#5a442c'; x.fillRect(i, j, 1, 1); }
  document.documentElement.style.setProperty('--dirt', `url(${c.toDataURL()})`);
})();

// ---------------- Attract mode: the demo family slowly turning behind the title screen ----------------
let attractData = null, attractLoop = false;
async function buildAttract() {
  if (S.running) return;
  try { attractData ||= parseGedcom(await demoText()); } catch (e) { return; }
  if (S.running) return;
  const tree = layoutAncestors(collectAncestors(attractData, attractData.individuals.keys().next().value, 6), { couples: S.couples, shape: S.shape });
  computeTraits(tree, attractData);
  buildLevel(tree);
  if (cute() && !flat()) {
    const a = buildIslandFigure(S.world.rootLook, S.world.material, { legs: true });
    a.root.rotation.y = Math.PI;
    a.root.position.set(tree.hub.x, 0, tree.hub.z);
    scene.add(a.root);
  }
  if (attractLoop) return;
  attractLoop = true;
  const t0 = performance.now();
  const spin = now => {
    if (S.running) { attractLoop = false; return; }
    requestAnimationFrame(spin);
    if (S.vizOpen) return;
    const t = (now - t0) / 1000;
    if (S.world.flat) {
      // the garden drifting slowly round the plaza
      S.flatCam = { x: S.tree.hub.x + Math.cos(t * 0.06) * 9, z: S.tree.hub.z + Math.sin(t * 0.06) * 9, scale: flatScale() * 0.8 };
      S.pos.set(S.tree.hub.x, 0, S.tree.hub.z); S.vel.set(0, 0, 0);
      for (const n of S.world.npcs) n.dist = Math.hypot(n.person.x - S.pos.x, n.person.z - S.pos.z);
      renderFlat(t);
      return;
    }
    S.world.update(t);
    const r = cute() ? 13 : 16;
    camera.position.set(Math.cos(t * 0.05) * r, cute() ? 5 : 3.2, Math.sin(t * 0.05) * r);
    camera.lookAt(0, 1.2, 0);
    renderer.clear();
    renderer.render(scene, camera);
  };
  requestAnimationFrame(spin);
}

// Defaults for a first visit: the Fluffy look, the Tree layout and couples standing together.
S.couples = store.get('a3d:couples') !== '0';
S.shape = ['circle', 'half', 'tree'].includes(store.get('a3d:shape')) ? store.get('a3d:shape') : 'tree';
$('shapeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.shape === S.shape));
$('couplesToggle').checked = S.couples;
applyStyle(OLD_STYLES[store.get('a3d:style')] || store.get('a3d:style') || 'fluffy', { silent: true });
S.vizScope = 'ancestors';
setVizKind(store.get('a3d:viz'));
setTab(store.get('a3d:tab'));
S.booted = true;
buildAttract();
// expose for debugging / tests
window.__A3D = { S, setTab, openViz, vizOpen, vizView, scene, camera, renderer, startGame, loadText, openDialog, setWaypoint, openMap, closeMap, applyStyle };
