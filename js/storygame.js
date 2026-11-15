// Story mode ("A Battle in Time"): a top-down driving game played across the towns and years of your own
// family tree. On foot or at the wheel, mission by mission, by air to other countries and by ink to other
// centuries. The plot is in storyplot.js, the towns in storycity.js, the drawings in storyart.js.
import { displayName, hashString, seededRandom, collectAncestors, lifespan } from './ancestry.js';
import { computeTraits } from './traits.js';
import { lookFor } from './outfits.js';
import { drawPortrait } from './textures.js';
import { buildDialogue, voiceLine } from './dialogue.js';
import { buildStory, eraOf, ERA_NAMES, eraWords, fareBetween, inkCost, residentsOf, oddJob, townNotes, kinOf, burialsIn, lifeSoFar } from './storyplot.js';
import { buildTown, TILE, G, DIRS, drawGround, drawTall, renderMiniMap } from './storycity.js';
import { makeNet, fetchNet, cachedNet, netFromOsm } from './storynet.js';
import { VEHICLES, SPEED_SCALE, trafficMix, trafficCount, paintFor, drawVehicle, drawSmoke, strangerLook, lookSummary, drawPerson, drawItem, drawMarker, FIXED_LOOKS, drawPortraitExtras, drawCritter, ERASER_LOOK } from './storyart.js';
import { mountStoryUi, escapeText } from './storyui.js';
import { resolvePlace } from './places.js';
import { drawRouteMap } from './storymap.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Every speed in this file below was tuned when everything went twice as fast; VS scales them to today's world.
const VS = SPEED_SCALE;
const plainText = s => String(s).replace(/[«»]/g, '');
const T = TILE;
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
let S = null;

// ---------------- Upgrades and badges ----------------
const UPGRADES = [
  { id: 'engine', name: 'Tuned engine', desc: 'Each level adds 30% to her starting speed and pull. Fully tuned, she is 1.6 times as quick.', max: 2, cost: [300, 700] },
  { id: 'bar', name: 'Brass ram bar', desc: 'Every bump on a grey van counts for more.', max: 2, cost: [250, 600] },
  { id: 'ink', name: 'Ink economiser', desc: 'Each level takes a fifth off the ink for a jump.', max: 2, cost: [200, 500] },
  { id: 'wind', name: 'Quick-wind dial', desc: 'The Engine winds up sooner, and at a lower speed.', max: 2, cost: [250, 550] },
  { id: 'tyres', name: 'Proper tyres', desc: 'More grip, and no fear of the rain.', max: 1, cost: [350] },
  { id: 'strap', name: 'Luggage straps', desc: 'Nothing falls off the back, whatever you hit.', max: 1, cost: [300] },
  { id: 'clock', name: 'Dorothy\'s stopwatch', desc: 'It runs a little slow. Every timer is a tenth longer per level.', max: 2, cost: [400, 900] },
  { id: 'horn', name: 'Brass klaxon', desc: 'People hear you coming from twice as far, and jump clear at any speed short of flat out.', max: 1, cost: [250] },
  { id: 'radio', name: 'Police-band wireless', desc: 'You know where they are looking. Stars fade half as fast again.', max: 1, cost: [450] },
];
const PAINTS = ['#c8a02a', '#a8322a', '#2a5a8a', '#2a6a4a', '#5a3a7a', '#d8d4c8', '#2a2a30', '#c86a2a'];
const BADGES = {
  jump: ['First jump', 'Turned the years back'], abroad: ['Passport stamped', 'Travelled to another country'], clean: ['Not a scratch', 'A fragile delivery without one bump'],
  reunion: ['Family reunion', 'Met 25 people from your file'], respects: ['Paid your respects', 'Visited 10 family graves'], snaps: ['Family album', 'Found 9 lost photographs'],
  paradox: ['Paradox', 'Ran over your own ancestor and lived'], cabbie: ['The Knowledge', 'Five fares in a row'], rubber: ['Off the road', 'Put five grey vans off the road'],
  favours: ['Good turns', 'Five favours for the family'], gold: ['Gold standard', 'Eight gold medals'], foundling: ['The Foundling File', 'Found every page of Silas\'s record'], named: ['Somebody\'s son', 'Took Silas to the right Tuesday'], streets: ['Street cred', 'Saved five street names from being scrubbed off the map'],
  centuries: ['Century hopper', 'Visited four different eras'], fitted: ['Fully fitted', 'Every upgrade on the Heirloom'], proven: ['Proven', 'Lodged every proof'],
};
const SILAS = ['Is that one of ours? I mean yours. I mean ours.', 'She has my chin. Do you see it? That is my chin.', 'I had no idea there were so many. Do they all come at Christmas?',
  'I should like to write that one down. In ink. I have given up pencil.', 'Nobody ever told me families were so loud.', 'May we stop? I think that gentleman is my great-great-great-uncle and I have nothing to give him.'];
const up = id => (S.save.up && S.save.up[id]) || 0;
function statsOf(v) {
  const st = VEHICLES[v.type];
  if (v !== S.heirloom) return st;
  const key = up('engine') + ':' + up('tyres');
  if (!S.hstat || S.hstat.key !== key) S.hstat = { key, st: { ...st, max: st.max * (1 + 0.3 * up('engine')), acc: st.acc * (1 + 0.3 * up('engine')), grip: st.grip + 2 * up('tyres') } };
  return S.hstat.st;
}
const inkFor = (y1, y2) => Math.round(inkCost(y1, y2) * (1 - 0.2 * up('ink')));
function badge(id) {
  const b = S.save.badges || (S.save.badges = []);
  if (b.includes(id)) return;
  b.push(id);
  S.ui.toast(`Badge: ${BADGES[id][0]}. ${BADGES[id][1]}. +£50`, 5200);
  S.save.cash += 50; sfx.cash();
}
const bump = (key, n = 1) => { const st = S.save.stats || (S.save.stats = {}); st[key] = (st[key] || 0) + n; return st[key]; };
export const storyOpen = () => !!S;
export const storyState = () => S;

// ---------------- Sound ----------------
// Everything is made here from oscillators and noise: no files. Two volume knobs, effects and music, each
// with its own switch in the pause menu (and remembered).
let AC = null, sfxOut = null, musicOut = null, noiseBuf = null;
const soundOn = k => { try { return localStorage.getItem('a3d:' + k) !== '0'; } catch (e) { return true; } };
function audio() {
  if (AC) return AC;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    sfxOut = AC.createGain(); musicOut = AC.createGain();
    sfxOut.gain.value = soundOn('sfx') ? 1 : 0; musicOut.gain.value = soundOn('music') ? 1 : 0;
    sfxOut.connect(AC.destination); musicOut.connect(AC.destination);
    const n = AC.sampleRate, d = (noiseBuf = AC.createBuffer(1, n, n)).getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
  return AC;
}
function setSound(k, on) { try { localStorage.setItem('a3d:' + k, on ? '1' : '0'); } catch (e) { /* no storage */ } if (audio()) (k === 'sfx' ? sfxOut : musicOut).gain.setTargetAtTime(on ? 1 : 0, AC.currentTime, 0.05); }
const muted = () => (S && S.bot) || (typeof document !== 'undefined' && document.hidden);
function beep(freq = 440, dur = 0.06, type = 'square', vol = 0.04, slide = 0, at = 0) {
  try {
    if (muted() || !audio()) return;
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol * 1.8, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(sfxOut); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* no sound */ }
}
// A burst of noise through a filter: crashes, thuds, leaves, a snare.
function noise(dur = 0.2, vol = 0.1, freq = 900, q = 0.8, type = 'lowpass', out = null, at = 0) {
  try {
    if (muted() || !audio()) return;
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime + at;
    src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f); f.connect(g); g.connect(out || sfxOut); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  } catch (e) { /* no sound */ }
}
const sfx = {
  pick: () => { beep(880, 0.06, 'square', 0.035); beep(1320, 0.1, 'square', 0.035, 0, 0.055); },
  cash: () => [660, 880, 1100, 1320].forEach((f, i) => beep(f, 0.09, 'square', 0.035, 0, i * 0.06)),
  pass: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => beep(f, 0.16, 'square', 0.04, 0, i * 0.11)),
  fail: () => [392, 330, 262, 196].forEach((f, i) => beep(f, 0.22, 'sawtooth', 0.035, 0, i * 0.15)),
  bump: (hard = 0.5) => { noise(0.12 + hard * 0.2, 0.1 + hard * 0.16, 500 + hard * 900, 0.7); beep(90, 0.14, 'sine', 0.12 + hard * 0.1, -40); },
  crash: () => { noise(0.45, 0.28, 1400, 0.6); noise(0.2, 0.2, 3800, 1.2, 'bandpass', null, 0.04); beep(70, 0.3, 'sine', 0.2, -35); },
  boom: () => { noise(0.7, 0.3, 700, 0.5); beep(110, 0.5, 'sine', 0.22, -75); },
  leaves: () => { noise(0.3, 0.14, 3200, 0.9, 'highpass'); beep(160, 0.08, 'triangle', 0.08, -60); },
  door: () => { beep(180, 0.05, 'triangle', 0.06); noise(0.05, 0.05, 700); },
  talk: () => {},
  blip: (hz = 300) => beep(hz * (0.94 + Math.random() * 0.12), 0.045, 'square', 0.022),
  page: () => noise(0.09, 0.05, 4200, 1.4, 'bandpass'),
  jump: () => { beep(200, 0.8, 'sawtooth', 0.06, 2200); noise(0.9, 0.12, 2400, 0.7, 'bandpass'); beep(1600, 0.6, 'sine', 0.05, -1300, 0.3); },
  wind: k => beep(220 + k * 900, 0.09, 'sawtooth', 0.012 + k * 0.02),
  siren: () => { beep(740, 0.24, 'square', 0.02); beep(590, 0.24, 'square', 0.02, 0, 0.26); },
  ring: () => { beep(1400, 0.05, 'square', 0.03); beep(1400, 0.05, 'square', 0.03, 0, 0.09); },
  horn: () => { beep(392, 0.22, 'sawtooth', 0.05); beep(494, 0.22, 'sawtooth', 0.04); },
};

// ---------------- Music ----------------
// Two original eight-bit tunes, written out below as notes: a jaunty one for getting about, and a driving one
// in the minor for when a clock is running or somebody is after you. Lead, harmony, bass and drums are all
// oscillators; the year you are in changes the instruments and the pace.
const NOTE = (() => { const n = {}, names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; for (let o = 1; o <= 7; o++) names.forEach((nm, i) => { n[nm + o] = 440 * Math.pow(2, (i - 9) / 12 + (o - 4)); }); return n; })();
const TUNES = {
  roam: { bpm: 126, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'FG', 'C'], lead: [
    'E5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2', 'D5:2 D5:2 G5:2 B5:4 A5:2 G5:2 D5:2', 'C5:2 E5:2 A5:2 C6:4 B5:2 A5:2 E5:2', 'F5:4 A5:2 G5:2 F5:2 E5:2 D5:4',
    'E5:2 E5:2 G5:2 C6:4 D6:2 E6:2 C6:2', 'D6:4 B5:2 G5:2 A5:2 B5:2 D6:4', 'C6:2 A5:2 F5:2 A5:2 B5:2 G5:2 D5:2 G5:2', 'C6:6 G5:2 E5:2 G5:2 C6:4',
    'G5:4 E5:2 C5:2 E5:2 G5:2 C6:4', 'B5:4 G5:2 D5:2 G5:2 B5:2 D6:4', 'A5:4 E5:2 C5:2 E5:2 A5:2 C6:4', 'A5:2 F5:2 C5:2 F5:2 A5:2 G5:2 F5:2 D5:2',
    'G5:4 E5:2 C5:2 E5:2 G5:2 E6:4', 'D6:2 B5:2 G5:2 B5:2 D6:2 B5:2 A5:2 B5:2', 'C6:2 A5:2 F5:2 A5:2 D6:2 B5:2 G5:2 B5:2', 'C6:8 -:4 G5:2 C6:2'],
    chords2: ['C', 'G', 'Am', 'F', 'C', 'G', 'FG', 'C', 'C', 'G', 'Am', 'F', 'C', 'G', 'FG', 'C'] },
  chase: { bpm: 152, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E'], lead: [
    'A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2', 'F4:2 A4:2 C5:2 F5:2 E5:2 C5:2 A4:2 C5:2', 'G4:2 C5:2 E5:2 G5:2 E5:2 C5:2 G4:2 C5:2', 'G4:2 B4:2 D5:2 G5:2 F5:2 D5:2 B4:2 D5:2',
    'A5:4 G5:2 E5:2 A5:4 C6:4', 'A5:4 F5:2 C5:2 F5:4 A5:4', 'G#5:2 B5:2 E5:2 G#5:2 B5:4 G#5:4', 'E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:2 E5:2'] },
};
const CHORD = { C: ['C3', 'E4', 'G4', 'C5'], G: ['G2', 'D4', 'G4', 'B4'], Am: ['A2', 'E4', 'A4', 'C5'], F: ['F2', 'C4', 'F4', 'A4'], E: ['E2', 'E4', 'G#4', 'B4'] };
for (const t of Object.values(TUNES)) {
  // flatten each tune into sixteenth-note slots: what starts on each one
  t.slots = [];
  t.lead.forEach((bar, b) => { let k = 0; for (const tok of bar.split(' ')) { const [nm, len] = tok.split(':'); t.slots[b * 16 + k] = nm === '-' ? null : { f: NOTE[nm], len: +len }; k += +len; } });
  t.bars = t.lead.length;
  t.chordAt = (bar, six) => { const c = (t.chords2 || t.chords)[bar % (t.chords2 || t.chords).length]; return c === 'FG' ? (six < 8 ? 'F' : 'G') : c; };
}
const music = { tune: 'roam', want: 'roam', step: 0, next: 0, on: false };
function tone(f, t, dur, type, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(musicOut); o.start(t); o.stop(t + dur + 0.02);
}
/** Called every frame: schedules the next quarter of a second of music. */
function musicTick(want, year) {
  try {
    if (!AC || !soundOn('music') || muted() || AC.state !== 'running') { music.next = 0; return; }
    music.want = want;
    if (music.next < AC.currentTime - 0.2) { music.next = AC.currentTime + 0.06; music.step = 0; music.tune = want; }
    const old = year < 1900, mid = year < 1950;
    while (music.next < AC.currentTime + 0.25) {
      const tu = TUNES[music.tune], six = music.step % 16, bar = Math.floor(music.step / 16) % tu.bars, t = music.next;
      const spb = 60 / (tu.bpm * (old ? 0.8 : mid ? 0.9 : 1)) / 4, sw = mid && !old && six % 2 ? spb * 0.28 : 0;   // a little swing between the wars
      const sl = tu.slots[bar * 16 + six], ch = CHORD[tu.chordAt(bar, six)];
      if (sl) tone(sl.f, t + sw, sl.len * spb * 0.92, old ? 'triangle' : 'square', old ? 0.06 : 0.034);
      if (six % 4 === 0) tone(NOTE[ch[0]] , t, spb * 3.4, 'triangle', 0.075);                                     // bass on the beat
      else if (six % 4 === 2) tone(NOTE[ch[0]] * 1.5, t + sw, spb * 1.6, 'triangle', 0.05);                        // and its fifth between
      if (!old && six % 2 === 1) tone(NOTE[ch[1 + ((six >> 1) % 3)]], t + sw, spb * 0.9, 'square', 0.012);         // a quiet arpeggio underneath
      if (old && six % 4 === 2) tone(NOTE[ch[2]], t, spb * 1.8, 'triangle', 0.03);
      if (!old) {                                                                                                   // drums
        if (six % 8 === 0) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.13); o.connect(g); g.connect(musicOut); o.start(t); o.stop(t + 0.15); }
        if (six % 8 === 4) noise(0.09, 0.05, 1800, 0.7, 'highpass', musicOut, t - AC.currentTime);
        if (six % 2 === 0 && music.tune === 'chase') noise(0.025, 0.018, 7000, 1, 'highpass', musicOut, t - AC.currentTime);
      }
      music.next += spb; music.step++;
      if (music.step % 16 === 0 && music.tune !== music.want) { music.tune = music.want; music.step = 0; }       // change tune on the bar
    }
  } catch (e) { /* no sound */ }
}

if (typeof document !== 'undefined') for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { try { if (S && audio() && AC.state === 'suspended' && !document.hidden) AC.resume(); } catch (e) { /* no sound */ } }, true);
// No sound from a tab nobody is looking at.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { try { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } } catch (e) { /* no sound */ } });
// An engine note for whatever you are driving: each kind of vehicle has its own voice, and it changes gear.
const ENGINES = {
  car: { type: 'sawtooth', base: 52, range: 150, r2: 2, g2: 0.25, t2: 'sawtooth', cut: 420, cutUp: 520, lfo: 0, vol: 1, gears: 4 },
  sport: { type: 'sawtooth', base: 78, range: 270, r2: 1.5, g2: 0.45, t2: 'sawtooth', cut: 700, cutUp: 1500, lfo: 0, vol: 1.25, gears: 5 },
  v8: { type: 'sawtooth', base: 44, range: 135, r2: 0.5, g2: 0.7, t2: 'square', cut: 380, cutUp: 560, lfo: 0.3, lfoHz: 14, lfoUp: 30, vol: 1.2, gears: 4 },
  van: { type: 'square', base: 40, range: 90, r2: 2, g2: 0.15, t2: 'square', cut: 300, cutUp: 260, lfo: 0.15, lfoHz: 12, lfoUp: 14, vol: 0.9, gears: 3 },
  diesel: { type: 'square', base: 32, range: 62, r2: 1.5, g2: 0.3, t2: 'square', cut: 240, cutUp: 170, lfo: 0.45, lfoHz: 10, lfoUp: 16, vol: 1, gears: 3 },
  old: { type: 'square', base: 30, range: 52, r2: 2, g2: 0.2, t2: 'triangle', cut: 320, cutUp: 120, lfo: 0.85, lfoHz: 6, lfoUp: 12, vol: 1.1, gears: 2 },
  tram: { type: 'sine', base: 90, range: 230, r2: 2, g2: 0.3, t2: 'sine', cut: 1400, cutUp: 400, lfo: 0, vol: 0.9, gears: 1 },
};
let eng = null, squeal = null;
function engineNote(on, frac, kind = 'car', thr = 0) {
  try {
    if (!audio()) return;
    if (!eng) {
      const o = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain(), f = AC.createBiquadFilter(), g = AC.createGain(), out = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
      f.type = 'lowpass'; g.gain.value = 1; out.gain.value = 0; lg.gain.value = 0;
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out); out.connect(sfxOut);
      lfo.connect(lg); lg.connect(g.gain);
      o.start(); o2.start(); lfo.start();
      eng = { o, o2, g2, f, g, out, lfo, lg };
    }
    const e = ENGINES[kind] || ENGINES.car, now = AC.currentTime;
    // revs climb through each gear and drop back at the change
    const gi = Math.min(e.gears - 1, Math.floor(frac * e.gears)), w = frac * e.gears - gi, pf = e.gears === 1 ? frac : (gi * 0.55 + w) / ((e.gears - 1) * 0.55 + 1);
    const hz = e.base + e.range * pf;
    if (eng.o.type !== e.type) eng.o.type = e.type;
    if (eng.o2.type !== e.t2) eng.o2.type = e.t2;
    eng.o.frequency.setTargetAtTime(hz, now, 0.05); eng.o2.frequency.setTargetAtTime(hz * e.r2, now, 0.05);
    eng.g2.gain.setTargetAtTime(e.g2, now, 0.1);
    eng.f.frequency.setTargetAtTime(e.cut + e.cutUp * pf + (thr > 0 ? 160 : 0), now, 0.08);
    eng.lfo.frequency.setTargetAtTime((e.lfoHz || 8) + (e.lfoUp || 0) * pf, now, 0.1); eng.lg.gain.setTargetAtTime(e.lfo, now, 0.1);
    eng.out.gain.setTargetAtTime(on ? (0.013 + frac * 0.012) * e.vol * (thr > 0 ? 1.25 : 0.8) : 0, now, 0.08);
  } catch (err) { /* no sound */ }
}
// Tyres letting go: filtered noise, louder the further sideways you are.
function tyreSqueal(amount) {
  try {
    if (!audio()) return;
    if (!squeal) {
      const n = AC.sampleRate, buf = AC.createBuffer(1, n, n), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 5; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(sfxOut); src.start();
      squeal = { f, g };
    }
    squeal.g.gain.setTargetAtTime(amount * 0.05, AC.currentTime, 0.05);
    squeal.f.frequency.setTargetAtTime(1500 + amount * 700, AC.currentTime, 0.1);
  } catch (err) { /* no sound */ }
}

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
    save: null, city: null, mini: null, player: null, heirloom: null, vehicles: [], peds: [], items: [], floats: [], sparks: [], skids: [], flames: [], nets: new Map(), streets: new Map(),
    mission: null, step: null, busy: false, heat: 0, heatCalm: 0, bust: 0, dial: null, target: null, near: null,
    view: { x: 0, y: 0, z: 1, w: 1, h: 1 }, spawnT: 0, names: [], flash: 0, looks: new Map(), ringT: 0, paused: false,
    clock: 9, rain: 0, rainT: 0, rainRoll: -1, critters: [], burials: [], glitch: 0,
  };
  // the family's commonest surnames, for street names
  const count = new Map();
  for (const p of tree.people.values()) if (p.indi.surname) count.set(p.indi.surname, (count.get(p.indi.surname) || 0) + 1);
  S.surnames = [...count.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]).filter(n => /^[\p{L}' -]{3,14}$/u.test(n)).slice(0, 30);
  let save = null;
  try { save = JSON.parse(store?.get(S.key) || 'null'); } catch (e) { save = null; }
  if (!save || save.v !== 1 || !story.towns.has(save.town)) save = { v: 1, cash: 40, idx: 0, proofs: [], town: story.home.id, year: story.now, oddN: 0, fresh: true };
  save.idx = clamp(save.idx, 0, story.missions.length);
  S.save = save;
  const hero = tree.people.get(rootId);
  S.player = { x: 0, y: 0, ang: 0, vehicle: null, hearts: 3, walk: 0, look: lookSummary(lookFor(hero)), down: 0, invuln: 0, moving: false };
  enterTown(story.towns.get(save.town), save.year, save.fresh ? 'start' : 'load');
  if (needsStreets(S.city.town)) {
    // First time in this town: fetch its real streets before anything starts, and show how that is going.
    const tok = S, town0 = S.city.town, others = [...story.towns.values()].filter(t => t.id !== town0.id);
    S.busy = true;
    waitForStreets(town0, false).then(how => {
      if (S !== tok) return;
      if (how === 'got') { enterTown(town0, save.year, save.fresh ? 'start' : 'load'); ui.toast(`These are the real streets of ${town0.name}. © OpenStreetMap contributors`, 5200); }
      else if (how === 'none') ui.toast(`Could not get the real streets of ${town0.name}, so it is made up for now.`, 5200);
      else S.streets.get(town0.id)?.promise.then(got => { if (S === tok && got) ui.toast(`The real streets of ${town0.name} have arrived. They will be used the next time you get here, or now from the pause menu.`, 8000); });
      S.busy = false;
      // and the other towns in the story, one at a time, so they are ready when you get there
      (async () => { for (const t of others) { await new Promise(r => setTimeout(r, 2500)); if (S !== tok) return; await fetchStreets(t); } })();
    });
  }
  // Hooks for the headless test (tests/story-smoke.py): jump to the current target, finish a step, travel.
  S.debug = {
    warp() { if (['tail', 'defend', 'catch'].includes(S.step?.step.t)) return; if (S.step?.step.need === 'heirloom' || ['carry', 'chase'].includes(S.step?.step.t)) this.intoHeirloom(); const t = stepTarget() || idleTarget(); if (!t) return; const P = S.player, sp = freeSpotNear(t.x, t.y, 0); if (P.vehicle) { const r = roadNear(t.x, t.y); P.vehicle.x = r.x; P.vehicle.y = r.y; P.vehicle.speed = P.vehicle.vx = P.vehicle.vy = 0; P.x = r.x; P.y = r.y; } else { P.x = sp.x; P.y = sp.y; } S.view.x = P.x; S.view.y = P.y; },
    finishStep() { const st = S.step; if (!st) return; const s = st.step; if (s.t === 'talk') return; if (s.t === 'search') { S.mission.found = st.spots[st.where].k; nextStep(); return; } if (s.t === 'frenzy') { st.timer = 0.01; return; } if (s.t === 'tail' && st.target) { st.target.arrived = true; st.grace = 9; return; } if (s.t === 'defend' && st.convoy) { st.convoy.arrived = true; return; } if (s.t === 'catch' && st.runner) { st.runner.caught = true; return; } if (s.t === 'chase' && st.target) { st.target.hp = 0; return; } if (s.t === 'escape') { S.heat = 0; return; } if (s.t === 'travel') { enterTown(S.story.towns.get(s.town), s.year, 'hub'); return; } nextStep(); },
    intoHeirloom() { const P = S.player; if (P.vehicle) return; P.x = S.heirloom.x; P.y = S.heirloom.y; enterVehicle(S.heirloom); },
    go(townId, year) { enterTown(S.story.towns.get(townId), year, 'hub'); },
    travel(townId, year, where) { travel(S.story.towns.get(townId), year, where); },
    bot(on, speed = 1) { S.bot = on ? { replan: 0, path: null, at: null, stuck: 0, rev: 0, unstick: 0, side: 0 } : null; S.speed = on ? speed : 0; S.tele = on ? (S.tele || []) : S.tele; S.save.hints = { walk: 1, drive: 1, fares: 1, hunt: 1 }; },
    startFav(f) { if (f && !S.mission) startMission(f); },
    target() { return stepTarget(); },
    fail() { failMission('Too late.'); },
    useOsm(townId, json, lat, lon) { const net = netFromOsm(json, lat, lon); if (net) S.nets.set(townId, net); return net ? { nodes: net.nodes.length, ways: net.ways.length } : null; },
    startSide(k) { if (!S.mission) startSide(k); },
    ghost(on) { S.ghost = !!on; },
    startNext() { const n = nextStory(); if (n && isHere(n) && !S.mission) startMission(n); },
  };
  const onResize = () => S && S.ui.resize();
  window.addEventListener('resize', onResize);
  S.onResize = onResize;
  S.raf = requestAnimationFrame(loop);
  if (save.fresh) { save.fresh = false; S.ui.banner('A BATTLE IN TIME', `A story for the ${story.surname} family`, '#ffd84a', 3600); }
  return S;
}

export function closeStory(silent) {
  if (!S) return;
  const s = S;
  persist();
  cancelAnimationFrame(s.raf);
  engineNote(false, 0); tyreSqueal(0);
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
  if (who === 'lowe') return { who: 'Mr Lowe', sub: 'Hargreaves & Lowe, Solicitors', look: FIXED_LOOKS.eraser };
  if (who === 'dot') return { who: 'Dorothy Pickering', sub: 'County Archivist, retired', look: FIXED_LOOKS.dot };
  if (who === 'blank') return { who: 'Silas Hargreaves', sub: 'Hargreaves & Lowe', look: FIXED_LOOKS.blank };
  if (who === 'letter') return { who: 'A letter', sub: '', letter: true };
  if (who === 'note') return { who: '', sub: '', note: true };
  const p = S.tree.people.get(who), ch = S.story.chapters.find(c => c.id === who);
  if (!p && S.data.individuals.has(who)) { const o = outsider(who); return { who: displayName(o.person.indi), sub: [kinOf(S.data, S.tree, who), lifespan(o.person.indi)].filter(Boolean).join(' · '), look: o.portrait, person: o.person }; }
  return { who: p ? displayName(p.indi) : 'Somebody', sub: [ch ? 'your ' + ch.rel : p ? kinOf(S.data, S.tree, who) : '', p ? lifespan(p.indi) : ''].filter(Boolean).join(' · '), look: personLook(who), person: p };
}
// Somebody in the file who is not a direct ancestor: a voice, a face and a figure for them.
function outsider(id) {
  const key = 'o:' + id + ':' + S.city.year;
  if (S.looks.has(key)) return S.looks.get(key);
  const indi = S.data.individuals.get(id), rnd = seededRandom(hashString('out' + id));
  const L = strangerLook(rnd, S.city.year, indi.sex === 'F');
  const o = {
    person: { id, indi, traits: { place: resolvePlace((indi.events.find(e => e.tag === 'BIRT' && e.place) || {}).place || ''), edu: 1, dressYear: S.city.year, estBirthYear: S.city.year - 30 } },
    look: L, portrait: { female: L.female, skin: L.skin, skinShade: L.skin, hair: L.hair, longHair: !!L.female, top: L.shawl || L.top, collar: null, hat: L.hat ? { kind: L.female ? 'bonnet' : 'flat', color: L.hat } : null },
  };
  S.looks.set(key, o);
  return o;
}
async function say(who, text, options) {
  const sp = speaker(who);
  const body = sp.person ? voiceLine(sp.person, text) : plainText(text);
  const paper = sp.letter || sp.note, voice = who === 'dot' ? 330 : who === 'blank' ? 150 : (sp.look && sp.look.female ? 300 : 170) + (hashString('voice' + who) % 90);
  if (paper) sfx.page();
  return S.ui.say({
    who: sp.who, sub: sp.sub, text: body, options, letter: sp.letter, blip: paper ? null : () => sfx.blip(voice),
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
  if (kind === '@found') kind = S.mission?.found || 'home';
  const giver = S.mission?.def.giver.who;
  return S.city.lot(kind, who || (giver && S.data.individuals.has(giver) ? giver : S.story.hero.id));
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
  const v = { id: (S.vid = (S.vid || 0) + 1), type, x, y, ang, vx: 0, vy: 0, speed: 0, hp: VEHICLES[type].hp, color: paintFor(type, rnd), ai: null, hitCd: 0, charge: 0, stuck: 0, ...extra };
  S.vehicles.push(v);
  return v;
}
// Real street plans come from OpenStreetMap, once per town, and are kept on this device. Off: every town is drawn.
const realStreets = () => { try { return localStorage.getItem('a3d:realstreets') !== '0'; } catch (e) { return false; } };
/** Fetch a town's real streets if we have not got them. Resolves true if a new plan arrived. One fetch per town; S.streets has how each is getting on. */
function fetchStreets(town) {
  const tok = S;
  if (!realStreets()) return Promise.resolve(false);
  const cur = S.nets.get(town.id);
  if ((cur && cur.source === 'osm') || cachedNet(town) === null) return Promise.resolve(false);
  let rec = S.streets.get(town.id);
  if (rec && (rec.state.stage !== 'fail' || S.t - rec.t0 < 20)) return rec.promise;
  rec = { state: { stage: 'find' }, t0: S.t, wall: performance.now(), promise: null };
  S.streets.set(town.id, rec);
  rec.promise = fetchNet(town, 80000, st => { rec.state = st; }).then(net => { if (S !== tok || !net) return false; S.nets.set(town.id, net); return true; });
  return rec.promise;
}
const needsStreets = town => realStreets() && S.nets.get(town.id)?.source !== 'osm' && cachedNet(town) === undefined;
/**
 * A card that shows the real streets of a town arriving, with a way out. Resolves 'got' when they are in,
 * 'skip' if the player would rather not wait, 'none' if they cannot be had.
 */
function waitForStreets(town, arriving) {
  const tok = S, ui = S.ui, name = escapeText(town.name);
  return new Promise(resolve => {
    let over = false, timer = 0;
    const end = how => { if (over) return; over = true; clearInterval(timer); if (S === tok) ui.closePanel(); resolve(how); };
    const p = fetchStreets(town), rec = S.streets.get(town.id);
    ui.panel(`<h2>🗺 Fetching the real streets of ${name}</h2><p>Downloading ${name}'s actual street plan and street names from OpenStreetMap, to draw in the game's own style. Once for each town; after that it is kept on this device. Only the town's name is sent.</p>
      <div style="height:16px;border:2.5px solid #2d2438;border-radius:9px;background:#e6dcc4;overflow:hidden;margin:10px 0 6px"><div id="stLoadBar" style="height:100%;width:4%;background:#f2b230;transition:width .25s"></div></div>
      <p id="stLoadMsg" style="margin:0 0 4px"><b>Finding ${name} on the map…</b></p><p><small id="stLoadSub">The free map servers are often busy. It can take up to a minute.</small></p>
      <div class="foot"><button data-go="skip">${arriving ? 'Go now' : 'Play now'} with made-up streets</button></div><p><small>If you do not wait, the real streets are used the next time you arrive in ${name}. Map data © OpenStreetMap contributors.</small></p>`, { skip: () => end('skip'), close: () => end('skip') });
    const show = () => {
      if (S !== tok) { end('skip'); return; }
      const st = rec ? rec.state : { stage: 'none' }, el = rec ? (performance.now() - rec.wall) / 1000 : 0, bar = document.getElementById('stLoadBar'), msg = document.getElementById('stLoadMsg'), sub = document.getElementById('stLoadSub');
      if (!bar || !msg) return;
      let pct = 5, text = `Finding ${name} on the map…`;
      if (st.stage === 'ask') { pct = 10 + 58 * (1 - Math.exp(-el / 22)); text = `Asking the map server for ${name}'s streets…` + (st.n > 1 ? ` (try ${st.n})` : ''); }
      else if (st.stage === 'busy') { pct = 10 + 58 * (1 - Math.exp(-el / 22)); text = `The map server is busy. Trying again in a moment… (try ${st.n})`; }
      else if (st.stage === 'read') { pct = 70 + 25 * Math.min(1, st.bytes / 900000); text = `Downloading the streets: ${Math.round(st.bytes / 1024)} KB`; }
      else if (st.stage === 'build') { pct = 97; text = 'Drawing the town…'; }
      else if (st.stage === 'done') { pct = 100; text = 'Done.'; }
      bar.style.width = pct.toFixed(0) + '%'; msg.innerHTML = `<b>${text}</b>`;
      if (sub) sub.textContent = `${Math.round(el)} seconds so far. The free map servers are often busy; it can take up to a minute.`;
    };
    timer = setInterval(show, 250); show();
    p.then(got => end(got || S.nets.get(town.id)?.source === 'osm' ? 'got' : 'none'));
  });
}
// Two lines of fire on the road behind the Heirloom where it lands in another year.
function fireTracks(v) {
  const st = VEHICLES[v.type], sx = -Math.sin(v.ang) * st.wid * 0.38, sy = Math.cos(v.ang) * st.wid * 0.38;
  for (let d = 0; d < 13 * T; d += 9) for (const sg of [1, -1]) {
    const x = v.x - Math.cos(v.ang) * (d + st.len * 0.3) + sx * sg, y = v.y - Math.sin(v.ang) * (d + st.len * 0.3) + sy * sg;
    S.flames.push({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, born: S.t + Math.random() * 0.15, life: 1.6 + (1 - d / (13 * T)) * 3.2 + Math.random() * 0.6, r: 7 + Math.random() * 5 });
    if (d % 27 === 0) S.skids.push({ x1: x, y1: y, x2: x - Math.cos(v.ang) * 27, y2: y - Math.sin(v.ang) * 27, t: S.t });
  }
  S.shake = 0.7;
}
function parkHeirloom(x, y) {
  const c = S.city, h = S.heirloom, n = c.nearNode(x, y), nb = c.nodes[n].nb;
  const m = nb.slice().sort((a, b) => Math.hypot(c.nodes[a].x - x, c.nodes[a].y - y) - Math.hypot(c.nodes[b].x - x, c.nodes[b].y - y))[0];
  if (m == null) { const r = roadNear(x, y); h.x = r.x; h.y = r.y; h.ang = 0; h.vx = h.vy = h.speed = 0; return; }
  // the nearest point on that stretch, then over to the kerb
  const A = c.nodes[n], B = c.nodes[m], dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy || 1, t = clamp(((x - A.x) * dx + (y - A.y) * dy) / l2, 0.15, 0.85), d = Math.sqrt(l2), side = (c.left ? 1 : -1) * 0.55 * T;
  h.x = A.x + dx * t + dy / d * side; h.y = A.y + dy * t - dx / d * side; h.ang = Math.atan2(dy, dx); h.vx = h.vy = h.speed = 0;
}

function enterTown(town, year, where) {
  const P = S.player, old = S.city;
  const keep = where === 'jump' && P.vehicle === S.heirloom;
  if (old && S.mission && S.step?.step.t !== 'travel' && !S.hopping) failMission('You left before the job was done.');
  if (!S.nets.has(town.id)) S.nets.set(town.id, (realStreets() && cachedNet(town)) || makeNet(town));
  S.city = buildTown(town, year, { surnames: S.surnames, net: S.nets.get(town.id) });
  S.mini = renderMiniMap(S.city, 2);
  const c = S.city;
  S.vehicles = [];
  S.peds = []; S.items = []; S.floats = []; S.sparks = []; S.skids = []; S.flames = []; S.incident = null;
  const h = S.heirloom || { type: 'heirloom', x: 0, y: 0, ang: 0, vx: 0, vy: 0, speed: 0, hp: VEHICLES.heirloom.hp, color: paintFor('heirloom'), ai: null, hitCd: 0, charge: 0, stuck: 0 };
  S.heirloom = h; h.charge = 0;
  if (S.save.paint) h.color = S.save.paint;
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
  // (not the hero, and not anybody who has a chapter of their own here)
  const starring = new Set([S.story.hero.id, ...S.story.chapters.filter(ch => ch.town.id === town.id).map(ch => ch.id)]);
  for (const f of S.story.frags) if (f.town === town.id && f.year === year && !(S.save.frags || []).includes(f.id)) {
    const l = c.lot(f.lot), fr = seededRandom(hashString(f.id + town.id));
    let spot = null;
    for (let k = 0; k < 300 && !spot; k++) { const a = fr() * 7, r = (4 + fr() * 5) * T, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r, tt = c.at(Math.floor(x / T), Math.floor(y / T)); if ((tt === G.GRASS || tt === G.YARD || tt === G.PAVE || tt === G.PLAZA) && c.reachable(Math.floor(x / T), Math.floor(y / T)) && !circleSolid(x, y, 12)) spot = { x, y }; }
    if (spot) S.items.push({ frag: f.id, kind: 'file', x: spot.x, y: spot.y, n: 5, text: f.text });
  }
  sideTokens(c);
  S.names = residentsOf(S.data, town, year, 48).filter(n => !starring.has(n.id));
  // three lost photographs in every town and era, with the file's own notes on the back
  const got = new Set(S.save.photos || []), pr = seededRandom(hashString('photo' + town.id + c.era));
  S.notes = townNotes(S.data, town);
  for (let i = 0, guard = 0; i < 3 && guard < 400; guard++) {
    const tx = Math.floor(pr() * c.W), ty = Math.floor(pr() * c.H), tt = c.at(tx, ty);
    if (tt !== G.PAVE && tt !== G.YARD && tt !== G.GRASS && tt !== G.PLAZA) continue;
    const id = `${town.id}:${c.era}:${i}`;
    if (!got.has(id)) S.items.push({ photo: id, n: i, x: (tx + 0.5) * T, y: (ty + 0.5) * T, kind: 'photo' });
    i++;
  }
  for (const sp of c.parkSpots) if (hashString(town.id + sp.x) % 5 < 3) { const v = makeVehicle(mix[hashString('p' + sp.x) % mix.length][0], sp.x, sp.y, sp.ang, { parked: true }); if (VEHICLES[v.type].len > 60) v.gone = true; }
  S.vehicles = S.vehicles.filter(v => !v.gone);
  // a cab on the rank outside the station or the airport
  const rank = c.lots.hub, cabType = year >= 1950 ? 'taxi' : year >= 1830 ? 'cab' : null;
  if (cabType && !circleSolid(rank.x + 2.4 * T, rank.y, 16)) makeVehicle(cabType, rank.x + 2.4 * T, rank.y, 0, { parked: true });
  // the tram runs up and down the High Street
  if (c.tramWay >= 0) { const w = c.ways[c.tramWay], a = w.pts[0], b = w.pts[1], tp = lanePt(a, b, 1); makeVehicle('tram', tp.x, tp.y, Math.atan2(c.nodes[b].y - c.nodes[a].y, c.nodes[b].x - c.nodes[a].x), { ai: 'traffic', straight: true, keep: true, pn: a, n: b }); }
  S.burials = burialsIn(S.data, town, year);
  c.graves.forEach((gv, i) => { gv.who = S.burials[i] || null; });
  spawnCritters();
  S.rainRoll = -1;
  const eras = S.save.eras || (S.save.eras = []);
  if (!eras.includes(c.era)) { eras.push(c.era); if (eras.length >= 4) setTimeout(() => S && badge('centuries'), 3000); }
  S.townLabel = town.name + (town.nation && town.nation !== town.name ? ', ' + town.nation : '');
  S.heat = 0; S.bust = 0;
  S.view.x = P.x; S.view.y = P.y;
  spawnNpcs();
  for (let i = 0; i < 14; i++) spawnWalker(true);
  if (old) { const show = () => S && S.ui.banner(town.name, `${year} · ${ERA_NAMES[c.era]}`, '#ffe9a8', 2600); if (S.transit) S.transit.after = show; else show(); }
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
    S.peds.push({ npc: true, who, giver, x: sp.x, y: sp.y, ang: Math.PI / 2, look, walk: 0, down: 0, name: who === 'dot' ? 'Dorothy Pickering' : displayName(S.tree.people.get(who).indi) });
  };
  if (c.town.id === st.home.id && c.year === st.now && (S.save.idx > 0 || (S.mission && S.mission.i >= 1))) add('dot', 'garage', false);
  for (const ch of st.chapters) if (ch.town.id === c.town.id && ch.year === c.year && S.save.idx > (st.missions.find(m => m.chapter === ch.index)?.index ?? 1e9)) add(ch.id, 'home', false);
  // family favours: brothers, sisters and children of the people whose chapters you have reached
  if (!S.mission) for (const f of st.favours) {
    if (f.town !== c.town.id || f.year !== c.year || (S.save.favours || []).includes(f.id) || S.save.idx <= f.after) continue;
    if (S.peds.some(p => p.npc && p.who === f.giver.who)) continue;
    const l = c.lot('home', f.giver.who), sp = freeSpotNear(l.x, l.y, 0), o = outsider(f.giver.who);
    S.peds.push({ npc: true, who: f.giver.who, favour: f, x: sp.x, y: sp.y, ang: Math.PI / 2, look: o.look, walk: 0, down: 0, name: displayName(o.person.indi) });
  }
  if (here(next) && next.giver.who !== 'auto' && !S.mission) {
    const who = next.giver.who;
    const ex = S.peds.find(p => p.npc && p.who === who);
    if (ex) { const l = c.lot(next.giver.at, who); const sp = freeSpotNear(l.x, l.y, 0); ex.x = sp.x; ex.y = sp.y; ex.giver = true; }
    else if (who === 'dot' && next.giver.at === 'phone') S.peds.push({ npc: true, who: 'dot', giver: true, phone: true, x: c.lot('phone').x, y: c.lot('phone').y, ang: 0, look: null, name: 'A note from Dorothy' });
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
  if (S.ghost) return false;   // handling tests only: drive through walls
  const st = VEHICLES[v.type], o = st.len * 0.28, r = st.wid * 0.46, cx = Math.cos(ang) * o, cy = Math.sin(ang) * o;
  return circleSolid(x + cx, y + cy, r) || circleSolid(x - cx, y - cy, r);
}
function moveWalker(p, dx, dy, r = 8) {
  dx *= VS; dy *= VS;
  if (!circleSolid(p.x + dx, p.y, r)) p.x += dx;
  if (!circleSolid(p.x, p.y + dy, r)) p.y += dy;
}

// ---------------- Vehicles ----------------
function driveVehicle(v, ctrl, dt) {
  const st = statsOf(v);
  const rough = !S.ghost && S.city.rough(v.x, v.y);
  const maxV = st.max * T * (rough ? 0.6 : 1) * (v.dead ? 0 : 1) * (ctrl.cap || 1);
  if (ctrl.thr > 0) v.speed += st.acc * T * ctrl.thr * dt * (v.speed < 0 ? 2.2 : 1);
  else if (ctrl.thr < 0) v.speed += st.acc * T * ctrl.thr * dt * (v.speed > 0 ? 2.4 : 0.7);
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 3.6 * T * dt);   // off the gas: from flat out to a stop in under two seconds
  if (ctrl.brake) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 15 * VS * T * dt);
  const drift = st.horse ? 0 : st.drift ?? 0.5, hand = !!ctrl.hand && Math.abs(v.speed) > 1.5 * VS * T;
  // the handbrake (Space) stops you dead in well under a second; steer while you hold it and the back slides round
  const handDec = (st.horse ? 12 : 9 + 3 * (1 - drift)) * T;
  if (ctrl.hand) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), handDec * (1 - 0.6 * Math.min(1, Math.abs(ctrl.steer))) * dt);
  v.thr = ctrl.thr; v.hand = !!ctrl.hand;
  if (v.speed > maxV) v.speed = Math.max(maxV, v.speed - 12 * VS * T * dt);
  v.speed = Math.max(v.speed, -maxV * 0.38);
  // steering: full lock at town speeds, easing off towards top speed so the car is calm flat out
  const hi = clamp((Math.abs(v.speed) - 0.45 * st.max * T) / (0.55 * st.max * T), 0, 1);
  const sf = clamp(Math.abs(v.speed) / (3.2 * VS * T), 0, 1) * (v.speed < 0 ? -1 : 1) * (hand || v.slideT > 0 ? 1 : 1 - 0.45 * hi);
  const newAng = v.ang + ctrl.steer * st.turn * sf * dt * (hand ? 1 + 0.8 * drift : ctrl.brake ? 1.35 : 1);
  if (!vehicleSolid(v, v.x, v.y, newAng)) v.ang = newAng;
  const wet = 1 - 0.38 * S.rain * (v === S.heirloom && up('tyres') ? 0.25 : 1);
  // grip: only the handbrake lets the back end go (more on a quick car, hardly at all on a bus). Steering on its own
  // never slides; a tap of the handbrake in a corner does, and the slide runs on for a moment as the tyres find grip.
  if (hand && Math.abs(ctrl.steer) > 0.3) v.slideT = 0.7; else if (v.slideT > 0) v.slideT -= dt;
  const firm = st.grip * 2;   // planted: an ordinary corner leaves no skid marks
  const loose = st.grip * (0.5 - 0.38 * drift), slideGrip = v.slideT > 0 ? loose + (firm - loose) * (1 - v.slideT / 0.7) : firm;
  const k = 1 - Math.exp(-(v.fling > 0 ? st.grip * 0.1 : hand ? loose : ctrl.brake ? st.grip * 0.45 : slideGrip) * wet * dt);   // thrown by a crash, the tyres are not gripping at all
  v.vx += (Math.cos(v.ang) * v.speed - v.vx) * k; v.vy += (Math.sin(v.ang) * v.speed - v.vy) * k;
  // the handbrake takes the slide off too, so the car stops where you stopped it instead of sailing on
  // (steering hard while you hold it lets the slide run on: that is the handbrake turn)
  if (ctrl.hand && !(v.fling > 0)) { const vm = Math.hypot(v.vx, v.vy); if (vm > 0) { const f = Math.max(0, vm - handDec * 0.8 * (1 - 0.85 * Math.min(1, Math.abs(ctrl.steer))) * dt) / vm; v.vx *= f; v.vy *= f; } }
  let hit = 0;
  const mine = v === S.player.vehicle, sp0 = Math.hypot(v.vx, v.vy) || 1;
  if (mine && sp0 > 4 * VS * T) fellTrees(v, dt);
  // How square-on a knock is decides what it costs: a glancing touch slides along the wall, a head-on one
  // takes four fifths of the speed, throws the car back and sets it spinning.
  const knock = (comp, flip) => {
    const frac = Math.abs(comp) / sp0, hard = Math.abs(comp) > 5 * VS * T;
    hit = Math.max(hit, Math.abs(comp));
    v.speed *= 1 - 0.8 * frac;
    flip(hard ? -0.42 : -0.12);
    if (mine && hard) { v.fling = 0.25 + 0.3 * frac; v.spin = clamp(angDiff(Math.atan2(v.vy, v.vx), v.ang) * 3.2, -5.5, 5.5) * frac; }
  };
  const nx = v.x + v.vx * dt;
  if (vehicleSolid(v, nx, v.y, v.ang)) knock(v.vx, k => { v.vx *= k; }); else v.x = nx;
  const ny = v.y + v.vy * dt;
  if (vehicleSolid(v, v.x, ny, v.ang)) knock(v.vy, k => { v.vy *= k; }); else v.y = ny;
  if (v.fling > 0) { v.fling -= dt; const na = v.ang + (v.spin || 0) * dt; if (!vehicleSolid(v, v.x, v.y, na)) v.ang = na; v.spin *= 1 - 2.2 * dt; }
  // how far sideways it is going, and the marks that leaves
  v.slip = Math.abs(-v.vx * Math.sin(v.ang) + v.vy * Math.cos(v.ang)) / T / VS;
  if (v.slip > 2.2 && !st.horse && !rough && Math.hypot(v.vx, v.vy) > 3 * VS * T) {
    const bx = -Math.cos(v.ang) * st.len * 0.32, by = -Math.sin(v.ang) * st.len * 0.32, sx = -Math.sin(v.ang) * st.wid * 0.38, sy = Math.cos(v.ang) * st.wid * 0.38;
    const now = [[v.x + bx + sx, v.y + by + sy], [v.x + bx - sx, v.y + by - sy]];
    if (v.sk) for (let w = 0; w < 2; w++) S.skids.push({ x1: v.sk[w][0], y1: v.sk[w][1], x2: now[w][0], y2: now[w][1], t: S.t });
    v.sk = now;
    if (S.skids.length > 700) S.skids.splice(0, S.skids.length - 700);
  } else v.sk = null;
  if (v.hitCd > 0) v.hitCd -= dt;
  if (hit > 3.5 * VS * T) wallHit(v, hit / VS);   // knocks are judged as they always were
  return hit;
}
// Anything going fast enough goes through a tree instead of stopping at it: the tree comes down, the car
// loses a third of its speed and is knocked a little off its line.
function fellTrees(v, dt) {
  const c = S.city, st = VEHICLES[v.type], o = st.len * 0.3, r = st.wid * 0.5;
  for (const sg of [1, -1]) {
    const px = v.x + v.vx * dt + Math.cos(v.ang) * o * sg, py = v.y + v.vy * dt + Math.sin(v.ang) * o * sg;
    for (let ty = Math.floor((py - r) / T); ty <= Math.floor((py + r) / T); ty++) for (let tx = Math.floor((px - r) / T); tx <= Math.floor((px + r) / T); tx++) {
      if (c.at(tx, ty) !== G.TREE || tx < 2 || ty < 2 || tx > c.W - 3 || ty > c.H - 3) continue;
      c.tiles[ty * c.W + tx] = G.GRASS;
      c.chunks.delete(Math.floor(tx / 16) + ',' + Math.floor(ty / 16));
      const cxp = (tx + 0.5) * T, cyp = (ty + 0.5) * T;
      spark(cxp, cyp, 16, '#4fa84a'); spark(cxp, cyp, 6, '#8a5a2a'); sfx.leaves();
      float(cxp, cyp - 20, 'TIMBER!', '#bfe8a0');
      v.speed *= 0.66; v.vx *= 0.66; v.vy *= 0.66;
      const side = (cxp - v.x) * -Math.sin(v.ang) + (cyp - v.y) * Math.cos(v.ang) > 0 ? -1 : 1;
      v.vx += -Math.sin(v.ang) * side * 2.2 * T; v.vy += Math.cos(v.ang) * side * 2.2 * T;
      S.shake = Math.max(S.shake || 0, 0.45);
      if (S.step) S.step.trees = (S.step.trees || 0) + 1;
      bump('trees');
    }
  }
}
function wallHit(v, hit) {
  if (v !== S.player.vehicle) return;
  if (S.step) S.step.walls = (S.step.walls || 0) + 1;
  if (hit > 9 * T) sfx.crash(); else sfx.bump(clamp(hit / (10 * T), 0.2, 1));
  spark(v.x + Math.cos(v.ang) * 20, v.y + Math.sin(v.ang) * 20, 6 + Math.round(hit / (2 * T)));
  S.shake = Math.max(S.shake || 0, clamp(hit / (11 * T), 0.15, 1));
  gentleBump(hit);
  if (v !== S.heirloom && hit > 7 * T) damage(v, 1);
}
function damage(v, n) {
  if (v === S.heirloom || v.dead) return;
  v.hp -= n;
  if (v.hp <= 0) { v.dead = true; v.ai = null; if (S.player.vehicle === v) { S.ui.toast(`The ${VEHICLES[v.type].name} has had enough. Press H to call the Heirloom.`); leaveVehicle(true); } }
}
function gentleBump(hit) {
  spillBump(hit);
  const m = S.mission, st = S.step;
  if (!m || !st || !st.step.gentle || !st.loaded || hit < 4.2 * T || st.bumpCd > 0) return;
  st.bumpCd = 1; st.bumps = (st.bumps || 0) + 1;
  if (st.bumps >= 3) failMission(st.step.passenger ? 'Your passenger got out and walked.' : 'It is in pieces.');
  else S.ui.toast(`Careful! (${st.bumps}/3)`, 1500);
}
function spark(x, y, n = 5, col = '#ffe08a') { for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = 40 + Math.random() * 120; S.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.35 + Math.random() * 0.2, col }); } }
function float(x, y, text, col = '#fff') { S.floats.push({ x, y, text, t: 2.2, col }); }

// Traffic follows the lanes from junction to junction.
// Where a vehicle going from junction a to junction b should be: on its own side of the road, back a little
// from b (at = -1) or a little way on from a (at = 1).
function lanePt(a, b, at) {
  const c = S.city, A = c.nodes[a], B = c.nodes[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const side = (c.left ? 1 : -1) * 0.5 * T, back = Math.min(1.5 * T, d * 0.45), o = at < 0 ? B : A, k = at < 0 ? -back : back;
  return { x: o.x + ux * k + uy * side, y: o.y + uy * k - ux * side };
}
const turnOf = (a, b, n) => { const c = S.city.nodes; return Math.abs(angDiff(Math.atan2(c[n].y - c[b].y, c[n].x - c[b].x), Math.atan2(c[b].y - c[a].y, c[b].x - c[a].x))); };
// The junction the player (or whoever is being hunted) is nearest, and how far everything is from it by road.
function preyField(prey) {
  const c = S.city, k = prey === S.player || !prey ? 'p' : 'v' + prey.id, t = S.pf || (S.pf = {});
  if (!t[k] || t[k].until < S.t || t[k].city !== c) { const q = prey && prey !== S.player ? prey : S.player.vehicle || S.player; t[k] = { until: S.t + 0.8, city: c, f: c.field(c.nearNode(q.x, q.y)) }; }
  return t[k].f;
}
// Having reached v.n (from v.pn), choose where to go next.
function planLeg(v) {
  const c = S.city, here = c.nodes[v.n];
  let opts = here.nb.filter(m => m !== v.pn);
  if (!opts.length) opts = [v.pn];
  const live = opts.filter(m => !c.nodes[m].dead);
  let nn;
  if (v.ai === 'lead') { if (v.destN == null || v.destFor !== v.dest) { v.destN = c.nearNode(v.dest.x, v.dest.y); v.destFor = v.dest; } const f = c.field(v.destN); nn = here.nb.slice().sort((a, b) => f[a] - f[b])[0]; }
  else if (v.ai === 'flee') { const f = preyField(S.player), pool = live.length ? live : opts; nn = pool.slice().sort((a, b) => f[b] - f[a])[Math.random() < 0.8 ? 0 : pool.length - 1]; }
  else if (v.ai === 'cop' || v.ai === 'hunt') { const f = preyField(v.prey && !v.prey.dead ? v.prey : S.player); nn = here.nb.slice().sort((a, b) => f[a] - f[b])[0]; }
  else {
    const pool = live.length && !(c.nodes[v.n].dead) ? live : opts, straight = pool.slice().sort((a, b) => turnOf(v.pn, v.n, a) - turnOf(v.pn, v.n, b))[0];
    nn = v.straight || Math.random() < 0.6 ? straight : pool[Math.floor(Math.random() * pool.length)];
  }
  v.nn = nn;
  v.wp = [lanePt(v.pn, v.n, -1), lanePt(v.n, nn, 1)];
}
function aiDrive(v, dt) {
  const st = VEHICLES[v.type], P = S.player;
  if (v.hold > 0) { v.hold -= dt; driveVehicle(v, { thr: 0, steer: 0, brake: true }, dt); return; }   // waiting to set off
  // a convoy waits for its escort: it sets off when you reach it and pulls in if you fall far behind
  if (v.convoy) { const q = P.vehicle || P, dq = Math.hypot(q.x - v.x, q.y - v.y); if (!v.started && dq < 7 * T) { v.started = true; float(v.x, v.y - 34, 'Off we go!', '#7be07b'); } if (!v.started || dq > 16 * T) { driveVehicle(v, { thr: 0, steer: 0, brake: true }, dt); return; } }
  // something being led or escorted must never sit still for good: if it has gone nowhere in ten seconds, put it on the next junction
  if (v.ai === 'lead') { v.pgT = (v.pgT || 0) + dt; if (v.pgT > 10) { if (v.pg && Math.hypot(v.x - v.pg.x, v.y - v.pg.y) < 2 * T && v.n != null) { const n = S.city.nodes[v.n]; v.x = n.x; v.y = n.y; v.vx = v.vy = 0; v.speed = 0; v.pn = v.n; v.wp = null; v.n = v.nn ?? v.n; } v.pg = { x: v.x, y: v.y }; v.pgT = 0; } }
  if (!v.wp || !v.wp.length) planLeg(v);
  let tgt = v.wp[0];
  if (v.ai === 'lead' && (Math.hypot(v.dest.x - v.x, v.dest.y - v.y) < 3.4 * T || (v.destN != null && v.destFor === v.dest && Math.hypot(S.city.nodes[v.destN].x - v.x, S.city.nodes[v.destN].y - v.y) < 2.2 * T))) {
    if (v.route && v.route.length) { v.dest = v.route.shift(); planLeg(v); tgt = v.wp[0]; }
    else { v.ai = null; v.arrived = true; return; }
  }
  const fast = v.ai === 'flee' || v.ai === 'cop' || v.ai === 'hunt' || v.ai === 'lead';
  if (v.ramCd > 0) v.ramCd -= dt;
  if (v.ai === 'cop') { const pp = P.vehicle || P; if (Math.hypot(pp.x - v.x, pp.y - v.y) < 5.5 * T) tgt = pp; }
  if (v.ai === 'hunt') {
    // Grey vans take turns: one comes for you at a time while the rest keep their distance, and after a ram it
    // peels away for a few seconds instead of pinning you against a wall.
    const pp = v.prey && !v.prey.dead ? v.prey : P.vehicle || P, d0 = Math.hypot(pp.x - v.x, pp.y - v.y), key = v.prey ? 'turnC' : 'turnP';
    const cur = S[key];
    if (!cur || cur.dead || cur.gone || cur.ai !== 'hunt' || cur.ramCd > 0.5 || !S.vehicles.includes(cur)) { if (!(v.ramCd > 0.5) && d0 < 14 * T) S[key] = v; }
    const away = (r) => ({ x: v.x + (v.x - pp.x) / (d0 || 1) * r, y: v.y + (v.y - pp.y) / (d0 || 1) * r });
    if (v.ramCd > 0.5) { if (d0 < 7 * T) tgt = away(4 * T); }
    else if (S[key] === v) { if (d0 < 5.5 * T) tgt = pp; }
    else if (d0 < 6.5 * T) tgt = away(3 * T);
  }
  const dx = tgt.x - v.x, dy = tgt.y - v.y, d = Math.hypot(dx, dy);
  const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
  if (tgt === v.wp[0] && (d < 0.75 * T || (d < 2.4 * T && dx * fx + dy * fy < 0))) {
    v.wp.shift();
    if (!v.wp.length) { v.pn = v.n; v.n = v.nn; planLeg(v); }
    tgt = v.wp[0];
  }
  const want = Math.atan2(tgt.y - v.y, tgt.x - v.x), da = angDiff(want, v.ang);
  let cruise = st.max * T * (v.ai === 'lead' ? (v.pace || 0.55) : fast ? (v.fast ? 1.02 : v.slow ? 0.7 : 1) : 0.5) * (v.ai === 'flee' && v.maxHp ? 0.78 + 0.22 * Math.max(0, v.hp) / v.maxHp : 1);
  if (Math.abs(da) > 0.45) cruise = Math.min(cruise, (fast ? 5.5 : 2.4) * VS * T);
  // anything in the way?
  let blocked = false;
  if (!fast && !(v.push > 0)) {
    const reach = st.len / 2 + 1.5 * T + Math.abs(v.speed) * 0.45;
    const test = (ox, oy, rad) => { const rx = ox - v.x, ry = oy - v.y, f = rx * fx + ry * fy, l = -rx * fy + ry * fx; return f > 0 && f < reach + rad && Math.abs(l) < 0.5 * T + rad * 0.5; };
    for (const o of S.vehicles) {
      if (o === v || !test(o.x, o.y, VEHICLES[o.type].len * 0.3)) continue;
      // two cars waiting for each other across a junction: the older one goes
      if (o.ai === 'traffic' && Math.abs(o.speed) < 0.4 * VS * T && Math.abs(angDiff(o.ang, v.ang)) > 0.8 && v.id < o.id) continue;
      blocked = true; break;
    }
    if (!blocked && !P.vehicle && test(P.x, P.y, 6)) blocked = true;
    if (!blocked) for (const p of S.peds) if (!p.npc && test(p.x, p.y, 4) && S.city.at(Math.floor(p.x / T), Math.floor(p.y / T)) === G.ROAD) { blocked = true; break; }
  }
  if (blocked) { v.stuck += dt; if (v.stuck > 4.5) { v.push = 1.6; v.stuck = 0; } } else v.stuck = Math.max(0, v.stuck - dt * 2);
  if (v.push > 0) v.push -= dt;
  const thr = blocked ? 0 : v.speed < cruise ? 1 : v.speed > cruise * 1.15 ? -0.6 : 0;
  const hit = driveVehicle(v, { thr, steer: clamp(da * 2.6, -1, 1), brake: blocked }, dt);
  // wedged against a wall: back out
  if (fast) {
    if (Math.abs(v.speed) < 0.8 * VS * T) v.wedge = (v.wedge || 0) + dt; else v.wedge = 0;
    if (v.wedge > 1.2) { v.ang = want; v.speed = 3 * VS * T; v.vx = Math.cos(want) * v.speed; v.vy = Math.sin(want) * v.speed; const r = roadNear(v.x, v.y); if (hit || v.wedge > 3) { v.x = r.x; v.y = r.y; } v.wedge = 0; }
  }
}
function spawnTraffic(target) {
  const c = S.city, P = S.player, n = S.vehicles.filter(v => v.ai === 'traffic').length;
  if (n >= target) return;
  const vr = Math.hypot(S.view.w, S.view.h) / 2 / S.view.z + 2 * T;
  for (let tries = 0; tries < 10; tries++) {
    // somewhere just out of sight of the player
    const a = Math.random() * 6.283, r = vr + (2 + Math.random() * 12) * T;
    const n = c.nearNode(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r), nb = c.nodes[n].nb;
    if (c.nodes[n].dead || !nb.length) continue;
    const m = nb[Math.floor(Math.random() * nb.length)], p = lanePt(n, m, 1), dp = Math.hypot(p.x - P.x, p.y - P.y);
    if (dp < vr || dp > vr + 22 * T) continue;
    if (S.vehicles.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 3.5 * T)) continue;
    const mix = trafficMix(c.year), tot = mix.reduce((a2, q) => a2 + q[1], 0);
    let rr = Math.random() * tot, type = mix[0][0];
    for (const q of mix) { rr -= q[1]; if (rr <= 0) { type = q[0]; break; } }
    const v = makeVehicle(type, p.x, p.y, Math.atan2(c.nodes[m].y - c.nodes[n].y, c.nodes[m].x - c.nodes[n].x), { ai: 'traffic', pn: n, n: m });
    v.color = paintFor(type, Math.random);
    return;
  }
}
function spawnAi(type, nearPt, ai, extra = {}) {
  const c = S.city, P = S.player;
  const n = c.nearNode(nearPt.x, nearPt.y, extra.minPlayer ? k => Math.hypot(c.nodes[k].x - P.x, c.nodes[k].y - P.y) >= extra.minPlayer : null);
  const nb = c.nodes[n].nb.slice();
  const far = k => Math.hypot(c.nodes[k].x - P.x, c.nodes[k].y - P.y);
  if (ai === 'lead') { const f = c.field(c.nearNode(extra.dest.x, extra.dest.y)); nb.sort((a, b) => f[a] - f[b]); }
  else nb.sort((a, b) => ai === 'flee' ? far(b) - far(a) : far(a) - far(b));
  const m = nb[0], p = lanePt(n, m, 1);
  for (const o of S.vehicles) if (o.ai === 'traffic' && Math.hypot(o.x - p.x, o.y - p.y) < 3 * T) o.gone = true;
  return makeVehicle(type, p.x, p.y, Math.atan2(c.nodes[m].y - c.nodes[n].y, c.nodes[m].x - c.nodes[n].x), { ai, pn: n, n: m, ...extra });
}

function collideVehicles() {
  const vs = S.vehicles, pv = S.player.vehicle;
  for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) {
    const A = vs[a], B = vs[b], ra = (VEHICLES[A.type].len + VEHICLES[A.type].wid) * 0.23, rb = (VEHICLES[B.type].len + VEHICLES[B.type].wid) * 0.23;
    if ((A.dead && A.wreck) || (B.dead && B.wreck)) continue;   // grey wrecks: drive straight through them
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = ra + rb;
    if (d >= min || d < 0.01) continue;
    const nx = dx / d, ny = dy / d, push = (min - d) / 2;
    if (!vehicleSolid(A, A.x - nx * push, A.y - ny * push, A.ang)) { A.x -= nx * push; A.y -= ny * push; }
    if (!vehicleSolid(B, B.x + nx * push, B.y + ny * push, B.ang)) { B.x += nx * push; B.y += ny * push; }
    const vn = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
    if (vn <= 0) continue;
    const ha = VEHICLES[A.type].heavy, hb = VEHICLES[B.type].heavy;
    const wa = hb ? 0 : ha ? 1 : A.parked ? 0.8 : 0.5, wb = ha ? 0 : hb ? 1 : 1 - wa + (B.parked ? 0.3 : 0);
    A.vx -= nx * vn * wb * 1.1; A.vy -= ny * vn * wb * 1.1; B.vx += nx * vn * wa * 1.1; B.vy += ny * vn * wa * 1.1;
    A.speed = A.vx * Math.cos(A.ang) + A.vy * Math.sin(A.ang); B.speed = B.vx * Math.cos(B.ang) + B.vy * Math.sin(B.ang);
    const hunter = A.ai === 'hunt' && B.convoy ? A : B.ai === 'hunt' && A.convoy ? B : null;
    if (hunter && !(hunter.ramCd > 0)) { const cv = hunter === A ? B : A; hunter.ramCd = 5; hunter.speed *= 0.3; cv.hp -= 1; float(cv.x, cv.y - 30, 'RAMMED!', '#ff5a4a'); spark((A.x + B.x) / 2, (A.y + B.y) / 2, 8); }
    if (A !== pv && B !== pv) continue;
    const other = A === pv ? B : A;
    const vq = vn / VS;   // how hard, in the units the numbers below were tuned in
    const nudge = (other.ai === 'flee' || (other.ai === 'hunt' && other.prey)) && Math.abs(pv.speed) > 2.5 * VS * T;  // touching the one you are chasing always counts
    if (!nudge && vq < (other.ai === 'flee' ? 1.1 : 2.2) * T) continue;
    if (vq > 8 * T) sfx.crash(); else sfx.bump(clamp(vq / (9 * T), 0.2, 1));
    spark((A.x + B.x) / 2, (A.y + B.y) / 2, 8); S.shake = Math.max(S.shake || 0, clamp(vq / (12 * T), 0.1, 0.8));
    if (other.ai === 'hunt') {
      const mine = Math.abs(pv.speed) >= Math.abs(other.speed);
      if (!other.prey) other.ramCd = Math.max(other.ramCd || 0, 2.4);
      if (((mine && vq > 2.2 * T) || (other.prey && Math.abs(pv.speed) > 3 * VS * T)) && other.hitCd <= 0) {   // anything going for the convoy only needs a shove
        other.hp -= 1 + 0.5 * up('bar'); other.hitCd = 0.8; other.speed *= 0.3; other.ramCd = Math.max(other.ramCd || 0, 1.5);
        float(other.x, other.y - 30, other.hp > 0 ? 'CRUNCH!' : 'OFF THE ROAD! +£15', '#f08aa0'); if (other.hp <= 0) sfx.boom();
        if (other.hp <= 0) { other.dead = true; other.wreck = true; other.ai = null; S.save.cash += 15; sfx.cash(); if (S.step && S.step.step.t === 'frenzy') S.step.k++; if (bump('erasers') >= 5) badge('rubber'); }
      } else if (!mine && !(other.rammedT > S.t)) {
        other.rammedT = S.t + 2.4;
        if (S.step) S.step.rams = (S.step.rams || 0) + 1;
        if (S.step?.timer != null && S.step.step.t !== 'frenzy') { S.step.timer = Math.max(1, S.step.timer - 3); float(pv.x, pv.y - 34, '−3 seconds', '#ff5a4a'); }
        gentleBump(vq + 3 * T);
      }
    } else if (other.ai === 'lead' || other.convoy) {
      if (S.step && S.step.step.t === 'tail' && !(S.step.grace > 0) && !(other.hold > 0) && !(other.tapCd > S.t)) { other.tapCd = S.t + 2; S.step.sus += Math.abs(pv.speed) > 3 * VS * T ? 1 : 0.4; }   // run into them and they know; a touch at a crawl only makes them wonder
    } else if (other.ai === 'flee') {
      if (other.hitCd <= 0) { other.hp -= 1 + 0.5 * up('bar'); other.speed *= 0.6; other.hitCd = 0.9; float(other.x, other.y - 30, other.hp > 0 ? 'CRUNCH!' : 'GOT IT!', '#ffd84a'); if (S.step) S.step.hits = (S.step.hits || 0) + 1; }
    } else {
      if (vq > 4 * T) { if (!other.block && !/^eraser|^engine1/.test(other.type) && (other.ai !== 'cop' || Math.abs(pv.speed) > 7 * VS * T)) offence(other.ai === 'cop' ? 0.7 : 0.15); damage(pv, 1); if (other.ai === 'traffic' && Math.random() < 0.5) float(other.x, other.y - 26, quip(), '#fff'); }
      gentleBump(vq);
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
  if (pv && Math.abs(pv.speed) > 3 * VS * T) {
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
  sfx.bump();
  if (v !== S.player.vehicle) { float(p.x, p.y - 22, quip(), '#fff'); return; }
  if (p.runner || p.vandal) { p.caught = true; return; }
  offence(p.cop ? 1 : 0.34);
  if (p.rid && S.tree.people.has(p.rid) && S.tree.people.get(p.rid).gen > 0) {
    // your own ancestor: history objects
    const fine = Math.min(S.save.cash, 50);
    S.save.cash -= fine; S.glitch = 1.4; S.player.hearts = Math.max(1, S.player.hearts);
    S.ui.banner('PARADOX!', `That was ${p.name}, ${kinOf(S.data, S.tree, p.rid)}. Mind your own existence.${fine ? ' −£' + fine : ''}`, '#d8b0ff', 3600);
    badge('paradox');
  } else if (p.rid) float(p.x, p.y - 22, `That was ${p.name.split(' ')[0]}, ${kinOf(S.data, S.tree, p.rid)}!`, '#ffd0d0');
  else float(p.x, p.y - 22, p.cop ? 'Right, that\'s it!' : quip(), '#fff');
}

// ---------------- Animals ----------------
function spawnCritters() {
  S.critters = [];
  const c = S.city;
  const add = (kind, l, n, r) => { for (let i = 0; i < n; i++) { const sp = freeSpotNear(l.x + (Math.random() - 0.5) * r * T, l.y + (Math.random() - 0.5) * r * T, 0); S.critters.push({ kind, x: sp.x, y: sp.y, hx: sp.x, hy: sp.y, ang: Math.random() * 7, n: i, t: Math.random() * 3, run: 0, walk: 0 }); } };
  add('pigeon', { x: c.lots.market.x, y: c.lots.market.y - 4 * T }, 7, 6);
  if (c.year < 1960) add('hen', { x: c.lots.farm.x, y: c.lots.farm.y - 2 * T }, 7, 5);
  add('dog', c.homeFor('dog'), 1, 2); add('cat', c.homeFor('cat'), 1, 2); add('dog', c.lots.pub, 1, 3);
  if (c.year < 1900) add('hen', c.homeFor('hens'), 3, 2);
}
function updateCritters(dt) {
  const P = S.player, pp = P.vehicle || P, fast = P.vehicle ? Math.abs(P.vehicle.speed) : P.moving ? 4 * T : 0;
  for (const k of S.critters) {
    k.t -= dt;
    if (fast > T && Math.hypot(k.x - pp.x, k.y - pp.y) < (k.kind === 'pigeon' ? 2.8 : 1.9) * T) { k.ang = Math.atan2(k.y - pp.y, k.x - pp.x) + (Math.random() - 0.5); k.run = k.kind === 'pigeon' ? 1.1 : 0.7; }
    const step = sp => { const nx = k.x + Math.cos(k.ang) * sp * dt, ny = k.y + Math.sin(k.ang) * sp * dt; if (k.kind === 'pigeon' && k.run > 0 || !circleSolid(nx, ny, 4)) { k.x = nx; k.y = ny; } else k.ang += 2; };
    if (k.run > 0) { k.run -= dt; step((k.kind === 'pigeon' ? 9 : 5.5) * T); }
    else if (k.walk > 0) { k.walk -= dt; step((k.kind === 'dog' ? 2.2 : 1.1) * T); }
    else if (k.t <= 0) { k.t = 0.8 + Math.random() * 2.5; k.ang = Math.atan2(k.hy - k.y, k.hx - k.x) + (Math.random() - 0.5) * 2.6; k.walk = 0.4 + Math.random(); }
  }
}

// ---------------- Light and weather ----------------
function darkness() {
  const h = S.clock, base = S.city.year < 1810 ? 0.74 : 0.62;
  const k = h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 18.5 ? 0 : h < 20.5 ? (h - 18.5) / 2 : 1;
  return k * base + S.rain * 0.1;
}
// Night is a dark sheet with holes cut in it for every lamp, lit window and headlamp.
function drawLight(g, w, h, V, d) {
  const sc = 0.25, lw = Math.ceil(w * sc), lh = Math.ceil(h * sc), c = S.city, P = S.player;
  let lc = S.lightC;
  if (!lc || lc.width !== lw || lc.height !== lh) { lc = S.lightC = document.createElement('canvas'); lc.width = lw; lc.height = lh; }
  const x = lc.getContext('2d'), z = V.z * sc;
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, lw, lh); x.fillStyle = `rgba(8,12,36,${d})`; x.fillRect(0, 0, lw, lh);
  x.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a) => {
    const sx = (wx - V.x) * z + lw / 2, sy = (wy - V.y) * z + lh / 2, rr = r * z;
    if (sx < -rr || sy < -rr || sx > lw + rr || sy > lh + rr) return;
    const gr = x.createRadialGradient(sx, sy, 0, sx, sy, rr); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  };
  if (c.year >= 1810) for (const p of c.props) if (p.t === 'lamp') hole((p.x + 0.5) * T, (p.y + 0.5) * T, 4.6 * T, 0.85);
  for (let i = 0; i < c.homes.length; i += 2) hole(c.homes[i].x, c.homes[i].y, 1.7 * T, 0.55);
  for (const k of ['pub', 'hub', 'police', 'infirmary', 'church', 'garage']) { const l = c.lots[k]; if (l) hole(l.x, l.y, 3.2 * T, 0.7); }
  for (const v of S.vehicles) {
    if (v.dead || (v.parked && v !== S.heirloom)) continue;
    const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
    if (!VEHICLES[v.type].horse) { hole(v.x + fx * 2.2 * T, v.y + fy * 2.2 * T, 2.7 * T, 0.9); hole(v.x + fx * 4.6 * T, v.y + fy * 4.6 * T, 2.7 * T, 0.6); } else hole(v.x + fx * T, v.y + fy * T, 1.7 * T, 0.6);
  }
  if (!P.vehicle) hole(P.x, P.y, 2.5 * T, 0.6);
  if (S.target) hole(S.target.x, S.target.y, 2.2 * T, 0.5);
  for (const it of S.items) if (it.step) hole(it.x, it.y, 1.2 * T, 0.5);
  g.drawImage(lc, 0, 0, w, h);
}

// ---------------- The law ----------------
function offence(n) { S.heat = Math.min(3, S.heat + n); S.heatCalm = 0; }
function updateHeat(dt) {
  const P = S.player, c = S.city, stars = Math.floor(S.heat + 0.001);
  const footEra = c.year < 1900;
  if (S.heat > 0) {
    S.heatCalm += dt;
    if (S.heatCalm > 5.5) S.heat = Math.max(0, S.heat - dt / 3.8 * (1 + 0.5 * up('radio')));
    const cops = S.vehicles.filter(v => v.ai === 'cop').length + S.peds.filter(p => p.cop).length;
    if (stars > 0 && cops < stars + (footEra ? 1 : 0) && (S.copT = (S.copT || 0) - dt) <= 0) {
      S.copT = 2.5;
      if (footEra) {
        const sp = freeSpotNear(P.x + (Math.random() < 0.5 ? -1 : 1) * 11 * T, P.y + (Math.random() - 0.5) * 12 * T, 0);
        S.peds.push({ cop: true, x: sp.x, y: sp.y, ang: 0, walk: 0, down: 0, sp: 4.3 * T, look: { skin: '#e6bf9e', hair: '#2a1c14', top: c.year < 1829 ? '#5a3a2a' : '#1a2238', hat: c.year < 1829 ? '#2a2420' : '#141a2c', badge: c.year < 1829 ? null : '#c8c8d0', r: 1.05 } });
      } else {
        const v = spawnAi(c.year >= 1950 ? 'police' : 'vintage', P, 'cop', { minPlayer: 9 * T });
        if (c.year < 1950) v.color = '#101014';
      }
    }
    if (c.year >= 1930 && (S.sirenT = (S.sirenT || 0) - dt) <= 0 && S.vehicles.some(v => v.ai === 'cop' && Math.hypot(v.x - (P.vehicle || P).x, v.y - (P.vehicle || P).y) < 22 * T)) { S.sirenT = 0.56; sfx.siren(); }
    // nicked if they have you boxed in
    const px = P.vehicle || P, slow = P.vehicle ? Math.abs(P.vehicle.speed) < 2.6 * VS * T : true;
    let close = false;
    for (const v of S.vehicles) if (v.ai === 'cop' && Math.hypot(v.x - px.x, v.y - px.y) < 2.4 * T) close = true;
    for (const p of S.peds) if (p.cop && !(p.down > 0) && Math.hypot(p.x - px.x, p.y - px.y) < (P.vehicle ? 1.9 : 0.9) * T) close = true;
    S.bust = close && slow && stars > 0 ? S.bust + dt : Math.max(0, S.bust - dt * 0.5);
    if (S.bust > (P.vehicle ? 2.2 : 0.7)) nicked();
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
const manh = (a, b) => { const c = S.city, na = c.nearNode(a.x, a.y), nb = c.nearNode(b.x, b.y); return (c.field(nb)[na] + dist(a, c.nodes[na]) + dist(b, c.nodes[nb])) / T * 1.08; };
function nextStory() { return S.story.missions[S.save.idx] || (bonusReady() ? S.story.bonus : null); }
const fragsGot = () => (S.save.frags || []).length;
const bonusReady = () => S.story.bonus && !S.save.foundling && S.save.idx >= S.story.missions.length && fragsGot() >= S.story.frags.length;
const isHere = m => m && m.town === S.city.town.id && m.year === S.city.year;

async function startMission(def, resume) {
  const tok = S;
  S.busy = true;
  if (S.player.vehicle) S.player.vehicle.speed = 0;
  if (!resume) await runLines(def.intro);
  if (S !== tok) return;
  S.busy = false;
  S.mission = resume ? { def, i: resume.i - 1, found: resume.found, resumed: resume.i > 0 } : { def, i: -1 };
  S.heat = Math.min(S.heat, 0.9);
  if (def.hour != null) S.clock = def.hour;
  if (def.title) S.ui.banner(def.title, def.act, '#ffd84a', 2000);
  spawnNpcs();
  nextStep();
}
function clearStep() {
  const st = S.step;
  if (st) { S.items = S.items.filter(i => !i.step && !i.tok); if (st.rival) st.rival.gone = true; for (const v of S.vehicles) if (v.block) v.gone = true; if (st.target) st.target.gone = true; if (st.convoy) { st.convoy.gone = true; for (const v of S.vehicles) if (v.prey === st.convoy) v.gone = true; } S.peds = S.peds.filter(p => !p.stepPed || p.vandal); }
  S.step = null;
}
function nextStep() {
  const m = S.mission; if (!m) return;
  if (S.tele && S.step) S.tele.push({ m: m.def.id, i: m.i, t: S.step.step.t, dur: +(S.t - S.step.t0).toFixed(1), timer0: S.step.timer0 ?? null, left: S.step.timer != null ? +S.step.timer.toFixed(1) : null, bumps: S.step.bumps || 0, walls: S.step.walls || 0, rams: S.step.rams || 0, unstick: S.bot ? S.bot.unstick : 0, k: S.step.k });
  if (S.bot) S.bot.unstick = 0;
  if (S.step && S.step.step.got) { const all = m.def.steps.filter(x => x.got).length, n = m.def.steps.slice(0, m.i + 1).filter(x => x.got).length; S.ui.toast(`Got ${S.step.step.got}. ${n} of ${all} parts for the time engine.`, 3600); sfx.pick(); }
  clearStep();
  m.i++;
  if (m.i >= m.def.steps.length) { passMission(); return; }
  if (m.i === 1 && m.def.id !== 'final-notice') hintOnce('brief', S.ui.touch ? 'Tap 📋 at any time to read the mission again.' : 'Press B (or 📋) at any time to read the mission again.', 5200);
  if (false) hintOnce('walk', S.ui.touch ? 'Left thumb walks. Follow the yellow arrow. GO talks, gets in and out and starts jobs.' : 'WASD or the arrow keys to walk (Shift to run). Follow the yellow arrow. E talks, gets in and out and starts jobs.', 8000);
  spawnNpcs();
  enterStep(m.def.steps[m.i]);
}
function enterStep(step) {
  const P = S.player, c = S.city, pp = P.vehicle || P;
  const st = S.step = { step, k: 0, loaded: false, wait: 0, timer: null, bumps: 0, bumpCd: 0, done: false };
  let tiles = 0, stops = 0;
  const off = pt => { const r = roadNear(pt.x, pt.y); return Math.max(0, dist(r, pt) / T - 2) * 3; };
  if (step.t === 'goto') tiles = manh(pp, lotPt(step.at)) + off(lotPt(step.at));
  else if (step.t === 'carry') { const a = lotPt(step.from), b = lotPt(step.to); tiles = manh(pp, a) + (manh(a, b) + (off(a) + off(b)) * 2) * (step.n * 2 - 1); stops = step.n * 2; S.mission.total = manh(a, b);
    if (step.passenger) { const sp = freeSpotNear(a.x, a.y - 0.2 * T, 0); const giver = S.peds.find(p => p.npc && p.name && p.name.split(' ')[0] === step.passenger); st.pass = { stepPed: true, x: sp.x + 14, y: sp.y, ang: Math.PI / 2, walk: 0, down: 0, look: step.who && S.tree.people.has(step.who) ? lookSummary(personLook(step.who)) : giver?.look || strangerLook(Math.random, c.year), name: step.passenger }; S.peds.push(st.pass); } }
  else if (step.t === 'race') { let prev = pp; for (const s of step.stops) { const l = lotPt(s); tiles += manh(prev, l) + off(l) * 2; prev = l; } stops = step.stops.length; }
  else if (step.t === 'collect') {
    const l = lotPt(step.around), kind = /sheep|pigs|truants/.test(step.label) ? step.label : /tubs|crates|barrels/.test(step.label) ? 'load' : /parts/.test(step.label) ? 'part' : 'page';
    let guard = 0;
    while (S.items.filter(i => i.step).length < step.n && guard++ < 600) {
      const a = Math.random() * 7, r = (3 + Math.random() * (step.radius - 3)) * T, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r;
      const tt = c.at(Math.floor(x / T), Math.floor(y / T));
      if (!c.reachable(Math.floor(x / T), Math.floor(y / T)) || c.roadDist(Math.floor(x / T), Math.floor(y / T)) > 3 || circleSolid(x, y, 14) || (tt !== G.ROAD && tt !== G.PAVE && tt !== G.PLAZA && tt !== G.YARD && tt !== G.GRASS && tt !== G.FIELD && tt !== G.APRON)) continue;
      if (S.items.some(i => Math.hypot(i.x - x, i.y - y) < 2.5 * T)) continue;
      S.items.push({ step: true, x, y, kind: step.names ? 'truants' : kind, n: S.items.length, label: step.names ? step.names[S.items.filter(i => i.step).length] : null });
    }
    st.n = S.items.filter(i => i.step).length;
    tiles = manh(pp, l) + st.n * step.radius * 2;
  } else if (step.t === 'chase') {
    const horse = c.year < 1900;
    st.target = spawnAi(step.boss ? 'engine1' : horse ? 'erasercoach' : 'eraser', lotPt(step.from), 'flee', { fast: !!step.fast, slow: !!step.slow });
    st.target.hp = step.hp; st.target.maxHp = step.hp; st.maxHp = step.hp; st.timer = Math.round((70 + step.hp * 14) * (0.5 + 0.5 / VS));
  } else if (step.t === 'escape') { S.heat = Math.max(S.heat, step.heat); S.heatCalm = -6; S.copT = 7; }
  else if (step.t === 'tail') {
    const troute = [...(step.via || []), step.to].map(k => lotPt(k));
    st.target = spawnAi(c.year < 1900 ? 'erasercoach' : 'eraser', lotPt(step.from), 'lead', { dest: troute.shift(), route: troute, pace: 0.5, hold: 4 });
    st.sus = 0; st.lost = 0; st.grace = 10;
  } else if (step.t === 'defend') {
    const type = c.year < 1900 ? 'wagon' : c.year < 1950 ? 'lorry' : 'van';
    const route = [...(step.via || []), step.to].map(k => lotPt(k));
    st.convoy = spawnAi(type, lotPt(step.from), 'lead', { dest: route.shift(), route, pace: 3.4 * VS / VEHICLES[type].max, convoy: true, hold: 3 });
    st.convoy.color = '#e8dfc4'; st.convoy.hp = step.hp || 10; st.maxHp = st.convoy.hp; st.sent = 0; st.wave = 6;
  } else if (step.t === 'catch') {
    const l = lotPt(step.from);
    let sp = freeSpotNear(l.x, l.y, 1);
    for (let k = 0; k < 40; k++) { const a = Math.random() * 7, r = (5 + Math.random() * 5) * T, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r; if (c.reachable(Math.floor(x / T), Math.floor(y / T)) && !circleSolid(x, y, 10) && Math.hypot(x - pp.x, y - pp.y) > 6 * T) { sp = { x, y }; break; } }
    st.runner = { stepPed: true, runner: true, x: sp.x, y: sp.y, ang: 0, sp: (step.speed || 4.8) * T, walk: 0, down: 0, look: ERASER_LOOK, name: step.label, think: 0 };
    S.peds.push(st.runner); st.timer = Math.round((step.time || 60) * (0.5 + 0.5 / VS));
  }
  else if (step.t === 'search') {
    st.spots = step.spots.map(k => ({ k, pt: lotPt(k), seen: false }));
    st.where = st.spots.length > 1 ? 1 + Math.floor(Math.random() * (st.spots.length - 1)) : 0;
  } else if (step.t === 'frenzy') { st.timer = step.time || 60; st.wave = 0; }
  else if (step.t === 'drill') { st.k = 0; st.peak = 0; st.held = 0; st.spin = null; }
  if (step.t === 'talk' && S.data.individuals.has(step.who)) {
    // whoever you are to talk to is standing where the step says
    S.peds = S.peds.filter(p => !(p.npc && p.who === step.who));
    const l = lotPt(step.at, step.who), sp = freeSpotNear(l.x, l.y, 0), inTree = S.tree.people.has(step.who);
    S.peds.push({ npc: true, who: step.who, x: sp.x, y: sp.y, ang: Math.PI / 2, look: inTree ? lookSummary(personLook(step.who)) : outsider(step.who).look, walk: 0, down: 0, name: displayName(S.data.individuals.get(step.who)) });
  }
  if (step.t === 'talk' && step.quiz) hintOnce('quiz', S.ui.touch ? 'They will test you with a question. The answer was in Dorothy\'s note: tap 📋 to read it again.' : 'They will test you with a question. The answer was in Dorothy\'s note: press B to read it again.', 6400);
  if (step.t === 'search') hintOnce('search', 'They could be in any of the places marked ?. Go and ask at each. The nearest is arrowed.', 5600);
  // the first time each kind of job comes up, say how it works (after whatever somebody shouts as it starts)
  const tok = S, hint = (key, text, ms) => step.bark ? setTimeout(() => S === tok && S.step?.step === step && hintOnce(key, text, ms), 5400) : hintOnce(key, text, ms);
  if (step.t === 'collect') hint('collect', 'PICK-UPS: drive (or walk) over every one. The arrow points at the nearest; the white dots on the little map show the rest.', 6000);
  if (step.t === 'carry' && step.gentle) hint('gentle', 'FRAGILE: every knock costs a ♦. Lose all three and the load is ruined. Slow down before corners.', 6000);
  if (step.t === 'catch') hint('catch', S.ui.touch ? 'ON FOOT: tap GO to get out, then run him down. Push the stick to the edge to sprint.' : 'ON FOOT: press E to get out, then run him down. Hold Shift to sprint.', 6400);
  if (step.t === 'chase') hint('chase', 'CHASE: ram the van with the red ring. Every knock empties its bar a little.', 5200);
  if (step.t === 'tail') hint('tail', 'TAIL: keep it in sight but not too close. The ! marks fill up if they notice you.', 5600);
  if (step.t === 'defend') hint('defend', 'DEFEND: drive up to the cart with the green ring and it sets off. Stay with it and shove away any grey van that goes for it.', 6400);
  if (step.blocks) hintOnce('blocks', 'Grey vans are parked across the road ahead. Find another way round, or get out and walk the last bit.', 5600);
  if (step.rival && step.t === 'goto') startRival(lotPt(step.at), step.rival);
  if (step.blocks) placeBlocks(step.t === 'goto' ? lotPt(step.at) : lotPt(step.to), step.blocks);
  if (step.bark) {
    const sp = step.bark.who ? speaker(step.bark.who) : null, name = step.bark.name || (sp ? sp.who.split(' ')[0] : '');
    S.ui.toast(`${name}: "${sp && sp.person ? voiceLine(sp.person, step.bark.text) : plainText(step.bark.text)}"`, 5200);
  }
  if (step.timed) st.timer = Math.round(14 + tiles / (c.source === 'osm' ? 3.2 : 3.8) / SPEED_SCALE * step.timed + stops * 5);   // (and the clock allows for an untuned engine)   // real streets twist more than drawn ones
  if (step.tokens && st.timer != null) {
    // clocks left about the streets: each one is five more seconds, if you care to go out of your way
    const dest = stepTarget() || pp, x0 = Math.min(pp.x, dest.x) - 9 * T, x1 = Math.max(pp.x, dest.x) + 9 * T, y0 = Math.min(pp.y, dest.y) - 9 * T, y1 = Math.max(pp.y, dest.y) + 9 * T;
    hintOnce('tokens', 'The little clocks lying in the road are worth five seconds each.', 4600);
    for (let k = 0, n = 0; k < 200 && n < step.tokens; k++) { const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0); if (c.at(Math.floor(x / T), Math.floor(y / T)) !== G.ROAD || Math.hypot(x - pp.x, y - pp.y) < 5 * T) continue; S.items.push({ tok: true, kind: 'clock', x, y, n: k }); n++; }
  }
  const m = S.mission;
  if (m.t0 == null) m.t0 = S.t;
  m.par = (m.par || 0) + (st.timer ?? ({ drill: 45, goto: 18, talk: 3, chase: 55, tail: 45, defend: 60, catch: 30, search: 40, escape: 30, travel: 0, collect: 40, carry: 40, race: 40 }[step.t] ?? 20));
  if (st.timer != null && S.save.easy) st.timer = Math.round(st.timer * 1.6);
  if (st.timer != null && step.t !== 'frenzy' && up('clock')) st.timer = Math.round(st.timer * (1 + 0.1 * up('clock')));
  st.timer0 = st.timer; st.t0 = S.t;
}
function stepTarget() {
  const st = S.step; if (!st) return null;
  const s = st.step;
  if (s.t === 'goto' || s.t === 'talk') return lotPt(s.at, S.tree.people.has(s.who) ? s.who : undefined);
  if (s.t === 'carry') return st.spillPt || lotPt(st.loaded ? (st.toAlt || s.to) : s.from);
  if (s.t === 'race') return lotPt(s.stops[st.k]);
  if (s.t === 'search') { let best = null, bd = 1e9; const q = S.player.vehicle || S.player; for (const sp of st.spots) if (!sp.seen) { const d = dist(sp.pt, q); if (d < bd) { bd = d; best = sp.pt; } } return best; }
  if (s.t === 'chase' || s.t === 'tail') return st.target;
  if (s.t === 'defend') return st.convoy;
  if (s.t === 'catch') return st.runner;
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
  for (const it of S.items) if (it.tok && dist(it, pp) < 1.5 * T) { it.gone = true; if (st.timer != null) st.timer += 5; float(it.x, it.y - 16, '+5 seconds', '#7be07b'); sfx.pick(); }
  if (st.rival && st.rival.arrived) { failMission('They got there first.'); return; }
  if (st.timer != null && s.t === 'frenzy' && st.timer - dt <= 0) { S.mission.score = st.k; nextStep(); return; }
  if (st.timer != null) { st.timer -= dt; if (st.timer <= 0) { failMission(s.t === 'chase' ? 'They got away.' : pv && pv !== S.heirloom ? `Too late. Nothing in ${S.city.year} is as quick as the Heirloom.` : 'Too late.'); return; } }
  const tgt = stepTarget();
  const near = (r1, r2) => tgt && dist(tgt, pp) < (pv ? r2 : r1) * T;
  if (s.t === 'goto') {
    if (near(1.5, 2.7) && (!s.need || pv === S.heirloom)) nextStep();
  } else if (s.t === 'talk') {
    if (near(1.7, 2.9) && speed < 2 * VS * T) { st.done = true; converse(s); }
  } else if (s.t === 'race') {
    if (near(1.5, 2.7)) { st.k++; sfx.pick(); float(tgt.x, tgt.y - 20, `${st.k}/${s.stops.length}`, '#ffd84a'); if (st.k >= s.stops.length) nextStep(); }
  } else if (s.t === 'carry') {
    if (near(1.4, 2.8)) {
      if (!pv) st.needWheels = true;
      else if (speed < 1.8 * VS * T) {
        st.wait += dt;
        if (st.wait > 0.55) {
          st.wait = 0;
          if (st.spillPt) { st.spillPt = null; st.loaded = true; S.items = S.items.filter(i => !i.spill); float(tgt.x, tgt.y - 20, 'Back on', '#fff'); sfx.door(); return; }
          st.loaded = !st.loaded; sfx.door();
          if (st.loaded && s.rival && st.k === s.n - 1) st.rivalDue = true;
          if (st.pass) { if (st.loaded) S.peds = S.peds.filter(p => p !== st.pass); else { st.pass.x = tgt.x; st.pass.y = tgt.y; S.peds.push(st.pass); } }
          if (!st.loaded) { st.k++; float(tgt.x, tgt.y - 20, s.n > 1 ? `${st.k}/${s.n}` : 'Delivered', '#ffd84a'); sfx.pick(); if (s.gentle && !st.bumps && st.k >= s.n) badge('clean'); if (st.k >= s.n) nextStep(); else if (st.pass) st.pass = null; }
          else float(tgt.x, tgt.y - 20, s.passenger ? 'In you get' : 'Loaded', '#fff');
        }
      }
    } else { st.wait = 0; st.needWheels = false; }
    if (st.rivalDue && st.loaded && S.city.at(Math.floor(pp.x / T), Math.floor(pp.y / T)) === G.ROAD) { st.rivalDue = false; startRival(lotPt(s.to), s.rival); }
    if (s.switch && st.loaded && st.k === s.n - 1 && !st.toAlt && dist(pp, lotPt(s.to)) < 0.5 * dist(lotPt(s.from), lotPt(s.to))) {
      st.toAlt = s.switch.to;
      if (st.timer != null) st.timer += Math.round(manh(pp, lotPt(st.toAlt)) / 5 + 6);
      S.ui.toast(`${s.switch.name || s.passenger || ''}: "${s.switch.text}"`, 5200); sfx.ring();
    }
  } else if (s.t === 'collect') {
    for (const it of S.items) if (it.step && dist(it, pp) < (pv ? 1.5 : 1.0) * T) { it.gone = true; st.k++; sfx.pick(); float(it.x, it.y - 16, `${st.k}/${st.n}`, '#ffd84a'); }
    S.items = S.items.filter(i => !i.gone);
    if (st.k >= st.n) nextStep();
  } else if (s.t === 'chase') {
    const v = st.target;
    if (s.hop && pv === S.heirloom && v.hp > 0 && (st.hops || 0) < s.hop.length && v.hp <= st.maxHp * (1 - ((st.hops || 0) + 1) / (s.hop.length + 1))) { hopChase(s.hop[st.hops || 0]); return; }
    if (v.hp <= 0 && !st.stopped) { st.stopped = 0.01; v.ai = null; v.dead = true; S.ui.toast(`You have ${s.drop}.`, 2600); sfx.cash(); }
    if (st.stopped) { st.stopped += dt; st.timer = null; if (st.stopped > 1.3) { v.ai = null; st.target = null; nextStep(); } }
  } else if (s.t === 'search') {
    for (let i = 0; i < st.spots.length; i++) {
      const sp = st.spots[i];
      if (sp.seen || dist(sp.pt, pp) > (pv ? 2.8 : 1.6) * T) continue;
      if (i === st.where) { S.mission.found = sp.k; sfx.cash(); nextStep(); return; }
      sp.seen = true; sfx.door();
      S.ui.toast((s.miss && s.miss[i]) || 'Not here.', 3600);
    }
  } else if (s.t === 'frenzy') {
    st.wave -= dt;
    if (st.wave <= 0 && S.vehicles.filter(v => v.ai === 'hunt' || (v.wreck && !v.gone)).length < 3) { st.wave = 3; const h = spawnAi(S.city.year < 1900 ? 'erasercoach' : 'eraser', pp, 'hunt', { minPlayer: Math.hypot(S.view.w, S.view.h) / 2 / S.view.z + 2 * T }); h.hp = 1; }
  } else if (s.t === 'tail') {
    const v = st.target, d = dist(v, pp);
    if (st.grace > 0) st.grace -= dt;
    else {
      st.sus = d < (s.min || 3.4) * T ? st.sus + dt * 0.5 : Math.max(0, st.sus - dt * 0.22);
      st.lost = d > (s.max || 15) * T ? st.lost + dt : Math.max(0, st.lost - dt);
    }
    st.far = d > (s.max || 15) * T * 0.8; st.close = d < (s.min || 3.4) * T * 1.3;
    if (st.spotted || st.sus >= 1) failMission('They spotted you.');
    else if (st.lost > 5) failMission('You lost them.');
    else if (v.arrived) { st.target = null; v.parked = true; nextStep(); }
  } else if (s.t === 'defend') {
    const cv = st.convoy;
    if (cv.hp <= 0) { cv.dead = true; failMission('The registers are gone.'); return; }
    if (cv.arrived) { for (const v of S.vehicles) if (v.prey === cv) { v.ai = null; v.dead = true; } st.convoy = null; cv.parked = true; cv.convoy = false; sfx.cash(); nextStep(); return; }
    st.wave -= dt;
    const alive = S.vehicles.filter(v => v.prey === cv && v.ai === 'hunt').length;
    if (cv.started && st.wave <= 0 && alive < 2 && st.sent < (s.waves || 6)) {
      st.wave = 9; st.sent++;
      const a = Math.random() * 7, h = spawnAi(S.city.year < 1900 ? 'erasercoach' : 'eraser', { x: cv.x + Math.cos(a) * 11 * T, y: cv.y + Math.sin(a) * 11 * T }, 'hunt', { prey: cv });
      h.hp = 1;
    }
  } else if (s.t === 'catch') {
    const r = st.runner;
    fleeStep(r, pp, dt);
    if (r.caught || (!pv && dist(r, P) < 0.95 * T)) { r.down = 3; float(r.x, r.y - 22, 'Got him!', '#ffd84a'); sfx.cash(); st.runner = null; r.stepPed = false; r.runner = false; r.sp = 1.6 * T; r.dir = 0; r.cross = 0; S.ui.toast(`You have ${s.drop || 'the page'}.`, 2400); nextStep(); }
  } else if (s.t === 'drill') {
    // Dorothy's driving lesson: each move is checked from what the car actually does
    if (S.bot) { nextStep(); return; }
    if (!pv) return;
    const id = s.drills[st.k], max = statsOf(pv).max * T;
    let ok = false;
    if (id === 'speed') ok = pv.speed > 0.75 * max;
    else if (id === 'stop') { st.peak = Math.max(st.peak, Math.abs(pv.speed)); ok = st.peak > 4 * VS * T && Math.abs(pv.speed) < 0.4 * VS * T; }
    else if (id === 'reverse') { st.held = pv.speed < -0.8 * VS * T ? st.held + dt : Math.max(0, st.held - dt * 0.5); ok = st.held > 0.8; }
    else if (id === 'slide') { st.held = pv.hand && pv.slip > 2.2 ? st.held + dt : st.held; ok = st.held > 0.7; }
    else if (id === 'spin') {
      // a handbrake turn: swing round to face back the way you came, all in one fresh pull of the handbrake
      if (st.lift) { if (!pv.hand) st.lift = false; }
      else if (pv.hand && (st.spin || Math.abs(pv.speed) > 3 * VS * T)) { st.spin ||= { tot: 0, last: pv.ang }; st.spin.tot += angDiff(pv.ang, st.spin.last); st.spin.last = pv.ang; ok = Math.abs(st.spin.tot) > 2.4; }
      else st.spin = null;
    }
    if (ok) {
      const d = DRILLS[id];
      st.k++; st.peak = 0; st.held = 0; st.spin = null; st.lift = pv.hand;   // the next move starts with a fresh press
      float(pv.x, pv.y - 30, d.done, '#7be07b'); sfx.pick();
      S.ui.toast(`Dorothy: "${d.praise}"`, 3200); S.lessonKey = 'praise';
      S.lessonHold = S.t + 3.2;
      if (st.k >= s.drills.length) nextStep();
    }
  } else if (s.t === 'travel') {
    if (S.city.town.id === s.town && S.city.year === s.year) nextStep();
  } else if (s.t === 'escape') {
    if (S.heat <= 0) nextStep();
  }
}
// Somebody on foot who does not want to be caught: away from you, and not into a dead end if he can help it.
function fleeStep(r, pp, dt) {
  r.think -= dt;
  if (r.think <= 0) {
    r.think = 0.28;
    let best = r.ang, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, nx = r.x + Math.cos(a) * 1.2 * T, ny = r.y + Math.sin(a) * 1.2 * T;
      if (circleSolid(nx, ny, 9)) continue;
      const open = circleSolid(r.x + Math.cos(a) * 3 * T, r.y + Math.sin(a) * 3 * T, 9) ? -2.5 * T : 0;
      const sc = Math.hypot(nx - pp.x, ny - pp.y) + open - Math.abs(angDiff(a, r.ang)) * 5;
      if (sc > bs) { bs = sc; best = a; }
    }
    r.ang = best;
  }
  const scared = dist(r, pp) < 9 * T ? 1 : 0.45;
  moveWalker(r, Math.cos(r.ang) * r.sp * scared * dt, Math.sin(r.ang) * r.sp * scared * dt, 8); r.walk += dt * 16 * scared;
}
// Now and then, when you are between jobs, a man in grey turns up to scrub a street name off the map.
function updateIncident(dt) {
  const c = S.city, P = S.player, pp = P.vehicle || P, inc = S.incident;
  if (!inc) {
    if (S.mission || S.busy || S.save.idx < 3) return;
    S.incT = (S.incT ?? 45 + Math.random() * 40) - dt;
    if (S.incT > 0) return;
    S.incT = 80 + Math.random() * 70;
    for (let tries = 0; tries < 12; tries++) {
      const w = c.ways[Math.floor(Math.random() * c.ways.length)], nd = c.nodes[w.pts[w.pts.length >> 1]], sp = freeSpotNear(nd.x + 1.6 * T, nd.y + 1.6 * T, 1);
      const x = sp.x, y = sp.y, d = Math.hypot(x - pp.x, y - pp.y), name = c.names[w.ni];
      if (d < 9 * T || d > 26 * T || circleSolid(x, y, 9) || /^—/.test(name)) continue;
      const r = { stepPed: true, vandal: true, x, y, ang: 0, sp: 4.7 * T, walk: 0, down: 0, look: ERASER_LOOK, name: 'Man in grey', think: 0 };
      S.peds.push(r);
      S.incident = { r, idx: w.ni, name, t: 50, alerted: false, rub: 0 };
      S.ui.toast(`A man in grey is scrubbing ${name} off the street signs! Catch him before the name is gone.`, 5200);
      return;
    }
    return;
  }
  const r = inc.r, d = dist(r, pp);
  const end = () => { S.peds = S.peds.filter(p => p !== r); S.incident = null; };
  if (S.mission) { end(); return; }
  inc.t -= dt;
  if (d < 6.5 * T) inc.alerted = true;
  if (inc.alerted) fleeStep(r, pp, dt);
  else if ((inc.rub -= dt) <= 0) { inc.rub = 1.3; float(r.x, r.y - 20, 'scrub scrub', '#f08aa0'); }
  if (r.caught || (!P.vehicle && d < 0.95 * T)) {
    r.down = 3; r.stepPed = false; r.vandal = false; r.sp = 1.6 * T; r.dir = 0; r.cross = 0; S.incident = null;
    earn(30); S.ui.toast(`${inc.name} is saved. The parish is grateful to the tune of £30.`, 4200);
    if (bump('saved') >= 5) badge('streets');
  } else if (inc.t <= 0) {
    c.names[inc.idx] = '— — —';
    c.chunks.clear();
    S.ui.toast(`Too late. ${inc.name} has been scrubbed off the map, and nobody can remember what it was called.`, 5200);
    end();
  }
}
// A grey vehicle racing you to the same door.
function startRival(dest, pace) {
  const st = S.step, P = S.player, pp = P.vehicle || P;
  const type = S.city.year < 1900 ? 'erasercoach' : 'eraser', c = S.city, far = Math.max(1, 16 * T / Math.max(1, dist(pp, dest))), from = { x: clamp(dest.x + (dest.x - pp.x) * far, 6 * T, c.wpx - 6 * T), y: clamp(dest.y + (dest.y - pp.y) * far, 6 * T, c.hpx - 6 * T) };  // from the far side of where you are both going
  const secs = (st.timer ?? manh(pp, dest) / 5 / VS + 14) * (pace === true ? 0.8 : 0.8 * 0.44 / pace);
  st.rival = spawnAi(type, from, 'lead', { dest, pace: clamp((manh(from, dest) + 4) / Math.max(secs, 12) / VEHICLES[type].max, 0.1, 0.6) });
  hintOnce('rival', 'A grey one is racing you there from the other side of town. Get there first, or get in its way.', 5200);
}
// Grey vans drawn across the road near where you are going.
function placeBlocks(dest, n) {
  const c = S.city, P = S.player, pp = P.vehicle || P, type = c.year < 1900 ? 'erasercoach' : 'eraser';
  const k = c.nearNode(dest.x, dest.y, q => c.nodes[q].nb.length >= 2), here = c.nodes[k];
  const arms = here.nb.slice().sort((a, b) => dist(c.nodes[a], pp) - dist(c.nodes[b], pp)).slice(0, Math.min(n, here.nb.length - 1));
  for (const m of arms) {
    const B = c.nodes[m], d = dist(here, B) || 1, ux = (B.x - here.x) / d, uy = (B.y - here.y) / d, at = Math.min(d * 0.8, 3.6 * T);
    for (const side of [-0.5, 0.5]) {
      const x = here.x + ux * at - uy * side * T, y = here.y + uy * at + ux * side * T;
      if (Math.hypot(x - pp.x, y - pp.y) < 5 * T || Math.hypot(x - dest.x, y - dest.y) < 2.2 * T) continue;
      for (const o of S.vehicles) if (o.ai === 'traffic' && Math.hypot(o.x - x, o.y - y) < 3 * T) o.gone = true;
      makeVehicle(type, x, y, Math.atan2(uy, ux) + Math.PI / 2 + (side > 0 ? 0.25 : -0.25), { parked: true, block: true, keep: true });
    }
  }
}
// A load that is not tied down comes off if you hit something hard enough.
function spillBump(hit) {
  const st = S.step, P = S.player;
  if (up('strap') || !st || st.step.t !== 'carry' || !st.step.spill || !st.loaded || st.spillPt || st.tied === st.k || hit < 5.6 * T || st.step.passenger) return;
  st.tied = st.k;  // once a trip: it gets tied down properly after that
  if (st.timer != null) st.timer += 4;
  const v = P.vehicle;
  st.loaded = false; st.spillPt = { x: v.x - Math.cos(v.ang) * 30, y: v.y - Math.sin(v.ang) * 30 };
  S.items.push({ spill: true, step: true, kind: 'load', x: st.spillPt.x, y: st.spillPt.y, n: 3 });
  S.ui.toast('It has come off the back! Stop and pick it up.', 2600); sfx.bump();
}
// The finale: every few knocks, Engine No. 1 jumps to another century and drags you with it.
function hopChase(year) {
  const st = S.step, v = st.target, m = S.mission;
  const keep = { x: v.x, y: v.y, ang: v.ang, hp: v.hp, pn: v.pn, n: v.n, type: v.type, fast: v.fast, speed: v.speed, maxHp: v.maxHp };
  st.hops = (st.hops || 0) + 1;
  S.hopping = true; sfx.jump(); S.flash = 0.9;
  enterTown(S.city.town, year, 'jump');
  S.hopping = false;
  S.mission = m; S.step = st;
  const nv = makeVehicle(keep.type, keep.x, keep.y, keep.ang, { ai: 'flee', pn: keep.pn, n: keep.n, fast: keep.fast, maxHp: keep.maxHp });
  nv.hp = keep.hp; nv.speed = keep.speed; st.target = nv;
  if (st.timer != null) st.timer += 25;
  S.ui.toast(`Hargreaves has jumped to ${year}, and taken you with him!`, 3600);
}
// After the first chapter, Hargreaves's men come looking for you while the clock is running.
function updateAmbush(dt) {
  const m = S.mission, st = S.step;
  if (m && m.def.frenzy) return;
  if (!m || (m.def.odd && !m.def.favour)) { for (const v of S.vehicles) if (v.ai === 'hunt') v.gone = true; return; }
  if (st && st.step.gentle) return;  // nobody rams the wedding car
  const force = st && st.step.hunt;
  if (!force && (m.def.index < 5 || !st || st.timer == null || !['carry', 'race', 'collect', 'goto', 'search'].includes(st.step.t))) return;
  if (S.vehicles.filter(v => v.ai === 'hunt' && !v.prey).length >= (force || (m.def.index > 14 ? 2 : 1))) return;
  st.amb = (st.amb ?? 9 + Math.random() * 9) - dt;
  if (st.amb > 0) return;
  st.amb = 16 + Math.random() * 12;
  const v = spawnAi(S.city.year < 1900 ? 'erasercoach' : 'eraser', S.player.vehicle || S.player, 'hunt', { minPlayer: Math.max(11 * T, Math.hypot(S.view.w, S.view.h) / 2 / S.view.z + 2 * T) });
  v.hp = 2;
  hintOnce('hunt', 'Grey vans on your tail! Every time one rams you, you lose three seconds. Ram them first.', 6500);
}
async function converse(s) {
  const tok = S;
  S.busy = true;
  if (S.player.vehicle) { S.player.vehicle.speed = 0; S.player.vehicle.vx = S.player.vehicle.vy = 0; }
  if (s.greet) { await runLines([{ who: s.who, greet: true }]); if (S !== tok) return; }
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
// Side jobs you drive into: the Smash-Up by the Hargreaves & Lowe office, the Heirloom Cup by the garage.
function sideTokens(c) {
  S.items = S.items.filter(i => !i.frenzy && !i.cup);
  if (S.save.idx >= 6) { const l = c.lots.office, r = roadNear(l.x, l.y + 2 * T); S.items.push({ frenzy: true, kind: 'rubber', x: r.x, y: r.y, n: 1, wait: true }); }
  if (S.save.idx >= 3) { const l = c.lots.garage, r = roadNear(l.x + 3 * T, l.y + 2 * T); S.items.push({ cup: true, kind: 'flag', x: r.x, y: r.y, n: 2, wait: true }); }
}
function startSide(kind) {
  const c = S.city;
  if (kind === 'frenzy') {
    hintOnce('frenzy', 'Smash-Up! Sixty seconds. Every grey van you ram off the road is £20. They ram back.', 6000);
    startMission({ id: 'frenzy', odd: true, frenzy: true, act: 'Side job', title: 'Smash-Up', town: c.town.id, year: c.year, giver: { who: 'board' }, brief: '', intro: [], outro: [], steps: [{ t: 'frenzy', time: 60, text: 'Ram every grey van you can before the clock runs out' }], reward: { cash: 0 } });
  } else {
    const best = (S.save.cup || {})[c.town.id + ':' + c.year];
    hintOnce('cup', 'The Heirloom Cup: one lap of the town against the clock. Green clocks are worth five seconds.', 6000);
    startMission({ id: 'cup', odd: true, cup: true, act: 'Side job', title: 'The Heirloom Cup', town: c.town.id, year: c.year, giver: { who: 'board' }, brief: '', intro: [], outro: [], steps: [{ t: 'race', stops: CUP_LAP, timed: 0.8, tokens: 4, text: `One lap of ${c.town.name}` + (best ? `. Your best: ${best.toFixed(1)}s` : '') }], reward: { cash: 40 } });
  }
}
const CUP_LAP = ['church', 'farm', 'hub', 'works', 'market', 'school', 'garage'];
function tally() {
  const sv = S.save, st = S.story, med = sv.medals || {};
  const story = st.missions.length, favs = st.favours.length, towns = st.towns.size;
  const golds = Object.values(med).filter(x => x === 3).length, medalable = st.missions.filter(m => m.steps.some(x => x.t !== 'travel' && x.t !== 'talk')).length + favs + towns * 2;
  const parts = [[sv.idx, story, 5], [(sv.favours || []).length, favs, 2], [golds, medalable, 2], [(sv.badges || []).length, Object.keys(BADGES).length, 1]];
  const pct = Math.round(100 * parts.reduce((a, [n, d, w]) => a + (d ? Math.min(1, n / d) : 1) * w, 0) / parts.reduce((a, p) => a + p[2], 0));
  return { pct, golds, medalable, text: `${pct}% complete · ${Math.min(sv.idx, story)}/${story} missions · ${(sv.favours || []).length}/${favs} favours · ${golds} gold of ${medalable} · ${(sv.badges || []).length}/${Object.keys(BADGES).length} badges` };
}
function hintOnce(key, text, ms = 6000) {
  const h = S.save.hints || (S.save.hints = {});
  if (h[key]) return;
  h[key] = 1;
  S.ui.toast(text, ms);
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
  if (def.cutOut && !def.odd && def.index >= S.save.idx) await playCut(def.cutOut, 'out:' + def.id);
  if (S !== tok) return;
  S.busy = false;
  let cash = def.reward.cash || 0;
  if (def.reward.perTile) cash = Math.max(25, Math.round((m.total || 20) * def.reward.perTile / 5) * 5);
  if (def.fare) {
    cash = Math.round(cash * (1 + 0.15 * def.streak) / 5) * 5;
    earn(cash);
    S.ui.toast(`Fare paid: £${cash}` + (def.streak ? ` · ${def.streak + 1} in a row` : ''), 2200);
    if (def.streak + 1 >= 5) badge('cabbie');
    persist();
    if (S.player.vehicle && VEHICLES[S.player.vehicle.type].cab) startFare(def.streak + 1);
    return;
  }
  // a medal for how briskly it was done (or, in a frenzy, how many)
  let medal = 0;
  const again = !def.odd && def.index < S.save.idx;
  if (again) cash = Math.round(cash * 0.3 / 5) * 5;
  let lap = 0;
  if (def.frenzy || def.cup || ((!def.odd || def.favour) && def.steps.some(x => x.t !== 'travel' && x.t !== 'talk'))) {
    const ratio = m.par ? (S.t - (m.t0 ?? S.t)) / m.par : 1;
    medal = def.frenzy ? (m.score >= 8 ? 3 : m.score >= 5 ? 2 : m.score >= 2 ? 1 : 0) : m.resumed ? 1 : ratio <= 0.5 ? 3 : ratio <= 0.72 ? 2 : 1;
    cash = def.frenzy ? (m.score || 0) * 20 : Math.round(cash * (medal === 3 ? 1.4 : medal === 2 ? 1.15 : 1) / 5) * 5;
    const med = S.save.medals || (S.save.medals = {}), key = def.frenzy ? 'frenzy:' + S.city.town.id : def.cup ? 'cup:' + S.city.town.id : def.id;
    if (def.cup) { lap = S.t - m.t0; const cups = S.save.cup || (S.save.cup = {}), ck = S.city.town.id + ':' + S.city.year; if (!cups[ck] || lap < cups[ck]) cups[ck] = Math.round(lap * 10) / 10; }
    if ((med[key] || 0) < medal) med[key] = medal;
    if (Object.values(med).filter(x => x === 3).length >= 8) badge('gold');
  }
  if (def.frenzy || def.cup) sideTokens(S.city);
  for (const it of S.items) if (it.frenzy || it.cup) it.wait = true;
  earn(cash);
  if (def.reward.proof && !S.save.proofs.includes(def.reward.proof.id)) S.save.proofs.push(def.reward.proof.id);
  if (!def.odd) S.save.idx = Math.max(S.save.idx, def.index + 1);
  if (S.save.proofs.length >= S.story.proofs.length) badge('proven');
  if (def.bonus) { S.save.foundling = 1; badge('named'); }
  if (def.favour) { (S.save.favours || (S.save.favours = [])).push(def.id); if (S.save.favours.length >= 5) badge('favours'); }
  S.player.hearts = 3; S.heat = 0;
  S.ui.banner(def.id === 'case-closed' ? 'CASE CLOSED' : def.frenzy ? `${m.score || 0} OFF THE ROAD` : def.cup ? `LAP ${lap.toFixed(1)}s` : 'MISSION PASSED', (medal ? '★'.repeat(medal) + '☆'.repeat(3 - medal) + ' · ' : '') + `+£${cash}` + (def.reward.proof ? ` · Proof: ${def.reward.proof.title}` : ''), '#7be07b', 3600);
  sfx.pass();
  if (def.unlock) setTimeout(() => S === tok && (S.ui.banner(def.unlock, S.ui.touch ? 'Tap Dial to choose a year' : 'Press T to choose a year', '#8ad4ff', 4200), sfx.jump()), 3700);
  persist(); spawnNpcs();
  // what comes next, so there is always a reason to go on
  const nx = !def.odd && def.reward.proof ? S.story.missions[S.save.idx] : null, nch = nx && nx.chapter != null && nx.chapter !== def.chapter ? S.story.chapters[nx.chapter] : null;
  if (nch) setTimeout(() => S === tok && !S.mission && S.ui.toast(`Proof ${S.save.proofs.length} of ${S.story.proofs.length} lodged. Next link in the chain: ${nch.name}, your ${nch.rel}. ${nch.town.name}, ${nch.year}.`, 7000), 3900);
  else if (nx && nx.id !== 'case-closed' && def.reward.proof) setTimeout(() => S === tok && !S.mission && S.ui.toast(`Proof ${S.save.proofs.length} of ${S.story.proofs.length} lodged. Dorothy wants a word: ${nx.title}.`, 6000), 3900);
  if (def.id === 'case-closed') setTimeout(() => S === tok && S.ui.toast('Every town and every year is open. Go and meet the family.', 6000), 3800);
}
function failMission(reason, quiet) {
  if (!S.mission) return;
  const failed = S.mission.def;
  if (S.tele) S.tele.push({ m: failed.id, i: S.mission.i, t: S.step ? S.step.step.t : '-', fail: reason || 'quiet', dur: S.step ? +(S.t - S.step.t0).toFixed(1) : 0, timer0: S.step ? S.step.timer0 ?? null : null, k: S.step ? S.step.k : 0, veh: !!S.player.vehicle, items: S.items.filter(i => i.step).map(i => [Math.floor(i.x / T), Math.floor(i.y / T), S.city.at(Math.floor(i.x / T), Math.floor(i.y / T))]), p: [Math.floor((S.player.vehicle || S.player).x / T), Math.floor((S.player.vehicle || S.player).y / T)] });
  S.retry = !failed.fare && !failed.frenzy && !S.hopping ? { def: failed, i: failed.cup ? 0 : Math.max(0, S.mission.i), found: S.mission.found, until: S.t + 40, town: S.city.town.id, year: S.city.year } : null;
  clearStep();
  S.mission = null;
  if (!quiet) { S.ui.banner('MISSION FAILED', reason, '#ff5a4a', 3000); sfx.fail(); }
  S.failT = S.t;
  const fc = S.fails || (S.fails = {}); fc[failed.id] = (fc[failed.id] || 0) + 1;
  if (fc[failed.id] === 2 && !S.save.easy && !failed.frenzy && !failed.cup) setTimeout(() => S && S.ui.toast('Twice now. The pause menu can make every timer generous, and nobody need know.', 6500), 3200);
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
    go: id => { const t = S.story.towns.get(id), fare = fareBetween(c.town, t); if (S.save.cash < fare) return; S.ui.closePanel(); S.save.cash -= fare; if (t.country !== c.town.country) badge('abroad'); travel(t, c.year, 'hub'); },
  });
}
function travel(town, year, where, waited) {
  const tok = S, c = S.city, jump = where === 'jump';
  S.busy = true;
  if (!jump && !waited && town.id !== c.town.id && needsStreets(town)) { waitForStreets(town, true).then(() => { if (S === tok) travel(town, year, where, true); }); return; }
  S.transit = { jump, t: 0, dur: jump ? 1.5 : 2.6, from: c.town, to: town, y0: c.year, y1: year, air: c.air, abroad: town.country !== c.town.country, swapped: false,
    swap: () => { if (S === tok) { enterTown(town, year, where); if (jump) fireTracks(S.heirloom); } }, done: () => { if (S === tok) { const after = S.transit.after; S.transit = null; S.busy = false; after?.(); } } };
  if (jump) sfx.jump(); else sfx.door();
}
// Drawn over everything while a journey is under way.
// The opening scene's dressing: black bars, a caption, and whoever is speaking, large, with a face to match.
let cutFace = null;
function drawCut(g, w, h, dpr) {
  const cu = S.cut, bar = Math.round(h * 0.12), k = clamp((S.t - cu.t0) / 0.8, 0, 1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0b080c'; g.fillRect(0, 0, w, bar * k); g.fillRect(0, h - bar * k, w, bar * k);
  g.fillStyle = 'rgba(11,8,12,0.28)'; g.fillRect(0, bar, w, h - 2 * bar);
  if (cu.caption) {
    // long captions (a full name and a town) shrink to fit a phone held upright
    const capt = cu.caption.toUpperCase();
    g.font = `${Math.round(15 * dpr)}px "Press Start 2P", monospace`;
    const fit = Math.min(1, (w * 0.92) / Math.max(1, g.measureText(capt).width));
    g.font = `${Math.max(8, Math.floor(15 * dpr * fit))}px "Press Start 2P", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd84a'; g.fillText(capt, w / 2, bar * 0.52); }
  g.font = `700 ${Math.round(12 * dpr)}px "Nunito", sans-serif`; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(S.ui.touch ? 'tap to go on' : 'E: go on   ·   Esc: skip', w - 14 * dpr, h - bar * 0.5);
  if (!cu.who || cu.who === 'note' || cu.who === 'letter') return;
  const sp = speaker(cu.who), size = 16 * Math.max(6, Math.round(Math.min(h * 0.46, w * 0.3) / 16)), u = size / 16;
  if (!cutFace) cutFace = document.createElement('canvas');
  if (cutFace.width !== size) cutFace.width = cutFace.height = size;
  const f = cutFace.getContext('2d'), talking = S.ui.dialogOpen ? Math.floor(S.t * 9) : 0;
  drawPortrait(f, sp.look, size, talking); drawPortraitExtras(f, cu.who, sp.look, size);
  // the face they are making
  f.strokeStyle = sp.look.hair === '#dcdcd4' ? '#8a8a84' : '#241a16'; f.lineWidth = u * 0.7; f.lineCap = 'round';
  const brow = (x0, y0, x1, y1) => { f.beginPath(); f.moveTo(x0 * u, y0 * u); f.lineTo(x1 * u, y1 * u); f.stroke(); };
  if (cu.mood === 'angry') { brow(4.6, 4.7, 7.3, 5.7); brow(11.4, 4.7, 8.7, 5.7); }
  else if (cu.mood === 'worried') { brow(4.6, 5.5, 7.2, 4.6); brow(11.4, 5.5, 8.8, 4.6); f.fillStyle = '#9ad4f0'; f.fillRect(12.3 * u, 5 * u, 0.7 * u, 1.3 * u); }
  else if (cu.mood === 'set') { brow(4.6, 5, 7.2, 5.1); brow(11.4, 5, 8.8, 5.1); }
  else if (cu.mood === 'grin') { brow(4.6, 5.3, 7.2, 4.7); brow(11.4, 4.6, 8.8, 5.4); f.fillStyle = '#fff'; f.fillRect(5.6 * u, 9.3 * u, 4.8 * u, 1.3 * u); f.strokeStyle = '#241a16'; f.lineWidth = u * 0.3; f.strokeRect(5.6 * u, 9.3 * u, 4.8 * u, 1.3 * u); for (let i = 1; i < 4; i++) { f.beginPath(); f.moveTo((5.6 + i * 1.2) * u, 9.3 * u); f.lineTo((5.6 + i * 1.2) * u, 10.6 * u); f.stroke(); } }
  const x = cu.side ? w - size - 28 * dpr : 28 * dpr, y = Math.max(bar + 8 * dpr, h * 0.72 - size) + Math.sin(S.t * 2.2) * 3 * dpr, slide = clamp((S.t - (cu.since || 0)) / 0.25, 0, 1);
  if (cu.shown !== cu.who + cu.side) { cu.shown = cu.who + cu.side; cu.since = S.t; }
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#ffd84a'; g.fillRect(x - 5 * dpr + (cu.side ? 1 : -1) * (1 - slide) * 60, y - 5 * dpr, size + 10 * dpr, size + 10 * dpr);
  g.fillStyle = '#2d2438'; g.fillRect(x - 2 * dpr + (cu.side ? 1 : -1) * (1 - slide) * 60, y - 2 * dpr, size + 4 * dpr, size + 4 * dpr);
  g.drawImage(cutFace, x + (cu.side ? 1 : -1) * (1 - slide) * 60, y);
  g.imageSmoothingEnabled = true;
}
function drawTransit(g, w, h, dpr, dt) {
  const tr = S.transit;
  tr.t += dt;
  const k = clamp(tr.t / tr.dur, 0, 1);
  if (k >= 0.5 && !tr.swapped) { tr.swapped = true; tr.swap(); }
  const font = (px, f = '"Press Start 2P", monospace') => { g.font = `${Math.round(px * dpr)}px ${f}`; };
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (tr.jump) {
    const a = Math.sin(k * Math.PI);
    g.fillStyle = `rgba(224,250,255,${Math.min(1, a * 1.6)})`; g.fillRect(0, 0, w, h);
    g.strokeStyle = `rgba(60,150,200,${a * 0.6})`; g.lineWidth = 2 * dpr;
    for (let i = 0; i < 26; i++) { const an = i / 26 * Math.PI * 2 + tr.t * 0.6, r0 = (0.08 + ((tr.t * 1.6 + i * 0.37) % 1) * 0.9) * Math.max(w, h); g.beginPath(); g.moveTo(w / 2 + Math.cos(an) * r0, h / 2 + Math.sin(an) * r0); g.lineTo(w / 2 + Math.cos(an) * r0 * 1.25, h / 2 + Math.sin(an) * r0 * 1.25); g.stroke(); }
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, y = Math.round(tr.y0 + (tr.y1 - tr.y0) * e);
    g.globalAlpha = Math.min(1, a * 2); font(64); g.lineWidth = 8 * dpr; g.strokeStyle = '#0a2a3a'; g.strokeText(String(y), w / 2, h / 2); g.fillStyle = '#fff'; g.fillText(String(y), w / 2, h / 2);
    g.globalAlpha = 1;
  } else {
    const a = k < 0.12 ? k / 0.12 : k > 0.88 ? (1 - k) / 0.12 : 1;
    g.globalAlpha = a;
    const icon = tr.abroad ? (tr.air ? '✈' : '⛴') : tr.y0 >= 1840 ? '🚂' : '🐎';
    drawRouteMap(g, w, h, dpr, tr.from, tr.to, clamp((k - 0.12) / 0.76, 0, 1), icon);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    font(16); g.lineWidth = 6 * dpr; g.strokeStyle = 'rgba(244,236,216,0.9)';
    const head = tr.abroad ? (tr.air ? 'DEPARTURES' : 'EMBARKED') : 'ALL ABOARD';
    g.strokeText(head, w / 2, h * 0.1); g.fillStyle = '#8a2a1a'; g.fillText(head, w / 2, h * 0.1);
    font(13, '"Nunito", sans-serif'); g.lineWidth = 4 * dpr; g.strokeText(`${tr.y0} · the Heirloom travels as freight`, w / 2, h * 0.1 + 28 * dpr); g.fillStyle = '#4a3a20'; g.fillText(`${tr.y0} · the Heirloom travels as freight`, w / 2, h * 0.1 + 28 * dpr);
    g.globalAlpha = 1;
  }
  if (k >= 1) tr.done();
}
const dialReady = () => S.save.idx > S.story.missions.findIndex(m => m.id === 'ink-money');
function openDial() {
  if (!dialReady()) {
    const def = S.story.missions.find(m => m.id === 'ink-money'), on = S.mission && S.mission.def === def, before = S.save.idx < def.index;
    const parts = def.steps.map((x, i) => x.got ? `<div class="row${on && S.mission.i > i ? ' off' : ''}"><span>${on && S.mission.i > i ? '✔' : '☐'} ${escapeText(x.got.replace(/^the /, ''))}<small>${escapeText(x.text.replace(/^Part \d of \d: /, ''))}</small></span></div>` : '').join('');
    S.ui.panel(`<h2>🔒 The time dial is locked</h2><p>The Heirloom's time engine is not working yet. It needs three parts fitted before it can travel in time:</p>${parts}<p>${before ? 'Finish <b>Final Notice</b> first. Then Dorothy will send you for the parts in <b>Spare Parts</b>.' : on ? 'Collect what is left and take it back to Dorothy at the lock-up.' : 'Talk to Dorothy at the lock-up to start <b>Spare Parts</b>.'}</p><div class="foot"><button data-go="close">Close</button></div>`, { close: () => S.ui.closePanel() });
    return;
  }
  const c = S.city, u = unlocked(), want = wanted();
  const rows = u.years.map(([y, labels]) => {
    const cost = inkFor(c.year, y), cur = y === c.year;
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
  S.ui.panel(`<h2>📜 The ${escapeText(st.surname)} pedigree</h2><p>${S.save.proofs.length} of ${st.proofs.length} proofs lodged · ${n} of ${st.missions.length} missions passed · ${(S.save.photos || []).length} lost photographs · ${(S.save.met || []).length} of the family met · ${(S.save.graves || []).length} graves visited · £${S.save.cash}</p><p>Badges (${(S.save.badges || []).length}/${Object.keys(BADGES).length}): ${escapeText((S.save.badges || []).map(b => BADGES[b][0]).join(', ') || 'none yet')}</p>${rows}<div class="foot"><button class="alt" data-go="close">Close</button></div>`, { close: () => S.ui.closePanel() });
}
function openMap() {
  const c = S.city, sc = 6;
  S.ui.panel(`<h2>🗺 ${escapeText(c.town.name)}, ${c.year}</h2><canvas id="stMap" width="${c.W * sc}" height="${c.H * sc}"></canvas><p>Yellow: where the story wants you. Gold: the Heirloom. £: odd jobs. ${c.air ? '✈' : '⚓'}: tickets. Photographs found here: ${(S.save.photos || []).filter(p => p.startsWith(c.town.id + ':' + c.era)).length} of 3.</p><div class="foot"><button class="alt" data-go="close">Close</button></div>`, { close: () => S.ui.closePanel() }, true);
  const g = S.ui.root.querySelector('#stMap').getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(S.mini, 0, 0, c.W * sc, c.H * sc);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 12px "Fredoka", "Nunito", sans-serif';
  const tag = (o, text, col) => { const x = o.x / T * sc, y = o.y / T * sc; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); };
  const SHORT = { church: 'Church', hall: c.year >= 1837 ? 'Records' : 'Vestry', pub: 'Pub', works: 'Works', farm: 'Farm', school: 'School', hub: c.air ? 'Airport' : 'Quay', garage: c.year >= 1950 ? 'Lock-up' : 'Barn', market: 'Market', infirmary: c.year >= 1948 ? 'Hospital' : 'Infirmary', police: c.year >= 1900 ? 'Police' : 'Watch', post: 'Post', office: c.era === 'modern' ? 'Hargreaves & Lowe' : 'Counting ho.' };
  g.font = '700 11px "Fredoka", "Nunito", sans-serif';
  for (const k in c.lots) if (SHORT[k]) tag({ x: c.lots[k].x, y: c.lots[k].y - (k === 'garage' ? -1.2 : 1.8) * T }, SHORT[k], '#fff');
  const dot = (o, col, r = 6) => { g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(o.x / T * sc, o.y / T * sc, r, 0, 7); g.fill(); g.stroke(); };
  dot(S.heirloom, '#e8c040');
  if (S.target) dot(S.target, '#ffd84a', 8);
  const pp = S.player.vehicle || S.player;
  dot(pp, '#fff', 5);
  tag({ x: pp.x, y: pp.y + 1.8 * T }, 'you', '#fff');
}
function openWorkshop(intro) {
  const draw = () => {
    const rows = UPGRADES.map(u => {
      const l = up(u.id), full = l >= u.max, cost = full ? 0 : u.cost[l];
      return `<div class="row${full ? ' off' : ''}"><span>${u.name} ${'●'.repeat(l)}${'○'.repeat(u.max - l)}<small>${u.desc}</small></span><b>${full ? 'fitted' : '£' + cost}</b><button data-go="buy:${u.id}" ${full || S.save.cash < cost ? 'disabled' : ''}>Fit</button></div>`;
    }).join('');
    S.ui.panel(`<h2>🔧 ${escapeText(capFirst(S.city.lots.garage.name))}</h2>${intro ? `<p>${escapeText(intro)}</p>` : ''}<p>Dorothy keeps a bench and a box of parts in every century. You have £${S.save.cash}.</p>${rows}
      <div class="row"><span>Respray<small>${S.heat > 0 ? 'A new colour, and the law will not know you.' : 'A new colour. Purely for vanity.'}</small></span><b>£40</b><button data-go="spray" ${S.save.cash < 40 ? 'disabled' : ''}>Spray</button></div>
      <div class="row${S.player.hearts >= 3 ? ' off' : ''}"><span>Flask of tea<small>Puts you back on your feet.</small></span><b>free</b><button data-go="tea" ${S.player.hearts >= 3 ? 'disabled' : ''}>Drink</button></div>
      <div class="foot"><button class="alt" data-go="close">Close</button></div>`, {
      close: () => S.ui.closePanel(),
      buy: id => { const u = UPGRADES.find(x => x.id === id), l = up(id), cost = u.cost[l]; if (l >= u.max || S.save.cash < cost) return; S.save.cash -= cost; (S.save.up || (S.save.up = {}))[id] = l + 1; sfx.cash(); if (UPGRADES.every(x => up(x.id) >= x.max)) badge('fitted'); persist(); draw(); },
      spray: () => { if (S.save.cash < 40) return; S.save.cash -= 40; const i = PAINTS.indexOf(S.heirloom.color); S.heirloom.color = S.save.paint = PAINTS[(i + 1) % PAINTS.length]; S.heat = 0; S.bust = 0; S.vehicles = S.vehicles.filter(v => v.ai !== 'cop'); S.peds = S.peds.filter(p => !p.cop); sfx.door(); persist(); draw(); },
      tea: () => { S.player.hearts = 3; sfx.pick(); draw(); },
    });
  };
  draw();
}
// The job in hand, to read again: what it is, what has been done, what to do now, and the briefing if you want it.
function openBrief() {
  const m = S.mission, def = m ? m.def : nextStory(), c = S.city;
  if (!def) { S.ui.panel('<h2>📋 No mission</h2><p>The case is closed. Every town and every year is open: go and meet the family, or look for the £ signs, the chequered flag and the pages of the Foundling File.</p><div class="foot"><button data-go="close">Close</button></div>', { close: () => S.ui.closePanel() }); return; }
  const esc = escapeText;
  let body;
  if (m) {
    const rows = def.steps.map((st, i) => i < m.i ? `<div class="row off" style="padding:4px 0"><span>✔ ${esc(st.text)}</span></div>`
      : i === m.i ? `<div class="row need" style="padding:6px 8px"><span>▶ <b>${esc(st.text)}</b><small>${esc(stepHelp(st))}</small></span></div>` : '').join('');
    const left = def.steps.length - m.i - 1;
    body = `<p>${esc(def.brief || '')}</p>${rows}${left > 0 ? `<p><small>${left === 1 ? 'One more part' : left + ' more parts'} after this.</small></p>` : ''}${S.step && S.step.timer != null ? `<p><small>The clock is stopped while you read this.</small></p>` : ''}`;
  } else {
    const here = isHere(def), t = S.story.towns.get(def.town), giver = def.giver.who === 'dot' ? (def.giver.at === 'phone' ? `the ${eraWords(def.year).phone}` : 'Dorothy at the lock-up') : def.giver.who === 'auto' ? '' : displayName(S.data.individuals.get(def.giver.who));
    body = `<p>${esc(def.brief || '')}</p><p><b>To start it:</b> ${here ? (giver ? `go to ${esc(giver)} (the yellow arrow) and press ${S.ui.touch ? 'GO' : 'E'}.` : 'it starts by itself.') : esc(def.town !== c.town.id ? `Buy a ticket to ${t.name} at ${c.lots.hub.name}` + (def.year !== c.year ? `, then set the dial to ${def.year}.` : '.') : `Set the dial to ${def.year} (${S.ui.touch ? '⏱' : 'T'}) and drive the Heirloom flat out.`)}</p>`;
  }
  S.ui.panel(`<h2>📋 ${esc(def.title)}</h2><p><small>${esc(def.act || '')} · ${esc(S.story.towns.get(def.town)?.name || c.town.name)}, ${def.year}${m ? ` · part ${m.i + 1} of ${def.steps.length}` : ' · not started'}</small></p>${body}<div class="foot"><button data-go="close">Back to it</button>${def.intro && def.intro.length ? '<button class="alt" data-go="again">Hear the briefing again</button>' : ''}${m && !def.fare ? '<button class="alt" data-go="quit">Give up this mission</button>' : ''}</div>`, {
    close: () => S.ui.closePanel(),
    again: async () => { const tok = S, was = S.busy; S.ui.closePanel(); S.busy = true; await runLines(def.intro); if (S === tok) S.busy = was; },
    quit: () => { S.ui.closePanel(); failMission('You gave it up.'); },
  });
}
// One line on how to do the kind of thing a step asks for.
function stepHelp(st) {
  const E = S.ui.touch ? 'GO' : 'E';
  return ({ goto: st.foot ? 'Follow the yellow arrow there, on foot.' : 'Follow the yellow arrow to the yellow ring.', talk: `Walk up to them and press ${E}.`, search: 'Each place marked ? on the map might be the one. Go to each and ask.',
    carry: st.gentle ? 'Stop on the yellow ring to load, then on the next to unload. Three hard knocks and it is over.' : 'Stop on the yellow ring to load, then on the next to unload.', collect: 'Drive or walk over each one. They are the yellow dots on the map.',
    race: 'Pass through each yellow ring in turn before the clock runs out.', chase: 'Catch the one with the red ring and bump into it until the bar above it is empty.', tail: 'Stay behind the one with the blue ring: not too close, not too far.',
    defend: 'Stay with the wagon with the green ring and shove every grey one off it.', catch: 'Get out and run after them. Shift runs.', travel: 'Tickets are sold at the airport or the quay. To change the year, set the dial (T) and drive flat out.',
    escape: 'Keep moving until the stars fade. A respray at the lock-up loses them at once.', frenzy: 'Ram every grey van you can find.' })[st.t] || '';
}
function openPause() {
  const k = (a, b) => `<p><kbd>${a}</kbd> ${b}</p>`;
  S.ui.panel(`<h2>A Battle in Time</h2><p>${escapeText(nextStory()?.brief || 'Free roam: every town, every year.')}</p>
    ${S.ui.touch ? '<p>Left thumb steers and walks. GO talks, gets in and out and starts jobs. CAR calls the Heirloom.</p>' : k('WASD / arrows', 'walk, drive') + k('E', 'talk, get in or out, start a job') + k('Space', 'handbrake: hold it into a corner to slide the back round') + k('T', 'time dial') + k('H', 'call the Heirloom (£10)') + k('B', 'read the mission again') + k('M', 'town map') + k('P', 'pedigree') }
    <p><b>The case so far</b> <small>${tally().text}</small></p>${fragsGot() || S.save.idx > S.story.missions.findIndex(m => m.id === 'blank-and-void') ? `<p>📄 <b>The Foundling File</b> ${fragsGot()} of ${S.story.frags.length} pages <small>${S.story.frags.map(f => (S.save.frags || []).includes(f.id) ? '✔' : `${escapeText(S.story.towns.get(f.town).name)} ${f.year}`).join(' · ')}</small></p>` : ''}${S.story.missions.map((m, i) => i < S.save.idx ? `<div class="row" style="padding:3px 0;border:0"><span>✔ ${escapeText(m.title)} <b style="color:#c8901a">${'★'.repeat((S.save.medals || {})[m.id] || 0)}</b><small>${escapeText(m.act)} · ${escapeText(S.story.towns.get(m.town).name)}, ${m.year}</small></span>${m.town === S.city.town.id && m.year === S.city.year && !S.mission && m.steps.some(x => x.t !== 'travel' && x.t !== 'talk') ? `<button class="alt" data-go="replay:${i}">Replay</button>` : ''}</div>` : i === S.save.idx ? `<div class="row need" style="padding:5px 8px"><span>▶ ${escapeText(m.title)}<small>${escapeText(m.act)} · ${escapeText(S.story.towns.get(m.town).name)}, ${m.year}</small></span></div>` : '').join('')}${S.save.idx < S.story.missions.length - 1 ? `<p>…and ${S.story.missions.length - S.save.idx - 1} more to come.</p>` : ''}
    <div class="foot"><button data-go="close">Resume</button><button class="alt" data-go="easy">Timers: ${S.save.easy ? 'generous' : 'normal'}</button><button class="alt" data-go="music">Music: ${soundOn('music') ? 'on' : 'off'}</button><button class="alt" data-go="sfx">Sound effects: ${soundOn('sfx') ? 'on' : 'off'}</button><button class="alt" data-go="streets">Streets: ${realStreets() ? 'real (OpenStreetMap)' : 'made up'}</button>${realStreets() && S.city.source !== 'osm' && S.nets.get(S.city.town.id)?.source === 'osm' && !S.mission ? '<button class="alt" data-go="realnow">Switch to the real streets now</button>' : ''}<button class="alt" data-go="quit">Save and leave</button><button class="alt" data-go="reset">Restart the story</button></div>`, {
    close: () => S.ui.closePanel(),
    easy: () => { S.save.easy = !S.save.easy; persist(); openPause(); },
    music: () => { setSound('music', !soundOn('music')); openPause(); },
    sfx: () => { setSound('sfx', !soundOn('sfx')); if (soundOn('sfx')) sfx.pick(); openPause(); },
    realnow: () => { S.ui.closePanel(); enterTown(S.city.town, S.city.year, 'hub'); S.ui.toast(`The real streets of ${S.city.town.name}. © OpenStreetMap contributors`, 4200); },
    streets: () => { try { localStorage.setItem('a3d:realstreets', realStreets() ? '0' : '1'); } catch (e) { /* no storage */ } S.nets.clear(); S.streets.clear(); S.ui.closePanel(); S.ui.toast(realStreets() ? 'Real streets from OpenStreetMap, from the next town you enter. Only the town\'s name is sent.' : 'Made-up streets from the next town you enter. Nothing is looked up.', 6000); if (realStreets()) fetchStreets(S.city.town); },
    replay: i => { S.ui.closePanel(); startMission(S.story.missions[+i]); },
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

// ---------------- A test driver ----------------
// Plays missions through the same controls a person has, so that tests/story-bot.py can measure how long
// each one takes, how tight its clock is and where it goes wrong. Switched on with S.debug.bot(true).
function botPath(from, to) {
  const c = S.city, pts = [];
  // off the road (a yard, a court): get back onto it first
  if (c.at(Math.floor(from.x / T), Math.floor(from.y / T)) !== G.ROAD) { const r = roadNear(from.x, from.y); if (dist(r, from) > 1.2 * T) pts.push({ x: r.x, y: r.y }); }
  const a = c.nearNode(from.x, from.y), b = c.nearNode(to.x, to.y), rt = c.route(a, b);
  // do not double back to a junction that is behind us on the way
  let s0 = 0;
  if (rt.length > 1 && dist(c.nodes[rt[1]], from) < dist(c.nodes[rt[0]], c.nodes[rt[1]]) + 0.5 * T) s0 = 1;
  for (let i = Math.max(1, s0); i < rt.length; i++) pts.push(lanePt(rt[i - 1], rt[i], -1));
  pts.push({ x: to.x, y: to.y });
  return pts;
}
function botGoal() {
  const st = S.step, P = S.player, pp = P.vehicle || P;
  if (!st) return null;
  const s = st.step;
  if (s.t === 'defend') {
    let best = null, bd = 1e9;
    for (const v of S.vehicles) if (v.ai === 'hunt' && v.prey === st.convoy) { const d = dist(v, st.convoy); if (d < bd) { bd = d; best = v; } }
    return best ? { o: best, ram: true } : { o: st.convoy, keep: 4.5 };
  }
  if (s.t === 'escape') { const B = S.bot; if (B.esc && S.t < B.esc.until && dist(B.esc.o, pp) > 5 * T) return B.esc; const c = S.city; let far = null, fd = -1; for (let i = 0; i < c.nodes.length; i += 9) { const n = c.nodes[i]; if (n.dead || dist(n, pp) < 9 * T || dist(n, pp) > 50 * T) continue; let d = 1e9; for (const v of S.vehicles) if (v.ai === 'cop') d = Math.min(d, dist(v, n)); for (const q of S.peds) if (q.cop) d = Math.min(d, dist(q, n)); d = Math.min(d, 60 * T) - dist(n, pp) * 0.2; for (const v of S.vehicles) if (v.ai === 'cop' && dist(v, pp) < 30 * T && (n.x - pp.x) * (v.x - pp.x) + (n.y - pp.y) * (v.y - pp.y) > 0.5 * dist(n, pp) * dist(v, pp)) d -= 30 * T; if (d > fd) { fd = d; far = n; } } B.esc = { o: far, until: S.t + 8 }; return B.esc; }
  if (s.t === 'frenzy') { let best = null, bd = 1e9; for (const v of S.vehicles) if (v.ai === 'hunt') { const d = dist(v, pp); if (d < bd) { bd = d; best = v; } } return best ? { o: best, ram: true } : null; }
  const t = stepTarget();
  if (!t) return null;
  if (s.t === 'chase') return { o: t, ram: true };
  if (s.t === 'tail') return { o: t, keep: 9 };
  if (s.t === 'carry' || s.t === 'talk') return { o: t, stop: true };
  if (s.t === 'collect') return { o: t, direct: 9 };
  return { o: t };
}
// On foot the test driver finds its way round buildings: a flood from the goal, redone when the goal moves.
function botWalk(from, to) {
  const c = S.city, B = S.bot, W = c.W, H = c.H, gx = Math.floor(to.x / T), gy = Math.floor(to.y / T), key = gx + gy * W;
  if (dist(from, to) < 1.6 * T) return to;
  if (B.fkey !== key || !(B.fUntil > S.t)) {
    const d = B.fmap = new Int16Array(W * H).fill(-1), q = [key];
    d[key] = 0;
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k - x) / W; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, nk = nx + ny * W; if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[nk] >= 0 || c.solid(nx, ny)) continue; d[nk] = d[k] + 1; q.push(nk); } }
    B.fkey = key; B.fUntil = S.t + 3;
  }
  const d = B.fmap, x = Math.floor(from.x / T), y = Math.floor(from.y / T);
  let best = null, bd = d[x + y * W] < 0 ? 1e9 : d[x + y * W];
  for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const v = d[nx + ny * W]; if (v >= 0 && v < bd) { bd = v; best = { x: (nx + 0.5) * T, y: (ny + 0.5) * T }; } }
  return best || to;
}
function botDrive(v, dt) {
  const B = S.bot, g = botGoal(), st = statsOf(v);
  if (!g || !g.o) return { thr: 0, steer: 0, brake: true };
  const goal = g.o, dGoal = dist(v, goal);
  B.replan -= dt;
  if (B.replan <= 0 || !B.path || !B.at || dist(goal, B.at) > 3 * T) { B.path = botPath(v, g.keep && goal.pn != null ? S.city.nodes[goal.pn] : goal); if (g.keep && goal.pn != null) B.path.push({ x: goal.x, y: goal.y }); B.at = { x: goal.x, y: goal.y }; B.replan = 1.5; }   // when following, come up from behind
  while (B.path.length > 1 && dist(v, B.path[0]) < 1.7 * T) B.path.shift();
  const direct = dGoal < (g.direct || (g.ram ? 7 : 3.5)) * T;
  const wp = direct ? goal : B.path[0];
  const da = angDiff(Math.atan2(wp.y - v.y, wp.x - v.x), v.ang), dW = dist(v, wp);
  let vmax = st.max * T;
  if (!direct && B.path.length > 1 && dW < 6 * T) {
    // only slow for a corner, not for a junction it is going straight across
    const nx = B.path[1], turn = Math.abs(angDiff(Math.atan2(nx.y - wp.y, nx.x - wp.x), Math.atan2(wp.y - v.y, wp.x - v.x)));
    if (turn > 0.5) vmax = Math.min(vmax, (4 + dW / T * 1.3) * T);
  }
  if (g.stop && dGoal < 8 * T) vmax = Math.min(vmax, Math.max(1.4 * T, (dGoal - 1.6 * T) * 2.2));
  if (g.keep) { if (dGoal < g.keep * T) vmax = 0; else vmax = Math.min(vmax, (dGoal / T - g.keep) * 1.6 * T + Math.abs(goal.speed || 0)); if (dGoal < (g.keep - 2) * T && v.speed > T) return { thr: -1, steer: 0, brake: true }; }
  if (Math.abs(da) > 0.8) vmax = Math.min(vmax, 3.2 * T);
  if (S.step && S.step.step.gentle && S.step.loaded) vmax = Math.min(vmax, 7.5 * T);  // it drives a fragile load as a person would
  { const fx = Math.cos(v.ang), fy = Math.sin(v.ang), reach = 1.6 * T + Math.abs(v.speed) * 0.5;
    for (const p of S.peds) { if (p.runner || p.npc || p.stepPed || p.cop || p.down > 0) continue; const rx = p.x - v.x, ry = p.y - v.y, f = rx * fx + ry * fy; if (f > 0 && f < reach + 2 * T && Math.abs(-rx * fy + ry * fx) < 0.9 * T) { vmax = Math.min(vmax, 9 * T); break; } } }
  let thr = v.speed < vmax ? 1 : v.speed > vmax * 1.15 + 8 ? -1 : 0;
  if (g.stop && dGoal < 2.4 * T) return { thr: v.speed > 0.4 * VS * T ? -1 : 0, steer: 0, brake: Math.abs(v.speed) < VS * T };
  if (Math.abs(v.speed) < 0.6 * VS * T && thr > 0) B.stuck += dt; else B.stuck = Math.max(0, B.stuck - dt * 2);
  if (B.stuck > 1.1) { B.stuck = 0; B.rev = 0.9; B.revSteer = da > 0 ? -1 : 1; B.unstick++; }
  if (B.rev > 0) { B.rev -= dt; return { thr: -1, steer: B.revSteer, brake: false }; }
  return { thr, steer: clamp(da * 2.6, -1, 1), brake: false };
}

// ---------------- Player ----------------
function enterVehicle(v) {
  const P = S.player;
  if (v.ai === 'flee' || v.ai === 'cop' || v.dead || v.type === 'tram') return;
  if (v.ai === 'traffic') {
    const sp = freeSpotNear(v.x - Math.sin(v.ang) * 26, v.y + Math.cos(v.ang) * 26, 0);
    S.peds.push({ x: sp.x, y: sp.y, dir: 0, ang: 0, sp: 2.2 * T, walk: 0, look: strangerLook(Math.random, S.city.year), down: 0, cross: 0 });
    float(sp.x, sp.y - 20, `Oi! That's my ${eraWords(S.city.year).ride}!`); offence(0.34);
  }
  v.ai = null; v.parked = false; v.wp = null;
  P.vehicle = v; sfx.door();
  // a cab asks before it puts you to work
  if (VEHICLES[v.type].cab && !S.mission && !S.busy) S.ui.panel(`<h2>🚕 For hire?</h2><p>This ${escapeText(VEHICLES[v.type].name)} can take fares: get each passenger where they want to go, quickly, for cash and a bonus for every fare in a row. Get out to go off duty.</p><div class="foot"><button data-go="fares">Take fares</button><button class="alt" data-go="close">Just drive</button></div>`, {
    fares: () => { S.ui.closePanel(); startFare(0); },
    close: () => S.ui.closePanel(),
  });
  if (!(S.mission && S.mission.def.id === 'final-notice')) hintOnce('drive', S.ui.touch ? 'Push the stick the way you want to go. BRAKE is the handbrake. GO gets you out.' : 'W accelerates, S brakes and reverses, A and D steer. Space is the handbrake. E gets you out.');
}
function startFare(streak) {
  const c = S.city;
  const def = oddJob(c.town, c.year, hashString(c.town.id + c.year + 'fare') + (S.save.oddN = (S.save.oddN || 0) + 1), true);
  def.streak = streak; def.title = streak ? '' : 'For Hire'; def.act = 'Side job';
  startMission(def);
}
function leaveVehicle(force) {
  const P = S.player, v = P.vehicle; if (!v) return;
  if (!force && Math.abs(v.speed) > 2.5 * VS * T) { S.ui.toast('Slow down first.', 1200); return; }
  if (S.mission?.def.fare) { const n = S.mission.def.streak; failMission('', true); S.ui.toast(n ? `Off duty after ${n} fare${n === 1 ? '' : 's'}.` : 'Off duty.'); }
  const side = VEHICLES[v.type].wid / 2 + 15;
  for (const s of [1, -1]) {
    const x = v.x - Math.sin(v.ang) * side * s, y = v.y + Math.cos(v.ang) * side * s;
    if (!circleSolid(x, y, 9)) { P.x = x; P.y = y; P.vehicle = null; sfx.door(); return; }
  }
  const sp = freeSpotNear(v.x, v.y, 1); P.x = sp.x; P.y = sp.y; P.vehicle = null;
}
function findNear() {
  const P = S.player, pv = P.vehicle, pp = pv || P, c = S.city, slow = !pv || Math.abs(pv.speed) < 2 * VS * T;
  const within = (o, a, b) => Math.hypot(o.x - pp.x, o.y - pp.y) < (pv ? b : a) * T;
  // the nearest vehicle you could get into
  let car = null, carD = 1.9 * T;
  if (!pv) for (const v of S.vehicles) { const d = dist(v, P) - VEHICLES[v.type].len * 0.25; if (d < carD && v.ai !== 'flee' && v.ai !== 'cop' && !v.dead && v.type !== 'tram') { carD = d; car = v; } }
  const getIn = car && { label: car === S.heirloom ? 'Get in the Heirloom' : `Borrow the ${VEHICLES[car.type].name}`, go: () => enterVehicle(car) };
  if (!S.mission && slow) {
    for (const p of S.peds) if (p.npc && within(p, 1.8, 3)) {
      const next = nextStory();
      if (p.giver && isHere(next)) return { label: p.phone ? 'Read the note' : `Talk to ${p.name.split(' ')[0]}`, go: () => startMission(next) };
      if (p.favour) return { label: `Help ${p.name.split(' ')[0]}`, go: () => startMission(p.favour) };
      if (getIn && carD < dist(p, P) - 10) continue; // standing at the car door, not talking to them
      if (!pv && p.who !== 'dot') return { label: `Chat with ${p.name.split(' ')[0]}`, go: () => chat(p.who) };
      if (!pv && p.who === 'dot') return { label: 'Dorothy and her workbench', go: () => openWorkshop(dotLine()) };
    }
    if (within(c.lots.market, 1.8, 3)) return { label: 'Odd jobs board (£)', go: () => startMission(oddJob(c.town, c.year, hashString(c.town.id + c.year) + (S.save.oddN = (S.save.oddN || 0) + 1))) };
  }
  if (!S.mission && slow && !pv) for (const p of S.peds) if (p.rid && !(p.down > 0) && dist(p, P) < 1.5 * T && !(getIn && carD < dist(p, P) - 10)) return { label: `Chat with ${p.name.split(' ')[0]}`, go: () => chatResident(p) };
  // side jobs on the road wait to be asked for
  if (pv && !S.mission && slow) for (const it of S.items) {
    if (it.frenzy && dist(it, pp) < 2.2 * T) return { label: 'Start the Smash-Up (60 seconds)', go: () => { it.gone = true; startSide('frenzy'); } };
    if (it.cup && pv === S.heirloom && dist(it, pp) < 2.2 * T) return { label: 'Start the Heirloom Cup', go: () => { it.gone = true; startSide('cup'); } };
  }
  if (slow && within(c.lots.hub, 2, 3.2) && !(S.step && S.step.loaded)) return { label: c.air ? 'Departures ✈' : 'Tickets ⚓', go: openDepartures };
  if (slow && within(c.lots.garage, 1.8, 3) && !(S.step && S.step.loaded) && !(getIn && carD < dist(c.lots.garage, P) - 10)) return { label: 'Workbench 🔧', go: () => openWorkshop() };
  if (!pv) return getIn || null;
  return slow ? { label: '', go: () => leaveVehicle() } : null;
}
// Anybody from the file you meet in the street will tell you their life so far, and no further.
async function chatResident(p) {
  const tok = S, indi = S.data.individuals.get(p.rid);
  if (!indi) return;
  S.busy = true;
  const kin = kinOf(S.data, S.tree, p.rid), L = p.look;
  const person = S.tree.people.get(p.rid) || { id: p.rid, indi, traits: { place: resolvePlace((indi.events.find(e => e.tag === 'BIRT' && e.place) || {}).place || ''), edu: 1, dressYear: S.city.year, estBirthYear: S.city.year - 30 } };
  const look = { female: L.female, skin: L.skin, skinShade: L.skin, hair: L.hair, longHair: !!L.female, top: L.shawl || L.top, collar: null, hat: L.hat ? { kind: L.female ? 'bonnet' : 'flat', color: L.hat } : null };
  for (const text of lifeSoFar(S.data, p.rid, S.city.year)) {
    if (S !== tok) return;
    await S.ui.say({ who: p.name, sub: kin, text: voiceLine(person, text), portrait: (ctx, f) => drawPortrait(ctx, look, 96, f) });
  }
  if (S === tok) S.busy = false;
}
async function chat(who) {
  const tok = S, p = S.tree.people.get(who); if (!p) return;
  S.busy = true;
  const pages = buildDialogue(p, { data: S.data, tree: S.tree }).pages, sp = speaker(who);
  for (const pg of pages.slice(0, 7)) { if (S !== tok) return; await S.ui.say({ who: sp.who, sub: sp.sub, text: pg, portrait: (ctx, f) => drawPortrait(ctx, sp.look, 96, f) }); }
  if (S === tok) S.busy = false;
}
function dotLine() {
  const n = nextStory();
  return 'Dorothy: "' + (n ? `${n.brief} ${isHere(n) ? '' : `That's ${S.story.towns.get(n.town).name}, ${n.year}.`} And mind the paintwork.` : `Nothing left to prove, dear. Go and visit them. Take your time; you've got all of it.`) + '"';
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
    if (S.bot) { const g = botGoal(); kx = ky = 0; if (g && g.o) { const w = botWalk(P, g.o), a = Math.atan2(w.y - P.y, w.x - P.x); kx = Math.cos(a); ky = Math.sin(a); if (S.bot.side > 0) { S.bot.side -= dt; [kx, ky] = [-ky, kx]; } } }
    const m = Math.hypot(kx, ky);
    P.moving = m > 0.1;
    if (P.moving) {
      const sp = (k.has('ShiftLeft') || k.has('ShiftRight') || (inp.stick.active && m > 0.9) || S.bot ? 6.4 : 5.0) * T * Math.min(1, m);
      moveWalker(P, kx / m * sp * dt, ky / m * sp * dt);
      P.ang = Math.atan2(ky, kx); P.walk += dt * 13;
    }
    // traffic can knock you over
    if (P.invuln <= 0) for (const o of S.vehicles) if (o.ai && Math.abs(o.speed) > 3 * VS * T && nearCar(o, P, 4)) {
      P.hearts--; P.down = 1.2; P.invuln = 2.5; sfx.bump(); const a = Math.atan2(P.y - o.y, P.x - o.x); moveWalker(P, Math.cos(a) * 30, Math.sin(a) * 30);
      if (P.hearts <= 0) flattened();
      break;
    }
    return;
  }
  let ctrl;
  if (S.bot) ctrl = botDrive(v, dt);
  else if (inp.stick.active) {
    const want = Math.atan2(inp.stick.y, inp.stick.x), da = angDiff(want, v.ang), mag = Math.hypot(inp.stick.x, inp.stick.y);
    const rev = Math.abs(da) > 2.3 && v.speed < 2 * VS * T;
    ctrl = { thr: rev ? -mag : mag * (Math.abs(da) > 1.2 ? 0.5 : 1), steer: rev ? clamp(-angDiff(want + Math.PI, v.ang) * 2.5, -1, 1) * -1 : clamp(da * 2.4, -1, 1), hand: inp.brake };
  } else ctrl = { thr: -ky, steer: kx, hand: k.has('Space') || inp.brake };
  driveVehicle(v, ctrl, dt);
  P.x = v.x; P.y = v.y; P.ang = v.ang;
  // knock people over
  // people jump clear of anything they can see coming; flat out, they cannot
  if (Math.abs(v.speed) > 1.5 * VS * T && Math.abs(v.speed) < (v === S.heirloom && up('horn') ? 15 : 12.5) * VS * T) {
    const fx = Math.cos(v.ang) * Math.sign(v.speed), fy = Math.sin(v.ang) * Math.sign(v.speed), reach = (2.2 * T + Math.abs(v.speed) * 0.3) * (v === S.heirloom && up('horn') ? 2 : 1);
    for (const p of S.peds) {
      if (p.npc || p.stepPed || p.cop || p.down > 0) continue;
      const rx = p.x - v.x, ry = p.y - v.y, f = rx * fx + ry * fy, l = -rx * fy + ry * fx;
      if (f < 0 || f > reach || Math.abs(l) > 0.85 * T) continue;
      const sd = l >= 0 ? 1 : -1;
      moveWalker(p, -fy * sd * 7 * T * dt, fx * sd * 7 * T * dt); p.walk += dt * 20;
      if (!(p.yelp > S.t)) { p.yelp = S.t + 4; if (Math.random() < 0.4) float(p.x, p.y - 22, quip(), '#fff'); }
    }
  }
  if (Math.abs(v.speed) > 2.4 * VS * T) for (const p of S.peds) if (!p.npc && (!p.stepPed || p.runner || p.vandal) && !(p.down > 0) && nearCar(v, p, 5)) knockDown(p, v);
  // the Parish Engine
  if (v === S.heirloom) {
    const st = statsOf(v), armed = S.dial != null && S.dial !== S.city.year;
    if (armed && Math.abs(v.speed) > st.max * T * (0.84 - 0.05 * up('wind'))) v.charge = Math.min(1, v.charge + dt / (2.0 - 0.4 * up('wind'))); else v.charge = Math.max(0, v.charge - dt / 1.7);
    if (v.charge > 0.12) {
      // the tyres catch as the Engine winds up
      const bx = -Math.cos(v.ang) * st.len * 0.36, by = -Math.sin(v.ang) * st.len * 0.36, sx = -Math.sin(v.ang) * st.wid * 0.38, sy = Math.cos(v.ang) * st.wid * 0.38;
      for (const sg of [1, -1]) if (Math.random() < 0.35 + v.charge * 0.65) S.flames.push({ x: v.x + bx + sx * sg + (Math.random() - 0.5) * 5, y: v.y + by + sy * sg + (Math.random() - 0.5) * 5, born: S.t, life: 0.35 + v.charge * 0.9, r: 4 + v.charge * 6 });
      if ((S.windT = (S.windT || 0) - dt) <= 0) { S.windT = 0.11; sfx.wind(v.charge); }
    }
    if (v.charge >= 1) {
      const cost = inkFor(S.city.year, S.dial);
      v.charge = 0;
      if (S.save.cash < cost) { S.ui.toast(`Not enough ink: that jump costs £${cost}. Odd jobs pay (look for £ in the market place).`, 4200); S.dial = null; }
      else { S.save.cash -= cost; const y = S.dial; S.dial = null; spark(v.x, v.y, 30, '#a8ecff'); travel(S.city.town, y, 'jump'); badge('jump'); }
    }
  }
}

// ---------------- Frame ----------------
function handleQueue() {
  const ui = S.ui, q = ui.input.queue;
  while (q.length) {
    const act = q.shift();
    if (S.cut && act === 'pause') { S.cut.skip = true; ui._advance?.('action'); ui._advance?.('action'); continue; }   // Esc skips the opening
    if (ui.dialogOpen) { if (act === 'action' || act === 'space' || /^opt/.test(act)) ui._advance?.(act); continue; }
    if (S.cut) continue;
    if (ui.panelOpen) { if (act === 'pause' || act === 'dial' || act === 'pedigree' || act === 'map' || act === 'brief') ui._panelClose?.(); continue; }
    if (S.busy) continue;
    if (act === 'action') { const r = S.retry; if ((!S.near || !S.near.label) && S.ui.touch && r && !S.mission && S.t < r.until && r.town === S.city.town.id && r.year === S.city.year) { S.retry = null; startMission(r.def, r); } else S.near?.go(); }
    else if (act === 'dial') openDial();
    else if (act === 'pedigree') openPedigree();
    else if (act === 'brief') openBrief();
    else if (act === 'pause') openPause();
    else if (act === 'retry') { const r = S.retry; if (r && !S.mission && S.t < r.until && r.town === S.city.town.id && r.year === S.city.year) { S.retry = null; startMission(r.def, r); } }
    else if (act === 'map') openMap();
    else if (act === 'call') callHeirloom();
  }
}
function update(dt) {
  const P = S.player, c = S.city;
  S.t += dt;
  if (S.transit) return;
  // a story mission that starts itself
  const next = nextStory();
  if (!S.mission && !S.busy && S.save.idx === 0 && !S.save.seenCut && isHere(next) && !S.bot && cutsOn()) { S.save.seenCut = 1; openingScene(); return; }
  // a new part of the story starts the moment you arrive in its town and year
  if (!S.mission && !S.busy && next?.cutIn && isHere(next) && !S.bot && cutsOn() && !cutSeen('in:' + next.id) && S.t > (S.failT || -9) + 1.5) { playCut(next.cutIn, 'in:' + next.id); return; }
  if (!S.mission && !S.busy && next && next.giver.who === 'auto' && isHere(next) && S.t > (S.failT || -9) + 3.5) { const r = S.retry && S.retry.def === next ? S.retry : undefined; S.retry = null; startMission(next, r); return; }
  if (S.bot && S.step && !S.busy) {
    // the test driver gets in and out of the car by itself, and side-steps when it walks into a wall
    const B0 = S.bot, g0 = botGoal(), dg = g0 && g0.o ? dist(P.vehicle || P, g0.o) : 1e9, slowStep = ['collect', 'search', 'goto', 'race'].includes(S.step.step.t);
    if (P.vehicle && slowStep && dg < 7 * T) { B0.near = (B0.near || 0) + dt; if (B0.near > 5) B0.walk = true; } else if (P.vehicle) B0.near = 0;
    if (B0.walk && (dg > 9 * T || !slowStep)) { B0.walk = false; B0.near = 0; }
    // going nowhere for a quarter of a minute: do what a person would, and call the Heirloom back onto the road
    if (P.vehicle && !['tail', 'defend'].includes(S.step.step.t)) { B0.wt = (B0.wt || 0) + dt; if (B0.wt > 14) { if (B0.wp && Math.hypot(P.vehicle.x - B0.wp.x, P.vehicle.y - B0.wp.y) < 3 * T && dg > 4 * T) { const v = P.vehicle; parkHeirloom(v.x, v.y); if (v !== S.heirloom) { const r = roadNear(v.x, v.y); v.x = r.x; v.y = r.y; } P.x = v.x; P.y = v.y; B0.unstick += 5; B0.path = null; } B0.wp = { x: P.vehicle.x, y: P.vehicle.y }; B0.wt = 0; } }
    const foot = S.step.step.t === 'catch' || B0.walk;
    if (foot && P.vehicle) { P.vehicle.speed = 0; leaveVehicle(true); }
    else if (!foot && !P.vehicle) { P.x = S.heirloom.x; P.y = S.heirloom.y; enterVehicle(S.heirloom); }
    if (!P.vehicle) { const B = S.bot; B.ft = (B.ft || 0) + dt; if (B.ft > 0.5) { if (B.fp && Math.hypot(P.x - B.fp.x, P.y - B.fp.y) < 0.6 * T) B.side = 0.45; B.fp = { x: P.x, y: P.y }; B.ft = 0; } }
  }
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
  const vr = Math.hypot(S.view.w, S.view.h) / 2 / S.view.z;
  for (const v of S.vehicles) if (v.dead && v !== P.vehicle) { v.deadT = (v.deadT || 0) + dt; if ((v.wreck && v.deadT > 3) || (v.deadT > 12 && dist(v, pp) > vr)) v.gone = true; }
  S.vehicles = S.vehicles.filter(v => !v.gone && (v === S.heirloom || v === P.vehicle || v === S.step?.target || v === S.step?.convoy || v === S.step?.rival || v.convoy || v.keep || v.ai === 'cop' || v.ai === 'hunt' || dist(v, pp) < (v.ai ? 40 : 60) * T));
  S.peds = S.peds.filter(p => p.npc || p.stepPed || p.cop || dist(p, pp) < 34 * T);
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = 0.35; spawnTraffic(trafficCount(c.year)); if (S.peds.filter(p => !p.npc).length < (c.year < 1714 ? 10 : c.year < 1837 ? 14 : 22)) spawnWalker(false); }
  for (const f of S.floats) { f.t -= dt; f.y -= 14 * dt; }
  S.floats = S.floats.filter(f => f.t > 0);
  for (const s of S.sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  S.sparks = S.sparks.filter(s => s.t > 0);
  if (!P.vehicle) for (const p of S.peds) if (p.rid && !(p.down > 0) && dist(p, P) < 1.7 * T) {
    const met = S.save.met || (S.save.met = []);
    if (met.includes(p.rid)) continue;
    met.push(p.rid); float(p.x, p.y - 44, `Met ${p.name.split(' ')[0]}`, '#7be07b'); sfx.pick();
    if (S.save.idx >= S.story.missions.length && met.length % 3 === 0) { const q = SILAS[(met.length / 3) % SILAS.length]; setTimeout(() => S && S.ui.toast(`Silas, from the back seat: "${q}"`, 5200), 1400); }
    if (met.length % 10 === 0) { earn(50); S.ui.toast(`${met.length} of the family met. A reunion bonus: £50.`); }
    if (met.length >= 25) badge('reunion');
  }
  updateAmbush(dt);
  updateIncident(dt);
  S.clock = (S.clock + dt / 50) % 24;
  const roll = Math.floor(S.clock / 4);
  if (roll !== S.rainRoll) { S.rainRoll = roll; const wetness = { med: 0.07, stucco: 0.1, flatroof: 0.03, veranda: 0.12 }[c.town.house] ?? 0.3; S.rainT = 0; }   // clear skies: the rain was hard to see and no help to anybody
  S.rain += (S.rainT - S.rain) * Math.min(1, dt * 0.25);
  if (S.glitch > 0) S.glitch -= dt;
  updateCritters(dt);
  if (!P.vehicle) for (const gv of c.graves) if (gv.who && Math.hypot((gv.x + 0.5) * T - P.x, (gv.y + 0.5) * T - P.y) < 1.2 * T && !(S.save.graves || (S.save.graves = [])).includes(gv.who.id)) {
    S.save.graves.push(gv.who.id);
    if (S.save.graves.length >= 10) badge('respects');
    S.ui.toast(`Here lies ${gv.who.name}${gv.who.life ? ' (' + gv.who.life + ')' : ''}, ${kinOf(S.data, S.tree, gv.who.id)}.`, 5200);
    sfx.pick();
  }
  if (S.flash > 0) S.flash -= dt;
  if ((S.saveT = (S.saveT || 0) + dt) > 15) { S.saveT = 0; persist(); }
  // the phone box rings until you answer it
  if (S.step?.step.t === 'goto' && S.step.step.at === 'phone') { S.ringT -= dt; if (S.ringT <= 0) { S.ringT = 1.6; const l = c.lot('phone'); float(l.x, l.y - 18, c.year >= 1925 ? 'RING RING' : 'A NOTE FOR YOU', '#ffd84a'); if (c.year >= 1925 && dist(l, pp) < 12 * T) sfx.ring(); } }
  for (const it of S.items) if (it.photo && dist(it, pp) < 1.2 * T) {
    it.gone = true;
    (S.save.photos || (S.save.photos = [])).push(it.photo);
    const note = S.notes.length ? S.notes[(hashString(it.photo) >>> 0) % S.notes.length] : null, who = S.names.length ? S.names[(hashString(it.photo) >>> 0) % S.names.length] : null;
    S.ui.toast(note ? `A lost photograph. On the back: "${note.name}${note.life ? ' (' + note.life + ')' : ''}. ${note.text}"` : who ? `A lost photograph. On the back, in pencil: "${who.name}, ${c.town.name}, ${c.year}."` : `A lost photograph of a street in ${c.town.name} you almost recognise.`, 9000);
    earn(30);
    if (S.save.photos.length >= 9) badge('snaps');
  }
  for (const it of S.items) if (it.frag && !S.busy && !it.gone && dist(it, pp) < 1.3 * T) {
    it.gone = true;
    (S.save.frags || (S.save.frags = [])).push(it.frag);
    const n = fragsGot(), of = S.story.frags.length, tok = S;
    sfx.pick(); earn(50); persist();
    S.busy = true;
    if (P.vehicle) P.vehicle.speed *= 0.2;
    S.ui.say({ who: `The Foundling File · ${n} of ${of}`, sub: 'a page somebody tried to destroy', text: it.text, letter: true, portrait: ctx => drawPortraitExtras(ctx, 'letter', null, 96) }).then(() => {
      if (S !== tok) return;
      S.busy = false;
      if (n >= of) { badge('foundling'); S.ui.toast(S.save.idx >= S.story.missions.length ? 'That is the whole of his file. Dorothy will want to see it: the garage, present day.' : 'That is the whole of his file. Finish the case, then take it to Dorothy.', 7000); }
      else S.ui.toast(`${of - n} more page${of - n === 1 ? '' : 's'} of his file, somewhere in the other years you have been.`, 5000);
    });
  }
  for (const it of S.items) if (it.wait && dist(it, pp) > 4 * T) it.wait = false;
  // the Smash-Up and the Heirloom Cup only start when you ask (E or GO on the marker): see findNear
  if (!S.mission && !S.busy && P.vehicle) for (const it of S.items) if ((it.frenzy || (it.cup && P.vehicle === S.heirloom)) && dist(it, pp) < 2.2 * T) hintOnce(it.frenzy ? 'frenzymark' : 'cupflag', it.frenzy ? 'The pink marker is the Smash-Up: sixty seconds of ramming grey vans for cash. Stop on it and press ' + (S.ui.touch ? 'GO' : 'E') + ' if you fancy it.' : 'The chequered flag is the Heirloom Cup, a timed lap of the town. Stop on it and press ' + (S.ui.touch ? 'GO' : 'E') + ' to start.', 5200);
  if (S.items.some(i => i.gone)) S.items = S.items.filter(i => !i.gone);
  S.near = findNear();
  S.target = S.step ? stepTarget() : idleTarget();
}
function idleTarget() {
  const n = nextStory(); if (!n) return null;
  if (isHere(n)) return S.peds.find(p => p.npc && p.giver) || null;
  return travelTarget(n.town, n.year);
}
// The opening: who is doing this to your family, why, and who is on your side. Played once, in the town itself,
// with the camera in close, the lights down, and faces big enough to see what they think.
async function openingScene() {
  const tok = S, st = S.story, c = S.city, sur = st.surname, hero = st.hero, ben = st.benefactor || hero, clock0 = S.clock;
  const estate = ben === hero ? `the ${sur} estate` : `the estate of ${ben.name}`;
  const at = k => { const l = c.lot(k); return { x: l.x, y: l.y - 1.5 * T }; };
  S.busy = true; S.clock = 22.5;
  S.cut = { x: at('office').x, y: at('office').y, who: null, mood: '', side: 0, caption: `${c.town.name}. Tonight.`, t0: S.t };
  S.ui.root.classList.add('cut');
  const shot = async (where, who, mood, side, text, caption) => {
    if (S !== tok || !S.cut || S.cut.skip) return;
    Object.assign(S.cut, { ...(where ? at(where) : {}), who, mood, side, caption: caption || '' });
    await say(who, text);
  };
  await new Promise(r => setTimeout(r, 1400));
  await shot('office', 'note', '', 0, `The offices of Hargreaves & Lowe, Solicitors. The lights are on late.`, 'Hargreaves & Lowe, Solicitors');
  await shot('office', 'blank', 'grin', 0, `Another one, Mr Lowe. ${cap(estate)}. A fortune, and nobody has come forward to claim it.`);
  await shot('office', 'lowe', 'worried', 1, `But there are heirs, Mr Hargreaves. The ${sur} family. Hundreds of them, going back four hundred years. It is all written down in the parish registers.`);
  await shot('office', 'blank', 'angry', 0, `Then we take them OUT of the registers. One name at a time. One generation at a time. All the way back to the very first ${sur}.`);
  await shot('office', 'lowe', 'worried', 1, `If nobody was ever born... and nobody was ever married...`);
  await shot('office', 'blank', 'grin', 0, `...then there never was a ${sur} family. And the money comes to the only people left to ask for it. Us. Start the time engine, Mr Lowe. We are going to erase a family from history.`);
  await shot('garage', 'note', '', 0, `Across town, in a lock-up behind the pub, somebody has been listening.`, 'Meanwhile');
  await shot('garage', 'dot', 'angry', 0, `Not while I'm breathing, Silas Hargreaves.`);
  await shot('garage', 'dot', 'worried', 0, `I'm a ${sur} too, you see. From a good way further down the family tree than anybody alive today. If he rubs out that line, I am never born. Nor is anybody I love.`);
  await shot('garage', 'dot', 'set', 0, `He has a time machine. So have I: she's old, she's yellow, and she needs a driver. I'm too old to drive her. But I know who isn't.`);
  if (S === tok && S.cut && !S.cut.skip) { Object.assign(S.cut, { x: S.player.x, y: S.player.y, who: null, caption: `${hero.name}. That's you.` }); await say('note', `You are ${hero.first}. You have one very old car, one month, and four hundred years of family depending on you. Go back through time, one ancestor at a time, and prove every one of them existed before Hargreaves can rub them out.`); }
  if (S !== tok) return;
  S.cut = null; S.clock = clock0; S.ui.root.classList.remove('cut'); S.busy = false; S.failT = S.t - 3; persist();
  S.ui.banner('A BATTLE IN TIME', `Save the ${sur} family`, '#ffd84a', 3200);
}
// The scenes between the parts of the story, played the same way as the opening. cut = { caption, hour, shots }
// (see addCuts in storyplot.js). Once each; Esc skips; the test driver and the "no cut scenes" switch skip them.
const cutsOn = () => { try { return localStorage.getItem('a3d:nocut') !== '1'; } catch (e) { return true; } };
const cutSeen = key => (S.save.cuts || []).includes(key);
async function playCut(cut, key) {
  if (!cut || !cut.shots?.length || S.bot || !cutsOn() || (key && cutSeen(key))) return;
  if (key) (S.save.cuts || (S.save.cuts = [])).push(key);
  const tok = S, c = S.city, clock0 = S.clock, was = S.busy;
  const at = (k, of) => { if (k === 'you') { const p = S.player.vehicle || S.player; return { x: p.x, y: p.y }; } const l = c.lot(k, of || S.story.hero.id); return l ? { x: l.x, y: l.y - 1.5 * T } : { x: S.player.x, y: S.player.y }; };
  S.busy = true;
  if (S.player.vehicle) S.player.vehicle.speed = S.player.vehicle.vx = S.player.vehicle.vy = 0;
  if (cut.hour != null) S.clock = cut.hour;
  S.cut = { ...at(cut.shots[0].at, cut.shots[0].of), who: null, mood: '', side: 0, caption: cut.caption || '', t0: S.t };
  S.ui.root.classList.add('cut');
  await new Promise(r => setTimeout(r, 1100));
  for (const sh of cut.shots) {
    if (S !== tok || !S.cut || S.cut.skip) break;
    Object.assign(S.cut, { ...at(sh.at, sh.of), who: sh.who, mood: sh.mood || '', side: sh.side || 0, caption: sh.caption || '' });
    await say(sh.who, sh.text);
  }
  if (S !== tok) return;
  S.cut = null; S.clock = clock0; S.ui.root.classList.remove('cut'); S.busy = was;
  persist();
}
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
// Dorothy's driving lesson, a move at a time: what to press, and what she says when you have it.
const DRILLS = {
  speed: { name: 'flat out', keys: 'Hold W to put your foot down. Steer with A and D. Keep going until you are near top speed.', touch: 'Push the stick the way you want to go and hold it at the edge. Keep going until you are near top speed.', done: 'Flat out!', praise: 'Oh, she likes that. Now let\'s see you stop her.' },
  stop: { name: 'brake', keys: 'BRAKE: let go of W and hold S (or Space to stop dead). Stop completely before you hit anything.', touch: 'BRAKE: let go of the stick and hold BRAKE. Stop completely before you hit anything.', done: 'Stopped!', praise: 'Brake in a straight line, before the corner, never in it. My husband never learned.' },
  reverse: { name: 'reverse', keys: 'REVERSE: once you are stopped, keep holding S and she goes backwards. Back up a car\'s length.', touch: 'REVERSE: once you are stopped, pull the stick behind the car and she goes backwards. Back up a car\'s length.', done: 'Reversing!', praise: 'Good. That gets you out of any dead end in any century.' },
  slide: { name: 'handbrake slide', keys: 'SKID: get some speed up, steer hard with A or D, and hold SPACE. The back end swings out and leaves skid marks.', touch: 'SKID: get some speed up, turn hard, and hold BRAKE. The back end swings out and leaves skid marks.', done: 'Sliding!', praise: 'Ha! Space lets the back go. Use it to slide round corners without stopping.' },
  spin: { name: 'handbrake turn', keys: 'HANDBRAKE TURN: go fast, then hold SPACE and steer hard until you are facing back the way you came.', touch: 'HANDBRAKE TURN: go fast, then hold BRAKE and turn hard until you are facing back the way you came.', done: 'Spun round!', praise: 'That\'s how you lose a grey van in a narrow street. Right: you can drive. Off we go.' },
};
// The first mission is the lesson: one instruction at a time, kept on screen until it has been done.
function lesson() {
  const m = S.mission, P = S.player, touch = S.ui.touch;
  if (!m || m.def.id !== 'final-notice' || S.busy || S.cut) { if (S.lessonKey) { S.lessonKey = null; S.ui.toast('', 1); } return; }
  const near = S.near && S.near.label;
  let key = 'i' + m.i, tip = '';
  if (m.i === 0) tip = touch ? 'WALK: push the left stick. Follow the yellow arrow to the phone box.' : 'WALK: use W A S D or the arrow keys (hold Shift to run). Follow the yellow arrow to the phone box.';
  else if (m.i === 1 || m.i === 3) { key += near ? 'n' : ''; tip = near ? (touch ? 'TALK: tap GO.' : 'TALK: press E. E is how you talk to people, answer things and get in and out of cars.') : 'Walk right up to the yellow marker.'; }
  else if (m.i === 2) tip = touch ? 'MISSION: tap the clipboard at the top right at any time to read what you are doing. Now follow the arrow to the lock-up.' : 'MISSION: press B at any time to read what you are meant to be doing. Now follow the yellow arrow to the lock-up.';
  else if ((m.i === 4 || m.i === 5) && !P.vehicle) { key += 'f'; tip = touch ? 'GET IN: walk up to the yellow car and tap GO.' : 'GET IN: walk up to the yellow car and press E.'; }
  else if (m.i === 4 && S.step?.step.t === 'drill') { const id = S.step.step.drills[S.step.k]; key += 'd' + id; tip = `LESSON ${S.step.k + 1} OF ${S.step.step.drills.length}: ` + DRILLS[id][touch ? 'touch' : 'keys']; }
  else if (m.i === 5) { key += 'v'; tip = touch ? 'DRIVE: follow the yellow arrow. Let go to slow down; BRAKE slides the back round corners.' : 'DRIVE: follow the yellow arrow. S to brake before a corner, Space to slide round it.'; }
  else if (m.i === 6) { key += P.vehicle ? 'v' : 'f'; tip = P.vehicle ? 'CHASE: catch the grey van with the red ring and drive into it. Any touch counts. Empty the bar above it.' : 'Get back in the car: walk up to it and press ' + (touch ? 'GO.' : 'E.'); }
  if (S.lessonHold > S.t) return;   // let Dorothy's "well done" be read first
  if (key !== S.lessonKey) { S.lessonKey = key; S.ui.toast(tip, 600000); }
}
function hud() {
  lesson();
  const ui = S.ui, P = S.player, c = S.city, st = S.step, m = S.mission;
  ui.cash(S.save.cash);
  ui.stat(P.hearts, Math.floor(S.heat + 0.001));
  { const b = ui.root.querySelector('[data-act="dial"]'), lab = dialReady() ? '⏱ Dial' : '🔒 Dial'; if (b && b.textContent !== lab) b.textContent = lab; }
  const pq = P.vehicle || P, hh = Math.floor(S.clock), mm = Math.floor((S.clock % 1) * 6) * 10, street = c.streetAt(pq.x, pq.y);
  ui.where(S.townLabel, `${c.year} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${S.rain > 0.3 ? ' · rain' : ''} · ${street || ERA_NAMES[c.era]}${c.source === 'osm' ? ' · © OpenStreetMap' : ''}`);
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
    if (s.t === 'search') text += ` <b>${st.spots.filter(x => !x.seen).length === 1 ? 'one place left to try' : st.spots.filter(x => !x.seen).length + ' places to try'}</b>`;
    if (s.t === 'frenzy') text += ` <b>${st.k} off the road</b>`;
    if (s.t === 'drill') text = `Driving lesson: ${DRILLS[s.drills[Math.min(st.k, s.drills.length - 1)]].name} <b>${st.k}/${s.drills.length}</b>`;
    if (st.rival) { const dp = lotPt(s.t === 'goto' ? s.at : (st.toAlt || s.to)); text += ` <b style="color:#f08aa0">rival ${Math.round(dist(st.rival, dp) / T * 4)}m · you ${Math.round(dist(P.vehicle || P, dp) / T * 4)}m</b>`; }
    if (st.spillPt) text = 'Stop and pick it up!';
    if (s.t === 'tail') text += ` <b>${st.close ? 'too close! ' : st.far ? 'falling behind! ' : ''}${'!'.repeat(Math.ceil(st.sus * 5))}</b>`;
    if (s.t === 'defend' && st.convoy && !st.convoy.started) text = `Get to the cart (green ring): it sets off when you reach it`;
    if (s.t === 'defend' && st.convoy) text += ` <b>${'■'.repeat(Math.max(0, Math.ceil(st.convoy.hp)))}${'□'.repeat(Math.max(0, st.maxHp - Math.ceil(st.convoy.hp)))}</b>`;
    if (s.t === 'chase' && st.target) text += ` <b>${'■'.repeat(Math.max(0, Math.ceil(st.target.hp)))}${'□'.repeat(Math.max(0, st.maxHp - Math.ceil(st.target.hp)))}</b>`;
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
  const againText = S.retry && S.retry.i > 0 ? `try again from part ${S.retry.i + 1} of ${S.retry.def.steps.length}` : 'try again';
  const again = S.retry && !S.mission && S.t < S.retry.until && S.retry.town === c.town.id && S.retry.year === c.year;
  ui.hint(S.busy || ui.panelOpen || ui.dialogOpen ? '' : S.near && S.near.label ? (ui.touch ? 'GO: ' : 'E: ') + S.near.label + (again && !ui.touch ? '   ·   R: ' + againText : '') : again ? (ui.touch ? 'GO: ' : 'R: ') + againText : '');
  const h = S.heirloom;
  if (S.dial != null && S.dial !== c.year) ui.dial(`DIAL ${S.dial} · INK £${inkFor(c.year, S.dial)}<i><b style="width:${Math.round(h.charge * 100)}%"></b></i>`); else ui.dial('');
}

function render() {
  const ui = S.ui, g = ui.ctx, P = S.player, c = S.city;
  const { w, h, dpr } = ui.resize();
  const pp = P.vehicle || P, sp = P.vehicle ? Math.abs(P.vehicle.speed) / (15 * VS * T) : 0;
  const base = clamp(Math.min(w, h) / ((ui.touch ? 11.5 : 15.5) * T), 0.75 * dpr, 2.2 * dpr);
  const V = S.view;
  V.w = w; V.h = h;
  const zt = S.cut ? base * 1.55 : base * (1 - 0.3 * clamp(sp, 0, 1));
  // The camera eases after the car by the same amount per second at any frame rate (phones run at 60, 90 or 120),
  // and the shake is kept out of the camera itself so the ground and the cars never part company.
  const fdt = clamp(S.frameDt || 1 / 60, 1 / 240, 0.05), ease = k => 1 - Math.pow(1 - k, fdt * 60);
  V.z += (zt - V.z) * ease(0.06); if (!V.init) { V.z = zt; V.init = true; }
  const lead = P.vehicle ? 0.22 : 0;
  const tx = S.cut ? S.cut.x : pp.x + (P.vehicle ? P.vehicle.vx * lead : 0), ty = S.cut ? S.cut.y : pp.y + (P.vehicle ? P.vehicle.vy * lead : 0);
  if (V.x !== V.sx || V.y !== V.sy) { V.cx = V.x; V.cy = V.y; }   // somebody moved the camera on purpose (a new town, a warp)
  V.cx += (tx - V.cx) * ease(0.14); V.cy += (ty - V.cy) * ease(0.14);
  V.x = V.cx; V.y = V.cy;
  if (S.shake > 0.02) { V.x += (Math.random() - 0.5) * S.shake * 16; V.y += (Math.random() - 0.5) * S.shake * 16; S.shake *= Math.pow(0.86, fdt * 60); } else S.shake = 0;
  V.sx = V.x; V.sy = V.y;
  const z = V.z, t = S.t;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  drawGround(g, c, V);
  const world = () => { g.setTransform(z, 0, 0, z, w / 2 - V.x * z, h / 2 - V.y * z); };
  const at = (x, y, ang, fn) => { g.save(); g.translate(x, y); if (ang) g.rotate(ang); fn(); g.restore(); };
  world();
  if (S.skids.length) {
    g.lineCap = 'round'; g.lineWidth = 3.4;
    for (const k of S.skids) { const a = 0.34 * Math.max(0, 1 - (S.t - k.t) / 22); if (a <= 0 || Math.abs(k.x1 - V.x) * z > w || Math.abs(k.y1 - V.y) * z > h) continue; g.strokeStyle = `rgba(20,16,24,${a.toFixed(2)})`; g.beginPath(); g.moveTo(k.x1, k.y1); g.lineTo(k.x2, k.y2); g.stroke(); }
    if (S.t - S.skids[0].t > 22) S.skids.shift();
  }
  if (S.flames.length) {
    for (const f of S.flames) {
      const age = t - f.born; if (age < 0 || age > f.life) continue;
      const a = 1 - age / f.life, fl = 0.7 + 0.3 * Math.sin(t * 23 + f.x), up = age * 14;
      g.fillStyle = `rgba(255,96,24,${(a * 0.75).toFixed(2)})`; g.beginPath(); g.ellipse(f.x, f.y - up * 0.5, f.r * fl, f.r * fl * 1.25, 0, 0, 7); g.fill();
      g.fillStyle = `rgba(255,214,72,${a.toFixed(2)})`; g.beginPath(); g.ellipse(f.x, f.y - up * 0.3, f.r * fl * 0.55, f.r * fl * 0.75, 0, 0, 7); g.fill();
    }
    if (S.flames.length > 40 && S.flames[0].born + S.flames[0].life < t) S.flames = S.flames.filter(f => f.born + f.life > t);
    else if (S.flames.length <= 40 && S.flames.every(f => f.born + f.life < t)) S.flames = [];
  }
  // markers on the ground
  const tgt = S.target;
  if (tgt && !tgt.type) at(tgt.x, tgt.y, 0, () => drawMarker(g, t, tgt.kind && !tgt.name ? '#ffd84a' : '#ffd84a', tgt.npc ? 20 : S.step?.step.t === 'collect' ? 14 : 30));
  if (S.step?.step.t === 'race') { const s = S.step.step; for (let i = S.step.k + 1; i < s.stops.length; i++) { const l = lotPt(s.stops[i]); at(l.x, l.y, 0, () => { g.globalAlpha = 0.35; drawMarker(g, t + i, '#ffffff', 22); g.globalAlpha = 1; }); } }
  if (!S.mission) { at(c.lots.market.x, c.lots.market.y, 0, () => drawMarker(g, t, '#7be07b', 22, '£')); }
  if (S.step?.step.t === 'search') for (const sp of S.step.spots) if (!sp.seen && sp.pt !== tgt) at(sp.pt.x, sp.pt.y, 0, () => { g.globalAlpha = 0.5; drawMarker(g, t + 0.4, '#ffffff', 24, '?'); g.globalAlpha = 1; });
  if (S.step?.rival) { const v = S.step.rival; at(v.x, v.y, 0, () => drawMarker(g, t, '#f08aa0', 30)); }
  at(c.lots.hub.x, c.lots.hub.y, 0, () => drawMarker(g, t + 0.5, '#a8d8ff', 24, c.air ? '✈' : '⚓'));
  for (const it of S.items) at(it.x, it.y, 0, () => drawItem(g, it.kind, t, it.n));
  for (const k of S.critters) at(k.x, k.y, k.ang, () => drawCritter(g, k.kind, t, k.n, k.run > 0 || k.walk > 0));
  for (const p of S.peds) if (p.look) at(p.x, p.y, p.ang, () => drawPerson(g, p, t));
  for (const v of S.vehicles) {
    at(v.x, v.y, v.ang, () => { drawVehicle(g, v, t); });
    if (v.dead || (v.ai === 'flee' && v.hp <= 2)) at(v.x, v.y, 0, () => drawSmoke(g, t, v.dead ? 1 : 0.6));
  }
  if (!P.vehicle && !(P.invuln > 0 && Math.floor(t * 12) % 2)) at(P.x, P.y, P.ang, () => drawPerson(g, { look: P.look, walk: P.moving ? P.walk : 0, down: P.down > 0 ? 0.3 : 0 }, t));
  if (S.step?.target) { const v = S.step.target; at(v.x, v.y, 0, () => drawMarker(g, t, S.step.step.t === 'tail' ? '#8ab4ff' : '#ff5a4a', 34));
    if (S.step.step.t === 'chase' && S.step.maxHp) at(v.x, v.y, 0, () => { const w = 54, f = Math.max(0, v.hp) / S.step.maxHp; g.fillStyle = '#2d2438'; g.fillRect(-w / 2 - 2, -50, w + 4, 10); g.fillStyle = '#5a2020'; g.fillRect(-w / 2, -48, w, 6); g.fillStyle = f > 0.5 ? '#ff5a4a' : '#ffb04a'; g.fillRect(-w / 2, -48, w * f, 6); g.font = '700 11px "Fredoka", "Nunito", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#2d2438'; g.lineWidth = 3; g.strokeText('RAM IT', 0, -55); g.fillText('RAM IT', 0, -55); }); }
  if (S.step?.convoy) { const v = S.step.convoy; at(v.x, v.y, 0, () => drawMarker(g, t, '#7be07b', 38)); }
  for (const s of S.sparks) { g.fillStyle = s.col; g.globalAlpha = clamp(s.t * 3, 0, 1); g.fillRect(s.x - 2, s.y - 2, 4, 4); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const dark = darkness();
  drawTall(g, c, V, t, dark);
  // cloud shadows drifting over the town, fading out at speed (big blue-grey shapes sweeping past read as flicker)
  S.cloudA = (S.cloudA ?? 1) + ((1 - clamp(sp * 1.4, 0, 1)) - (S.cloudA ?? 1)) * Math.min(1, (S.frameDt || 0.016) * 1.5);
  if (dark < 0.3 && S.cloudA > 0.02) {
    g.fillStyle = `rgba(40,50,90,${(0.085 * (1 - dark / 0.3) * S.cloudA).toFixed(4)})`;
    for (let i = 0; i < 6; i++) {
      const wx = ((i * 977 + t * 22) % (c.wpx + 1400)) - 700, wy = ((i * 613) % c.hpx) + Math.sin(t * 0.05 + i) * 80;
      const sx = (wx - V.x) * z + w / 2, sy = (wy - V.y) * z + h / 2, rx = (260 + (i % 3) * 90) * z, ry = (120 + (i % 2) * 60) * z;
      if (sx < -rx * 1.6 || sx > w + rx * 1.6 || sy < -ry * 1.6 || sy > h + ry * 1.6) continue;
      g.beginPath(); g.ellipse(sx, sy, rx, ry, 0, 0, 7); g.ellipse(sx + rx * 0.7, sy + ry * 0.3, rx * 0.7, ry * 0.8, 0, 0, 7); g.ellipse(sx - rx * 0.6, sy + ry * 0.2, rx * 0.6, ry * 0.7, 0, 0, 7); g.fill();
    }
  }
  if (dark > 0.03) drawLight(g, w, h, V, dark);
  if (S.rain > 0.03) {
    g.strokeStyle = `rgba(205,220,240,${0.38 * S.rain})`; g.lineWidth = dpr; g.beginPath();
    for (let i = 0, n = Math.floor(120 * S.rain); i < n; i++) { const rx = Math.random() * w, ry = Math.random() * h; g.moveTo(rx, ry); g.lineTo(rx - 6 * dpr, ry + 17 * dpr); }
    g.stroke(); g.fillStyle = `rgba(90,110,140,${0.1 * S.rain})`; g.fillRect(0, 0, w, h);
  }
  // labels over everything
  world();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = (x, y, text, col = '#fff', size = 12) => { g.font = `700 ${size}px "Fredoka", "Nunito", sans-serif`; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); };
  for (const k in c.lots) { const l = c.lots[k]; if (k !== 'phone' && Math.abs(l.x - pp.x) < 11 * T && Math.abs(l.y - pp.y) < 8 * T) label(l.x, l.y - 4, l.name.replace(/^the /, '').replace(/^./, ch => ch.toUpperCase()), '#ffe9a8', 11); }
  for (const p of S.peds) {
    if (p.npc && p.giver && !S.mission) { const y = p.y - 34 - Math.abs(Math.sin(t * 3)) * 6; label(p.x, y, '!', '#ffd84a', 26); }
    else if (p.npc && p.favour && !S.mission) { const y = p.y - 34 - Math.abs(Math.sin(t * 3 + 1)) * 5; label(p.x, y, '?', '#7be07b', 24); }
    if (p.name && dist(p, pp) < (p.npc ? 6 : 2.6) * T && p.look) { label(p.x, p.y - 20, p.name, '#fff', 11); if (p.sub && dist(p, pp) < 2.6 * T) label(p.x, p.y - 32, p.sub, '#d8d2c0', 9); }
  }
  if (!P.vehicle) for (const gv of c.graves) if (gv.who && Math.hypot((gv.x + 0.5) * T - P.x, (gv.y + 0.5) * T - P.y) < 1.6 * T) { label((gv.x + 0.5) * T, gv.y * T - 6, gv.who.name, '#e8e4d8', 10); label((gv.x + 0.5) * T, gv.y * T + 5, gv.who.life, '#b8b4a8', 9); }
  for (const it of S.items) if (it.label && Math.abs(it.x - pp.x) < 14 * T && Math.abs(it.y - pp.y) < 10 * T) label(it.x, it.y - 18, it.label, '#ffe9a8', 11);
  for (const f of S.floats) { g.globalAlpha = clamp(f.t, 0, 1); label(f.x, f.y, f.text, f.col, 12); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  // The sat nav. Off screen: a big pulsing arrow at the edge, pointing the way, with the distance. On screen: a
  // bouncing pointer and a ring drawn over the buildings, so the place is never hidden behind a roof.
  if (tgt) {
    const sx = (tgt.x - V.x) * z + w / 2, sy = (tgt.y - V.y) * z + h / 2, m = 58 * dpr;
    const col = S.step?.step.t === 'chase' ? '#ff5a4a' : S.step?.step.t === 'defend' ? '#7be07b' : tgt.type ? '#8ab4ff' : '#ffd84a';
    const dtl = Math.round(Math.hypot(tgt.x - pp.x, tgt.y - pp.y) / T * 4) + 'm', pulse = 1 + 0.12 * Math.sin(t * 7);
    g.font = `800 ${13 * dpr}px "Fredoka", "Nunito", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const text = (s, x, y) => { g.lineWidth = 4 * dpr; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(s, x, y); g.fillStyle = '#fff'; g.fillText(s, x, y); };
    if (sx < m || sy < m || sx > w - m || sy > h - m) {
      const a = Math.atan2(sy - h / 2, sx - w / 2), r = Math.min((w / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const ax = w / 2 + Math.cos(a) * r, ay = h / 2 + Math.sin(a) * r, k = dpr * 1.7 * pulse;
      g.save(); g.translate(ax, ay);
      g.fillStyle = 'rgba(20,16,28,0.55)'; g.beginPath(); g.arc(0, 0, 24 * dpr, 0, 7); g.fill();
      g.rotate(a); g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr;
      g.beginPath(); g.moveTo(16 * k, 0); g.lineTo(-10 * k, -11 * k); g.lineTo(-4 * k, 0); g.lineTo(-10 * k, 11 * k); g.closePath(); g.stroke(); g.fill();
      g.restore();
      text(dtl, ax - Math.cos(a) * 40 * dpr, ay - Math.sin(a) * 40 * dpr);
    } else {
      const bob = Math.abs(Math.sin(t * 4)) * 10 * dpr, top = sy - 46 * dpr - bob;
      g.strokeStyle = col; g.lineWidth = 4 * dpr; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(sx, sy, 22 * dpr * pulse, 0, 7); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr;
      g.beginPath(); g.moveTo(sx, top + 18 * dpr); g.lineTo(sx - 14 * dpr, top); g.lineTo(sx - 5 * dpr, top); g.lineTo(sx - 5 * dpr, top - 12 * dpr); g.lineTo(sx + 5 * dpr, top - 12 * dpr); g.lineTo(sx + 5 * dpr, top); g.lineTo(sx + 14 * dpr, top); g.closePath(); g.stroke(); g.fill();
      if (Math.hypot(sx - w / 2, sy - h / 2) > 60 * dpr) text(dtl, sx, top - 24 * dpr);
    }
  }
  // the Engine winding up
  const ch = S.heirloom.charge;
  if (ch > 0.02) { const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7); gr.addColorStop(0, 'rgba(160,236,255,0)'); gr.addColorStop(1, `rgba(160,236,255,${ch * 0.75})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  if (S.flash > 0) { g.fillStyle = `rgba(200,240,255,${S.flash})`; g.fillRect(0, 0, w, h); }
  // Wanted: a police light at the edges only. (It used to wash the whole screen blue three times a second,
  // which looked like the picture flickering.)
  if (S.heat >= 1) {
    const on = Math.floor(t * 2.5) % 2, bw = 7 * dpr;
    g.fillStyle = on ? 'rgba(70,120,255,0.5)' : 'rgba(255,70,70,0.5)'; g.fillRect(0, 0, w, bw); g.fillRect(0, h - bw, w, bw);
  }
  // A paradox: a soft violet fade (no tearing the picture apart; that looked like a fault, not a story).
  if (S.glitch > 0) { g.fillStyle = `rgba(200,140,255,${(0.22 * Math.min(1, S.glitch)).toFixed(3)})`; g.fillRect(0, 0, w, h); }
  miniMap(pp, tgt);
  if (S.cut) drawCut(g, w, h, dpr);
  if (S.transit) drawTransit(g, w, h, dpr, S.frameDt || 0.016);
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
  for (const v of S.vehicles) if (v.ai === 'cop') dot(v, '#4a7aff', 3); else if (v.ai === 'hunt') dot(v, '#f08aa0', 3);
  for (const p of S.peds) if (p.cop) dot(p, '#4a7aff', 2.5); else if (p.favour && !S.mission) dot(p, '#7be07b', 3); else if (p.vandal) dot(p, '#f08aa0', 3.5);
  if (S.step?.rival) dot(S.step.rival, '#f08aa0', 4);
  if (S.step?.step.t === 'search') for (const sp of S.step.spots) if (!sp.seen) dot(sp.pt, '#fff', 3);
  for (const it of S.items) if (it.frag && S.save.idx > S.story.missions.findIndex(m => m.id === 'blank-and-void')) dot(it, '#f08aa0', 3 + Math.sin(S.t * 5));
  for (const it of S.items) if (it.frenzy || it.tok || it.cup) dot(it, it.frenzy ? '#f08aa0' : it.cup ? '#ffffff' : '#7be07b', 2.5);
  for (const i of S.items) if (i.step) dot(i, '#fff', 2);
  if (tgt) dot(tgt, S.step?.step.t === 'chase' ? '#ff5a4a' : tgt.type ? '#8ab4ff' : '#ffd84a', 4.5, '#fff');
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
    if (!s.ui.panelOpen && !s.ui.dialogOpen) { for (let k = 0; k < (s.speed || 1) && S === s && !s.ui.dialogOpen; k++) update(s.speed ? 1 / 30 : dt); } else s.t += dt * 0.0001;
    if (!S) return;
    const pv = s.player.vehicle, quiet = s.ui.panelOpen || s.ui.dialogOpen || s.busy || !!s.bot || document.hidden;
    engineNote(!!pv && !VEHICLES[pv.type].horse && !quiet, pv ? Math.min(1, Math.abs(pv.speed) / (VEHICLES[pv.type].max * T)) : 0, pv ? VEHICLES[pv.type].eng : 'car', pv ? pv.thr || 0 : 0);
    musicTick(s.transit ? music.tune : (s.step && (s.step.timer != null || ['chase', 'escape', 'defend', 'catch', 'frenzy'].includes(s.step.step.t))) || s.heat >= 1 ? 'chase' : 'roam', s.city.year);
    tyreSqueal(pv && !quiet && !VEHICLES[pv.type].horse ? clamp(((pv.slip || 0) - 2.2) / 5, 0, 1) : 0);
    if (pv && VEHICLES[pv.type].horse && !quiet && Math.abs(pv.speed) > T) { s.clop = (s.clop || 0) - dt * Math.abs(pv.speed) / T; if (s.clop <= 0) { s.clop = 1.6; beep(180 + Math.random() * 40, 0.03, 'triangle', 0.035); } }
    s.frameDt = dt;
    hud();
    render();
  } catch (e) {
    console.error(e.stack || e);
    s.err = (s.err || 0) + 1;
    if (s.err < 3) s.ui.toast('Something went wrong: ' + e.message, 6000);
  }
}
