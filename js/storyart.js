// Story mode art: every vehicle, person and pick-up is drawn from above with plain canvas shapes.
// Sizes are in world pixels (32 to a tile); speeds in tiles a second.
import { eraOf } from './storyplot.js';

const car = (len, wid, max, acc, turn, hp, extra = {}) => ({ len, wid, max, acc, turn, hp, grip: 6, ...extra });
export const VEHICLES = {
  heirloom: car(50, 23, 14.5, 9.5, 2.9, 14, { name: 'the Heirloom', seats: 4 }),
  hatch: car(42, 21, 11.5, 7.5, 3.0, 5, { name: 'hatchback' }),
  saloon: car(48, 22, 12.5, 7.5, 2.8, 6, { name: 'saloon' }),
  sports: car(46, 22, 15, 11, 3.0, 4, { name: 'sports car', grip: 5 }),
  van: car(54, 24, 10, 6, 2.4, 8, { name: 'van' }),
  bus: car(84, 26, 8, 4, 1.7, 14, { name: 'bus', grip: 7 }),
  police: car(48, 22, 13.2, 9, 2.9, 9, { name: 'police car' }),
  classic: car(46, 21, 10.5, 6, 2.7, 6, { name: 'family saloon' }),
  vintage: car(44, 20, 8, 4.5, 2.4, 5, { name: 'motor car' }),
  lorry: car(58, 23, 6.5, 3.5, 2.0, 9, { name: 'motor lorry' }),
  cart: car(62, 20, 4.6, 3.5, 2.2, 5, { name: 'horse and cart', horse: 1 }),
  carriage: car(66, 21, 6.2, 4, 2.2, 6, { name: 'carriage', horse: 1 }),
  wagon: car(76, 23, 4.0, 3, 1.8, 8, { name: 'wagon', horse: 2 }),
  eraser: car(54, 24, 12.3, 8, 2.9, 99, { name: 'Redaction van' }),
  erasercoach: car(66, 22, 12.3, 8, 2.9, 99, { name: 'grey carriage', horse: 1 }),
  engine1: car(50, 23, 13.5, 9, 3.0, 99, { name: 'Engine No. 1' }),
};
const CAR_COLORS = ['#c8443a', '#3a6ac8', '#e8e8e4', '#2a2a2e', '#3a9a5a', '#e0b030', '#8a8e94', '#7a3ac8', '#d86a3a', '#2a8a9a'];
const OLD_COLORS = ['#1c1c20', '#4a1a1a', '#1a2a4a', '#1a3a2a', '#3a2a1a'];
const HORSES = ['#6a4428', '#3a2618', '#8a5a34', '#c8b8a0', '#2a2220'];
const WOODS = ['#8a6238', '#7a5630', '#9a7244'];

/** What drives about in a given year: [type, weight]. */
export function trafficMix(year) {
  return {
    modern: [['hatch', 5], ['saloon', 4], ['van', 2], ['sports', 1], ['bus', 1]],
    retro: [['classic', 6], ['van', 2], ['bus', 1], ['lorry', 1]],
    vintage: [['vintage', 4], ['lorry', 2], ['cart', 3]],
    victorian: [['cart', 5], ['carriage', 3], ['wagon', 2]],
    georgian: [['cart', 5], ['carriage', 2], ['wagon', 3]],
    early: [['cart', 6], ['wagon', 3]],
  }[eraOf(year)];
}
export const trafficCount = year => ({ modern: 13, retro: 9, vintage: 7, victorian: 6, georgian: 4, early: 3 }[eraOf(year)]);
export function paintFor(type, rnd) {
  if (type === 'heirloom') return '#c8a02a';
  if (type === 'eraser' || type === 'erasercoach') return '#8a8e94';
  if (type === 'engine1') return '#1a1a20';
  if (type === 'police') return '#f0f0ee';
  if (type === 'bus') return rnd() < 0.5 ? '#c8443a' : '#3a8a5a';
  if (VEHICLES[type].horse) return WOODS[Math.floor(rnd() * WOODS.length)];
  if (type === 'vintage' || type === 'lorry') return OLD_COLORS[Math.floor(rnd() * OLD_COLORS.length)];
  return CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)];
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function tint(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f + (f > 1 ? (f - 1) * 60 : 0))));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function horse(g, x, y, col, t, moving) {
  const s = moving ? Math.sin(t * 14) * 3 : 0;
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x + 2, y + 3, 15, 6, 0, 0, 7); g.fill();
  g.fillStyle = tint(col, 0.7); g.fillRect(x - 10 + s, y - 7, 4, 3); g.fillRect(x + 6 - s, y - 7, 4, 3); g.fillRect(x - 10 - s, y + 4, 4, 3); g.fillRect(x + 6 + s, y + 4, 4, 3);
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 14, 5.5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + 16, y, 6, 3.2, 0, 0, 7); g.fill();
  g.fillStyle = tint(col, 0.5); g.fillRect(x + 4, y - 1, 10, 2); g.fillRect(x - 17, y - 1, 5, 2);
}

/** Draw a vehicle at the origin, facing +x. v = { type, color, speed, hp, charge, damage } */
export function drawVehicle(g, v, t) {
  const S = VEHICLES[v.type], L = S.len, W = S.wid, body = v.color, k = v.type;
  const moving = Math.abs(v.speed || 0) > 8;
  if (S.horse) {
    const bodyLen = k === 'cart' ? 30 : k === 'wagon' ? 42 : 34, bx = -L / 2;
    const hx = bx + bodyLen + 18;
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + bodyLen, -6); g.lineTo(hx + 6, -6); g.moveTo(bx + bodyLen, 6); g.lineTo(hx + 6, 6); g.stroke();
    if (S.horse === 2) { horse(g, hx, -6, HORSES[0], t, moving); horse(g, hx, 6, HORSES[2], t + 0.2, moving); } else horse(g, hx, 0, k === 'erasercoach' ? '#9a9a9e' : HORSES[(L + body.charCodeAt(2)) % HORSES.length], t, moving);
    g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, bx + 3, -W / 2 + 4, bodyLen, W, 3);
    g.fillStyle = '#1e1a16'; g.fillRect(bx + bodyLen * 0.3, -W / 2 - 2, 12, 3); g.fillRect(bx + bodyLen * 0.3, W / 2 - 1, 12, 3);
    if (k === 'cart') { g.fillStyle = body; rr(g, bx, -W / 2, bodyLen, W, 2); g.fillStyle = tint(body, 0.75); g.fillRect(bx + 2, -W / 2 + 2, bodyLen - 4, W - 4); g.fillStyle = '#b8a060'; g.beginPath(); g.arc(bx + 9, -2, 5, 0, 7); g.arc(bx + 18, 3, 5, 0, 7); g.fill(); }
    else if (k === 'wagon') { g.fillStyle = body; rr(g, bx, -W / 2, bodyLen, W, 2); g.fillStyle = '#e8dfc8'; rr(g, bx + 2, -W / 2 + 1, bodyLen - 10, W - 2, 6); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(bx + 2 + i * (bodyLen - 10) / 4, -W / 2 + 1); g.lineTo(bx + 2 + i * (bodyLen - 10) / 4, W / 2 - 1); g.stroke(); } }
    else {
      const grey = k === 'erasercoach';
      g.fillStyle = grey ? '#8a8e94' : '#1c1c20'; rr(g, bx, -W / 2, bodyLen, W, 5); g.fillStyle = grey ? '#a4a8ae' : '#34343a'; rr(g, bx + 4, -W / 2 + 3, bodyLen - 12, W - 6, 3);
      if (grey) { g.fillStyle = '#f08aa0'; g.fillRect(bx + 7, -5, 14, 10); g.fillStyle = '#f8f4f0'; g.fillRect(bx + 15, -5, 3, 10); } else { g.fillStyle = '#c8a040'; g.fillRect(bx + bodyLen - 5, -W / 2 + 2, 2, 2); g.fillRect(bx + bodyLen - 5, W / 2 - 4, 2, 2); }
    }
    g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(bx + bodyLen - 3, 0, 4, 0, 7); g.fill(); // driver
    return;
  }
  g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, -L / 2 + 3, -W / 2 + 4, L, W, 6);
  g.fillStyle = '#141418';
  for (const x of [-L * 0.3, L * 0.28]) { g.fillRect(x - 5, -W / 2 - 1.5, 10, 4); g.fillRect(x - 5, W / 2 - 2.5, 10, 4); }
  if (k === 'vintage' || k === 'lorry') {
    g.fillStyle = '#18181c'; rr(g, L / 2 - 16, -W / 2, 14, W, 3); rr(g, -L / 2 + 2, -W / 2, 12, W, 3);
    g.fillStyle = body; rr(g, -L / 2 + 4, -W / 2 + 2, L - 20, W - 4, 2); rr(g, L / 2 - 18, -W / 2 + 5, 16, W - 10, 2);
    if (k === 'lorry') { g.fillStyle = '#8a6238'; g.fillRect(-L / 2 + 2, -W / 2 + 1, L * 0.55, W - 2); g.fillStyle = '#6a4a28'; g.fillRect(-L / 2 + 4, -W / 2 + 3, L * 0.55 - 4, W - 6); g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(-L / 2 + 12, -3, 5, 0, 7); g.arc(-L / 2 + 22, 3, 5, 0, 7); g.fill(); }
    else { g.fillStyle = '#d8cfb8'; rr(g, -L / 2 + 7, -W / 2 + 3, 18, W - 6, 2); g.fillStyle = '#20262c'; g.fillRect(L / 2 - 22, -W / 2 + 4, 3, W - 8); }
    g.fillStyle = '#f0e6a0'; g.beginPath(); g.arc(L / 2 - 2, -W / 2 + 4, 2.5, 0, 7); g.arc(L / 2 - 2, W / 2 - 4, 2.5, 0, 7); g.fill();
    return;
  }
  const round = k === 'classic' ? 9 : k === 'van' || k === 'eraser' || k === 'bus' ? 4 : 7;
  g.fillStyle = body; rr(g, -L / 2, -W / 2, L, W, round);
  if (k === 'heirloom') { g.fillStyle = '#7a5630'; g.fillRect(-L / 2 + 6, -W / 2 + 1, L * 0.62, 3); g.fillRect(-L / 2 + 6, W / 2 - 4, L * 0.62, 3); }
  if (k === 'police') { g.fillStyle = '#2a4ac8'; g.fillRect(-L / 2 + 4, -W / 2, L - 8, 3); g.fillRect(-L / 2 + 4, W / 2 - 3, L - 8, 3); }
  const longRoof = k === 'van' || k === 'eraser' || k === 'bus' || k === 'heirloom';
  const cx0 = longRoof ? -L / 2 + 4 : -L * 0.3, cx1 = k === 'bus' ? L / 2 - 6 : longRoof ? L * 0.26 : L * 0.2;
  g.fillStyle = '#1c2832'; rr(g, cx0, -W / 2 + 2.5, cx1 - cx0, W - 5, 3);
  g.fillStyle = tint(body, 1.18); rr(g, cx0 + (longRoof ? 2 : 5), -W / 2 + 4, cx1 - cx0 - (longRoof ? 9 : 12), W - 8, 2);
  if (k === 'bus') { g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = cx0 + 10; x < cx1 - 10; x += 12) g.fillRect(x, -W / 2 + 4, 2, W - 8); }
  if (k === 'eraser') { g.fillStyle = '#f08aa0'; g.fillRect(-L / 2 + 10, -6, 18, 12); g.fillStyle = '#f8f4f0'; g.fillRect(-L / 2 + 20, -6, 4, 12); }
  if (k === 'heirloom' || k === 'engine1') {
    const dome = k === 'heirloom' ? '#d8b040' : '#b8bcc8';
    g.fillStyle = '#4a3a20'; g.fillRect(-10, -8, 16, 16);
    g.fillStyle = dome; g.beginPath(); g.arc(-2, 0, 6.5, 0, 7); g.fill();
    g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(-2, 0, 4.2, 0, 7); g.fill();
    const a = t * (1 + (v.charge || 0) * 14);
    g.strokeStyle = '#3a2a10'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, 0); g.lineTo(-2 + Math.cos(-a) * 3.6, Math.sin(-a) * 3.6); g.moveTo(-2, 0); g.lineTo(-2 + Math.cos(-a / 12) * 2.5, Math.sin(-a / 12) * 2.5); g.stroke();
    if ((v.charge || 0) > 0.02) { g.fillStyle = `rgba(${k === 'heirloom' ? '120,220,255' : '200,120,255'},${0.25 + v.charge * 0.5})`; g.beginPath(); g.arc(-2, 0, 8 + v.charge * 10, 0, 7); g.fill(); }
  }
  if (k === 'police') { g.fillStyle = Math.floor(t * 6) % 2 ? '#3a6aff' : '#ff3a3a'; g.fillRect(-4, -5, 6, 10); }
  g.fillStyle = '#fff2b0'; g.fillRect(L / 2 - 3, -W / 2 + 2, 3, 5); g.fillRect(L / 2 - 3, W / 2 - 7, 3, 5);
  g.fillStyle = '#d82a2a'; g.fillRect(-L / 2, -W / 2 + 2, 2, 5); g.fillRect(-L / 2, W / 2 - 7, 2, 5);
}

/** Smoke for a vehicle that has had enough. */
export function drawSmoke(g, t, amount) {
  for (let i = 0; i < 4; i++) { const ph = (t * 0.9 + i / 4) % 1; g.fillStyle = `rgba(60,60,60,${amount * 0.5 * (1 - ph)})`; g.beginPath(); g.arc(14 - ph * 6, -ph * 26, 5 + ph * 12, 0, 7); g.fill(); }
}

// ---------------- People ----------------
const SKINS = ['#f6dcc6', '#efcfb4', '#e6bf9e', '#d9ab84', '#c79467', '#8f5f3e'];
const HAIRS = ['#2a1c14', '#3a2414', '#5a3418', '#a8742c', '#1c1410', '#b8b8b0', '#8a2c14'];
const DRAB = ['#4a4038', '#5a5048', '#3a3a44', '#6a5a44', '#44403a', '#5a4a3a', '#3a4438'];
const BRIGHT = ['#c83a3a', '#3a6ac8', '#2a2a2a', '#e8e8e8', '#3a9a5a', '#e0a020', '#7a3ac8', '#d86a8a', '#4ab0c8'];
/** A passer-by dressed for the year. */
export function strangerLook(rnd, year, female = rnd() < 0.5) {
  const e = eraOf(year), pick = a => a[Math.floor(rnd() * a.length)];
  const L = { female, skin: pick(SKINS.slice(0, 4)), hair: pick(HAIRS), top: pick(e === 'modern' || e === 'retro' ? BRIGHT : DRAB), hat: null, skirt: null, r: 1 };
  if (female && year < 1925) L.skirt = pick(DRAB);
  else if (female && rnd() < 0.4) L.skirt = pick(BRIGHT);
  if (year < 1960 && rnd() < (female ? 0.6 : 0.8)) L.hat = female ? (year < 1840 ? '#efe8d8' : pick(['#2a2a2a', '#4a3a3a', '#efe8d8'])) : (year < 1800 ? '#2a2420' : year < 1900 ? pick(['#1a1a1c', '#5a4a3a']) : pick(['#5a5048', '#3a3a3a', '#6a5a44']));
  if (female && year < 1900 && rnd() < 0.5) L.shawl = pick(['#3a3a44', '#6a2a2a', '#2a3a2a']);
  return L;
}
/** The same summary from one of the main game's period outfits. */
export function lookSummary(look) {
  return { female: look.female, skin: look.skin, hair: look.hair, top: look.coat?.color || look.top, hat: look.hat?.color || null, skirt: look.skirt ? (look.skirt.color || look.top) : null, shawl: look.shawl?.color || null, r: 1 };
}

/** Draw a person at the origin, facing +x. p = { look, walk (phase), down (0..1 knocked over) } */
export function drawPerson(g, p, t) {
  const L = p.look, s = Math.sin(p.walk || 0) * 3.2, r = L.r || 1;
  g.save();
  if (r !== 1) g.scale(r, r);
  if (p.down) g.rotate(p.down * 5);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(2, 3, 8, 9, 0, 0, 7); g.fill();
  if (L.skirt) { g.fillStyle = L.skirt; g.beginPath(); g.ellipse(-1.5, 0, 8.5, 9.5, 0, 0, 7); g.fill(); }
  else { g.fillStyle = '#2a2a30'; g.fillRect(-2 + s, -6, 6, 4); g.fillRect(-2 - s, 2, 6, 4); }
  g.fillStyle = L.skin; g.beginPath(); g.arc(2 - s * 0.8, -8.5, 2.4, 0, 7); g.arc(2 + s * 0.8, 8.5, 2.4, 0, 7); g.fill();
  g.fillStyle = L.shawl || L.top; g.beginPath(); g.ellipse(0, 0, 5, 9, 0, 0, 7); g.fill();
  if (L.badge) { g.fillStyle = L.badge; g.fillRect(-1, -9, 3, 18); }
  g.fillStyle = L.skin; g.beginPath(); g.arc(1, 0, 5, 0, 7); g.fill();
  g.fillStyle = L.hair; g.beginPath(); g.arc(0.2, 0, 5, Math.PI * 0.5, Math.PI * 1.5); g.fill();
  if (L.female && !L.hat) { g.beginPath(); g.arc(-3.5, 0, 3.2, 0, 7); g.fill(); }
  if (L.hat) { g.fillStyle = L.hat; g.beginPath(); g.arc(0.5, 0, 6.2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(0.5, 0, 3.6, 0, 7); g.fill(); }
  g.restore();
}

/** Things to pick up. kind: page | load | sheep | pigs | truants | photo */
export function drawItem(g, kind, t, n = 0) {
  const bob = Math.sin(t * 4 + n) * 2;
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(2, 5, 9, 5, 0, 0, 7); g.fill();
  if (kind === 'sheep' || kind === 'pigs') {
    const pig = kind === 'pigs', hop = Math.abs(Math.sin(t * 5 + n)) * 2;
    g.save(); g.rotate(n * 1.7); g.translate(0, -hop);
    g.fillStyle = pig ? '#e8a8a0' : '#f0ece0'; g.beginPath(); g.ellipse(0, 0, 10, 7, 0, 0, 7); g.fill();
    if (!pig) { g.beginPath(); g.arc(-5, -4, 4, 0, 7); g.arc(4, -5, 4, 0, 7); g.arc(-4, 5, 4, 0, 7); g.arc(5, 4, 4, 0, 7); g.fill(); }
    g.fillStyle = pig ? '#d88a84' : '#2a2a2a'; g.beginPath(); g.ellipse(10, 0, 4, 3.4, 0, 0, 7); g.fill();
    g.restore();
  } else if (kind === 'truants') {
    drawPerson(g, { look: { skin: SKINS[n % 4], hair: HAIRS[n % 5], top: DRAB[n % 7], r: 0.72, female: n % 2 === 0, skirt: n % 2 === 0 ? DRAB[(n + 3) % 7] : null }, walk: t * 9 + n }, t);
  } else if (kind === 'load') {
    g.fillStyle = '#9a7a4a'; g.fillRect(-10, -10 + bob * 0.3, 20, 20); g.strokeStyle = '#6a5230'; g.lineWidth = 2; g.strokeRect(-9, -9 + bob * 0.3, 18, 18);
  } else if (kind === 'photo') {
    g.save(); g.translate(0, bob - 3); g.rotate(Math.sin(t * 2 + n) * 0.2); g.fillStyle = '#f4efe0'; g.fillRect(-8, -9, 16, 18); g.fillStyle = '#8a6a48'; g.fillRect(-6, -7, 12, 11); g.fillStyle = '#c8a880'; g.beginPath(); g.arc(0, -2, 3, 0, 7); g.fill(); g.restore();
  } else {
    g.save(); g.translate(0, bob - 3); g.rotate(Math.sin(t * 3 + n * 2) * 0.35 + n);
    g.fillStyle = '#f4efe0'; g.fillRect(-7, -9, 14, 18); g.fillStyle = '#6a5a48'; for (let i = 0; i < 4; i++) g.fillRect(-5, -6 + i * 4, 10 - (i % 2) * 3, 1);
    g.restore();
  }
}

/** A mission marker on the ground. */
export function drawMarker(g, t, color = '#ffd84a', r = 26, glyph = '') {
  const ph = (t * 1.2) % 1;
  g.strokeStyle = color; g.lineWidth = 3; g.globalAlpha = 0.9; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
  g.globalAlpha = 0.5 * (1 - ph); g.beginPath(); g.arc(0, 0, r + ph * 16, 0, 7); g.stroke();
  g.globalAlpha = 0.16; g.fillStyle = color; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.globalAlpha = 1;
  if (glyph) {
    const y = -30 - Math.abs(Math.sin(t * 3)) * 6;
    g.font = '700 22px "Fredoka", "Nunito", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(glyph, 0, y); g.fillStyle = color; g.fillText(glyph, 0, y);
  }
}

// ---------------- Portraits for the three people who are not in anybody's file ----------------
export const FIXED_LOOKS = {
  dot: { female: true, skin: '#eccdb4', skinShade: '#c8a48a', hair: '#dcdcd4', longHair: false, top: '#7a4a8a', collar: '#f0e8d8', hat: null, glasses: '#3a2a2a' },
  blank: { female: false, skin: '#d8d2cc', skinShade: '#aea8a2', hair: '#8a8a8e', longHair: false, top: '#6a6e74', collar: '#e8e8e8', hat: { kind: 'bowler', color: '#5a5e64' }, glasses: null },
  eraser: { female: false, skin: '#d0ccc8', skinShade: '#a8a4a0', hair: '#7a7a7e', longHair: false, top: '#8a8e94', collar: '#f08aa0', hat: { kind: 'flat', color: '#8a8e94' } },
};
/** Extras on top of the main game's pixel portrait (glasses), or a whole picture for letters and notes. */
export function drawPortraitExtras(ctx, who, look, size) {
  const s = size / 16, px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.ceil(w * s), Math.ceil(h * s)); };
  if (who === 'letter' || who === 'note') {
    px(0, 0, 16, 16, '#1c1410');
    if (who === 'letter') { px(2, 4, 12, 9, '#efe8d4'); px(2, 4, 12, 1, '#c8bfa8'); px(3, 5, 1, 1, '#c8bfa8'); px(12, 5, 1, 1, '#c8bfa8'); px(4, 6, 1, 1, '#c8bfa8'); px(11, 6, 1, 1, '#c8bfa8'); px(5, 7, 6, 1, '#c8bfa8'); px(7, 9, 2, 2, '#a82a2a'); }
    else { px(3, 2, 10, 12, '#efe8d4'); for (let i = 0; i < 5; i++) px(4, 4 + i * 2, i % 2 ? 6 : 8, 1, '#6a5a48'); }
    return;
  }
  if (look?.glasses) { px(4, 6, 4, 1, look.glasses); px(9, 6, 3, 1, look.glasses); px(4, 5, 1, 3, look.glasses); px(7, 5, 1, 3, look.glasses); px(8, 5, 1, 3, look.glasses); px(11, 5, 1, 3, look.glasses); px(5, 6, 2, 1, '#fff'); px(9, 6, 2, 1, '#fff'); px(6, 6, 1, 1, '#202040'); px(10, 6, 1, 1, '#202040'); }
}
