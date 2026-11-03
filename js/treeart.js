// Artwork for the growing tree: four seasons of sky and light, tapered bark lit from the sun's side, leaves,
// opening blossoms for each person, and a little life (butterflies, caterpillars that turn into butterflies,
// flowers blooming in the grass, falling petals or leaves, fireflies at night). Everything is drawn on one
// canvas so it all ends up in recorded videos.
import { seededRandom } from './ancestry.js';

// Seasons set the colours of the land, bark, leaves and blossoms; the time of day sets the sky and the light.
export const TREE_STYLES = {
  spring: {
    name: 'Spring', icon: '🌸',
    hills: ['#a8d8a0', '#8cc87e', '#6db35e'], ground: ['#79c25e', '#4f9a3e'], bark: ['#4a3324', '#7a5638', '#b08a64'],
    leaves: ['#8fd16a', '#a8de7e', '#6fbf54', '#c2ea94'],
    female: { petal: '#ffb9d2', edge: '#f08cb0', inner: '#ff86b0' }, male: { petal: '#ffffff', edge: '#cfdcf5', inner: '#d9e6ff' },
    centre: '#ffd84a', particle: 'petal', particleCols: ['#ffc8dc', '#ffe0ec', '#ffffff'], grassFlowers: ['#ffffff', '#ffd84a', '#ff9ac0', '#b9a0ff'],
    flyer: 'butterfly', legend: [['#ffb9d2', 'woman (pink blossom)'], ['#ffffff', 'man (white blossom)']],
  },
  summer: {
    name: 'Summer', icon: '☀️',
    hills: ['#8cc27a', '#6aab5a', '#4f9444'], ground: ['#5aa844', '#3c7f30'], bark: ['#3e2a1c', '#6e4b30', '#a07a56'],
    leaves: ['#3f9a3e', '#58b04a', '#2f8034', '#74c25a'],
    female: { petal: '#ff7f8e', edge: '#e85a6e', inner: '#ff5f78' }, male: { petal: '#ffe066', edge: '#e8b92e', inner: '#ffc93a' },
    centre: '#ffb02e', particle: 'fluff', particleCols: ['#ffffff', '#fffbe8'], grassFlowers: ['#ffffff', '#ffe066', '#ff7f8e', '#8fb8ff'],
    flyer: 'butterfly', legend: [['#ff7f8e', 'woman (rose)'], ['#ffe066', 'man (buttercup)']],
  },
  autumn: {
    name: 'Autumn', icon: '🍂',
    hills: ['#b08a5a', '#8f6e44', '#6f5634'], ground: ['#8a8a3c', '#5f6428'], bark: ['#3a2618', '#674530', '#9a7050'],
    leaves: ['#e8892e', '#d4582a', '#f2b23a', '#b8442a'],
    female: { petal: '#c8326a', edge: '#9a1e4c', inner: '#e0507e' }, male: { petal: '#fff0b0', edge: '#e0c070', inner: '#ffe48a' },
    centre: '#ffd060', particle: 'leaf', particleCols: ['#e8892e', '#d4582a', '#f2b23a'], grassFlowers: ['#fff0b0', '#c8326a', '#f2b23a', '#ffffff'],
    flyer: 'butterfly', legend: [['#c8326a', 'woman (crimson)'], ['#fff0b0', 'man (pale gold)']],
  },
  winter: {
    name: 'Winter', icon: '❄️', snow: true,
    hills: ['#e2eaf3', '#ccd9e7', '#b8c8db'], ground: ['#f2f6fb', '#c9d6e4'], bark: ['#33261f', '#5a463b', '#8c7a70'],
    leaves: ['#f4f8ff', '#ffffff', '#dce8f4', '#2f6a4a'],
    female: { petal: '#e8679a', edge: '#b83c70', inner: '#ff9ac0' }, male: { petal: '#8fc8ff', edge: '#4a8ad0', inner: '#c4e2ff' },
    centre: '#ffe48a', particle: 'snow', particleCols: ['#ffffff'], grassFlowers: ['#ffffff', '#b69cff', '#ffffff', '#ffe48a'],
    flyer: 'robin', legend: [['#e8679a', 'woman (winter rose)'], ['#8fc8ff', 'man (ice-blue snowdrop)']],
  },
};
const OLD_SEASON = { night: 'spring' };
export const seasonKey = k => TREE_STYLES[k] ? k : OLD_SEASON[k] || 'spring';

// ---------------- time of day ----------------
const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * k));
// sky (top, middle, horizon), the light's colour on the land, and how strongly it tints it
const SKY_KEYS = [
  [0, ['#04071a', '#0b1236', '#1a2350'], '#3e4f96', 0.72],
  [4.6, ['#0b1238', '#262c5c', '#5a4a70'], '#4a5490', 0.62],
  [6.2, ['#33447e', '#c98a96', '#ffb877'], '#e0a080', 0.4],
  [8, ['#5fa8e0', '#a9dcf7', '#fde6d4'], '#fff0dc', 0.12],
  [12, ['#2f86d8', '#7cc2f2', '#e8f6ff'], '#ffffff', 0],
  [16, ['#4a98dc', '#a0d0f0', '#fff0d8'], '#fff2d8', 0.08],
  [18.3, ['#3b2f62', '#d8706a', '#ffb26a'], '#ffb880', 0.38],
  [19.8, ['#151b44', '#3e3270', '#7a4e74'], '#7a6aa0', 0.55],
  [24, ['#04071a', '#0b1236', '#1a2350'], '#3e4f96', 0.72],
];
export function lightAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const [h0, s0, t0, a0] = SKY_KEYS[i], [h1, s1, t1, a1] = SKY_KEYS[i + 1];
  const k = (h - h0) / (h1 - h0), e = k * k * (3 - 2 * k);
  const sky = s0.map((c, j) => mix(c, s1[j], e));
  const tint = mix(t0, t1, e), tintAmt = a0 + (a1 - a0) * e;
  // night: 1 in the small hours, 0 in daylight
  const dark = h < 4.6 || h > 20.4 ? 1 : h < 6.6 ? 1 - (h - 4.6) / 2 : h > 18.4 ? (h - 18.4) / 2 : 0;
  // the sun climbs from the left and sets on the right; the moon follows it across the night sky
  let src;
  if (h > 5.6 && h < 19.4) {
    const p = (h - 5.6) / 13.8;
    const low = 1 - Math.sin(p * Math.PI);
    src = { x: 0.06 + 0.88 * p, y: 0.66 - Math.sin(p * Math.PI) * 0.56, moon: false,
      core: low > 0.55 ? '255,214,150' : '255,250,228', glow: low > 0.45 ? '255,160,90' : low > 0.2 ? '255,224,170' : '255,246,200' };
  } else {
    const p = (((h - 19.4) + 24) % 24) / 10.2;
    src = { x: 0.06 + 0.88 * p, y: 0.66 - Math.sin(p * Math.PI) * 0.5, moon: true, core: '236,240,255', glow: '160,180,255' };
  }
  return { hour: h, sky, tint, tintAmt, dark, sun: src };
}
const shade = (c, tint, amt) => toHex(hex(c).map((v, i) => v * (1 - amt + amt * hex(tint)[i] / 255)));
const lookCache = new Map();
/** Everything the painter needs for a season at an hour: the sky, the light, and every colour lit to match. */
export function makeLook(season, hour) {
  const key = `${seasonKey(season)}|${Math.round(hour * 4) / 4}`;
  if (lookCache.has(key)) return lookCache.get(key);
  const S = TREE_STYLES[seasonKey(season)], L = lightAt(hour);
  const lit = c => shade(c, L.tint, L.tintAmt);
  const flower = f => ({ petal: lit(f.petal), edge: lit(f.edge), inner: lit(f.inner), glow: L.dark > 0.45 ? hex(f.petal).join(',') : null });
  const look = {
    ...S, key, dark: L.dark, sky: L.sky, sun: L.sun,
    rays: !L.sun.moon && L.sun.y < 0.6, clouds: L.dark < 0.65, stars: L.dark > 0.15 ? L.dark : 0,
    hills: S.hills.map(lit), ground: S.ground.map(lit), bark: S.bark.map(lit), leaves: S.leaves.map(lit),
    female: flower(S.female), male: flower(S.male), centre: lit(S.centre), grassFlowers: S.grassFlowers.map(lit),
    particle: S.snow ? 'snow' : L.dark > 0.55 ? 'firefly' : S.particle, particleCols: L.dark > 0.55 && !S.snow ? ['#e8ff8a'] : S.particleCols,
    flyer: L.dark > 0.5 ? null : S.flyer, lit,
  };
  if (lookCache.size > 400) lookCache.clear();
  lookCache.set(key, look);
  return look;
}
export const EST_FLOWER = { petal: '#cdb8ee', edge: '#a28ad0', inner: '#dccbf6' };

// ---------------- backdrop ----------------
const STARS = (() => { const r = seededRandom(9); return Array.from({ length: 160 }, () => [r(), r() * 0.7, 0.5 + r() * 1.3, r() * 6]); })();
const CLOUDS = (() => { const r = seededRandom(4); return Array.from({ length: 5 }, () => ({ x: r(), y: 0.06 + r() * 0.18, s: 0.6 + r() * 0.7, v: 0.003 + r() * 0.005 })); })();
const BLADES = (() => { const r = seededRandom(12); return Array.from({ length: 220 }, () => [r(), 4 + r() * 9, r() * 6, r()]); })();

// The still parts of the scene are painted once into a cached canvas and reused every frame; only the clouds
// drift on top. The cache is repainted when the size, season or ground line changes (e.g. while panning).
let backCache = null, backKey = '';
export function paintBackdrop(ctx, W, H, st, t, groundY, trunkX, dpr = 1) {
  const key = `${W}x${H}@${dpr}|${st.key}|${Math.round(groundY)}|${Math.round(trunkX)}`;
  if (key !== backKey) {
    backKey = key;
    backCache ||= document.createElement('canvas');
    backCache.width = Math.round(W * dpr); backCache.height = Math.round(H * dpr);
    const c = backCache.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintStill(c, W, H, st, groundY, trunkX);
  }
  ctx.drawImage(backCache, 0, 0, W, H);
  if (st.clouds) for (const c of CLOUDS) {
    const x = ((c.x + t * c.v) % 1.3 - 0.15) * W, y = c.y * H, s = c.s * Math.max(22, W * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    for (const [dx, dy, r] of [[-1, 0.15, 0.55], [-0.35, -0.2, 0.75], [0.4, -0.05, 0.62], [1, 0.2, 0.45], [0, 0.25, 0.6]]) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); }
    ctx.fill();
  }
}
function paintStill(ctx, W, H, st, groundY, trunkX) {
  const t = 0;
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(groundY, H * 0.5));
  sky.addColorStop(0, st.sky[0]); sky.addColorStop(0.6, st.sky[1]); sky.addColorStop(1, st.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (st.stars) for (const [x, y, s, ph] of STARS) {
    ctx.globalAlpha = (0.4 + (ph / 6) * 0.55) * st.stars;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x * W, y * H, s, s);
  }
  ctx.globalAlpha = 1;
  // sun or moon with its glow
  const sx = st.sun.x * W, sy = st.sun.y * H, R = Math.max(W, H);
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.55);
  glow.addColorStop(0, `rgba(${st.sun.glow},0.55)`); glow.addColorStop(0.25, `rgba(${st.sun.glow},0.18)`); glow.addColorStop(1, `rgba(${st.sun.glow},0)`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  if (st.rays) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + t * 0.015 + Math.sin(t * 0.2 + i) * 0.03, wdt = 0.05 + (i % 3) * 0.025;
      ctx.fillStyle = `rgba(${st.sun.glow},${0.035 + (i % 2) * 0.02})`;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - wdt) * R * 1.4, sy + Math.sin(a - wdt) * R * 1.4);
      ctx.lineTo(sx + Math.cos(a + wdt) * R * 1.4, sy + Math.sin(a + wdt) * R * 1.4);
      ctx.fill();
    }
    ctx.restore();
  }
  const sr = Math.max(18, Math.min(34, W * 0.025)) * (st.sun.moon ? 0.85 : 1);
  ctx.fillStyle = `rgb(${st.sun.core})`; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
  if (st.sun.moon) {
    ctx.fillStyle = 'rgba(160,170,200,0.35)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [0.05, 0.4, 0.12]]) { ctx.beginPath(); ctx.arc(sx + dx * sr, sy + dy * sr, r * sr, 0, 7); ctx.fill(); }
  }
  // rolling hills, fading into the distance
  st.hills.forEach((col, i) => {
    const base = groundY - (3 - i) * Math.max(16, H * 0.03), amp = 14 + (2 - i) * 10;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, base - amp - Math.sin(x / (160 + i * 70) + i * 2) * amp - Math.sin(x / 63 + i) * amp * 0.25);
    ctx.lineTo(W, H); ctx.fill();
  });
  // the meadow
  const g = ctx.createLinearGradient(0, groundY - 20, 0, H);
  g.addColorStop(0, st.ground[0]); g.addColorStop(1, st.ground[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, groundY + 12);
  ctx.quadraticCurveTo(W * 0.5, groundY - 18, W, groundY + 12); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  // the tree's shadow, cast away from the light
  const away = st.sun.x < 0.5 ? 1 : -1;
  ctx.fillStyle = st.snow ? 'rgba(60,80,120,0.22)' : 'rgba(20,30,10,0.28)'; ctx.beginPath(); ctx.ellipse(trunkX + away * W * 0.06, groundY + 8, Math.max(60, W * 0.16), 12, 0, 0, 7); ctx.fill();
  // grass blades swaying along the top edge
  ctx.strokeStyle = st.ground[0]; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [x, h, ph, k] of BLADES) {
    const bx = x * W, by = groundY + 10 - Math.sin((bx / W) * Math.PI) * 26 + k * 8 + 2;
    ctx.strokeStyle = k < 0.5 ? st.ground[0] : st.leaves[0];
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 1, by - h * 0.6, bx + Math.sin(ph) * 3, by - h); ctx.stroke();
  }
}
/** y of the meadow's top edge at x (it bulges up a little in the middle). */
export const meadowY = (x, W, groundY) => groundY + 10 - Math.sin((x / W) * Math.PI) * 26;

let vigCache = null, vigKey = '';
export function vignette(ctx, W, H, st) {
  const key = `${W}x${H}|${Math.round(st.dark * 10)}`;
  if (key !== vigKey) {
    vigKey = key;
    vigCache ||= document.createElement('canvas');
    vigCache.width = Math.max(1, Math.round(W / 2)); vigCache.height = Math.max(1, Math.round(H / 2));
    const c = vigCache.getContext('2d'); c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    paintVignette(c, W, H, st);
  }
  ctx.drawImage(vigCache, 0, 0, W, H);
}
function paintVignette(ctx, W, H, st) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${st.dark > 0.5 ? '0,0,10' : '30,10,0'},${0.28 + st.dark * 0.22})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------- bark, leaves and blossoms ----------------
export function bezierAt(q, t) {
  const u = 1 - t;
  return [u * u * u * q[0] + 3 * u * u * t * q[2] + 3 * u * t * t * q[4] + t * t * t * q[6], u * u * u * q[1] + 3 * u * u * t * q[3] + 3 * u * t * t * q[5] + t * t * t * q[7]];
}
export function bezTangent(q, t) {
  const u = 1 - t;
  const dx = 3 * u * u * (q[2] - q[0]) + 6 * u * t * (q[4] - q[2]) + 3 * t * t * (q[6] - q[4]);
  const dy = 3 * u * u * (q[3] - q[1]) + 6 * u * t * (q[5] - q[3]) + 3 * t * t * (q[7] - q[5]);
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/**
 * Collects branch segments and strokes them in a few batches (one path per pass and width) instead of
 * thousands of separate strokes, which keeps big trees smooth on phones.
 */
export class BranchBatch {
  constructor() { this.groups = new Map(); }
  seg(pass, color, width, x0, y0, x1, y1, alpha = 1) {
    const w = Math.max(0.6, Math.round(width * 2) / 2), key = `${pass}|${color}|${w}|${alpha}`;
    let g = this.groups.get(key);
    if (!g) this.groups.set(key, g = { pass, color, w, alpha, path: new Path2D() });
    g.path.moveTo(x0, y0); g.path.lineTo(x1, y1);
  }
  /** Adds a tapered branch along bezier q (screen coords) from t0 to t1, w0 wide at t=0 and w1 at t=1. lx: -1 lit from the left. */
  branch(q, t0, t1, w0, w1, st, lx) {
    const n = w0 > 7 ? 10 : w0 > 3 ? 5 : 2;
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * (i / n); const [x, y] = bezierAt(q, t); pts.push([x, y, w0 + (w1 - w0) * t]); }
    for (let i = 0; i < n; i++) {
      const [x0, y0, a] = pts[i], [x1, y1, b] = pts[i + 1], w = (a + b) / 2;
      this.seg(0, st.bark[0], w, x0, y0, x1, y1);
      this.seg(1, st.bark[1], w * 0.72, x0 + lx * 0.1 * a, y0, x1 + lx * 0.1 * b, y1);
      if (w0 > 2.2) this.seg(2, st.bark[2], w * 0.26, x0 + lx * 0.24 * a, y0, x1 + lx * 0.24 * b, y1, 0.75);
      if (st.snow && w0 > 1.6 && Math.abs(x1 - x0) >= Math.abs(y1 - y0) * 0.35) this.seg(3, st.leaves[1], (a + b) * 0.2, x0, y0 - a * 0.42, x1, y1 - b * 0.42, 0.95);
    }
  }
  flush(ctx) {
    ctx.lineCap = 'round';
    [...this.groups.values()].sort((a, b) => a.pass - b.pass || b.w - a.w).forEach(g => {
      ctx.strokeStyle = g.color; ctx.lineWidth = g.w; ctx.globalAlpha = g.alpha; ctx.stroke(g.path);
    });
    ctx.globalAlpha = 1;
    this.groups.clear();
  }
}

/** A tapered branch along bezier q (screen coords) from t0 to t1, w0 wide at t=0 and w1 at t=1. lx: -1 lit from the left, 1 from the right. */
export function drawBranch(ctx, q, t0, t1, w0, w1, st, lx) {
  const snowy = st.snow && w0 > 1.6;
  const n = w0 > 7 ? 10 : w0 > 3 ? 5 : 2;
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * (i / n); const [x, y] = bezierAt(q, t); pts.push([x, y, w0 + (w1 - w0) * t]); }
  ctx.lineCap = 'round';
  const pass = (col, wk, off, alpha = 1) => {
    ctx.strokeStyle = col; ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const [x0, y0, a] = pts[i], [x1, y1, b] = pts[i + 1], w = (a + b) / 2;
      ctx.lineWidth = Math.max(0.6, w * wk);
      ctx.beginPath(); ctx.moveTo(x0 + off * a, y0); ctx.lineTo(x1 + off * b, y1); ctx.stroke();
    }
  };
  pass(st.bark[0], 1, 0);
  pass(st.bark[1], 0.72, lx * 0.1);
  if (w0 > 2.2) pass(st.bark[2], 0.26, lx * 0.24, 0.75);
  if (snowy) {
    // a ridge of snow along the top of the branch
    ctx.strokeStyle = st.leaves[1]; ctx.globalAlpha = 0.95;
    for (let i = 0; i < n; i++) {
      const [x0, y0, a] = pts[i], [x1, y1, b] = pts[i + 1];
      if (Math.abs(x1 - x0) < Math.abs(y1 - y0) * 0.35) continue; // little settles on steep parts
      ctx.lineWidth = Math.max(0.8, (a + b) * 0.2);
      ctx.beginPath(); ctx.moveTo(x0, y0 - a * 0.42); ctx.lineTo(x1, y1 - b * 0.42); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Adds a leaf outline to a Path2D (no transforms), so many leaves of one colour can be filled at once. */
export function addLeaf(path, x, y, size, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), ex = x + c * size, ey = y + s * size;
  const mx = x + c * size * 0.5, my = y + s * size * 0.5, px = -s * size * 0.42, py = c * size * 0.42;
  path.moveTo(x, y); path.quadraticCurveTo(mx + px, my + py, ex, ey); path.quadraticCurveTo(mx - px, my - py, x, y);
}
const glowCache = new Map();
/** A soft round glow, drawn once per colour and reused (much cheaper than a gradient per flower). rgb: '255,236,150' */
export function drawGlow(ctx, x, y, r, rgb, alpha = 1) {
  let g = glowCache.get(rgb);
  if (!g) {
    g = document.createElement('canvas'); g.width = g.height = 64;
    const c = g.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},0.6)`); gr.addColorStop(0.5, `rgba(${rgb},0.22)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    glowCache.set(rgb, g);
  }
  ctx.globalAlpha = alpha; ctx.drawImage(g, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}

export function drawLeaf(ctx, x, y, size, ang, col, vein) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(size * 0.5, -size * 0.42, size, 0); ctx.quadraticCurveTo(size * 0.5, size * 0.42, 0, 0); ctx.fill();
  if (vein) { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(size * 0.1, 0); ctx.lineTo(size * 0.85, 0); ctx.stroke(); }
  ctx.restore();
}

// Blossoms are drawn once into small sprites (per colour, sex, how open and which way turned) and reused.
const flowerCache = new Map();
export function drawFlowerFast(ctx, x, y, r, open, female, pal, centre, spin = 0, glowing = false) {
  if (open <= 0 || r <= 0) return;
  if (r < 3) { drawFlower(ctx, x, y, r, open, female, pal, centre, spin, false); return; }
  const o = Math.round(open * 10) / 10, sp = Math.round(((spin % 6.283) / 6.283) * 8) % 8;
  const key = `${pal.petal}${pal.edge}${pal.inner}${centre}${female ? 1 : 0}|${o}|${sp}`;
  let spr = flowerCache.get(key);
  if (!spr) {
    spr = document.createElement('canvas'); spr.width = spr.height = 72;
    drawFlower(spr.getContext('2d'), 36, 36, 26, o, female, pal, centre, sp / 8 * 6.283, false);
    if (flowerCache.size > 500) flowerCache.clear();
    flowerCache.set(key, spr);
  }
  if (glowing && pal.glow) drawGlow(ctx, x, y, r * 2.6, pal.glow);
  const s = r / 26;
  ctx.drawImage(spr, x - 36 * s, y - 36 * s, 72 * s, 72 * s);
}

/** A blossom: a bud that swells and opens. open 0..1, female: 5 round petals, male: 6 slender ones. */
export function drawFlower(ctx, x, y, r, open, female, pal, centre, spin = 0, glowing = false) {
  if (open <= 0 || r <= 0) return;
  if (glowing && pal.glow) drawGlow(ctx, x, y, r * 2.6, pal.glow);
  if (open < 0.35) {
    // the bud
    const k = open / 0.35;
    ctx.fillStyle = '#5a9a3a'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.32 * k + 1, r * 0.42 * k + 1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = pal.edge; ctx.beginPath(); ctx.ellipse(x, y - r * 0.12 * k, r * 0.24 * k + 0.5, r * 0.34 * k + 0.5, 0, 0, 7); ctx.fill();
    return;
  }
  const k = (open - 0.35) / 0.65, e = 1 - Math.pow(1 - k, 3);
  const n = female ? 5 : 6, rx = (female ? 0.5 : 0.56) * r * e, ry = (female ? 0.42 : 0.27) * r * e, d = r * 0.5 * e;
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin + (1 - e) * 0.8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.rotate(a); ctx.translate(d, 0);
    ctx.fillStyle = pal.petal; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = Math.max(0.6, r * 0.06); ctx.stroke();
    ctx.fillStyle = pal.inner; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(-rx * 0.45, 0, rx * 0.45, ry * 0.55, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  ctx.fillStyle = centre; ctx.beginPath(); ctx.arc(0, 0, r * 0.24 * e, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,90,20,0.75)';
  for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3 * e, Math.sin(a) * r * 0.3 * e, Math.max(0.6, r * 0.05), 0, 7); ctx.fill(); }
  // a gleam on the lit side
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-r * 0.12 * e, -r * 0.14 * e, r * 0.1 * e, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------------- life ----------------
const BUTTERFLY = [['#ffb347', '#a8501a'], ['#7ec8ff', '#2a5a9a'], ['#ff8fd0', '#9a2a6a'], ['#fff27a', '#a88a1a'], ['#b48cff', '#4a2a8a'], ['#ffffff', '#7a7a8a']];

/**
 * Butterflies, caterpillars, meadow flowers and falling petals. Positions are in tree (layout) coordinates,
 * so they move with pan and zoom; env.X/env.Y turn them into screen coordinates.
 */
export class Life {
  constructor(seed = 1) { this.rnd = seededRandom(seed); this.reset(); }
  reset() { this.flies = []; this.cats = []; this.meadow = []; this.bits = []; this.beasts = []; this.catClock = 2; this.bitClock = 0; this.beastClock = 5; }
  bloom(x, y, env) {
    const r = this.rnd;
    if (this.meadow.length < 160) this.meadow.push({ x: env.groundSpan[0] + r() * (env.groundSpan[1] - env.groundSpan[0]), dy: r() * 26, t: 0, ci: Math.floor(r() * 12), s: 0.7 + r() * 0.6, d: 0.6 + r() * 1.4 });
    if (env.st.flyer && this.flies.length < 9 && r() < 0.16) this.spawnFly(x, y + 10);
  }
  spawnFly(x, y) {
    const r = this.rnd;
    this.flies.push({ x, y, vx: (r() - 0.5) * 30, vy: -20, tx: x, ty: y - 40, retarget: 0, age: 0, life: 10 + r() * 8, cols: BUTTERFLY[Math.floor(r() * BUTTERFLY.length)], ph: r() * 6, s: 0.8 + r() * 0.5 });
  }
  update(dt, env) {
    const r = this.rnd;
    // butterflies wander from flower to flower, then flutter away
    for (const f of this.flies) {
      f.age += dt; f.retarget -= dt;
      if (f.age > f.life) { f.tx = f.x + (f.x > env.midX ? 300 : -300); f.ty = f.y - 400; }
      else if (f.retarget <= 0 && env.flowers.length) {
        const fl = env.flowers[Math.floor(r() * env.flowers.length)];
        f.tx = fl[0] + (r() - 0.5) * 30; f.ty = fl[1] - 10 - r() * 25; f.retarget = 1.5 + r() * 2.5;
      }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
      f.vx += (dx / d * 70 - f.vx) * dt * 1.6 + (r() - 0.5) * 140 * dt;
      f.vy += (dy / d * 70 - f.vy) * dt * 1.6 + (r() - 0.5) * 140 * dt + Math.sin(f.age * 7 + f.ph) * 40 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    this.flies = this.flies.filter(f => f.age < f.life + 7);
    // caterpillars inch along grown branches; at the end of their walk they become butterflies
    this.catClock -= dt;
    if (this.catClock <= 0 && this.cats.length < 4 && env.branches.length && env.st.flyer === 'butterfly') {
      this.catClock = 4 + r() * 5;
      const b = env.branches[Math.floor(r() * env.branches.length)];
      if (b.full && b.w > 3) this.cats.push({ b, s: 0.12 + r() * 0.2, speed: 0.025 + r() * 0.025, ph: r() * 6, col: r() < 0.5 ? ['#7cc84a', '#c8e86a'] : ['#f0a030', '#ffe080'], age: 0 });
    }
    for (const c of this.cats) {
      c.age += dt;
      c.s += c.speed * dt * (0.25 + Math.max(0, Math.sin(c.age * 4 + c.ph)) * 1.5);
      if (c.s > 0.9 || !c.b.full) { c.done = true; if (c.b.full && env.st.flyer) { const p = env.bezWorld(c.b, c.s); this.spawnFly(p[0], p[1]); } }
    }
    this.cats = this.cats.filter(c => !c.done && env.branches.includes(c.b));
    for (const m of this.meadow) m.t += dt;
    this.updateBeasts(dt, env);
    // falling petals, leaves, summer fluff or fireflies
    this.bitClock -= dt;
    const snowing = env.st.particle === 'snow';
    if (this.bitClock <= 0 && (env.flowers.length || snowing) && this.bits.length < (snowing ? 90 : 40)) {
      this.bitClock = snowing ? 0.06 + r() * 0.08 : 0.35 + r() * 0.6;
      const fl = snowing ? [env.groundSpan[0] + r() * (env.groundSpan[1] - env.groundSpan[0]), env.topY - 40] : env.flowers[Math.floor(r() * env.flowers.length)];
      this.bits.push({ x: fl[0], y: fl[1], vx: (r() - 0.5) * 12, vy: env.st.particle === 'firefly' ? (r() - 0.5) * 10 : 8 + r() * 14, rot: r() * 6, vr: (r() - 0.5) * 3, age: 0, life: 7 + r() * 6, col: env.st.particleCols[Math.floor(r() * env.st.particleCols.length)], ph: r() * 6 });
    }
    for (const b of this.bits) {
      b.age += dt;
      if (env.st.particle === 'firefly') { b.vx += (r() - 0.5) * 40 * dt; b.vy += (r() - 0.5) * 40 * dt; b.vx *= 0.98; b.vy *= 0.98; }
      else { b.vx = Math.sin(b.age * 1.7 + b.ph) * (env.st.particle === 'snow' ? 10 : 18); if (b.y > env.groundY - 4) { b.vy = 0; b.vx = 0; b.vr = 0; } }
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
    }
    this.bits = this.bits.filter(b => b.age < b.life);
  }
  // ---- a few mammals: rabbits (white hares in winter), deer, red squirrels on the branches, foxes at
  // dusk and hedgehogs at night ----
  updateBeasts(dt, env) {
    const r = this.rnd, st = env.st;
    this.beastClock -= dt;
    if (this.beastClock <= 0 && env.flowers.length > 6) {
      this.beastClock = 5 + r() * 7;
      const kinds = [];
      if (st.dark < 0.45) kinds.push(st.snow ? 'hare' : 'rabbit', 'deer', st.snow ? 'deer' : 'squirrel');
      if (st.dark > 0.25) kinds.push('fox');
      if (st.dark > 0.55 && !st.snow) kinds.push('hedgehog', 'hedgehog');
      const kind = kinds[Math.floor(r() * kinds.length)];
      const onGround = this.beasts.filter(b => b.kind !== 'squirrel').length;
      if (kind === 'squirrel') {
        const ok = env.branches.filter(b => b.full && b.w > 3 && b.wWorld > 2);
        if (ok.length && !this.beasts.some(b => b.kind === 'squirrel')) this.beasts.push({ kind, b: ok[Math.floor(r() * ok.length)], s: 0.15, dir: 1, speed: 0.18 + r() * 0.1, pause: 0, age: 0, ph: r() * 6 });
      } else if (kind && onGround < 3) {
        const fromLeft = r() < 0.5, [x0, x1] = env.groundSpan;
        const speed = { rabbit: 34, hare: 40, deer: 14, fox: 30, hedgehog: 7 }[kind];
        this.beasts.push({ kind, x: fromLeft ? x0 - 40 : x1 + 40, dy: 6 + r() * 18, dir: fromLeft ? 1 : -1, speed, pause: 0, age: 0, ph: r() * 6, antlers: r() < 0.5, s: 0.85 + r() * 0.3 });
      }
    }
    for (const b of this.beasts) {
      b.age += dt;
      if (b.kind === 'squirrel') {
        if (!env.branches.includes(b.b)) { b.gone = true; continue; }
        if (b.pause > 0) { b.pause -= dt; continue; }
        b.s += b.dir * b.speed * dt;
        if (r() < dt * 0.5) b.pause = 0.6 + r() * 1.4;
        if (b.s > 0.95) { b.dir = -1; } else if (b.s < 0.08 && b.dir < 0) b.gone = true;
        continue;
      }
      if (b.pause > 0) { b.pause -= dt; continue; }
      if (r() < dt * (b.kind === 'deer' ? 0.25 : 0.15)) b.pause = b.kind === 'deer' ? 2.5 + r() * 3 : 0.8 + r() * 1.6; // stop to graze or sniff the air
      const hop = b.kind === 'rabbit' || b.kind === 'hare' ? Math.max(0, Math.sin(b.age * 9 + b.ph)) * 1.8 : 1;
      b.x += b.dir * b.speed * hop * dt;
      if (b.x < env.groundSpan[0] - 80 || b.x > env.groundSpan[1] + 80) b.gone = true;
    }
    this.beasts = this.beasts.filter(b => !b.gone);
  }
  drawBeasts(ctx, env, t) {
    const { X, Y, k, st } = env, lit = st.lit || (c => c);
    for (const b of this.beasts) {
      if (b.kind === 'squirrel') {
        const [wx, wy] = env.bezWorld(b.b, b.s), [tx, ty] = env.bezTanWorld(b.b, b.s);
        let nx = -ty, ny = tx; if (ny > 0) { nx = -nx; ny = -ny; }
        const off = b.b.wWorld * 0.5 + 3;
        const x = X(wx + nx * off), y = Y(wy + ny * off), s = 4.2 * k;
        const face = (tx * b.dir) >= 0 ? 1 : -1, bob = b.pause > 0 ? 0 : Math.abs(Math.sin(b.age * 14)) * s * 0.3;
        ctx.save(); ctx.translate(x, y - bob); ctx.scale(face, 1);
        ctx.strokeStyle = lit('#b4552a'); ctx.lineWidth = s * 0.9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.quadraticCurveTo(-s * 2.4, -s * 0.4, -s * 1.6, -s * 2.2); ctx.quadraticCurveTo(-s * 0.9, -s * 2.8, -s * 1.2, -s * 1.6); ctx.stroke();
        ctx.fillStyle = lit('#c0602e'); ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s, s * 0.7, -0.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.9, -s * 0.8, s * 0.55, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 1.2); ctx.lineTo(s * 0.8, -s * 1.75); ctx.lineTo(s * 1.0, -s * 1.2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 1.1, -s * 0.9, s * 0.1, 0, 7); ctx.fill();
        ctx.restore();
        continue;
      }
      const x = X(b.x), base = Y(env.groundY) + b.dy * k, s = 5 * k * b.s, face = b.dir;
      const moving = b.pause <= 0;
      ctx.save(); ctx.translate(x, base); ctx.scale(face, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, s * (b.kind === 'deer' ? 2.6 : 1.6), s * 0.35, 0, 0, 7); ctx.fill();
      if (b.kind === 'rabbit' || b.kind === 'hare') {
        const up = moving ? Math.max(0, Math.sin(b.age * 9 + b.ph)) * s * 1.4 : 0;
        const fur = lit(b.kind === 'hare' ? '#f2f2f6' : '#9a7a5a');
        ctx.translate(0, -up);
        ctx.fillStyle = fur;
        ctx.beginPath(); ctx.ellipse(0, -s * 0.9, s * 1.2, s * 0.85, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 1.1, -s * 1.6, s * 0.6, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 0.9, -s * 2.6, s * 0.18, s * 0.7, -0.2, 0, 7); ctx.ellipse(s * 1.25, -s * 2.55, s * 0.18, s * 0.7, 0.15, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-s * 1.15, -s * 1.0, s * 0.35, 0, 7); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s * 1.35, -s * 1.7, s * 0.1, 0, 7); ctx.fill();
      } else if (b.kind === 'deer') {
        const coat = lit('#a8703e'), legT = moving ? b.age * 5 : 0, graze = b.pause > 0;
        ctx.strokeStyle = lit('#7a4e2a'); ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
        for (const [lx0, ph] of [[-1.4, 0], [-1.0, 2], [1.0, 1], [1.4, 3]]) { ctx.beginPath(); ctx.moveTo(lx0 * s, -s * 2.2); ctx.lineTo(lx0 * s + Math.sin(legT + ph) * s * 0.4, 0); ctx.stroke(); }
        ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, -s * 2.6, s * 2.1, s * 0.85, 0, 0, 7); ctx.fill();
        const hx = graze ? s * 2.3 : s * 2.2, hy = graze ? -s * 0.6 : -s * 4.2;
        ctx.strokeStyle = coat; ctx.lineWidth = s * 0.7; ctx.beginPath(); ctx.moveTo(s * 1.6, -s * 2.9); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx + s * 0.4, hy, s * 0.7, s * 0.4, graze ? 0.9 : 0.25, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx - s * 0.15, hy - s * 0.4, s * 0.15, s * 0.4, -0.5, 0, 7); ctx.fill();
        if (b.antlers) { ctx.strokeStyle = lit('#d8c4a0'); ctx.lineWidth = s * 0.15; ctx.beginPath(); ctx.moveTo(hx, hy - s * 0.3); ctx.lineTo(hx - s * 0.3, hy - s * 1.6); ctx.moveTo(hx - s * 0.15, hy - s * 0.9); ctx.lineTo(hx + s * 0.4, hy - s * 1.3); ctx.moveTo(hx - s * 0.25, hy - s * 1.3); ctx.lineTo(hx - s * 0.8, hy - s * 1.8); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-s * 2.1, -s * 2.8, s * 0.25, s * 0.35, 0, 0, 7); ctx.fill();
      } else if (b.kind === 'fox') {
        const coat = lit('#e07a2e'), legT = moving ? b.age * 12 : 0;
        ctx.strokeStyle = lit('#3a2418'); ctx.lineWidth = s * 0.25; ctx.lineCap = 'round';
        for (const [lx0, ph] of [[-0.9, 0], [-0.5, 2], [0.7, 1], [1.0, 3]]) { ctx.beginPath(); ctx.moveTo(lx0 * s, -s * 1.1); ctx.lineTo(lx0 * s + Math.sin(legT + ph) * s * 0.35, 0); ctx.stroke(); }
        ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, -s * 1.4, s * 1.5, s * 0.6, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-s * 2.1, -s * 1.5, s * 1.1, s * 0.45, 0.25, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-s * 3.0, -s * 1.3, s * 0.35, s * 0.3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 1.9); ctx.lineTo(s * 2.4, -s * 1.5); ctx.lineTo(s * 1.3, -s * 1.1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 1.8); ctx.lineTo(s * 1.35, -s * 2.5); ctx.lineTo(s * 1.65, -s * 1.85); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s * 2.4, -s * 1.5, s * 0.12, 0, 7); ctx.fill();
      } else if (b.kind === 'hedgehog') {
        ctx.fillStyle = lit('#6a4a32'); ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 1.2, s * 0.8, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = lit('#3a2818'); ctx.lineWidth = s * 0.12;
        ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) / 9 * Math.PI, cx = Math.cos(a) * s * 1.1, cy = -s * 0.5 + Math.sin(a) * s * 0.75; ctx.moveTo(cx, cy); ctx.lineTo(cx * 1.3, cy - s * 0.35); } ctx.stroke();
        ctx.fillStyle = lit('#c8a888'); ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.7); ctx.lineTo(s * 1.8, -s * 0.3); ctx.lineTo(s * 0.9, -s * 0.1); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 1.8, -s * 0.3, s * 0.12, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }
  drawMeadow(ctx, env) {
    const { X, Y, k } = env;
    const cols = env.st.grassFlowers, stems = new Path2D(), heads = cols.map(() => new Path2D()), mids = new Path2D();
    for (const m of this.meadow) {
      const g = Math.min(1, m.t / m.d), x = X(m.x), base = Y(env.groundY) + m.dy * k;
      const h = (8 + m.s * 10) * k * Math.min(1, g * 1.6);
      stems.moveTo(x, base); stems.quadraticCurveTo(x + 2 * k, base - h * 0.5, x, base - h);
      const open = Math.max(0, (g - 0.4) / 0.6);
      if (open > 0) {
        const rr = (2.4 + m.s * 1.8) * k * open, path = heads[m.ci % cols.length];
        for (let i = 0; i < 5; i++) { const a = i * 1.2566, cx = x + Math.cos(a) * rr * 0.8, cy = base - h + Math.sin(a) * rr * 0.8; path.moveTo(cx + rr * 0.62, cy); path.arc(cx, cy, rr * 0.62, 0, 7); }
        mids.moveTo(x + rr * 0.45, base - h); mids.arc(x, base - h, rr * 0.45, 0, 7);
      }
    }
    ctx.strokeStyle = env.st.lit ? env.st.lit('#3f8a34') : '#3f8a34'; ctx.lineWidth = Math.max(1, 1.2 * k); ctx.stroke(stems);
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(heads[i]); });
    ctx.fillStyle = env.st.lit ? env.st.lit('#ffcf3a') : '#ffcf3a'; ctx.fill(mids);
  }
  drawCreatures(ctx, env, t) {
    const { X, Y, k } = env;
    this.drawBeasts(ctx, env, t);
    // caterpillars
    for (const c of this.cats) {
      const segs = 7;
      for (let i = segs - 1; i >= 0; i--) {
        const s = Math.max(0.01, c.s - i * 0.012);
        const [wx, wy] = env.bezWorld(c.b, s), [tx, ty] = env.bezTanWorld(c.b, s);
        let nx = -ty, ny = tx; if (ny > 0) { nx = -nx; ny = -ny; } // the upper side of the branch
        const hump = Math.max(0, Math.sin(c.age * 4 + c.ph - i * 0.7)) * 2.2;
        const off = c.b.wWorld * 0.5 + 2.4 + hump;
        const x = X(wx + nx * off), y = Y(wy + ny * off), rr = (i === 0 ? 3 : 2.6) * k;
        ctx.fillStyle = i === 0 ? '#3a5a1a' : c.col[i % 2]; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
        if (i === 0) {
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(0.6, 0.7 * k);
          ctx.beginPath(); ctx.moveTo(x, y - rr * 0.6); ctx.lineTo(x + tx * 3 * k + nx * 3 * k, y + ty * 3 * k + ny * 3 * k); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + tx * rr * 0.4, y + ty * rr * 0.4 - rr * 0.2, rr * 0.3, 0, 7); ctx.fill();
        }
      }
    }
    // butterflies (or robins in winter)
    if (env.st.flyer === 'robin') for (const f of this.flies) {
      const x = X(f.x), y = Y(f.y), s = 5.5 * f.s * k, flap = Math.sin(t * 16 + f.ph);
      const face = f.vx >= 0 ? 1 : -1;
      ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
      ctx.fillStyle = '#7a5a3e'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8562e'; ctx.beginPath(); ctx.ellipse(s * 0.35, s * 0.2, s * 0.55, s * 0.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5a3e'; ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.45, s * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.55, s * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8b040'; ctx.beginPath(); ctx.moveTo(s * 1.15, -s * 0.45); ctx.lineTo(s * 1.45, -s * 0.38); ctx.lineTo(s * 1.15, -s * 0.3); ctx.fill();
      ctx.fillStyle = '#5a3e2a'; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.2 - flap * s * 0.35, s * 0.6, s * 0.28, -0.3 - flap * 0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.4, -s * 0.25); ctx.lineTo(-s * 1.35, s * 0.2); ctx.fill();
      ctx.restore();
    }
    else for (const f of this.flies) {
      const x = X(f.x), y = Y(f.y), s = 6 * f.s * k;
      const flap = 0.2 + 0.8 * Math.abs(Math.sin(t * 13 + f.ph));
      const tilt = Math.max(-0.5, Math.min(0.5, f.vx / 120));
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side * flap, 1);
        ctx.fillStyle = f.cols[0];
        ctx.beginPath(); ctx.ellipse(s * 0.75, -s * 0.45, s * 0.8, s * 0.62, -0.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 0.55, s * 0.45, s * 0.5, s * 0.4, 0.5, 0, 7); ctx.fill();
        ctx.fillStyle = f.cols[1]; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.55, s * 0.2, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.14, s * 0.7, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // petals, leaves, fluff, fireflies
    for (const b of this.bits) {
      const x = X(b.x), y = Y(b.y), fade = Math.min(1, (b.life - b.age) / 1.5, b.age / 0.4);
      ctx.globalAlpha = Math.max(0, fade);
      if (env.st.particle === 'firefly') {
        const on = 0.4 + 0.6 * Math.max(0, Math.sin(b.age * 3 + b.ph));
        drawGlow(ctx, x, y, 9 * k, '232,255,138', Math.max(0, fade) * on);
        ctx.globalAlpha = Math.max(0, fade);
      } else if (env.st.particle === 'fluff') {
        ctx.strokeStyle = b.col; ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) { const a = i * 1.047 + b.rot; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 3 * k, y + Math.sin(a) * 3 * k); ctx.stroke(); }
      } else if (env.st.particle === 'snow') {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, (1.3 + (b.ph % 1.5)) * k, 0, 7); ctx.fill();
      } else if (env.st.particle === 'leaf') drawLeaf(ctx, x, y, 7 * k, b.rot, b.col, false);
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot); ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(0, 0, 3.4 * k, 2.2 * k, 0, 0, 7); ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
}
