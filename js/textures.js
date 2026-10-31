// Procedural 90s-shooter style pixel textures, drawn on canvases at boot. No image files needed.
import * as THREE from 'three';
import { seededRandom } from './ancestry.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(c, repeat = 1, smooth = false) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = smooth;
  if (smooth) t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const clamp = v => Math.max(0, Math.min(255, v));

function noisy(ctx, x, y, w, h, base, amount, rnd) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = (rnd() - 0.5) * amount;
    ctx.fillStyle = rgb(clamp(base[0] + n), clamp(base[1] + n), clamp(base[2] + n));
    ctx.fillRect(x + i, y + j, 1, 1);
  }
}

// Worn flagstone floor with cracks and grime.
export function floorTexture() {
  const c = canvas(64, 64), x = c.getContext('2d'), rnd = seededRandom(7);
  noisy(x, 0, 0, 64, 64, [92, 80, 66], 26, rnd);
  x.fillStyle = 'rgb(40,32,26)';
  for (let i = 0; i < 64; i += 32) { x.fillRect(0, i, 64, 2); x.fillRect(i, 0, 2, 64); }
  x.fillStyle = 'rgb(120,106,88)';
  for (let i = 0; i < 64; i += 32) { x.fillRect(0, i + 2, 64, 1); x.fillRect(i + 2, 0, 1, 64); }
  x.fillStyle = 'rgba(30,22,16,0.8)';
  let px = 10, py = 14;
  for (let i = 0; i < 14; i++) { x.fillRect(px, py, 1, 1); px += rnd() < 0.5 ? 1 : 0; py += 1; }
  px = 44; py = 40;
  for (let i = 0; i < 12; i++) { x.fillRect(px, py, 1, 1); px += 1; py += rnd() < 0.5 ? 1 : 0; }
  return c;
}

// Brown/red brick walls.
export function brickTexture() {
  const c = canvas(64, 64), x = c.getContext('2d'), rnd = seededRandom(11);
  noisy(x, 0, 0, 64, 64, [58, 34, 26], 14, rnd);
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 8 : 0;
    for (let col = -1; col < 4; col++) {
      const bx = col * 16 + off, by = row * 8;
      const tone = 100 + rnd() * 50;
      noisy(x, bx + 1, by + 1, 14, 6, [tone, tone * 0.45, tone * 0.32], 22, rnd);
      x.fillStyle = 'rgba(255,200,160,0.18)';
      x.fillRect(bx + 1, by + 1, 14, 1);
    }
  }
  return c;
}

// Grey metal tech panel for pillars.
export function techTexture() {
  const c = canvas(32, 64), x = c.getContext('2d'), rnd = seededRandom(5);
  noisy(x, 0, 0, 32, 64, [96, 96, 104], 18, rnd);
  x.fillStyle = 'rgb(50,50,58)';
  x.fillRect(0, 0, 32, 2); x.fillRect(0, 31, 32, 2); x.fillRect(0, 62, 32, 2);
  x.fillRect(0, 0, 2, 64); x.fillRect(30, 0, 2, 64);
  x.fillStyle = 'rgb(150,150,160)';
  for (const [a, b] of [[5, 6], [26, 6], [5, 26], [26, 26], [5, 38], [26, 38], [5, 57], [26, 57]]) x.fillRect(a, b, 2, 2);
  x.fillStyle = 'rgb(255,190,40)';
  x.fillRect(10, 12, 12, 3);
  x.fillStyle = 'rgb(200,30,20)';
  x.fillRect(10, 44, 12, 3);
  return c;
}

// Wrap-around hellish sunset sky with jagged mountains.
export function skyTexture() {
  const c = canvas(512, 128), x = c.getContext('2d'), rnd = seededRandom(3);
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#1a0606'); g.addColorStop(0.45, '#5a1408'); g.addColorStop(0.8, '#b8460c'); g.addColorStop(1, '#f0a020');
  x.fillStyle = g; x.fillRect(0, 0, 512, 128);
  // banded clouds
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(${150 + rnd() * 80},${40 + rnd() * 40},20,${0.15 + rnd() * 0.2})`;
    x.fillRect(rnd() * 512, 20 + rnd() * 60, 20 + rnd() * 60, 2 + rnd() * 3);
  }
  // mountains (seamless: sample periodic function)
  x.fillStyle = '#140604';
  for (let i = 0; i < 512; i++) {
    const t = (i / 512) * Math.PI * 2;
    const h = 22 + Math.sin(t * 3) * 8 + Math.sin(t * 7 + 1) * 6 + Math.sin(t * 17 + 2) * 3 + (rnd() < 0.3 ? 1 : 0);
    x.fillRect(i, 128 - h, 1, h);
  }
  // quantise to a chunky palette
  const img = x.getImageData(0, 0, 512, 128);
  for (let i = 0; i < img.data.length; i += 4) for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(img.data[i + k] / 24) * 24;
  x.putImageData(img, 0, 0);
  const t = toTexture(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Flame sprite frames for wall torches.
export function flameFrames() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(16, 32), x = c.getContext('2d'), rnd = seededRandom(100 + f);
    for (let y = 0; y < 32; y++) {
      const w = Math.max(0, Math.round((1 - Math.abs(y - 20) / 16) * 7 + (rnd() - 0.5) * 3));
      for (let i = -w; i <= w; i++) {
        const heat = 1 - Math.abs(i) / (w + 1) - (32 - y) / 60;
        x.fillStyle = heat > 0.7 ? '#fff7a0' : heat > 0.45 ? '#ffc020' : heat > 0.2 ? '#f06010' : '#a01808';
        x.fillRect(8 + i, y, 1, 1);
      }
    }
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    frames.push(t);
  }
  return frames;
}

/**
 * NPC atlas (64x64):
 *  - left half (0..31): neutral fabric grain, tinted by vertex colours
 *  - (32..47, 0..15): male face   (48..63, 0..15): female face
 *  - (32..47, 16..31): bearded male face
 * Faces are drawn on white "skin" so vertex colour supplies the skin tone.
 */
export const ATLAS = {
  grain: [0, 0, 32, 64],
  male: [32, 0, 16, 16],
  female: [48, 0, 16, 16],
  beard: [32, 16, 16, 16],
  hairFront: [48, 16, 16, 16],
  voxM: [32, 32, 16, 16],
  voxF: [48, 32, 16, 16],
};

export function npcAtlas() {
  const c = canvas(64, 64), x = c.getContext('2d'), rnd = seededRandom(42);
  // fabric grain
  for (let j = 0; j < 64; j++) for (let i = 0; i < 32; i++) {
    const v = 210 + (rnd() - 0.5) * 50 + ((i + j) % 4 === 0 ? -12 : 0);
    x.fillStyle = rgb(v, v, v); x.fillRect(i, j, 1, 1);
  }
  x.fillStyle = '#fff'; x.fillRect(32, 0, 32, 64);
  const face = (ox, oy, female, beard) => {
    // brows
    x.fillStyle = '#3a2a20';
    x.fillRect(ox + 3, oy + 5, 3, 1); x.fillRect(ox + 10, oy + 5, 3, 1);
    // eyes
    x.fillStyle = '#ffffff'; x.fillRect(ox + 3, oy + 6, 3, 2); x.fillRect(ox + 10, oy + 6, 3, 2);
    x.fillStyle = '#1a1a40'; x.fillRect(ox + 4, oy + 6, 2, 2); x.fillRect(ox + 11, oy + 6, 2, 2);
    if (female) { x.fillStyle = '#100808'; x.fillRect(ox + 2, oy + 6, 1, 1); x.fillRect(ox + 13, oy + 6, 1, 1); }
    // nose shadow
    x.fillStyle = 'rgba(120,60,40,0.45)'; x.fillRect(ox + 7, oy + 8, 2, 3);
    // mouth
    x.fillStyle = female ? '#a83040' : '#6a3028';
    x.fillRect(ox + 6, oy + 12, 4, 1);
    if (female) { x.fillStyle = 'rgba(220,90,90,0.35)'; x.fillRect(ox + 2, oy + 10, 2, 1); x.fillRect(ox + 12, oy + 10, 2, 1); }
    if (beard) {
      x.fillStyle = '#4a3020';
      x.fillRect(ox + 1, oy + 10, 14, 6); x.fillRect(ox + 5, oy + 11, 6, 1);
      x.fillStyle = '#6a3028'; x.fillRect(ox + 6, oy + 12, 4, 1);
    }
  };
  face(32, 0, false, false);
  face(48, 0, true, false);
  face(32, 16, false, true);
  // Voxel faces for the Blocks look: an 8x8 grid of 2px "pixels"
  const vox = (ox, oy, female) => {
    const P = (gx, gy, col) => { x.fillStyle = col; x.fillRect(ox + gx * 2, oy + gy * 2, 2, 2); };
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) if ((gx + gy * 3) % 5 === 0) P(gx, gy, 'rgba(0,0,0,0.05)');
    P(1, 4, '#ffffff'); P(2, 4, '#3a2a6a'); P(5, 4, '#3a2a6a'); P(6, 4, '#ffffff');
    P(3, 5, 'rgba(120,60,40,0.45)'); P(4, 5, 'rgba(120,60,40,0.45)');
    P(3, 6, female ? '#b04050' : '#7a3a30'); P(4, 6, female ? '#b04050' : '#7a3a30');
    if (female) { P(1, 3, '#2a1a10'); P(6, 3, '#2a1a10'); }
  };
  vox(32, 32, false);
  vox(48, 32, true);
  return c;
}

// Doom-ish status-bar face portraits are drawn per NPC for the dialogue box.
export function drawPortrait(ctx, look, size = 64, frame = 0) {
  const s = size / 16;
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.ceil(w * s), Math.ceil(h * s)); };
  ctx.clearRect(0, 0, size, size);
  px(0, 0, 16, 16, '#1c1410');
  // shoulders / clothes
  px(1, 13, 14, 3, look.top);
  if (look.collar) px(6, 13, 4, 1, look.collar);
  // neck & head
  px(6, 11, 4, 2, look.skinShade);
  px(4, 3, 8, 9, look.skin);
  // hair
  px(4, 2, 8, 2, look.hair);
  if (look.longHair) { px(3, 3, 1, 9, look.hair); px(12, 3, 1, 9, look.hair); px(2, 6, 1, 7, look.hair); px(13, 6, 1, 7, look.hair); }
  else { px(3, 3, 1, 3, look.hair); px(12, 3, 1, 3, look.hair); }
  // eyes (blink on frame 7; look.gaze -1/0/1 shifts the pupils like the classic status-bar face)
  const gz = look.gaze || 0;
  if (frame % 8 === 7) { px(5, 6, 2, 1, look.skinShade); px(9, 6, 2, 1, look.skinShade); }
  else { px(5, 6, 2, 1, '#fff'); px(9, 6, 2, 1, '#fff'); px(gz < 0 ? 5 : 6, 6, 1, 1, '#202040'); px(gz < 0 ? 9 : 10, 6, 1, 1, '#202040'); }
  if (look.grin) { px(7, 7, 2, 2, look.skinShade); px(5, 10, 6, 1, '#fff'); px(5, 9, 1, 1, '#6a3028'); px(10, 9, 1, 1, '#6a3028'); px(5, 11, 6, 1, '#6a3028'); }
  px(7, 7, 2, 2, look.skinShade);
  // mouth animates while talking
  const open = frame % 2 === 1 && !look.grin;
  if (!look.grin) px(6, 10, 4, 1, look.female ? '#a83040' : '#6a3028');
  if (open) px(7, 10, 2, 1, '#2a0a0a');
  if (look.beard) { px(4, 9, 8, 3, look.hair); px(6, 10, 4, 1, open ? '#2a0a0a' : '#6a3028'); }
  // hat
  if (look.hat) {
    const h = look.hat;
    if (h.kind === 'top') { px(3, 2, 10, 1, h.color); px(5, -2, 6, 4, h.color); }
    else if (h.kind === 'bowler' || h.kind === 'trilby') { px(3, 2, 10, 1, h.color); px(5, 0, 6, 2, h.color); }
    else if (h.kind === 'tricorn') { px(2, 2, 12, 1, h.color); px(4, 1, 8, 1, h.color); px(6, 0, 4, 1, h.color); }
    else if (h.kind === 'flat') { px(3, 2, 10, 2, h.color); }
    else if (h.kind === 'bonnet' || h.kind === 'coif' || h.kind === 'mob') { px(3, 1, 10, 3, h.color); px(3, 4, 1, 4, h.color); px(12, 4, 1, 4, h.color); }
    else if (h.kind === 'cloche') { px(3, 1, 10, 3, h.color); }
    else if (h.kind === 'cap') { px(4, 1, 8, 2, h.color); }
  }
}

// Text drawn onto the floor (ring labels).
export function labelTexture(text, color = '#ffcc33', width = 512, font = '16px "Press Start 2P", monospace', shadow = 'rgba(0,0,0,0.65)', smooth = false) {
  const c = canvas(width, 32), x = c.getContext('2d');
  x.font = font;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (shadow) { x.fillStyle = shadow; x.fillText(text, width / 2 + 2, 18); }
  x.fillStyle = color; x.fillText(text, width / 2, 16);
  const t = toTexture(c, 1, smooth);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------------- Island style ----------------

// Soft mown-lawn grass with faint diamond stripes.
export function grassTexture() {
  const c = canvas(128, 128), x = c.getContext('2d'), rnd = seededRandom(21);
  x.fillStyle = '#7fd062'; x.fillRect(0, 0, 128, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) {
    const d = ((Math.floor((i + j) / 32) + Math.floor((i - j + 256) / 32)) % 2) ? 0.04 : -0.02;
    const n = (rnd() - 0.5) * 0.05 + d;
    x.fillStyle = `rgba(${n > 0 ? '255,255,220' : '20,90,30'},${Math.abs(n)})`;
    x.fillRect(i, j, 1, 1);
  }
  // little tufts
  for (let k = 0; k < 40; k++) {
    const px = rnd() * 128, py = rnd() * 128;
    x.fillStyle = 'rgba(40,130,50,0.35)';
    x.fillRect(px, py, 2, 4); x.fillRect(px + 3, py + 1, 2, 3);
  }
  return toTexture(c, 1, true);
}

export function sandTexture() {
  const c = canvas(64, 64), x = c.getContext('2d'), rnd = seededRandom(33);
  x.fillStyle = '#f3e2b0'; x.fillRect(0, 0, 64, 64);
  for (let k = 0; k < 220; k++) { x.fillStyle = rnd() < 0.5 ? 'rgba(200,170,110,0.35)' : 'rgba(255,255,240,0.5)'; x.fillRect(rnd() * 64, rnd() * 64, 1.5, 1.5); }
  return toTexture(c, 1, true);
}

export function skyGradientTexture() {
  const c = canvas(4, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5fb8f2'); g.addColorStop(0.55, '#a8dcfa'); g.addColorStop(0.85, '#e6f6ff'); g.addColorStop(1, '#fff8e8');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = toTexture(c, 1, true);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Three-step ramp for MeshToonMaterial.
export function toonRamp() {
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// Round, friendly portrait for the island dialogue box.
export function drawIslandPortrait(ctx, look, size = 96, frame = 0) {
  const s = size / 100;
  ctx.clearRect(0, 0, size, size);
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(50, 50, 50, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(50, 50, 48, 0, Math.PI * 2); ctx.clip();
  // shoulders
  ctx.fillStyle = look.topSoft || look.top; ctx.beginPath(); ctx.ellipse(50, 104, 38, 26, 0, 0, Math.PI * 2); ctx.fill();
  // back hair
  ctx.fillStyle = look.hair;
  if (look.longHair) { ctx.beginPath(); ctx.ellipse(50, 60, 33, 34, 0, 0, Math.PI * 2); ctx.fill(); }
  // head
  ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(50, 50, 28, 0, Math.PI * 2); ctx.fill();
  // fringe
  ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(50, 46, 29, Math.PI * 1.03, Math.PI * 1.97); ctx.fill();
  // eyes (blink)
  ctx.fillStyle = '#2a1e1a';
  if (frame % 10 === 9) { ctx.fillRect(36, 52, 9, 2); ctx.fillRect(55, 52, 9, 2); }
  else { ctx.beginPath(); ctx.ellipse(40, 52, 3.6, 4.6, 0, 0, 7); ctx.ellipse(60, 52, 3.6, 4.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(40, 49, 1.6, 1.6); ctx.fillRect(60, 49, 1.6, 1.6); }
  // blush
  ctx.fillStyle = 'rgba(255,120,130,0.45)'; ctx.beginPath(); ctx.ellipse(33, 61, 5, 3, 0, 0, 7); ctx.ellipse(67, 61, 5, 3, 0, 0, 7); ctx.fill();
  if (look.beard) { ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(50, 62, 17, 0.1, Math.PI - 0.1); ctx.fill(); }
  // mouth
  ctx.fillStyle = '#7a3030';
  if (frame % 2) { ctx.beginPath(); ctx.ellipse(50, 66, 4, 3, 0, 0, 7); ctx.fill(); }
  else { ctx.fillRect(46, 65, 8, 2); }
  // hat
  if (look.hat) {
    const h = look.hat; ctx.fillStyle = h.color;
    if (h.kind === 'top') { ctx.fillRect(28, 25, 44, 5); ctx.fillRect(36, 4, 28, 22); }
    else if (h.kind === 'bowler' || h.kind === 'trilby') { ctx.fillRect(26, 27, 48, 5); ctx.beginPath(); ctx.arc(50, 28, 17, Math.PI, 0); ctx.fill(); }
    else if (h.kind === 'tricorn') { ctx.beginPath(); ctx.moveTo(18, 30); ctx.lineTo(50, 12); ctx.lineTo(82, 30); ctx.closePath(); ctx.fill(); }
    else if (h.kind === 'flat' || h.kind === 'cap') { ctx.beginPath(); ctx.ellipse(50, 28, 30, 10, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(40, 27, 32, 4); }
    else { ctx.beginPath(); ctx.arc(50, 44, 33, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); }
  }
  ctx.restore();
}
