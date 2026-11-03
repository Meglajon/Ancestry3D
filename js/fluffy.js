// The Fluffy look: a top-down 2D garden drawn on a plain canvas, where every ancestor is a round, fluffy ball.
// It uses the same ground layout as the 3D looks (person.x / person.z in metres), so generations are still
// paths round you, and talking works exactly the same way. Screen up is -Z, so the father's side is on the left.
import { lookFor } from './outfits.js';
import { birthYear, firstName, seededRandom, hashString } from './ancestry.js';

// ---------------- Colour helpers ----------------
function hexToRgb(hex) {
  let h = String(hex || '#888888').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hsl(h, s, l, a = 1) { return `hsla(${Math.round(((h % 1) + 1) % 1 * 360)},${Math.round(s * 100)}%,${Math.round(l * 100)}%,${a})`; }
// Era clothes (lots of Victorian black and brown) become soft pastel fur with the same hue.
function pastel(hex, seedHue) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const hue = s < 0.12 ? seedHue : h;
  return [hue, Math.min(0.72, Math.max(0.42, s * 1.3 + 0.2)), Math.min(0.8, Math.max(0.6, l * 0.4 + 0.52))];
}

// ---------------- Fluffy ball sprites ----------------
// Each ball is drawn once to a small canvas (fur, tuft of hair, hat, cheeks); eyes, mouth and feet are drawn
// live on top so they can look at you, blink and talk. Sprite coordinates: ball centre (56, 74), radius 36.
const SW = 112, SH = 128, CX = 56, CY = 74, BR = 36;
const dprScale = () => Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1) >= 1.5 ? 1.5 : 1;

export function fluffOf(look, id = '') {
  if (look.fluff) return look.fluff;
  const seed = hashString(String(id) + (look.top || '') + (look.year || ''));
  const seedHue = (seed % 1000) / 1000;
  const [h, s, l] = pastel(look.top, seedHue);
  const hair = look.hair || '#5a3a20';
  look.fluff = {
    seed, h, s, l,
    fur: hsl(h, s, l), furDark: hsl(h, s * 1.05, l * 0.78), furLight: hsl(h, s * 0.8, Math.min(0.94, l + 0.12)),
    feet: hsl(h + 0.02, s * 0.9, l * 0.62), hair, hat: look.hat,
    tuft: look.hat ? 0 : 3 + (seed % 3), facial: look.facial, female: look.female,
  };
  return look.fluff;
}

function paintSprite(f, k) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(SW * k); c.height = Math.ceil(SH * k);
  const x = c.getContext('2d');
  x.scale(k, k);
  const rnd = seededRandom(f.seed);
  // fur: wisps sticking out all round, a darker layer under a lighter one, then the round body
  const wisps = (n, r0, len, w, color) => {
    x.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.12, l = len * (0.7 + rnd() * 0.6), bend = (rnd() - 0.5) * 0.35;
      const ca = Math.cos(a), sa = Math.sin(a), tx = -sa, ty = ca;
      const bx = CX + ca * r0, by = CY + sa * r0;
      const ex = CX + Math.cos(a + bend * 0.3) * (r0 + l), ey = CY + Math.sin(a + bend * 0.3) * (r0 + l);
      x.beginPath();
      x.moveTo(bx + tx * w, by + ty * w);
      x.quadraticCurveTo(CX + Math.cos(a + bend) * (r0 + l * 0.6) + tx * w * 0.4, CY + Math.sin(a + bend) * (r0 + l * 0.6) + ty * w * 0.4, ex, ey);
      x.quadraticCurveTo(CX + Math.cos(a + bend) * (r0 + l * 0.6) - tx * w * 0.4, CY + Math.sin(a + bend) * (r0 + l * 0.6) - ty * w * 0.4, bx - tx * w, by - ty * w);
      x.fill();
    }
  };
  wisps(84, BR * 0.8, 10, 3.6, f.furDark);
  wisps(72, BR * 0.78, 7.5, 3.4, f.fur);
  x.fillStyle = f.fur;
  x.beginPath(); x.arc(CX, CY, BR * 0.86, 0, Math.PI * 2); x.fill();
  wisps(40, BR * 0.7, 6, 2.2, f.furLight);
  x.fillStyle = f.fur;
  x.beginPath(); x.arc(CX, CY, BR * 0.74, 0, Math.PI * 2); x.fill();
  // soft shading underneath, light on top
  const g = x.createRadialGradient(CX - 10, CY - 14, 4, CX, CY, BR * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,30,40,0.18)');
  x.fillStyle = g; x.beginPath(); x.arc(CX, CY, BR * 0.98, 0, Math.PI * 2); x.fill();
  // fur strands
  x.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * BR * 0.85;
    const px = CX + Math.cos(a) * r, py = CY + Math.sin(a) * r, len = 3 + rnd() * 4;
    x.strokeStyle = rnd() < 0.5 ? f.furLight : f.furDark;
    x.globalAlpha = 0.35 + rnd() * 0.3; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len * 0.6 + 1, py + Math.sin(a) * len * 0.6, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  x.globalAlpha = 1;
  // rosy cheeks
  x.fillStyle = 'rgba(255,110,130,0.38)';
  x.beginPath(); x.ellipse(CX - 21, CY + 9, 6, 3.6, 0, 0, 7); x.ellipse(CX + 21, CY + 9, 6, 3.6, 0, 0, 7); x.fill();
  // facial hair, in their hair colour
  x.fillStyle = f.hair;
  if (f.facial === 'beard') { x.beginPath(); x.ellipse(CX, CY + 22, 17, 10, 0, 0, Math.PI); x.fill(); }
  if (f.facial === 'moustache' || f.facial === 'beard') { x.beginPath(); x.ellipse(CX - 5, CY + 13, 6, 2.6, 0.2, 0, 7); x.ellipse(CX + 5, CY + 13, 6, 2.6, -0.2, 0, 7); x.fill(); }
  if (f.facial === 'mutton') { x.beginPath(); x.ellipse(CX - 27, CY + 6, 5, 11, 0.2, 0, 7); x.ellipse(CX + 27, CY + 6, 5, 11, -0.2, 0, 7); x.fill(); }
  // a tuft of hair on top, or their hat
  if (f.hat) drawHat(x, f.hat);
  else {
    x.fillStyle = f.hair; x.strokeStyle = f.hair; x.lineWidth = 4;
    for (let i = 0; i < f.tuft; i++) {
      const dx = (i - (f.tuft - 1) / 2) * 6;
      x.beginPath(); x.moveTo(CX + dx * 0.6, CY - BR + 4);
      x.quadraticCurveTo(CX + dx * 1.6, CY - BR - 10, CX + dx * 2.2 + (dx >= 0 ? 4 : -4), CY - BR - 6); x.stroke();
    }
    if (f.female && f.tuft % 2) { x.fillStyle = '#ff7aa0'; x.beginPath(); x.arc(CX + 16, CY - BR + 4, 5, 0, 7); x.fill(); x.fillStyle = '#ffd0dc'; x.beginPath(); x.arc(CX + 16, CY - BR + 4, 2, 0, 7); x.fill(); }
  }
  return c;
}

function drawHat(x, hat) {
  const col = hat.color || '#3a2a20';
  const [h, s, l] = rgbToHsl(hexToRgb(col));
  x.fillStyle = hsl(h, s, Math.max(0.22, l)); // keep dark hats dark, but not pure black
  const top = CY - BR;
  const k = hat.kind;
  if (k === 'top') { x.fillRect(CX - 24, top + 2, 48, 6); x.fillRect(CX - 15, top - 22, 30, 25); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(CX - 15, top - 6, 30, 4); }
  else if (k === 'bowler' || k === 'trilby') { x.beginPath(); x.ellipse(CX, top + 5, 26, 5, 0, 0, 7); x.fill(); x.beginPath(); x.arc(CX, top + 4, 16, Math.PI, 0); x.fill(); }
  else if (k === 'tricorn') { x.beginPath(); x.moveTo(CX - 30, top + 6); x.lineTo(CX, top - 14); x.lineTo(CX + 30, top + 6); x.closePath(); x.fill(); }
  else if (k === 'flat' || k === 'cap') { x.beginPath(); x.ellipse(CX, top + 4, 24, 9, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(CX + 6, top + 6, 20, 4, 0, 0, 7); x.fill(); }
  else { // bonnets, coifs, caps and kerchiefs: a soft cap over the top of the fur
    x.beginPath(); x.arc(CX, CY, BR + 2, Math.PI * 1.08, Math.PI * 1.92); x.lineTo(CX, CY - 6); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.arc(CX, CY, BR + 2, Math.PI * 1.15, Math.PI * 1.85); x.arc(CX, CY, BR - 4, Math.PI * 1.85, Math.PI * 1.15, true); x.fill();
  }
}

const spriteCache = new Set();
function spriteFor(holder, f) {
  if (!holder.sprite) {
    holder.sprite = paintSprite(f, dprScale());
    spriteCache.add(holder);
    if (spriteCache.size > 260) {
      // free the sprites of balls that are far away (they are repainted if you come back)
      for (const h of spriteCache) if (h !== holder && !(h.dist < 14)) { h.sprite = null; spriteCache.delete(h); if (spriteCache.size < 180) break; }
    }
  }
  return holder.sprite;
}

/**
 * Draws one ball standing on (sx, sy) (screen pixels of the ground point under it), radius r pixels.
 * o: { squash, gazeX, gazeY (-1..1), blink, mouth (0 shut .. 1 open), step (feet phase), hop (pixels) }
 */
function drawBall(ctx, holder, f, sx, sy, r, o = {}) {
  const k = r / BR;
  const sq = o.squash || 0, hop = o.hop || 0;
  // shadow
  ctx.fillStyle = 'rgba(40,70,30,0.22)';
  ctx.beginPath(); ctx.ellipse(sx, sy, r * (0.95 - hop / (r * 6)), r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(sx, sy - hop);
  ctx.scale(k * (1 + sq), k * (1 - sq));
  ctx.translate(-CX, -(CY + BR));
  // feet
  const st = o.step || 0;
  ctx.fillStyle = f.feet;
  ctx.beginPath(); ctx.ellipse(CX - 14, CY + BR - 1 + Math.max(0, Math.sin(st)) * -4, 10, 6, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(CX + 14, CY + BR - 1 + Math.max(0, -Math.sin(st)) * -4, 10, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  const spr = spriteFor(holder, f);
  ctx.drawImage(spr, 0, 0, SW, SH);
  // eyes
  const gx = (o.gazeX || 0) * 3.5, gy = (o.gazeY || 0) * 2.5;
  if (o.blink) {
    ctx.strokeStyle = '#2a1a22'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(CX - 12, CY - 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX + 12, CY - 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(CX - 12, CY - 2, 8, 9.5, 0, 0, 7); ctx.ellipse(CX + 12, CY - 2, 8, 9.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a22';
    ctx.beginPath(); ctx.ellipse(CX - 12 + gx, CY - 1 + gy, 4.6, 5.8, 0, 0, 7); ctx.ellipse(CX + 12 + gx, CY - 1 + gy, 4.6, 5.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(CX - 13.5 + gx, CY - 3.5 + gy, 1.7, 0, 7); ctx.arc(CX + 10.5 + gx, CY - 3.5 + gy, 1.7, 0, 7); ctx.fill();
  }
  // mouth
  const m = o.mouth || 0;
  ctx.fillStyle = '#7a2a3a'; ctx.strokeStyle = '#7a2a3a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (m > 0.2) { ctx.beginPath(); ctx.ellipse(CX, CY + 12, 4, 2 + m * 3, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(CX, CY + 9, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  ctx.restore();
}

/** Round portrait of a fluffy ball, for the dialogue box and the HUD. */
export function drawFluffyPortrait(ctx, look, size = 96, frame = 0) {
  const f = fluffOf(look);
  const holder = look.__portrait || (look.__portrait = { dist: 0 });
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#bfe8a0'; ctx.fillRect(0, size * 0.72, size, size);
  drawBall(ctx, holder, f, size / 2, size * 0.86, size * 0.3, { blink: frame % 10 === 9, mouth: frame % 2 ? 0.8 : 0, squash: frame % 2 ? 0.02 : 0 });
  ctx.restore();
}

// ---------------- Garden decorations ----------------
function tile(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
const GRASS_TILE_M = 4; // metres covered by one grass tile
let grassTile = null, grassPat = null, grassCtx = null;
function grassPattern(ctx) {
  if (grassPat && grassCtx === ctx) return grassPat;
  grassTile ||= tile(128, (x, s) => {
    x.fillStyle = '#9ad873'; x.fillRect(0, 0, s, s);
    const rnd = seededRandom(5);
    for (let i = 0; i < 26; i++) {
      const px = rnd() * s, py = rnd() * s;
      x.strokeStyle = rnd() < 0.5 ? '#86c862' : '#a8e284'; x.lineWidth = 2; x.lineCap = 'round';
      x.beginPath(); x.moveTo(px - 3, py - 4); x.lineTo(px, py + 2); x.lineTo(px + 3, py - 5); x.stroke();
    }
    for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.arc(rnd() * s, rnd() * s, 1.4, 0, 7); x.fill(); }
  });
  grassCtx = ctx;
  return (grassPat = ctx.createPattern(grassTile, 'repeat'));
}

function genName(g) {
  const n = g === 1 ? 'Parents' : g === 2 ? 'Grandparents' : g === 3 ? 'Great-grandparents' : g === 4 ? '2× great-grandparents' : `${g - 2}× great-grandparents`;
  return `Gen ${g} · ${n}`;
}

// ---------------- The world ----------------
export function buildFlatWorld(tree) {
  const R = tree.worldRadius;
  const root = tree.people.get(tree.rootId);
  const rootYear = birthYear(root.indi) ?? 1990;
  const world = {
    flat: true, theme: 'fluffy', npcs: [], byId: new Map(), colliders: [], platforms: [], coins: [], pickups: [], shootables: [],
    radius: R, wallRadius: R + 0.5, skyRadius: R, lineage: [], deco: [],
  };
  world.rootLook = lookFor(root, rootYear);
  fluffOf(world.rootLook, root.id);
  world.player = { dist: 0 };
  const people = [...tree.people.values()].filter(p => p.gen > 0);
  people.forEach((person, i) => {
    const look = lookFor(person, rootYear - person.gen * 29);
    const npc = { person, look, phase: (i * 1.37) % 6.28, met: false, talking: false, flinch: 0, wave: 0, waved: false,
      dist: Infinity, near: false, size: 0.56 + ((hashString(person.id) % 7) - 3) * 0.012, nextBlink: 1 + (i % 5), blinkUntil: 0, look2: 0 };
    fluffOf(look, person.id);
    world.npcs.push(npc);
    world.byId.set(person.id, npc);
  });
  world.beacon = { visible: false, position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
  world.setLineage = id => {
    const segs = [];
    let p = tree.people.get(id);
    while (p && p.primaryChild) { const c = tree.people.get(p.primaryChild); segs.push([c, p]); p = c; }
    world.lineage = segs;
  };
  world.update = () => {};

  // Decorations: flowers, clover, pebbles, mushrooms, bushes and round trees (the last two block your way).
  const rnd = seededRandom(31 + tree.people.size);
  const clearOf = (x, z, d) => {
    if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < 3.5) return false;
    for (const p of tree.people.values()) if (Math.abs(p.x - x) < d && Math.abs(p.z - z) < d && Math.hypot(p.x - x, p.z - z) < d) return false;
    return true;
  };
  const onPath = (x, z) => {
    for (const gd of tree.guides) {
      if (gd.kind === 'row') { if (Math.abs(z - (gd.z + 1.45)) < 1 && x > gd.x0 && x < gd.x1) return true; }
      else if (Math.abs(Math.hypot(x - gd.cx, z - gd.cz) - (gd.r - 1.45)) < 1) return true;
    }
    return false;
  };
  const area = R * R;
  const want = { tree: Math.min(70, area * 0.004), bush: Math.min(90, area * 0.006), flower: Math.min(1400, area * 0.09), pebble: Math.min(300, area * 0.02), mush: Math.min(120, area * 0.006) };
  const place = (kind, n, clear) => {
    for (let i = 0, made = 0; i < n * 6 && made < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R - 1.5);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearOf(x, z, clear) || onPath(x, z)) continue;
      if ((kind === 'tree' || kind === 'bush') && world.colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 2)) continue;
      const d = { kind, x, z, s: 0.8 + rnd() * 0.5, c: Math.floor(rnd() * 6), r: rnd() };
      world.deco.push(d);
      if (kind === 'tree') world.colliders.push({ x, z, r: 0.9 * d.s });
      if (kind === 'bush') world.colliders.push({ x, z, r: 0.55 * d.s });
      made++;
    }
  };
  place('tree', want.tree, 3.4); place('bush', want.bush, 2.2); place('mush', want.mush, 1.2); place('pebble', want.pebble, 1); place('flower', want.flower, 1);
  // trees on top, small things underneath
  const order = { pebble: 0, flower: 1, mush: 2, bush: 3, tree: 4 };
  world.deco.sort((a, b) => order[a.kind] - order[b.kind] || a.z - b.z);

  world.draw = (ctx, v) => drawWorld(ctx, world, tree, v);
  return world;
}

const FLOWER = ['#ff7aa0', '#ffd84a', '#ffffff', '#b98aff', '#ff9a5a', '#7ad0ff'];

function drawDeco(ctx, d, X, Y, sc, layer) {
  const x = X(d.x), y = Y(d.z), s = d.s * sc;
  if (d.kind === 'flower' && layer === 0) {
    ctx.fillStyle = FLOWER[d.c];
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 + d.r; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.09, y + Math.sin(a) * s * 0.09, s * 0.07, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffe06a'; ctx.beginPath(); ctx.arc(x, y, s * 0.05, 0, 7); ctx.fill();
  } else if (d.kind === 'pebble' && layer === 0) {
    ctx.fillStyle = '#c9c2b0'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.16, s * 0.11, d.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(x - s * 0.04, y - s * 0.03, s * 0.06, s * 0.03, d.r, 0, 7); ctx.fill();
  } else if (d.kind === 'mush' && layer === 0) {
    ctx.fillStyle = '#f6ecd8'; ctx.fillRect(x - s * 0.05, y - s * 0.12, s * 0.1, s * 0.14);
    ctx.fillStyle = d.c % 2 ? '#e84a4a' : '#c8864a'; ctx.beginPath(); ctx.arc(x, y - s * 0.12, s * 0.16, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - s * 0.06, y - s * 0.18, s * 0.03, 0, 7); ctx.arc(x + s * 0.05, y - s * 0.16, s * 0.025, 0, 7); ctx.fill();
  } else if (d.kind === 'bush' && layer === 1) {
    ctx.fillStyle = 'rgba(40,70,30,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.15, s * 0.7, s * 0.25, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4fa848';
    for (const [ox, oy, r] of [[-0.3, -0.1, 0.36], [0.3, -0.12, 0.34], [0, -0.32, 0.4], [0, 0, 0.38]]) { ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, r * s, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#6cc25e'; ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.4, s * 0.18, 0, 7); ctx.fill();
    if (d.c < 3) { ctx.fillStyle = FLOWER[d.c]; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + (i - 1) * s * 0.28, y - s * (0.2 + (i % 2) * 0.2), s * 0.07, 0, 7); ctx.fill(); } }
  } else if (d.kind === 'tree' && layer === 1) {
    ctx.fillStyle = 'rgba(40,70,30,0.22)'; ctx.beginPath(); ctx.ellipse(x + s * 0.2, y + s * 0.1, s * 1.2, s * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a6a44'; ctx.fillRect(x - s * 0.13, y - s * 0.7, s * 0.26, s * 0.75);
    const g = ['#3f9a46', '#4aa84c', '#368a48'][d.c % 3];
    ctx.fillStyle = g;
    for (const [ox, oy, r] of [[-0.5, -1.1, 0.6], [0.5, -1.1, 0.6], [0, -1.55, 0.7], [0, -0.95, 0.65]]) { ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, r * s, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.arc(x - s * 0.25, y - s * 1.65, s * 0.32, 0, 7); ctx.fill();
    if (d.c >= 3) { ctx.fillStyle = ['#ff5a4a', '#ffb43a', '#ff7aa8'][d.c - 3]; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.7 + d.r * 6) * s * 0.6, y - s * 1.15 + Math.sin(i * 1.7 + d.r * 6) * s * 0.4, s * 0.09, 0, 7); ctx.fill(); } }
  }
}

/**
 * v: { w, h, t, cam: {x, z, scale}, player: {x, z, vx, vz, step}, target, waypoint, talkingTo, mouth }
 */
function drawWorld(ctx, world, tree, v) {
  const { w, h, t, cam } = v;
  const sc = cam.scale;
  const X = x => w / 2 + (x - cam.x) * sc, Y = z => h / 2 + (z - cam.z) * sc;
  const R = tree.worldRadius;
  const vis = (x, z, m) => { const sx = X(x), sy = Y(z); return sx > -m && sx < w + m && sy > -m && sy < h + m; };

  // sea, sandy shore and the meadow
  ctx.fillStyle = '#7ad4ee'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, sc * 0.15); ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 1.3) * 0.2})`;
  ctx.beginPath(); ctx.arc(X(0), Y(0), (R + 3.6 + Math.sin(t * 1.3) * 0.2) * sc, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f2dfae'; ctx.beginPath(); ctx.arc(X(0), Y(0), (R + 3) * sc, 0, Math.PI * 2); ctx.fill();
  const pat = grassPattern(ctx);
  if (pat.setTransform) {
    const k = (GRASS_TILE_M * sc) / 128;
    pat.setTransform(new DOMMatrix([k, 0, 0, k, X(0), Y(0)]));
  }
  ctx.fillStyle = pat; ctx.beginPath(); ctx.arc(X(0), Y(0), (R + 1.4) * sc, 0, Math.PI * 2); ctx.fill();

  // generation paths
  ctx.lineCap = 'round';
  const strokeGuide = (gd, width, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = width * sc; ctx.beginPath();
    if (gd.kind === 'row') { ctx.moveTo(X(gd.x0), Y(gd.z + 1.45)); ctx.lineTo(X(gd.x1), Y(gd.z + 1.45)); }
    else ctx.arc(X(gd.cx), Y(gd.cz), Math.max(0.1, (gd.r - 1.45) * sc), gd.t0, gd.t0 + gd.tl);
    ctx.stroke();
  };
  for (const gd of tree.guides) strokeGuide(gd, 1.25, '#dcc48e');
  for (const gd of tree.guides) strokeGuide(gd, 1.0, '#f0dcaa');
  // plaza where you start
  ctx.fillStyle = '#dcc48e'; ctx.beginPath(); ctx.arc(X(tree.hub.x), Y(tree.hub.z), 2.6 * sc, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4e4b8'; ctx.beginPath(); ctx.arc(X(tree.hub.x), Y(tree.hub.z), 2.35 * sc, 0, 7); ctx.fill();
  // path labels
  if (sc > 14) {
    ctx.font = `700 ${Math.max(10, Math.min(16, sc * 0.36))}px Fredoka, Nunito, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(122,82,48,0.85)';
    for (const gd of tree.guides) {
      const label = genName(gd.g);
      if (gd.kind === 'row') {
        const n = Math.max(2, Math.round((gd.x1 - gd.x0) / 22));
        for (let i = 0; i < n; i++) { const x = gd.x0 + (i + 0.5) * (gd.x1 - gd.x0) / n; if (vis(x, gd.z + 1.45, 200)) ctx.fillText(label, X(x), Y(gd.z + 1.45)); }
      } else {
        const r = gd.r - 1.45, n = Math.max(3, Math.round(r * gd.tl / 40));
        for (let i = 0; i < n; i++) {
          const a = gd.t0 + gd.tl * (i + 0.5) / n, x = gd.cx + Math.cos(a) * r, z = gd.cz + Math.sin(a) * r;
          if (!vis(x, z, 200)) continue;
          ctx.save(); ctx.translate(X(x), Y(z));
          let rot = a + Math.PI / 2; if (Math.cos(rot) < 0) rot += Math.PI;
          ctx.rotate(rot); ctx.fillText(label, 0, 0); ctx.restore();
        }
      }
    }
  }

  // small decorations under everything
  const m = 3 * sc;
  for (const d of world.deco) if ((d.kind === 'flower' || d.kind === 'pebble' || d.kind === 'mush') && vis(d.x, d.z, m)) drawDeco(ctx, d, X, Y, sc, 0);

  // lines of descent, and the gold line back to you while you talk to someone
  ctx.lineWidth = Math.max(1.5, sc * 0.12);
  for (const e of tree.edges) {
    const a = tree.people.get(e.child), b = tree.people.get(e.parent);
    if (!vis(a.x, a.z, w) && !vis(b.x, b.z, w)) continue;
    ctx.strokeStyle = e.side === 'paternal' ? 'rgba(90,150,255,0.8)' : 'rgba(255,120,170,0.8)';
    ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.z)); ctx.lineTo(X(b.x), Y(b.z)); ctx.stroke();
  }
  if (world.lineage.length) {
    ctx.strokeStyle = '#ffc23a'; ctx.lineWidth = Math.max(3, sc * 0.28);
    ctx.beginPath(); for (const [a, b] of world.lineage) { ctx.moveTo(X(a.x), Y(a.z)); ctx.lineTo(X(b.x), Y(b.z)); } ctx.stroke();
  }
  // couples standing together
  ctx.strokeStyle = 'rgba(255,184,74,0.9)'; ctx.lineWidth = Math.max(2, sc * 0.3);
  for (const p of tree.people.values()) if (p.spouseInUnit && p.id < p.spouseInUnit) { const q = tree.people.get(p.spouseInUnit); if (vis(p.x, p.z, m)) { ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.z)); ctx.lineTo(X(q.x), Y(q.z)); ctx.stroke(); } }

  // rings under the person you can talk to and the waypoint
  const ring = (n, color, pulse) => {
    const p = n.person, r = (0.85 + (pulse ? Math.sin(t * 5) * 0.12 : 0)) * sc;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, sc * 0.1);
    ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.z), r, r * 0.45, 0, 0, 7); ctx.stroke();
  };
  if (v.waypoint) ring(v.waypoint, '#ffb020', true);
  if (v.target && !v.talkingTo) ring(v.target, 'rgba(255,255,255,0.95)', false);

  // balls and big decorations, back to front
  const items = [];
  for (const d of world.deco) if ((d.kind === 'tree' || d.kind === 'bush') && vis(d.x, d.z, 2.5 * sc)) items.push({ z: d.z, d });
  for (const n of world.npcs) if (vis(n.person.x, n.person.z, 2 * sc)) items.push({ z: n.person.z, n });
  items.push({ z: v.player.z, me: true });
  items.sort((a, b) => a.z - b.z);
  const px = v.player.x, pz = v.player.z;
  for (const it of items) {
    if (it.d) { drawDeco(ctx, it.d, X, Y, sc, 1); continue; }
    if (it.me) {
      const sp = Math.hypot(v.player.vx, v.player.vz);
      const mv = Math.min(1, sp / 4);
      const gaze = sp > 0.3 ? [v.player.vx / sp, v.player.vz / sp] : v.talkingTo ? norm(v.talkingTo.person.x - px, v.talkingTo.person.z - pz) : [0, 0.3];
      const ballR = 0.66 * sc;
      // a soft glow under you
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(X(px), Y(pz), ballR * 1.25, ballR * 0.5, 0, 0, 7); ctx.fill();
      drawBall(ctx, world.player, world.rootLook.fluff, X(px), Y(pz), ballR, {
        squash: Math.sin(v.player.step * 2) * 0.05 * mv, hop: Math.abs(Math.sin(v.player.step * 2)) * ballR * 0.18 * mv,
        gazeX: gaze[0], gazeY: gaze[1], step: v.player.step * 2, blink: (t % 4.3) < 0.12, mouth: 0,
      });
      continue;
    }
    const n = it.n, p = n.person;
    const ballR = n.size * sc;
    const near = n.dist < 7;
    const [gx, gy] = near ? norm(px - p.x, pz - p.z) : [Math.sin(t * 0.4 + n.phase) * 0.5, 0.3];
    let hop = 0, squash = Math.sin(t * 2.2 + n.phase) * 0.03;
    if (n.wave > 0) hop = Math.abs(Math.sin(n.wave * 6)) * ballR * 0.35;
    if (n.flinch > 0) { squash = -0.18 * Math.sin((n.flinch / 0.45) * Math.PI); hop = Math.sin((n.flinch / 0.45) * Math.PI) * ballR * 0.3; }
    if (n.talking) { hop = Math.abs(Math.sin(t * 7)) * ballR * 0.08; squash += Math.sin(t * 14) * 0.03; }
    const blink = (t + n.phase * 3) % 5 < 0.12;
    drawBall(ctx, n, n.look.fluff, X(p.x), Y(p.z), ballR, { squash, hop, gazeX: gx, gazeY: gy, blink, mouth: n.talking ? v.mouth : 0 });
    if (n.talking) bubble(ctx, X(p.x) + ballR * 0.9, Y(p.z) - ballR * 2.5, sc, t);
  }

  // names of the people near you
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const fs = Math.max(11, Math.min(17, sc * 0.34));
  ctx.font = `700 ${fs}px Fredoka, Nunito, sans-serif`;
  ctx.lineJoin = 'round';
  for (const n of world.npcs) {
    if (n.dist > 7.5 || n.talking) continue;
    const label = firstName(n.person.indi) + (n.met ? ' ✓' : '');
    const x = X(n.person.x), y = Y(n.person.z) + sc * 0.3;
    ctx.globalAlpha = Math.min(1, (7.5 - n.dist) / 2);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,250,238,0.95)'; ctx.strokeText(label, x, y);
    ctx.fillStyle = '#6b4a2e'; ctx.fillText(label, x, y);
  }
  ctx.globalAlpha = 1;

  // waypoint arrow at the edge of the screen when they are off it
  if (v.waypoint) {
    const p = v.waypoint.person, sx = X(p.x), sy = Y(p.z);
    if (sx < 0 || sx > w || sy < 0 || sy > h) {
      const a = Math.atan2(sy - h / 2, sx - w / 2), pad = 34;
      const ex = Math.max(pad, Math.min(w - pad, w / 2 + Math.cos(a) * w)), ey = Math.max(pad + 40, Math.min(h - pad, h / 2 + Math.sin(a) * h));
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = '#ffb020'; ctx.strokeStyle = '#fffaee'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}

function norm(x, z) { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }

function bubble(ctx, x, y, sc, t) {
  const r = Math.max(10, sc * 0.32);
  ctx.fillStyle = '#fffaee'; ctx.strokeStyle = 'rgba(107,74,46,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 0.6, y + r * 0.8); ctx.lineTo(x - r * 1.1, y + r * 1.6); ctx.lineTo(x - r * 0.1, y + r * 0.9); ctx.fill();
  ctx.fillStyle = '#6b4a2e';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + (i - 1) * r * 0.6, y - Math.max(0, Math.sin(t * 6 - i)) * r * 0.2, r * 0.17, 0, 7); ctx.fill(); }
}
