// Story mode towns. Every town in the file gets its own street plan (seeded from its name), and the same
// streets exist in every year: the further back you go, the more of the outskirts are still fields, the
// roads turn from tarmac to setts to mud, and slate gives way to thatch.
import { hashString, seededRandom } from './ancestry.js';
import { eraOf, lotName } from './storyplot.js';
import { makeNet } from './storynet.js';

export const TILE = 32;
export const G = { GRASS: 0, ROAD: 1, PAVE: 2, BUILD: 3, WATER: 4, PLAZA: 5, FIELD: 6, YARD: 7, APRON: 8, TREE: 9, SAND: 10 };
const STONE = new Set(['pennine', 'cotswold', 'granite', 'scotstone', 'tenement', 'lakeland', 'blackhouse', 'welsh', 'valleys', 'irishcottage', 'colliery']);
const MED = new Set(['med', 'stucco', 'flatroof']);
const WOOD = new Set(['clapboard', 'veranda', 'wooden', 'nordic', 'chattel', 'stilt']);
const pick = (r, a) => a[Math.floor(r() * a.length)];

const SPECIAL_SIZE = { church: [4, 6], hall: [6, 4], pub: [3, 3], post: [4, 3], police: [4, 3], school: [6, 3], infirmary: [6, 4], office: [4, 4], works: [8, 5], farm: [4, 3], hub: [6, 3] };

/** Build the town as it stood in `year`, on its street plan (opts.net, or one drawn from the town's name). */
export function buildTown(town, year, opts = {}) {
  const era = eraOf(year);
  const net = opts.net || makeNet(town);
  const rnd = seededRandom(hashString('town' + town.id));
  const { W, H } = net, cx = net.centre.x, cy = net.centre.y, R = net.radius;
  const tiles = new Uint8Array(W * H), zone = new Uint8Array(W * H), wayAt = new Int16Array(W * H).fill(-1), keep = new Uint8Array(W * H);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const get = (x, y) => inb(x, y) ? tiles[y * W + x] : G.WATER;
  const set = (x, y, v) => { if (inb(x, y)) tiles[y * W + x] = v; };
  const fill = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v); };
  const buildings = [], homes = [], props = [], lots = {}, parkSpots = [], blocks = [];
  const air = year >= 1950;
  // every tile whose middle is within r of the line from a to b
  const stamp = (a, b, r, fn) => {
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - r - 1)), x1 = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x) + r + 1)), y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - r - 1)), y1 = Math.min(H - 1, Math.ceil(Math.max(a.y, b.y) + r + 1));
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / l2));
      if (Math.hypot(x + 0.5 - a.x - dx * t, y + 0.5 - a.y - dy * t) <= r) fn(x, y);
    }
  };
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
  const polyFill = (poly, fn) => {
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) if (inPoly(poly, x + 0.5, y + 0.5)) fn(x, y);
  };
  // Water first, then parks, then the roads over the top (so every road that meets a river is a bridge).
  for (const w of net.water || []) {
    if (w.line) for (let i = 1; i < w.line.length; i++) stamp(w.line[i - 1], w.line[i], w.r, (x, y) => set(x, y, G.WATER));
    else polyFill(w.poly, (x, y) => set(x, y, G.WATER));
  }
  for (const gp of net.green || []) polyFill(gp.poly, (x, y) => { if (tiles[y * W + x] === G.GRASS) keep[y * W + x] = 2; });
  // a bridge is wider than the road it carries: decking either side, so nothing catches on the water
  for (const w of net.ways) for (let i = 1; i < w.pts.length; i++) stamp(net.nodes[w.pts[i - 1]], net.nodes[w.pts[i]], 2.25, (x, y) => { if (tiles[y * W + x] === G.WATER) tiles[y * W + x] = G.PAVE; });
  net.ways.forEach((w, wi) => {
    const r = w.cls === 0 ? 1.12 : 1.0;
    for (let i = 1; i < w.pts.length; i++) stamp(net.nodes[w.pts[i - 1]], net.nodes[w.pts[i]], r, (x, y) => { tiles[y * W + x] = G.ROAD; if (wayAt[y * W + x] < 0 || w.cls === 0) wayAt[y * W + x] = wi; });
  });
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (tiles[y * W + x] === G.ROAD) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tiles[(y + dy) * W + x + dx] === G.GRASS) tiles[(y + dy) * W + x + dx] = G.PAVE;
  // how far every tile is from a road
  const dRoad = new Uint8Array(W * H).fill(255);
  { const q = []; for (let k = 0; k < W * H; k++) if (tiles[k] === G.ROAD) { dRoad[k] = 0; q.push(k); }
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k - x) / W, d = dRoad[k] + 1; if (d > 60) continue; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || dRoad[ny * W + nx] <= d) continue; dRoad[ny * W + nx] = d; q.push(ny * W + nx); } } }
  // The old middle has always been there; the rest was built outwards over the centuries.
  const ringAt = (x, y) => { const d = Math.hypot(x - cx, y - cy) / R; return d < 0.2 ? 0 : d < 0.4 ? 1 : d < 0.66 ? 2 : 3; };
  const builtAt = (x, y) => { const rg = ringAt(x, y); if (rg <= 1) return 0; const h = hsh(Math.floor(x / 14) + 7, Math.floor(y / 14) + 3); return rg === 2 ? 1690 + Math.floor(h * 190) : 1850 + Math.floor(h * 125); };

  const addB = (x, y, w, h, kind, extra = {}) => { const b = { x, y, w, h, kind, ...extra }; buildings.push(b); fill(x, y, x + w - 1, y + h - 1, G.BUILD); return b; };
  const lot = (kind, tx, ty, b) => { lots[kind] = { kind, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, tx, ty, b, name: lotName(kind, town, year) }; };
  const free = (x0, y0, x1, y1) => { if (x0 < 3 || y0 < 3 || x1 > W - 4 || y1 > H - 4) return false; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[y * W + x] !== G.GRASS) return false; return true; };
  // A plot of bw by bh with a road along its south side (or, failing that, its north), as near (wx, wy) as can be had.
  const findPlot = (bw, bh, wx, wy, pad = 1) => {
    let best = null, bd = 1e9;
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
      if (tiles[y * W + x] !== G.PAVE) continue;
      const d = Math.hypot(x - wx, y - wy);
      if (d >= bd) continue;
      const x0 = x - (bw >> 1);
      if (tiles[(y + 1) * W + x] === G.ROAD && free(x0 - pad, y - bh - pad, x0 + bw - 1 + pad, y - 1)) { best = { x0, y0: y - bh, door: { x, y }, south: true }; bd = d; }
      else if (d + 8 < bd && tiles[(y - 1) * W + x] === G.ROAD && free(x0 - pad, y + 1, x0 + bw - 1 + pad, y + bh + pad)) { best = { x0, y0: y + 1, door: { x, y }, south: false }; bd = d + 8; }
    }
    return best;
  };
  const GROUND = { church: G.GRASS, school: G.YARD, works: G.YARD, police: G.YARD, farm: G.FIELD, hub: G.APRON, pub: G.YARD };
  const EDGE = { church: 'wall', school: 'fence', works: 'wall', farm: 'hedge', infirmary: 'hedge', police: 'wall' };
  const landmark = (kind, wx, wy, pad = 1) => {
    const [bw, bh] = SPECIAL_SIZE[kind];
    const pl = findPlot(bw, bh, wx, wy, pad) || findPlot(bw, bh, wx, wy, 0) || findPlot(Math.min(bw, 3), Math.min(bh, 2), wx, wy, 0);
    if (!pl) { const tx = Math.round(wx), ty = Math.round(wy); lot(kind, tx, ty, null); return null; }   // nowhere at all: at least the place exists
    const w = pl.x0 + bw - 1 <= W - 4 ? bw : 3, h = bh;
    const gx0 = pl.x0 - pad, gy0 = pl.y0 - (pl.south ? pad : 0), gx1 = pl.x0 + w - 1 + pad, gy1 = pl.y0 + h - 1 + (pl.south ? 0 : pad);
    const gk = GROUND[kind] ?? G.GRASS;
    for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) if (get(x, y) === G.GRASS) { keep[y * W + x] = 1; if (gk === G.FIELD) { tiles[y * W + x] = G.FIELD; zone[y * W + x] = 3; } else tiles[y * W + x] = gk; }
    const main = addB(pl.x0, pl.y0, w, h, kind, { door: pl.door });
    lot(kind, pl.door.x, pl.door.y, main);
    const blk = { x0: gx0, y0: gy0, x1: gx1, y1: gy1, kind, edge: EDGE[kind] || 'none', main, south: pl.south };
    blocks.push(blk);
    return blk;
  };
  // The market place: an open square as near the middle as there is room for one.
  {
    const pl = findPlot(9, 6, cx, cy, 0) || findPlot(6, 4, cx, cy, 0) || { x0: Math.round(cx) - 3, y0: Math.round(cy) - 4, door: { x: Math.round(cx), y: Math.round(cy) }, south: true, none: true };
    const pw = pl.none ? 0 : free(pl.x0, pl.y0, pl.x0 + 8, pl.y0 + 5) ? 9 : 6, ph = pw === 9 ? 6 : 4;
    const x0 = pl.x0, y0 = pl.y0, x1 = x0 + pw - 1, y1 = y0 + ph - 1;
    if (pw) {
      fill(x0, y0, x1, y1, G.PLAZA);
      const pr = seededRandom(hashString('mkt' + town.id));
      for (let i = 0; i < 5; i++) props.push({ t: 'stall', x: x0 + 1 + Math.floor(pr() * (pw - 3)), y: y0 + 1 + Math.floor(pr() * (ph - 2)), c: pick(pr, ['#c8443a', '#3a6ac8', '#e0b030', '#3a9a5a', '#e8e0d0']) });
      props.push({ t: 'cross', x: x0 + pw / 2 - 0.5, y: y0 + ph / 2 - 0.5, memorial: year >= 1920 });
      if (year < 1837) props.push({ t: 'stocks', x: x1 - 1, y: y1 - 1 });
      props.push({ t: year >= 1860 ? 'fountain' : 'pump', x: x1 - 1.5, y: y0 + 0.5 });
      for (let i = 0; i < 3; i++) props.push({ t: year >= 1900 ? 'bench' : 'barrel', x: x0 + 1 + i * 2, y: pl.south ? y0 : y1 });
      blocks.push({ x0, y0, x1, y1, kind: 'market', edge: 'none' });
    }
    lot('market', pl.door.x, pl.door.y, null);
    const phx = pw ? (pl.door.x - 3 >= x0 ? pl.door.x - 3 : x0) : pl.door.x + 2, phy = pl.door.y;
    lot('phone', phx, phy, null);
    props.push({ t: 'phone', x: phx, y: phy });
    props.push({ t: 'board', x: pl.door.x, y: pl.south ? pl.door.y - 1 : pl.door.y + 1 });
  }
  // The landmarks, round the market place; then the ones that want room, further out.
  {
    const a0 = rnd() * 6.28, mk = lots.market, mx = mk.tx, my = mk.ty;
    ['church', 'hall', 'pub', 'post', 'police', 'school', 'infirmary', 'office'].forEach((kind, n) => {
      const a = a0 + n * 0.785 + (rnd() - 0.5) * 0.4, r = 11 + rnd() * 12;
      const blk = landmark(kind, mx + Math.cos(a) * r, my + Math.sin(a) * r, kind === 'church' ? 2 : 1);
      if (!blk) return;
      const m = blk.main;
      if (kind === 'church') {
        m.tower = { x: m.x + 1, y: m.y + m.h - 2, w: 2, h: 2 };
        const gr = seededRandom(hashString('graves' + town.id));
        for (let i = 0, guard = 0; i < 12 && guard < 200; guard++) { const gx = blk.x0 + Math.floor(gr() * (blk.x1 - blk.x0 + 1)), gy = blk.y0 + Math.floor(gr() * (blk.y1 - blk.y0 + 1)); if (get(gx, gy) !== G.GRASS || props.some(p => p.t === 'grave' && p.x === gx && p.y === gy)) continue; props.push({ t: 'grave', x: gx, y: gy }); i++; }
      } else if (kind === 'pub') {
        // the lock-up is round the back of the pub
        const g = findPlot(3, 2, m.x + 6, m.y - 5, 0);
        if (g) { const gb = addB(g.x0, g.y0, 3, 2, 'garage', { door: g.door }); lot('garage', g.door.x, g.door.y, gb); }
      }
    });
    if (!lots.garage) lot('garage', lots.pub.tx + 2, lots.pub.ty, null);
    const far = (kind, frac, pad) => { const a = rnd() * 6.28; return landmark(kind, cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac, pad); };
    const wk = far('works', 0.42, 1);
    if (wk) { const m = wk.main; props.push({ t: 'chimney', x: m.x + m.w - 1.5, y: m.y + 0.8 }); if (year >= 1760) props.push({ t: 'chimney', x: m.x + 1.2, y: m.y + m.h - 1.2 }); }
    const fm = far('farm', 0.8, 3);
    if (fm) {
      const m = fm.main, fr = seededRandom(hashString('farm' + town.id));
      const bp = findPlot(3, 3, m.x + 7, m.y, 0);
      if (bp && Math.hypot(bp.x0 - m.x, bp.y0 - m.y) < 16) addB(bp.x0, bp.y0, 3, 3, 'barn');
      for (let i = 0; i < 4; i++) { const hx = fm.x0 + Math.floor(fr() * (fm.x1 - fm.x0 + 1)), hy = fm.y0 + Math.floor(fr() * (fm.y1 - fm.y0 + 1)); if (get(hx, hy) === G.FIELD) props.push({ t: 'hay', x: hx, y: hy }); }
      if (year < 1850) for (let k = 0; k < 40; k++) { const wx = m.x - 3 + Math.floor(fr() * (m.w + 6)), wy = m.y - 4 + Math.floor(fr() * 3); if (get(wx, wy) === G.FIELD || get(wx, wy) === G.GRASS) { set(wx, wy, G.BUILD); props.push({ t: 'windmill', x: wx, y: wy }); break; } }
    }
    // the way out of town: an airport, or before that a quay if there is water, or a coach yard if there is not
    const hb = far('hub', 0.7, 2);
    if (hb) {
      const m = hb.main, hr = seededRandom(hashString('hub' + town.id));
      if (air) {
        let rw = null;
        for (const [ox, oy] of [[m.w + 3, -8], [-9, -8], [m.w + 3, -2], [-9, -2], [0, -22], [0, 6]]) if (free(m.x + ox, m.y + oy, m.x + ox + 5, m.y + oy + 15)) { rw = [m.x + ox, m.y + oy]; break; }
        if (rw) { for (let y = rw[1]; y <= rw[1] + 15; y++) for (let x = rw[0]; x <= rw[0] + 5; x++) { tiles[y * W + x] = G.APRON; keep[y * W + x] = 1; } props.push({ t: 'runway', x: rw[0] + 1, y: rw[1], w: 4, h: 16 }); props.push({ t: 'plane', x: rw[0] + 3, y: rw[1] + 6 }); }
        else props.push({ t: 'plane', x: hb.x0 + 1.5, y: hb.y0 + 1 });
      } else {
        let wt = null;
        for (let r = 2; r < 22 && !wt; r++) for (let k = 0; k < 16 && !wt; k++) { const x = Math.round(m.x + m.w / 2 + Math.cos(k / 16 * 6.28) * r), y = Math.round(m.y + Math.sin(k / 16 * 6.28) * r); if (inb(x, y) && tiles[y * W + x] === G.WATER && get(x + 1, y) === G.WATER && get(x - 1, y) === G.WATER) wt = [x, y]; }
        if (wt) props.push({ t: year >= 1840 ? 'steamer' : 'sail', x: wt[0] + 0.5, y: wt[1] });
        for (let i = 0; i < 5; i++) props.push({ t: 'crate', x: hb.x0 + Math.floor(hr() * (hb.x1 - hb.x0 + 1)), y: hb.y0 });
      }
    }
    for (const k of ['church', 'hall', 'pub', 'post', 'police', 'school', 'infirmary', 'office', 'works', 'farm', 'hub']) if (!lots[k]) lot(k, mx, my, null);
  }

  // Houses: along every built-up street, facing it, in whatever fashion the year and the part of town call for.
  const putHouse = h => { const hb = addB(h.x, h.y, h.w, h.h, h.kind || 'house', { door: h.door, ring: h.ring }); homes.push({ tx: h.door.x, ty: h.door.y, x: (h.door.x + 0.5) * TILE, y: (h.door.y + 0.5) * TILE, b: hb }); return hb; };
  const stuff = year >= 1990 ? ['flowers', 'shed', 'tramp', 'patio', 'veg', 'bin', 'pool'] : year >= 1950 ? ['wash', 'shed', 'veg', 'flowers', 'bin', 'veg'] : year >= 1850 ? ['wash', 'privy', 'coal', 'veg', 'wash', 'hens'] : ['veg', 'woodpile', 'wash', 'hens', 'veg'];
  const row = (dx, dy) => {
    const horiz = dy !== 0, A = horiz ? H : W, B = horiz ? W : H;
    // a doorstep: pavement with the road right there, or one more flag of pavement first (so houses can follow a road that runs at a slant)
    const front = (x, y) => { if (!inb(x, y) || tiles[y * W + x] !== G.PAVE) return false; const n1 = get(x + dx, y + dy); return n1 === G.ROAD || (n1 === G.PAVE && get(x + 2 * dx, y + 2 * dy) === G.ROAD); };
    for (let a = 4; a < A - 4; a++) for (let b = 4; b < B - 4; b++) {
      const x = horiz ? b : a, y = horiz ? a : b;
      if (!front(x, y) || year < builtAt(x, y) || keep[y * W + x] === 2) continue;
      const rg = ringAt(x, y), h1 = hsh(x * 3 + 1, y * 5 + 2), cell = hsh(Math.floor(x / 14), Math.floor(y / 14) + 9);
      const variant = year < 1800 ? (rg <= 1 ? 'terrace' : 'cottages') : year >= 1962 && rg >= 2 && cell < 0.1 ? 'flats' : year >= 1925 && rg >= 2 && cell < 0.75 ? 'semis' : 'terrace';
      if (variant === 'cottages' && h1 < 0.5) continue;
      if (rg >= 3 && h1 < 0.16) continue;
      const depth = variant === 'terrace' && h1 > 0.5 ? 3 : 2;
      const fits = w => { for (let k = 0; k < w; k++) { const fx = horiz ? x + k : x, fy = horiz ? y : y + k; if (!front(fx, fy)) return false; for (let d = 1; d <= depth; d++) { const tx = fx - dx * d, ty = fy - dy * d; if (!inb(tx, ty) || tiles[ty * W + tx] !== G.GRASS || keep[ty * W + tx]) return false; } } return true; };
      let w = variant === 'flats' ? 5 : variant === 'cottages' ? 2 : 2 + Math.floor(h1 * 2.99);
      while (w >= 2 && !fits(w)) w--;
      if (w < 2) continue;
      const hx = horiz ? x : dx > 0 ? x - depth : x + 1, hy = horiz ? (dy > 0 ? y - depth : y + 1) : y;
      const hb = putHouse({ x: hx, y: hy, w: horiz ? w : depth, h: horiz ? depth : w, kind: variant === 'flats' && w === 5 ? 'flats' : 'house', door: horiz ? { x: x + (w >> 1), y } : { x, y: y + (w >> 1) }, ring: rg });
      // the garden behind
      const gd = variant === 'cottages' ? 3 : 2, gx = [], gy = [];
      for (let k = 0; k < w; k++) for (let d = depth + 1; d <= depth + gd; d++) { const tx = (horiz ? x + k : x) - dx * d, ty = (horiz ? y : y + k) - dy * d; if (inb(tx, ty) && tiles[ty * W + tx] === G.GRASS && !keep[ty * W + tx]) { keep[ty * W + tx] = 1; gx.push(tx); gy.push(ty); if (variant === 'cottages') { tiles[ty * W + tx] = G.FIELD; zone[ty * W + tx] = 4; } } }
      if (gx.length && hb.kind === 'house' && variant !== 'cottages') { const gi = Math.floor(hsh(x + 5, y + 9) * gx.length); props.push({ t: stuff[Math.floor(hsh(x + 2, y + 4) * stuff.length)], x: gx[gi], y: gy[gi] }); if (horiz && gx.length >= 2) props.push({ t: 'gfence', x: Math.min(...gx), y: Math.min(...gy), h: Math.max(...gy) - Math.min(...gy) + 1 }); }
      b += w - 1 + (variant === 'terrace' ? (h1 > 0.9 ? 1 : 0) : 1);
    }
  };
  row(0, 1); row(0, -1); row(1, 0); row(-1, 0);

  // Lamps and street furniture along the pavements, different in every period.
  const kit = year >= 1980 ? ['bin', 'bench', 'planter', 'postbox', 'bike', 'busstop', 'bin', 'planter'] : year >= 1925 ? ['postbox', 'bench', 'busstop', 'bin', 'pram', 'bike']
    : year >= 1853 ? ['postbox', 'bench', 'trough', 'handcart', 'barrel'] : year >= 1700 ? ['trough', 'barrel', 'handcart', 'pump'] : ['barrel', 'pump', 'handcart', 'woodpile'];
  const taken = new Set(homes.map(h => h.tx + ',' + h.ty));
  for (const k of Object.values(lots)) taken.add(k.tx + ',' + k.ty);
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    if (tiles[y * W + x] !== G.PAVE || taken.has(x + ',' + y) || year < builtAt(x, y)) continue;
    if (get(x + 1, y) !== G.ROAD && get(x - 1, y) !== G.ROAD && get(x, y + 1) !== G.ROAD && get(x, y - 1) !== G.ROAD) continue;
    const h = hsh(x * 7 + 3, y * 11 + 1), rg = ringAt(x, y);
    if (year >= 1810 && h < (rg <= 1 ? 0.07 : 0.045)) props.push({ t: 'lamp', x, y });
    else if (h > (rg <= 1 ? 0.955 : 0.985)) props.push({ t: kit[Math.floor(hsh(x + 1, y + 1) * kit.length)], x, y });
    else if (year >= 1870 && year < 1975 && h > 0.5 && h < 0.512) props.push({ t: 'pole', x, y });
  }
  // Trees, fields and woods on whatever is left.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (tiles[k] !== G.GRASS || keep[k] === 1) continue;
    const d = dRoad[k], h = hsh(x * 13 + 5, y * 17 + 3), out = Math.hypot(x - cx, y - cy) / R;
    if (x < 2 || y < 2 || x > W - 3 || y > H - 3) { tiles[k] = G.TREE; continue; }
    if (keep[k] === 2) { if (h < 0.07 && d >= 2) tiles[k] = G.TREE; continue; }            // a park
    if (out > 1.12 && h < 0.2) { tiles[k] = G.TREE; continue; }                              // woods beyond the last houses
    const open = year < builtAt(x, y) || ringAt(x, y) >= 2;
    if (open && d >= (year < builtAt(x, y) ? 2 : 5)) {
      const z = [2, 3, 0, 1, 4, 3, 0, 2][Math.floor(hsh(Math.floor(x / 17) + 3, Math.floor(y / 12) + 8) * 8)];
      if (h < 0.012) tiles[k] = G.TREE; else if (z) { tiles[k] = G.FIELD; zone[k] = z; }
      continue;
    }
    if (h < 0.035 && d >= 2) tiles[k] = G.TREE;
  }

  // Colours for the year and the part of the world: bright and flat, like a picture book.
  const er = seededRandom(hashString(town.id + era));
  const house = town.house || 'midbrick';
  const stone = STONE.has(house), med = MED.has(house), wood = WOOD.has(house);
  const old = era === 'early' || era === 'georgian';
  const brick = ['#cf6b4f', '#bf5a42', '#d98463', '#b0503e', '#e2a070'], pastel = ['#f6ead0', '#dcecf2', '#f8d9c8', '#e3f0d6', '#f3e3ef'];
  const wallSet = med ? ['#fdecc9', '#f8dcae', '#ffdcb6', '#f4cfa8', '#fbf3e2'] : wood ? ['#f4f1e8', '#bfd7e2', '#f2d89e', '#dc7462', '#93b5cf', '#b9d6ac']
    : stone ? ['#d3c19c', '#c6b592', '#dccdaa', '#bca884'] : old ? ['#f6eed6', '#eee2c2', '#dc8f60', '#ecdab2']
      : era === 'retro' || era === 'modern' ? [...brick, ...pastel] : brick;
  const THATCH = ['#e6c25a', '#d8b24c', '#efcf6e'], SLATE = ['#62748f', '#70819c', '#566680'], TILES = ['#cf5a43', '#be4e3b', '#dd7050'], FLATS = ['#a2aeba', '#b3bdc7'];
  const roofSet = med ? ['#e58049', '#d5703c', '#ee9058'] : old ? [...THATCH, ...THATCH, '#8d8478']
    : era === 'victorian' ? SLATE : era === 'vintage' ? [...SLATE, TILES[0]] : era === 'retro' ? [...TILES, ...SLATE] : [...TILES, ...SLATE, ...FLATS, '#4fa58c'];
  const TRIMS = ['#3f7fbf', '#c8443a', '#3f9a5a', '#e0a020', '#7a4ab8', '#2d2438', '#e8e2d0', '#d86a8a'], AWN = ['#e8554a', '#3f8fd8', '#3fa56a', '#f2b230', '#8a5ac8'];
  const SPECIAL = {
    church: ['#d9cfb4', '#6d7f96', 1.6, 'gable'], hall: [stone || old ? '#dccba6' : '#ead9b4', '#4fa58c', 1.8, 'dome'], pub: ['#fbf3e2', '#4a4658', 1.2, 'hip'], post: ['#cf6b4f', '#5d4a52', 1.3, 'gable'],
    police: [year >= 1900 ? '#8fa6c9' : '#c6b592', year >= 1900 ? '#4a5a7a' : old ? '#d8b24c' : '#566680', 1.3, year >= 1900 ? 'flat' : old ? 'thatch' : 'hip'], school: ['#d98463', old ? '#d8b24c' : '#62748f', 1.2, 'gable'], infirmary: ['#f7f3ea', old ? '#d8b24c' : '#8fa0b0', 1.6, 'hip'], office: [era === 'modern' ? '#a4a6ae' : '#b9bbc2', era === 'modern' ? '#b6b8c0' : '#7c7e8a', era === 'modern' ? 3.2 : 1.6, era === 'modern' || era === 'retro' ? 'flat' : 'hip'],
    works: [stone ? '#c6b592' : '#b0503e', old ? '#8d8478' : '#6e7480', 2.0, old ? 'gable' : 'saw'], farm: [stone ? '#d3c19c' : '#f6eed6', old ? '#e6c25a' : '#a8553f', 1.0, old ? 'thatch' : 'gable'], barn: ['#a8703f', old ? '#d8b24c' : '#b0443a', 1.2, old ? 'thatch' : 'gable'],
    shed: ['#a8804f', '#62748f', 0.7, 'gable'], store: ['#f3efe4', '#b3bdc7', 1.3, 'flat'], flats: ['#ece5d2', '#b3bdc7', 3.4, 'flat'],
    hub: [air ? '#cfe2ee' : '#c49a62', air ? '#6a9ac8' : '#62748f', 1.5, air ? 'flat' : 'gable'], garage: [year >= 1900 ? '#9db09a' : '#a8703f', year >= 1900 ? '#7a8c78' : old ? '#d8b24c' : '#62748f', 0.8, year >= 1900 ? 'flat' : old ? 'thatch' : 'gable'],
  };
  for (const b of buildings) {
    b.trim = pick(er, TRIMS);
    if (b.kind === 'house') {
      b.wall = pick(er, wallSet); b.roof = pick(er, roofSet); b.ht = old ? 0.78 : 0.95 + er() * 0.3;
      b.thatch = THATCH.includes(b.roof); b.flat = FLATS.includes(b.roof);
      b.style = b.thatch ? 'thatch' : b.flat ? 'flat' : er() < 0.3 ? 'hip' : 'gable';
      b.chim = year < 1975 ? 1 + (b.w > 2 ? 1 : 0) : er() < 0.3 ? 1 : 0; b.smoke = year < 1965 && er() < 0.35;
      b.shop = (b.ring ?? 9) <= 1 && b.door && year >= 1700 && er() < 0.5 ? pick(er, AWN) : null;
    } else { const s = SPECIAL[b.kind]; b.wall = s[0]; b.roof = s[1]; b.ht = s[2]; b.style = s[3]; b.thatch = s[3] === 'thatch'; b.flat = s[3] === 'flat'; b.chim = b.kind === 'pub' || b.kind === 'farm' ? 2 : 0; b.smoke = b.chim > 0 && year < 1965; }
    b.ridge = b.w >= b.h ? 'h' : 'v';
  }

  const ground = {
    road: era === 'early' || era === 'georgian' ? '#c49a62' : era === 'victorian' ? '#978d82' : era === 'vintage' ? '#7c7a86' : '#62607a',
    pave: era === 'early' || era === 'georgian' ? '#a8cc6a' : era === 'victorian' ? '#d8cfbc' : '#ece2cc',
    grass: med ? '#b5cf5e' : '#78c95a', grass2: med ? '#a3bf4e' : '#5fb548', plaza: old ? '#e2cfa0' : '#ead9b4', yard: old ? '#c9a878' : '#c2b49c',
    apron: air ? '#8d90a0' : '#c49a62', water: '#52b8de', sand: '#f3e2a4', marks: era === 'retro' || era === 'modern', setts: era === 'victorian' || era === 'vintage', mud: era === 'early' || era === 'georgian',
  };

  const sr = seededRandom(hashString('streets' + town.id));
  const fam = (opts.surnames || []).filter(Boolean).slice(0, 40);
  for (let i = fam.length - 1; i > 0; i--) { const j = Math.floor(sr() * (i + 1)); [fam[i], fam[j]] = [fam[j], fam[i]]; }
  const spare = ['Chapel', 'Mill', 'Bridge', 'Albert', 'Victoria', 'King', 'Queen', 'George', 'York', 'School', 'North', 'Green', 'Cross', 'Bank', 'Moor', 'Wood', 'Hill', 'Spring'];
  const pool = [...new Set([...fam, ...spare])];
  const form = STREET_FORMS[town.key] || (STREET_FORMS[({ 'the United States': 'usa', Canada: 'usa', Australia: 'usa', 'New Zealand': 'usa' })[town.country]]) || null;
  const named = (base, i, vertical) => {
    if (form) return form(base, i);
    const sfx = year < 1750 ? (vertical ? ['Lane', 'Gate', 'Row'] : ['Lane', 'Gate', 'Way']) : vertical ? ['Lane', 'Road', 'Row', 'Terrace'] : ['Street', 'Road', 'Street', 'Avenue'];
    return base + ' ' + sfx[i % sfx.length];
  };
  let pi = 0;
  const local = MAIN_STREETS[town.key] || (form ? [form('Main', 0), form('Market', 1), form('Church', 0), form(air ? 'Airport' : 'Harbor', 1)] : null);
  // Real streets keep their real names. The rest: High Street, Market Street, Church Lane, and then the family.
  const names = [], byKey = new Map();
  net.ways.forEach((w, wi) => {
    let nm = w.name;
    if (!nm) {
      const k = w.key || 'w' + wi;
      if (!byKey.has(k)) {
        const a = net.nodes[w.pts[0]], b = net.nodes[w.pts[w.pts.length - 1]], vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
        byKey.set(k, k === 'high' ? (local ? local[0] : named('High', 0, false)) : k === 'market' ? (local ? local[1] : named('Market', 0, false)) : k === 'church' ? (local ? local[2] : named('Church', 0, true))
          : w.close && !form ? pool[pi++ % pool.length] + (year < 1750 ? ' Yard' : pi % 3 ? ' Close' : ' Court') : named(pool[pi % pool.length], pi++, vertical));
      }
      nm = byKey.get(k);
    }
    let ni = names.indexOf(nm);
    if (ni < 0) { names.push(nm); ni = names.length - 1; }
    w.ni = ni;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of w.pts) { const n = net.nodes[p]; x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }
    w.box = [x0, y0, x1, y1];
  });
  const hi = net.ways.findIndex(w => w.key === 'high');
  const tramWay = year >= 1895 && year <= 1958 ? (hi >= 0 ? hi : net.ways.reduce((b, w, i) => w.cls === 0 && w.pts.length > net.ways[b].pts.length ? i : b, 0)) : -1;
  // the junctions and bends, in pixels, with what each is joined to
  const nodes = net.nodes.map(n => ({ x: n.x * TILE, y: n.y * TILE, nb: n.nb, dead: n.dead }));
  const BK = 12 * TILE, bw = Math.ceil(W * TILE / BK), buckets = new Map();
  nodes.forEach((n, i) => { const k = Math.floor(n.x / BK) + Math.floor(n.y / BK) * bw; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); });
  const fields = new Map();
  const city = {
    town, year, era, W, H, tiles, blocks, buildings, homes, props, lots, ground, air, left: town.left !== false, names, tramWay, parkSpots, zone, nodes, ways: net.ways, source: net.source, centre: { x: cx * TILE, y: cy * TILE },
    graves: props.filter(p => p.t === 'grave'),
    /** The street a point is on, or ''. */
    streetAt(x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return ''; const wi = wayAt[ty * W + tx]; return wi < 0 ? '' : names[net.ways[wi].ni]; },
    /** The nearest junction or bend to a point (optionally only those that pass a test). */
    nearNode(x, y, ok) {
      let best = -1, bd = 1e18;
      const bx = Math.floor(x / BK), by = Math.floor(y / BK);
      for (let r = 0; r < 40; r++) {
        for (let j = by - r; j <= by + r; j++) for (let i = bx - r; i <= bx + r; i++) {
          if (Math.max(Math.abs(i - bx), Math.abs(j - by)) !== r) continue;
          const list = buckets.get(i + j * bw); if (!list || i < 0 || i >= bw) continue;
          for (const n of list) { if (ok && !ok(n)) continue; const d = (nodes[n].x - x) ** 2 + (nodes[n].y - y) ** 2; if (d < bd) { bd = d; best = n; } }
        }
        if (best >= 0 && bd < (r * BK) ** 2) break;
      }
      return best;
    },
    /** How far every junction is from one of them, by road. */
    field(from) {
      let f = fields.get(from);
      if (f) return f;
      f = new Float32Array(nodes.length).fill(1e9); f[from] = 0;
      const heap = [from];
      while (heap.length) { let bi = 0; for (let i = 1; i < heap.length; i++) if (f[heap[i]] < f[heap[bi]]) bi = i; const k = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop(); for (const m of nodes[k].nb) { const d = f[k] + Math.hypot(nodes[m].x - nodes[k].x, nodes[m].y - nodes[k].y); if (d < f[m]) { f[m] = d; heap.push(m); } } }
      if (fields.size > 24) fields.delete(fields.keys().next().value);
      fields.set(from, f);
      return f;
    },
    /** The junctions to pass through, by the shortest road, from one to another. */
    route(a, b) { const f = this.field(b), out = [a]; let k = a; for (let guard = 0; k !== b && guard < 4000; guard++) { let nx = -1, bd = f[k]; for (const m of nodes[k].nb) if (f[m] < bd) { bd = f[m]; nx = m; } if (nx < 0) break; out.push(nx); k = nx; } return out; },
    /** How many tiles a tile is from the nearest road. */
    roadDist(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H ? 99 : dRoad[ty * W + tx]; },
    wpx: W * TILE, hpx: H * TILE, chunks: new Map(),
    at(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H ? G.WATER : tiles[ty * W + tx]; },
    solid(tx, ty) { const t = this.at(tx, ty); return t === G.BUILD || t === G.WATER || t === G.TREE; },
    solidAt(x, y) { return this.solid(Math.floor(x / TILE), Math.floor(y / TILE)); },
    rough(x, y) { const t = this.at(Math.floor(x / TILE), Math.floor(y / TILE)); return t === G.GRASS || t === G.FIELD || t === G.SAND; },
    /** Can you get to this tile from the road, on foot or on wheels? (Gardens walled in by houses cannot be reached.) */
    reachable(tx, ty) {
      if (!this._reach) {
        const sx = Math.floor(net.nodes[0].x), sy = Math.floor(net.nodes[0].y);
        const r = this._reach = new Uint8Array(W * H), q = [[sx, sy]];
        r[sy * W + sx] = 1;
        while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || r[ny * W + nx] || this.solid(nx, ny)) continue; r[ny * W + nx] = 1; q.push([nx, ny]); } }
      }
      return tx >= 0 && ty >= 0 && tx < W && ty < H && this._reach[ty * W + tx] === 1;
    },
    homeFor(id) { return homes.length ? homes[hashString('home' + id) % homes.length] : lots.market; },
    /** A lot by kind; 'home' needs the person it belongs to. */
    lot(kind, who) { if (kind === 'home') { const h = this.homeFor(who || 'x'); return { kind, x: h.x, y: h.y, tx: h.tx, ty: h.ty, name: 'the house' }; } return lots[kind] || lots.market; },
  };
  return city;
}

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N
const MAIN_STREETS = {
  france: ['Grande Rue', 'Rue du Marché', 'Rue de l\'Église', 'Quai du Port'], belgium: ['Grand\'Rue', 'Rue du Marché', 'Rue de l\'Église', 'Quai du Port'],
  germany: ['Hauptstraße', 'Marktstraße', 'Kirchgasse', 'Hafenstraße'], netherlands: ['Hoofdstraat', 'Marktstraat', 'Kerkstraat', 'Havenkade'],
  italy: ['Corso Italia', 'Via del Mercato', 'Via della Chiesa', 'Via del Porto'], spain: ['Calle Mayor', 'Calle del Mercado', 'Calle de la Iglesia', 'Paseo del Puerto'],
  latinamerica: ['Calle Mayor', 'Calle del Mercado', 'Calle de la Iglesia', 'Paseo del Puerto'], portugal: ['Rua Direita', 'Rua do Mercado', 'Rua da Igreja', 'Cais do Porto'],
  scandinavia: ['Storgatan', 'Torggatan', 'Kyrkogatan', 'Hamngatan'], wales: ['Stryd Fawr', 'Heol y Farchnad', 'Lôn yr Eglwys', 'Heol y Cei'], southwales: ['Stryd Fawr', 'Heol y Farchnad', 'Lôn yr Eglwys', 'Heol y Cei'],
};
// How streets are named in other parts of the world.
const STREET_FORMS = {
  france: n => 'Rue ' + n, belgium: n => 'Rue ' + n, germany: n => n + 'straße', netherlands: n => n + 'straat', italy: n => 'Via ' + n, spain: n => 'Calle ' + n,
  latinamerica: n => 'Calle ' + n, portugal: n => 'Rua ' + n, scandinavia: n => n + 'gatan', wales: n => 'Heol ' + n, southwales: n => 'Heol ' + n,
  usa: (n, i) => n + (i % 2 ? ' Avenue' : ' Street'), easteurope: n => 'ul. ' + n, russia: n => 'ul. ' + n, greece: n => 'Odos ' + n,
};
/** The middle of the lane a vehicle heading `dir` uses, as an offset from the road's centre line. */
export function laneOffset(city, dir) {
  const s = (city.left ? 1 : -1) * TILE * 0.5;
  return [[0, -s], [s, 0], [0, s], [-s, 0]][dir];
}

// ---------------- Drawing ----------------
const CHUNK = 16; // tiles
const hsh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const INK = '#2d2438'; // every outline
const rrf = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
function renderChunk(city, cx, cy) {
  const c = document.createElement('canvas');
  c.width = c.height = CHUNK * TILE;
  const g = c.getContext('2d');
  const { ground: gr, zone } = city;
  g.translate(-cx * CHUNK * TILE, -cy * CHUNK * TILE); // everything below is in world pixels
  g.lineCap = 'round';
  const trees = [];
  for (let ty = cy * CHUNK; ty < (cy + 1) * CHUNK; ty++) for (let tx = cx * CHUNK; tx < (cx + 1) * CHUNK; tx++) {
    const t0 = city.at(tx, ty), isTree = t0 === G.TREE, t = isTree && zone[ty * city.W + tx] ? G.FIELD : t0;
    const X = tx * TILE, Y = ty * TILE, n = hsh(tx, ty), m = hsh(ty + 31, tx + 17);
    if (isTree) trees.push([X, Y]);
    if (t === G.ROAD || t === G.PAVE) {
      g.fillStyle = t === G.ROAD ? gr.pave : gr.grass; g.fillRect(X, Y, TILE, TILE);
    } else if (t === G.WATER) {
      g.fillStyle = gr.water; g.fillRect(X, Y, TILE, TILE);
      if (n > 0.55) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2.2; g.beginPath(); g.arc(X + 9 + m * 14, Y + 13 + n * 8, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      if (m > 0.8) { g.fillStyle = 'rgba(30,110,170,0.25)'; g.beginPath(); g.ellipse(X + 16, Y + 16, 13, 5, 0, 0, 7); g.fill(); }
    } else if (t === G.SAND) {
      g.fillStyle = gr.sand; g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = 'rgba(190,150,70,0.4)'; g.fillRect(X + n * 28, Y + m * 28, 2.5, 2.5); g.fillRect(X + m * 26, Y + n * 22, 2, 2);
      if (city.at(tx + 1, ty) === G.WATER) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X + TILE - 2, Y); g.quadraticCurveTo(X + TILE - 7 + n * 6, Y + 16, X + TILE - 2, Y + TILE); g.stroke(); }
    } else if (t === G.PLAZA) {
      g.fillStyle = gr.plaza; g.fillRect(X, Y, TILE, TILE);
      if (gr.mud || gr.setts) { g.strokeStyle = 'rgba(45,36,56,0.13)'; g.lineWidth = 1.5; g.beginPath(); g.arc(X + 8, Y + 20, 8, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(X + 24, Y + 10, 8, Math.PI, 0); g.stroke(); }
      else { g.fillStyle = (tx + ty) % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(45,36,56,0.05)'; g.fillRect(X, Y, TILE, TILE); }
    } else if (t === G.FIELD) {
      const zn = zone[ty * city.W + tx] || 2;
      if (zn === 1) { g.fillStyle = '#b98a5a'; g.fillRect(X, Y, TILE, TILE); g.strokeStyle = '#9a6f44'; g.lineWidth = 3; for (let k = 5; k < TILE; k += 9) { g.beginPath(); g.moveTo(X, Y + k); g.lineTo(X + TILE, Y + k); g.stroke(); } }
      else if (zn === 3) { g.fillStyle = '#ecd46e'; g.fillRect(X, Y, TILE, TILE); g.strokeStyle = '#d2b44e'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { const px = X + hsh(tx * 5 + k, ty) * 28 + 2, py = Y + hsh(tx, ty * 5 + k) * 24 + 6; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 2, py - 6); g.stroke(); } }
      else if (zn === 4) { g.fillStyle = '#a97a4e'; g.fillRect(X, Y, TILE, TILE); for (let k = 0; k < 2; k++) for (let q = 0; q < 2; q++) { g.fillStyle = (tx + q) % 3 ? '#63b85a' : '#8fd070'; g.beginPath(); g.arc(X + 8 + q * 16, Y + 8 + k * 16, 5.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(X + 7 + q * 16, Y + 7 + k * 16, 2, 0, 7); g.fill(); } }
      else if (zn === 5) { const bed = (tx + ty * 2) % 3; g.fillStyle = bed ? '#a97a4e' : '#86cc62'; g.fillRect(X, Y, TILE, TILE); g.strokeStyle = bed === 1 ? '#63b85a' : bed === 2 ? '#e8884a' : '#5fb548'; g.lineWidth = 3; g.setLineDash([2, 6]); for (let k = 6; k < TILE; k += 10) { g.beginPath(); g.moveTo(X + 2, Y + k); g.lineTo(X + TILE, Y + k); g.stroke(); } g.setLineDash([]); }
      else { g.fillStyle = '#96d468'; g.fillRect(X, Y, TILE, TILE); if (n > 0.5) { g.strokeStyle = '#74bb50'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 8 + m * 14, Y + 20); g.lineTo(X + 6 + m * 14, Y + 13); g.moveTo(X + 12 + m * 14, Y + 20); g.lineTo(X + 14 + m * 14, Y + 13); g.stroke(); } }
    } else if (t === G.YARD) {
      g.fillStyle = gr.yard; g.fillRect(X, Y, TILE, TILE);
      if (n > 0.6) { g.fillStyle = 'rgba(45,36,56,0.12)'; g.beginPath(); g.ellipse(X + 6 + m * 20, Y + 8 + n * 14, 4, 2.5, 0, 0, 7); g.fill(); }
    } else if (t === G.APRON) {
      g.fillStyle = gr.apron; g.fillRect(X, Y, TILE, TILE);
      if (!city.air) { g.strokeStyle = 'rgba(45,36,56,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y + 10.5); g.lineTo(X + TILE, Y + 10.5); g.moveTo(X, Y + 21.5); g.lineTo(X + TILE, Y + 21.5); g.moveTo(X + (ty % 2 ? 10 : 22), Y); g.lineTo(X + (ty % 2 ? 10 : 22), Y + 10); g.stroke(); }
    } else if (t === G.BUILD) {
      g.fillStyle = '#3a2f3f'; g.fillRect(X, Y, TILE, TILE);
    } else {
      g.fillStyle = (tx + ty) % 2 && n > 0.35 ? gr.grass : n > 0.82 ? gr.grass2 : gr.grass; g.fillRect(X, Y, TILE, TILE);
      if (n > 0.62) { g.strokeStyle = gr.grass2; g.lineWidth = 2; g.beginPath(); const px = X + 6 + m * 18, py = Y + 10 + n * 14; g.moveTo(px, py); g.lineTo(px - 2, py - 6); g.moveTo(px + 4, py); g.lineTo(px + 4, py - 7); g.moveTo(px + 8, py); g.lineTo(px + 10, py - 6); g.stroke(); }
      if (m > 0.9) { g.fillStyle = ['#fff6d8', '#ffd84a', '#f58ab0', '#b79aff'][Math.floor(n * 4)]; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(X + 6 + hsh(tx + k, ty * 7) * 20, Y + 6 + hsh(tx * 7, ty + k) * 20, 2.2, 0, 7); g.fill(); } }
    }
  }
  for (const [X, Y] of trees) { g.fillStyle = 'rgba(45,36,56,0.22)'; g.beginPath(); g.ellipse(X + 21, Y + 22, 16, 13, 0, 0, 7); g.fill(); }
  // the roads: smooth ribbons with an ink kerb, drawn over the pavement
  const bx0 = cx * CHUNK - 3, by0 = cy * CHUNK - 3, bx1 = (cx + 1) * CHUNK + 3, by1 = (cy + 1) * CHUNK + 3;
  const near = city.ways.filter(w => w.box[2] >= bx0 && w.box[0] <= bx1 && w.box[3] >= by0 && w.box[1] <= by1);
  const trace = w => { g.beginPath(); w.pts.forEach((p, i) => { const n = city.nodes[p]; if (i) g.lineTo(n.x, n.y); else g.moveTo(n.x, n.y); }); };
  g.lineJoin = 'round'; g.lineCap = 'round';
  const wd = w => (w.cls === 0 ? 2.24 : 2.0) * TILE;
  // pavement first: a wider ribbon under the road
  for (const w of near) { trace(w); g.strokeStyle = gr.mud ? 'rgba(45,36,56,0.0)' : 'rgba(45,36,56,0.55)'; g.lineWidth = wd(w) + 1.9 * TILE + 3; g.stroke(); }
  for (const w of near) { trace(w); g.strokeStyle = gr.pave; g.lineWidth = wd(w) + 1.9 * TILE; g.stroke(); }
  if (!gr.mud) for (const w of near) { trace(w); g.strokeStyle = 'rgba(45,36,56,0.13)'; g.lineWidth = wd(w) + 1.9 * TILE - 4; g.setLineDash([1.5, TILE - 1.5]); g.lineCap = 'butt'; g.stroke(); g.setLineDash([]); g.lineCap = 'round'; }
  for (const w of near) { trace(w); g.strokeStyle = gr.mud ? '#9a7444' : INK; g.lineWidth = wd(w) + (gr.mud ? 4 : 5); g.stroke(); }
  for (const w of near) { trace(w); g.strokeStyle = gr.road; g.lineWidth = wd(w); g.stroke(); }
  if (gr.setts) for (const w of near) { trace(w); g.strokeStyle = 'rgba(45,36,56,0.1)'; g.lineWidth = wd(w) - 10; g.setLineDash([3, 9]); g.stroke(); g.setLineDash([]); }
  if (gr.mud) for (const w of near) { trace(w); g.strokeStyle = 'rgba(255,238,196,0.22)'; g.lineWidth = 22; g.stroke(); trace(w); g.strokeStyle = gr.road; g.lineWidth = 15; g.stroke(); }
  if (gr.marks) for (const w of near) { if (w.close) continue; trace(w); g.strokeStyle = '#fff6d8'; g.lineWidth = 3; g.setLineDash([16, 18]); g.lineCap = 'butt'; g.stroke(); g.setLineDash([]); g.lineCap = 'round'; }
  if (city.tramWay >= 0) { const tk = city.ways[city.tramWay].key; for (const w of near) { if (w !== city.ways[city.tramWay] && (tk == null || w.key !== tk)) continue; trace(w); g.strokeStyle = '#d8dce4'; g.lineWidth = 17; g.stroke(); trace(w); g.strokeStyle = gr.road; g.lineWidth = 12; g.stroke(); } }
  // grounds: a hedge, wall or fence round the churchyard, the school, the works
  for (const b of city.blocks) {
    if (b.x1 < cx * CHUNK - 1 || b.x0 > (cx + 1) * CHUNK + 1 || b.y1 < cy * CHUNK - 1 || b.y0 > (cy + 1) * CHUNK + 1) continue;
    const ix = b.x0 * TILE, iy = b.y0 * TILE, iw = (b.x1 - b.x0 + 1) * TILE, ih = (b.y1 - b.y0 + 1) * TILE;
    if (b.kind === 'market') { g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.roundRect(ix + 1, iy + 1, iw - 2, ih - 2, 8); g.stroke(); continue; }
    if (b.edge === 'hedge') { g.strokeStyle = '#2f8a44'; g.lineWidth = 7; g.setLineDash([26, 3]); g.strokeRect(ix + 2, iy + 2, iw - 4, ih - 4); g.setLineDash([]); g.strokeStyle = '#56b85e'; g.lineWidth = 3; g.setLineDash([10, 19]); g.strokeRect(ix + 1, iy + 1, iw - 4, ih - 4); g.setLineDash([]); }
    else if (b.edge === 'wall') { g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(ix + 1.5, iy + 1.5, iw - 3, ih - 3); g.strokeStyle = '#cdbf9f'; g.lineWidth = 2.5; g.strokeRect(ix + 1.5, iy + 1.5, iw - 3, ih - 3); }
    else if (b.edge === 'fence') { g.strokeStyle = '#a9773f'; g.lineWidth = 2.5; g.setLineDash([7, 4]); g.strokeRect(ix + 2, iy + 2, iw - 4, ih - 4); g.setLineDash([]); }
  }
  for (const p of city.props) {
    if (p.x < cx * CHUNK - 8 || p.x > (cx + 1) * CHUNK + 8 || p.y < cy * CHUNK - 14 || p.y > (cy + 1) * CHUNK + 14) continue;
    drawFlatProp(g, p, city);
  }
  // street names painted along the road (not on mud)
  if (!gr.mud) {
    g.font = '800 10px "Nunito", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = gr.marks ? 'rgba(255,246,216,0.66)' : 'rgba(255,246,216,0.48)';
    const X0 = cx * CHUNK - 7, X1 = (cx + 1) * CHUNK + 7, Y0 = cy * CHUNK - 7, Y1 = (cy + 1) * CHUNK + 7, side = (city.left ? -1 : 1) * TILE * 0.5;
    for (const w of near) {
      if (w.pts.length < 3) continue;
      const m = w.pts.length >> 1, a = city.nodes[w.pts[m - 1]], b = city.nodes[w.pts[m]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (mx < X0 * TILE || mx > X1 * TILE || my < Y0 * TILE || my > Y1 * TILE) continue;
      let ang = Math.atan2(b.y - a.y, b.x - a.x); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      g.save(); g.translate(mx, my); g.rotate(ang); g.fillText(city.names[w.ni].toUpperCase(), 0, side); g.restore();
    }
  }
  return c;
}

// Small things seen from above, each with a shadow and an ink outline.
function drawSmallProp(g, p, X, Y, city) {
  const sh = (x, y, w, h) => { g.fillStyle = 'rgba(45,36,56,0.22)'; rrf(g, x + 3, y + 4, w, h, 3); };
  const box = (x, y, w, h, col, r = 3) => { g.fillStyle = col; rrf(g, x, y, w, h, r); g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke(); };
  const dot = (x, y, r, col, ol = true) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); if (ol) { g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(); } };
  const t = p.t, n = hsh(Math.floor(p.x * 3), Math.floor(p.y * 5));
  if (t === 'bench') { sh(X + 4, Y + 11, 24, 9); box(X + 4, Y + 11, 24, 9, '#b9824a'); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(X + 5, Y + 15.5); g.lineTo(X + 27, Y + 15.5); g.stroke(); }
  else if (t === 'bin') { sh(X + 10, Y + 10, 12, 12); dot(X + 16, Y + 16, 6.5, '#4f8a5a'); dot(X + 16, Y + 16, 3, '#2d2438', false); }
  else if (t === 'postbox') { sh(X + 10, Y + 10, 12, 12); dot(X + 16, Y + 16, 7, '#e0362e'); dot(X + 16, Y + 16, 4.2, '#f2584c', false); g.fillStyle = INK; g.fillRect(X + 12.5, Y + 15, 7, 1.6); }
  else if (t === 'planter') { sh(X + 5, Y + 9, 22, 14); box(X + 5, Y + 9, 22, 14, '#b98a5a'); for (let k = 0; k < 4; k++) dot(X + 9 + k * 5, Y + 16 + (k % 2 ? -2 : 2), 3.2, ['#f58ab0', '#ffd84a', '#ff7a5a', '#b79aff'][(k + Math.floor(n * 4)) % 4], false); }
  else if (t === 'bike') { g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(X + 9, Y + 16, 5, 0, 7); g.moveTo(X + 28, Y + 16); g.arc(X + 23, Y + 16, 5, 0, 7); g.stroke(); g.strokeStyle = ['#e8554a', '#3f8fd8', '#3fa56a'][Math.floor(n * 3)]; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X + 9, Y + 16); g.lineTo(X + 23, Y + 16); g.moveTo(X + 20, Y + 11); g.lineTo(X + 20, Y + 21); g.stroke(); }
  else if (t === 'busstop') { sh(X + 2, Y + 8, 28, 13); box(X + 2, Y + 8, 28, 13, 'rgba(190,225,240,0.9)'); g.fillStyle = '#e0362e'; g.fillRect(X + 3, Y + 9, 26, 3); dot(X + 33, Y + 14, 3, '#f2c230'); }
  else if (t === 'pram') { sh(X + 9, Y + 9, 14, 12); box(X + 9, Y + 9, 14, 12, '#4a4658', 5); dot(X + 14, Y + 15, 3, '#f6dcc6', false); }
  else if (t === 'trough') { sh(X + 3, Y + 10, 26, 12); box(X + 3, Y + 10, 26, 12, '#b8b0a0'); g.fillStyle = '#6cc6e4'; rrf(g, X + 6, Y + 13, 20, 6, 2); }
  else if (t === 'handcart') { g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 22, Y + 10); g.lineTo(X + 31, Y + 8); g.moveTo(X + 22, Y + 20); g.lineTo(X + 31, Y + 22); g.stroke(); sh(X + 5, Y + 8, 18, 14); box(X + 5, Y + 8, 18, 14, '#b9824a'); dot(X + 11, Y + 13, 3, ['#e8884a', '#63b85a', '#ecd46e'][Math.floor(n * 3)], false); dot(X + 17, Y + 17, 3, '#c8443a', false); }
  else if (t === 'barrel') { sh(X + 9, Y + 9, 14, 14); dot(X + 16, Y + 16, 7.5, '#a9773f'); g.strokeStyle = '#5a3c20'; g.lineWidth = 1.5; g.beginPath(); g.arc(X + 16, Y + 16, 4.5, 0, 7); g.stroke(); }
  else if (t === 'pump') { sh(X + 10, Y + 8, 12, 16); box(X + 12, Y + 8, 8, 16, '#5a6a5e', 4); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X + 16, Y + 12); g.lineTo(X + 27, Y + 9); g.stroke(); dot(X + 16, Y + 26, 4, '#6cc6e4', false); }
  else if (t === 'woodpile') { sh(X + 5, Y + 10, 22, 12); for (let k = 0; k < 4; k++) dot(X + 8 + k * 5.5, Y + 16 + (k % 2 ? -2 : 2), 4, '#c08a50'); }
  else if (t === 'zebra') { g.fillStyle = '#fff6d8'; for (let k = 0; k < 5; k++) { if (p.vert) rrf(g, X + 3 + k * 12.5, Y, 7, TILE, 2); else rrf(g, X, Y + 3 + k * 12.5, TILE, 7, 2); } }
  else if (t === 'wash') { g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X + 2, Y + 16); g.lineTo(X + 30, Y + 16); g.stroke(); const cols = ['#fff6d8', '#f58ab0', '#8fc8f0', '#fff6d8', '#ffd84a']; for (let k = 0; k < 4; k++) box(X + 4 + k * 6.5, Y + 16, 5, 7 + (k % 2) * 3, cols[(k + Math.floor(n * 5)) % 5], 1); dot(X + 2, Y + 16, 2, '#8a6238'); dot(X + 30, Y + 16, 2, '#8a6238'); }
  else if (t === 'veg') { g.fillStyle = '#a97a4e'; rrf(g, X + 3, Y + 4, 26, 24, 3); for (let k = 0; k < 3; k++) for (let q = 0; q < 3; q++) dot(X + 8 + q * 8, Y + 9 + k * 7, 2.8, k === 1 ? '#e8884a' : '#63b85a', false); }
  else if (t === 'flowers') { for (let k = 0; k < 5; k++) { const fx = X + 5 + hsh(k, Math.floor(p.x * 9)) * 22, fy = Y + 6 + hsh(Math.floor(p.y * 9), k) * 20; dot(fx, fy, 3.2, ['#f58ab0', '#ffd84a', '#ff7a5a', '#b79aff', '#fff6d8'][(k + Math.floor(n * 5)) % 5], false); dot(fx, fy, 1.2, '#f2b230', false); } }
  else if (t === 'privy' || t === 'coal' || t === 'shed') { sh(X + 7, Y + 6, 18, 18); box(X + 7, Y + 6, 18, 18, t === 'coal' ? '#4a4658' : t === 'shed' ? '#b9824a' : '#c6b592'); g.fillStyle = 'rgba(45,36,56,0.25)'; g.fillRect(X + 8, Y + 14, 16, 2); }
  else if (t === 'hens') { box(X + 6, Y + 8, 20, 16, '#c9a878'); dot(X + 12, Y + 14, 2.6, '#fff6d8', false); dot(X + 19, Y + 18, 2.6, '#a8643a', false); }
  else if (t === 'tramp') { sh(X + 4, Y + 4, 24, 24); dot(X + 16, Y + 16, 12, '#3f8fd8'); dot(X + 16, Y + 16, 8.5, '#2d2438', false); }
  else if (t === 'patio') { g.fillStyle = '#e6dcc6'; rrf(g, X + 2, Y + 4, 28, 24, 3); dot(X + 16, Y + 16, 6, '#f4efe2'); dot(X + 7, Y + 16, 3, '#b9824a'); dot(X + 25, Y + 16, 3, '#b9824a'); }
  else if (t === 'pool') { box(X + 3, Y + 6, 26, 20, '#f4efe2', 8); g.fillStyle = '#6cd0ee'; rrf(g, X + 6, Y + 9, 20, 14, 6); }
  else if (t === 'gfence') { g.strokeStyle = city.year >= 1930 ? '#a9773f' : '#8a8478'; g.lineWidth = 2.2; g.setLineDash([6, 3]); g.beginPath(); g.moveTo(X + 1, Y + 2); g.lineTo(X + 1, Y + p.h * TILE - 2); g.stroke(); g.setLineDash([]); }
  else if (t === 'scarecrow') { g.fillStyle = 'rgba(45,36,56,0.22)'; g.beginPath(); g.ellipse(X + 19, Y + 21, 13, 5, 0, 0, 7); g.fill(); g.strokeStyle = '#8a6238'; g.lineWidth = 3; g.beginPath(); g.moveTo(X + 3, Y + 16); g.lineTo(X + 29, Y + 16); g.stroke(); box(X + 11, Y + 10, 10, 12, '#c8443a'); dot(X + 16, Y + 16, 5, '#ecd46e'); }
  else if (t === 'well') { sh(X + 4, Y + 4, 24, 24); dot(X + 16, Y + 16, 12, '#b8b0a0'); dot(X + 16, Y + 16, 7.5, '#3a6a8a'); g.strokeStyle = '#8a6238'; g.lineWidth = 3; g.beginPath(); g.moveTo(X + 3, Y + 16); g.lineTo(X + 29, Y + 16); g.stroke(); }
  else if (t === 'playground') { g.fillStyle = '#f2d38a'; rrf(g, X, Y, 56, 30, 8); g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.roundRect(X, Y, 56, 30, 8); g.stroke(); box(X + 6, Y + 6, 8, 18, '#e8554a', 2); dot(X + 30, Y + 15, 8, '#3f8fd8'); box(X + 44, Y + 5, 6, 20, '#f2c230', 2); }
  else if (t === 'fountain') { sh(X - 4, Y - 4, 44, 44); dot(X + 16, Y + 16, 22, '#cfc6b4'); dot(X + 16, Y + 16, 17, '#6cd0ee'); dot(X + 16, Y + 16, 6, '#cfc6b4'); dot(X + 16, Y + 16, 2.5, '#fff', false); }
  else if (t === 'boat') { g.save(); g.translate(X, Y); g.rotate(p.a); g.fillStyle = 'rgba(30,110,170,0.35)'; g.beginPath(); g.ellipse(2, 3, 19, 8, 0, 0, 7); g.fill(); g.fillStyle = p.c; g.beginPath(); g.moveTo(-17, -6); g.quadraticCurveTo(4, -9, 19, 0); g.quadraticCurveTo(4, 9, -17, 6); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); g.fillStyle = '#f4e6c4'; rrf(g, -11, -3.5, 16, 7, 2); if (p.sail) { g.fillStyle = '#fff6d8'; g.beginPath(); g.moveTo(0, -2); g.lineTo(4, -20); g.lineTo(12, -2); g.closePath(); g.fill(); g.stroke(); } g.restore(); }
  else if (t === 'brolly') { g.fillStyle = 'rgba(45,36,56,0.2)'; g.beginPath(); g.arc(X + 19, Y + 20, 13, 0, 7); g.fill(); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#fff6d8' : p.c; g.beginPath(); g.moveTo(X + 16, Y + 16); g.arc(X + 16, Y + 16, 13, k * Math.PI / 4, (k + 1) * Math.PI / 4); g.closePath(); g.fill(); } g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.arc(X + 16, Y + 16, 13, 0, 7); g.stroke(); }
  else if (t === 'towel' || t === 'deckchair') { box(X + 6, Y + 8, 12, 20, p.c, 2); g.fillStyle = '#fff6d8'; g.fillRect(X + 7, Y + 13, 10, 3); g.fillRect(X + 7, Y + 20, 10, 3); }
  else if (t === 'castle') { dot(X + 16, Y + 16, 8, '#e3c878'); dot(X + 16, Y + 16, 4, '#f3e2a4'); g.fillStyle = '#e8554a'; g.fillRect(X + 15, Y + 9, 6, 4); }
  else if (t === 'net' || t === 'pots') { g.strokeStyle = '#8a6a48'; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(X + 4 + k * 7, Y + 6); g.lineTo(X + 8 + k * 7, Y + 26); g.moveTo(X + 4, Y + 8 + k * 6); g.lineTo(X + 28, Y + 6 + k * 6); g.stroke(); } if (t === 'pots') { dot(X + 10, Y + 12, 4, '#a9773f'); dot(X + 20, Y + 20, 4, '#a9773f'); } }
  else if (t === 'rowboat') { g.save(); g.translate(X + 16, Y + 16); g.rotate(0.5); g.fillStyle = '#a9773f'; g.beginPath(); g.ellipse(0, 0, 15, 7, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); g.fillStyle = '#7a5630'; rrf(g, -8, -3, 16, 6, 2); g.restore(); }
  else if (t === 'groyne') { g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(X, Y + 16); g.lineTo(X + 4.6 * TILE, Y + 16); g.stroke(); g.strokeStyle = '#a9773f'; g.lineWidth = 3; g.setLineDash([8, 3]); g.beginPath(); g.moveTo(X, Y + 16); g.lineTo(X + 4.6 * TILE, Y + 16); g.stroke(); g.setLineDash([]); }
  else return false;
  return true;
}

function drawFlatProp(g, p, city) {
  const X = p.x * TILE, Y = p.y * TILE;
  if (drawSmallProp(g, p, X, Y, city)) return;
  if (p.t === 'grave') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 12, Y + 12, 12, 16); g.fillStyle = '#b8b4a8'; g.fillRect(X + 10, Y + 8, 12, 5); g.fillRect(X + 10, Y + 10, 12, 14); g.fillStyle = '#8a8678'; g.fillRect(X + 12, Y + 13, 8, 1); g.fillRect(X + 12, Y + 16, 8, 1); }
  else if (p.t === 'stall') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 5, Y + 7, 40, 24); g.fillStyle = p.c; g.fillRect(X, Y + 2, 40, 24); g.fillStyle = 'rgba(255,255,255,0.75)'; for (let k = 0; k < 40; k += 16) g.fillRect(X + k, Y + 2, 8, 24); }
  else if (p.t === 'shed') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 9, Y + 10, 18, 16); g.fillStyle = '#7a5a3a'; g.fillRect(X + 6, Y + 6, 18, 16); g.fillStyle = '#5a4028'; g.fillRect(X + 6, Y + 13, 18, 2); }
  else if (p.t === 'bays') { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let k = 0; k <= p.w; k += 2) { g.beginPath(); g.moveTo(X + k * TILE, Y + 8); g.lineTo(X + k * TILE, Y + 2 * TILE); g.stroke(); } }
  else if (p.t === 'pitch') { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; const w = p.w * TILE, h = p.h * TILE; g.strokeRect(X, Y, w, h); g.beginPath(); g.moveTo(X + w / 2, Y); g.lineTo(X + w / 2, Y + h); g.stroke(); g.beginPath(); g.arc(X + w / 2, Y + h / 2, 16, 0, 7); g.stroke(); g.strokeRect(X, Y + h / 2 - 22, 20, 44); g.strokeRect(X + w - 20, Y + h / 2 - 22, 20, 44); }
  else if (p.t === 'bandstand') { g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(X + 21, Y + 21, 24, 0, 7); g.fill(); g.fillStyle = '#e8e2d0'; g.beginPath(); for (let k = 0; k < 8; k++) g.lineTo(X + 16 + Math.cos(k * Math.PI / 4) * 24, Y + 16 + Math.sin(k * Math.PI / 4) * 24); g.fill(); g.fillStyle = '#3a7a5a'; g.beginPath(); for (let k = 0; k < 8; k++) g.lineTo(X + 16 + Math.cos(k * Math.PI / 4) * 18, Y + 16 + Math.sin(k * Math.PI / 4) * 18); g.fill(); g.fillStyle = '#d8c060'; g.beginPath(); g.arc(X + 16, Y + 16, 3, 0, 7); g.fill(); }
  else if (p.t === 'maypole') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(X + 19, Y + 19, 5, 0, 7); g.fill(); for (let k = 0; k < 6; k++) { g.strokeStyle = ['#c8443a', '#e8e0d0', '#3a6ac8'][k % 3]; g.lineWidth = 2; g.beginPath(); g.moveTo(X + 16, Y + 16); g.lineTo(X + 16 + Math.cos(k) * 34, Y + 16 + Math.sin(k) * 34); g.stroke(); } g.fillStyle = '#8a6238'; g.beginPath(); g.arc(X + 16, Y + 16, 4, 0, 7); g.fill(); }
  else if (p.t === 'stocks') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 4, Y + 16, 30, 8); g.fillStyle = '#6a4a30'; g.fillRect(X + 2, Y + 11, 30, 8); g.fillStyle = '#2a1c10'; g.beginPath(); g.arc(X + 10, Y + 15, 3, 0, 7); g.arc(X + 24, Y + 15, 3, 0, 7); g.fill(); }
  else if (p.t === 'cross' && p.memorial) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 2, Y + 2, 40, 40); g.fillStyle = '#b8b4a8'; g.fillRect(X - 6, Y - 6, 44, 44); g.fillStyle = '#d0ccc0'; g.fillRect(X + 2, Y + 2, 28, 28); g.fillStyle = '#e4e0d6'; g.fillRect(X + 10, Y + 10, 12, 12); g.fillStyle = '#c8302a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(X + 6 + k * 5, Y + 34, 2.4, 0, 7); g.fill(); } }
  else if (p.t === 'cross') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(X + 22, Y + 22, 22, 0, 7); g.fill(); g.fillStyle = '#a8a090'; g.beginPath(); g.arc(X + 16, Y + 16, 22, 0, 7); g.fill(); g.fillStyle = '#c8c0b0'; g.beginPath(); g.arc(X + 16, Y + 16, 14, 0, 7); g.fill(); g.fillStyle = '#8a8272'; g.fillRect(X + 12, Y + 12, 8, 8); }
  else if (p.t === 'hay') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(X + 20, Y + 20, 13, 0, 7); g.fill(); g.fillStyle = '#d8b850'; g.beginPath(); g.arc(X + 16, Y + 16, 13, 0, 7); g.fill(); g.strokeStyle = '#b89838'; g.lineWidth = 2; g.beginPath(); g.arc(X + 16, Y + 16, 7, 0, 7); g.stroke(); }
  else if (p.t === 'crate') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 9, Y + 9, 20, 20); g.fillStyle = '#9a7a4a'; g.fillRect(X + 5, Y + 5, 20, 20); g.strokeStyle = '#6a5230'; g.lineWidth = 2; g.strokeRect(X + 6, Y + 6, 18, 18); g.beginPath(); g.moveTo(X + 6, Y + 6); g.lineTo(X + 24, Y + 24); g.stroke(); }
  else if (p.t === 'runway') {
    g.fillStyle = '#3a3c42'; g.fillRect(X, Y, p.w * TILE, p.h * TILE);
    g.fillStyle = '#e8e8e0'; for (let k = 1; k < p.h; k += 2) g.fillRect(X + p.w * TILE / 2 - 3, Y + k * TILE, 6, TILE * 0.9);
    for (let k = 0; k < 4; k++) { g.fillRect(X + 14 + k * 28, Y + 8, 10, 44); g.fillRect(X + 14 + k * 28, Y + p.h * TILE - 52, 10, 44); }
  } else if (p.t === 'plane') {
    g.save(); g.translate(X, Y); g.fillStyle = 'rgba(0,0,0,0.3)'; plane(g, 10, 12); g.fillStyle = '#eef0f4'; plane(g, 0, 0); g.fillStyle = '#c8443a'; g.fillRect(-7, 62, 14, 16); g.fillStyle = '#5a7a9a'; g.fillRect(-5, -78, 10, 8); g.restore();
  } else if (p.t === 'steamer' || p.t === 'sail') {
    g.save(); g.translate(X, Y);
    g.fillStyle = 'rgba(0,0,0,0.25)'; hull(g, 8, 8); g.fillStyle = p.t === 'sail' ? '#6a4a30' : '#2a2a30'; hull(g, 0, 0); g.fillStyle = p.t === 'sail' ? '#9a7a4a' : '#b8a888'; g.fillRect(-24, -90, 48, 180);
    if (p.t === 'steamer') { g.fillStyle = '#e8e2d0'; g.fillRect(-18, -40, 36, 70); for (const yy of [-22, 10]) { g.fillStyle = '#1a1a1e'; g.beginPath(); g.arc(0, yy, 11, 0, 7); g.fill(); g.fillStyle = '#c8443a'; g.beginPath(); g.arc(0, yy, 8, 0, 7); g.fill(); } }
    else { for (const yy of [-50, 0, 50]) { g.fillStyle = '#efe8d4'; g.fillRect(-46, yy - 6, 92, 12); g.fillStyle = '#4a3420'; g.beginPath(); g.arc(0, yy, 5, 0, 7); g.fill(); } }
    g.restore();
  } else if (p.t === 'board') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 4, Y + 14, 28, 8); g.fillStyle = '#6a4a30'; g.fillRect(X + 2, Y + 10, 28, 8); g.fillStyle = '#f0e8c8'; g.fillRect(X + 5, Y + 11, 6, 6); g.fillRect(X + 13, Y + 11, 6, 6); g.fillRect(X + 21, Y + 11, 6, 6); }
  else if (p.t === 'phone') {
    const e = city.era;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 12, Y + 12, 18, 18);
    if (e === 'modern' || e === 'retro') { g.fillStyle = '#c0282a'; g.fillRect(X + 7, Y + 7, 18, 18); g.fillStyle = '#e04a44'; g.fillRect(X + 10, Y + 10, 12, 12); }
    else if (e === 'vintage' || e === 'victorian') { g.fillStyle = '#4a3a2a'; g.fillRect(X + 7, Y + 7, 18, 18); g.fillStyle = '#e8d8a0'; g.fillRect(X + 11, Y + 11, 10, 10); }
    else { g.fillStyle = '#6a4a30'; g.fillRect(X + 6, Y + 12, 20, 8); g.fillStyle = '#f0e8c8'; g.fillRect(X + 9, Y + 13, 14, 6); }
  }
}
function plane(g, ox, oy) {
  g.beginPath(); g.ellipse(ox, oy, 11, 84, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(ox - 8, oy - 14); g.lineTo(ox - 72, oy + 22); g.lineTo(ox - 72, oy + 34); g.lineTo(ox - 8, oy + 20); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(ox + 8, oy - 14); g.lineTo(ox + 72, oy + 22); g.lineTo(ox + 72, oy + 34); g.lineTo(ox + 8, oy + 20); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(ox - 5, oy + 58); g.lineTo(ox - 28, oy + 76); g.lineTo(ox - 28, oy + 84); g.lineTo(ox + 28, oy + 84); g.lineTo(ox + 28, oy + 76); g.lineTo(ox + 5, oy + 58); g.closePath(); g.fill();
}
function hull(g, ox, oy) { g.beginPath(); g.moveTo(ox, oy - 125); g.quadraticCurveTo(ox + 40, oy - 80, ox + 34, oy + 100); g.lineTo(ox - 34, oy + 100); g.quadraticCurveTo(ox - 40, oy - 80, ox, oy - 125); g.closePath(); g.fill(); }

/** Ground layer: cached in chunks, drawn for whatever the camera can see. view = { x, y, z, w, h } (world centre, zoom, screen size). */
export function drawGround(ctx, city, view) {
  const half = { w: view.w / 2 / view.z, h: view.h / 2 / view.z };
  const cs = CHUNK * TILE;
  const cx0 = Math.floor((view.x - half.w) / cs), cx1 = Math.floor((view.x + half.w) / cs), cy0 = Math.floor((view.y - half.h) / cs), cy1 = Math.floor((view.y + half.h) / cs);
  ctx.fillStyle = '#3f8f46'; ctx.fillRect(0, 0, view.w, view.h);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    if (cx < 0 || cy < 0 || cx * CHUNK >= city.W || cy * CHUNK >= city.H) continue;
    const key = cx + ',' + cy;
    let ch = city.chunks.get(key);
    if (!ch) { ch = renderChunk(city, cx, cy); if (city.chunks.size >= 56) city.chunks.delete(city.chunks.keys().next().value); } else city.chunks.delete(key);
    city.chunks.set(key, ch);
    const sx = Math.floor((cx * cs - view.x) * view.z + view.w / 2), sy = Math.floor((cy * cs - view.y) * view.z + view.h / 2);
    ctx.drawImage(ch, sx, sy, Math.ceil(cs * view.z) + 1, Math.ceil(cs * view.z) + 1);
  }
}

const LEAN = 0.085; // how far roofs lean away from the middle of the screen, per storey
/** Buildings, trees and tall props, leaning away from the middle of the screen like the old top-down city games. */
export function drawTall(ctx, city, view, t, night = 0) {
  const { x: cxw, y: cyw, z, w, h } = view;
  const hw = w / 2, hh = h / 2;
  const sx = wx => (wx - cxw) * z + hw, sy = wy => (wy - cyw) * z + hh;
  const pad = 5 * TILE;
  const x0 = cxw - hw / z - pad, x1 = cxw + hw / z + pad, y0 = cyw - hh / z - pad, y1 = cyw + hh / z + pad;
  const list = [];
  for (const b of city.buildings) {
    const bx = b.x * TILE, by = b.y * TILE, bw = b.w * TILE, bh = b.h * TILE;
    if (bx + bw < x0 || bx > x1 || by + bh < y0 || by > y1) continue;
    list.push({ b, d: Math.hypot(bx + bw / 2 - cxw, by + bh / 2 - cyw) });
  }
  const tx0 = Math.max(0, Math.floor(x0 / TILE)), tx1 = Math.min(city.W - 1, Math.floor(x1 / TILE)), ty0 = Math.max(0, Math.floor(y0 / TILE)), ty1 = Math.min(city.H - 1, Math.floor(y1 / TILE));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (city.tiles[ty * city.W + tx] === G.TREE) list.push({ tree: true, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, n: hsh(tx, ty), m: hsh(ty + 9, tx + 3), d: Math.hypot((tx + 0.5) * TILE - cxw, (ty + 0.5) * TILE - cyw) });
  for (const p of city.props) if ((p.t === 'lamp' || p.t === 'chimney' || p.t === 'gasometer' || p.t === 'windmill' || p.t === 'pole') && p.x * TILE > x0 && p.x * TILE < x1 && p.y * TILE > y0 && p.y * TILE < y1) list.push({ prop: p, d: Math.hypot(p.x * TILE - cxw, p.y * TILE - cyw) });
  list.sort((a, b) => b.d - a.d);
  const up = (X, Y, ht) => [hw + (X - hw) * (1 + ht * LEAN), hh + (Y - hh) * (1 + ht * LEAN)];
  const lerp = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  const poly = (pts, fill, lw = 1.5) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.strokeStyle = INK; ctx.lineWidth = lw * z; ctx.stroke(); }
  };
  ctx.lineJoin = 'round';
  const lit = night > 0.25;
  // windows (and a door) on a wall that can be seen: p is the foot of the wall, q the eaves
  const wall = (p0, p1, q0, q1, n, seed, door, b) => {
    if (Math.hypot(q0[0] - p0[0], q0[1] - p0[1]) < 5 * z) return;
    for (let i = 0; i < n; i++) {
      const isDoor = door && i === Math.floor(n / 2), u0 = (i + 0.27) / n, u1 = (i + 0.73) / n, v0 = isDoor ? 0.03 : 0.3, v1 = isDoor ? 0.66 : 0.8;
      const e0 = lerp(p0, p1, u0), e1 = lerp(p0, p1, u1), f0 = lerp(q0, q1, u0), f1 = lerp(q0, q1, u1);
      poly([lerp(e0, f0, v0), lerp(e1, f1, v0), lerp(e1, f1, v1), lerp(e0, f0, v1)], isDoor ? b.trim : lit ? (hsh(seed + i, seed * 3 + 1) > 0.42 ? '#ffe27a' : '#3d4a70') : '#c4e8f6', 1);
    }
  };
  const box = (bx, by, bw, bh, ht, wallCol, b, seed) => {
    const A = [sx(bx), sy(by)], B = [sx(bx + bw), sy(by)], Cc = [sx(bx + bw), sy(by + bh)], D = [sx(bx), sy(by + bh)];
    const a = up(A[0], A[1], ht), b2 = up(B[0], B[1], ht), c = up(Cc[0], Cc[1], ht), d = up(D[0], D[1], ht);
    poly([A, B, b2, a], shade(wallCol, 0.84)); poly([D, Cc, c, d], wallCol); poly([A, D, d, a], shade(wallCol, 0.92)); poly([B, Cc, c, b2], shade(wallCol, 0.76));
    if (b) {
      const nx = Math.max(1, Math.round(bw / TILE)), ny = Math.max(1, Math.round(bh / TILE));
      if (D[1] < hh) wall(D, Cc, d, c, nx, seed, !!b.door && b.door.y > b.y, b);
      if (A[1] > hh) wall(A, B, a, b2, nx, seed + 7, !!b.door && b.door.y < b.y, b);
      if (A[0] > hw) wall(A, D, a, d, ny, seed + 13, false, b);
      if (B[0] < hw) wall(B, Cc, b2, c, ny, seed + 19, false, b);
    }
    return { a, b2, c, d, rw: b2[0] - a[0], rh: d[1] - a[1] };
  };
  const roofOf = (r, col, style, ridge) => {
    const { a, b2, c, d, rw, rh } = r, x = a[0], y = a[1];
    const hi = shade(col, 1.12), lo = shade(col, 0.84), mid = shade(col, 0.94);
    if (style === 'thatch') {
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - 2 * z, y - 2 * z, rw + 4 * z, rh + 4 * z, 9 * z); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.stroke();
      ctx.strokeStyle = 'rgba(120,84,20,0.4)'; ctx.lineWidth = 1.5 * z; ctx.beginPath();
      for (let k = 1; k < 6; k++) { if (ridge === 'h') { ctx.moveTo(x + rw * k / 6, y + 3 * z); ctx.lineTo(x + rw * k / 6 - 3 * z, y + rh / 2); ctx.moveTo(x + rw * k / 6, y + rh - 3 * z); ctx.lineTo(x + rw * k / 6 - 3 * z, y + rh / 2); } else { ctx.moveTo(x + 3 * z, y + rh * k / 6); ctx.lineTo(x + rw / 2, y + rh * k / 6 - 3 * z); ctx.moveTo(x + rw - 3 * z, y + rh * k / 6); ctx.lineTo(x + rw / 2, y + rh * k / 6 - 3 * z); } }
      ctx.stroke();
      ctx.strokeStyle = shade(col, 0.7); ctx.lineWidth = 3 * z; ctx.beginPath(); if (ridge === 'h') { ctx.moveTo(x + 4 * z, y + rh / 2); ctx.lineTo(x + rw - 4 * z, y + rh / 2); } else { ctx.moveTo(x + rw / 2, y + 4 * z); ctx.lineTo(x + rw / 2, y + rh - 4 * z); } ctx.stroke();
      return;
    }
    if (style === 'hip') {
      const k = Math.min(rw, rh) / 2, r1 = ridge === 'h' ? [x + k, y + rh / 2] : [x + rw / 2, y + k], r2 = ridge === 'h' ? [x + rw - k, y + rh / 2] : [x + rw / 2, y + rh - k];
      if (ridge === 'h') { poly([a, b2, r2, r1], hi, 1); poly([d, c, r2, r1], lo, 1); poly([a, d, r1], mid, 1); poly([b2, c, r2], shade(col, 0.76), 1); }
      else { poly([a, d, r2, r1], hi, 1); poly([b2, c, r2, r1], lo, 1); poly([a, b2, r1], mid, 1); poly([d, c, r2], shade(col, 0.76), 1); }
      poly([a, b2, c, d], null, 2);
      return;
    }
    poly([a, b2, c, d], style === 'gable' ? hi : col, 0);
    if (style === 'gable') {
      ctx.fillStyle = lo; if (ridge === 'h') ctx.fillRect(x, y + rh / 2, rw, rh / 2); else ctx.fillRect(x + rw / 2, y, rw / 2, rh);
      ctx.strokeStyle = 'rgba(45,36,56,0.16)'; ctx.lineWidth = z; ctx.beginPath();
      if (ridge === 'h') for (const f of [0.25, 0.75]) { ctx.moveTo(x, y + rh * f); ctx.lineTo(x + rw, y + rh * f); } else for (const f of [0.25, 0.75]) { ctx.moveTo(x + rw * f, y); ctx.lineTo(x + rw * f, y + rh); }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.beginPath(); if (ridge === 'h') { ctx.moveTo(x, y + rh / 2); ctx.lineTo(x + rw, y + rh / 2); } else { ctx.moveTo(x + rw / 2, y); ctx.lineTo(x + rw / 2, y + rh); } ctx.stroke();
    } else if (style === 'saw') {
      const n = Math.max(2, Math.round(rw / (TILE * z)));
      for (let k = 0; k < n; k++) { ctx.fillStyle = hi; ctx.fillRect(x + k * rw / n, y, rw / n * 0.55, rh); ctx.fillStyle = '#bfe6f5'; ctx.fillRect(x + (k + 0.55) * rw / n, y, rw / n * 0.2, rh); ctx.strokeStyle = 'rgba(45,36,56,0.4)'; ctx.lineWidth = z; ctx.strokeRect(x + k * rw / n, y, rw / n, rh); }
    } else {
      // flat, with a parapet (and a dome for the town hall)
      ctx.strokeStyle = 'rgba(45,36,56,0.35)'; ctx.lineWidth = 1.5 * z; ctx.strokeRect(x + 4 * z, y + 4 * z, rw - 8 * z, rh - 8 * z);
      ctx.fillStyle = hi; ctx.fillRect(x + 5 * z, y + 5 * z, rw - 10 * z, rh - 10 * z);
      if (style === 'dome') { const rr = Math.min(rw, rh) * 0.3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + rw / 2, y + rh / 2, rr, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8 * z; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x + rw / 2 - rr * 0.3, y + rh / 2 - rr * 0.3, rr * 0.4, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x + rw / 2, y + rh / 2, 2.5 * z, 0, 7); ctx.fill(); }
    }
    poly([a, b2, c, d], null, 2);
  };
  for (const it of list) {
    if (it.tree) {
      const [ux, uy] = up(sx(it.x), sy(it.y), 1.1), r = (13 + it.n * 6) * z, X = sx(it.x), Y = sy(it.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
      ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 3.4 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
      if (it.m < 0.22) { // conifer
        ctx.fillStyle = '#2f7d4f'; ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7, rr = k % 2 ? r * 0.62 : r * 1.05; ctx.lineTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * z; ctx.stroke();
        ctx.fillStyle = '#48a066'; ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7 + 0.2, rr = k % 2 ? r * 0.3 : r * 0.55; ctx.lineTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      } else {
        const blossom = it.m > 0.88, col = blossom ? '#f7a8c4' : it.n > 0.5 ? '#4fae4a' : '#63c257', hi = blossom ? '#ffd0e0' : it.n > 0.5 ? '#74cc62' : '#8ada6e';
        ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + it.n * 6; ctx.moveTo(ux + Math.cos(a) * r * 0.5 + r * 0.62, uy + Math.sin(a) * r * 0.5); ctx.arc(ux + Math.cos(a) * r * 0.5, uy + Math.sin(a) * r * 0.5, r * 0.62, 0, 7); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3.2 * z; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
        ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(ux - r * 0.28, uy - r * 0.3, r * 0.5, 0, 7); ctx.fill();
        if (blossom) { ctx.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(ux + Math.cos(k * 1.9) * r * 0.6, uy + Math.sin(k * 2.3) * r * 0.6, 2 * z, 0, 7); ctx.fill(); } }
      }
      continue;
    }
    if (it.prop) {
      const p = it.prop, X = sx((p.x + 0.5) * TILE), Y = sy((p.y + 0.5) * TILE);
      if (p.t === 'lamp') {
        const [ux, uy] = up(X, Y, 0.9);
        ctx.strokeStyle = INK; ctx.lineWidth = 3.4 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
        ctx.fillStyle = lit ? '#fff2a8' : city.year < 1900 ? '#f6dc8a' : '#f4f4ea'; ctx.beginPath(); ctx.arc(ux, uy, 4.2 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.stroke();
        if (lit) { ctx.fillStyle = 'rgba(255,226,122,0.28)'; ctx.beginPath(); ctx.arc(ux, uy, 11 * z, 0, 7); ctx.fill(); }
      } else if (p.t === 'pole') {
        const [ux, uy] = up(X, Y, 1.5);
        ctx.strokeStyle = INK; ctx.lineWidth = 3.6 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
        ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.6 * z; ctx.beginPath(); ctx.moveTo(ux - 9 * z, uy); ctx.lineTo(ux + 9 * z, uy); ctx.stroke();
      } else if (p.t === 'gasometer') {
        const ht = 2.3, r0 = p.r * TILE * z, [ux, uy] = up(X, Y, ht), r1 = r0 * (1 + ht * LEAN);
        ctx.strokeStyle = INK; ctx.lineWidth = 3 * z; for (const f of [0, 1]) { ctx.beginPath(); ctx.arc(X + (ux - X) * f, Y + (uy - Y) * f, r0 + (r1 - r0) * f, 0, 7); ctx.stroke(); }
        for (let k = 0; k <= 6; k++) { const f = k / 6; ctx.fillStyle = shade('#7fb0a0', 0.72 + f * 0.26); ctx.beginPath(); ctx.arc(X + (ux - X) * f, Y + (uy - Y) * f, r0 + (r1 - r0) * f, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#9cc9b8'; ctx.beginPath(); ctx.arc(ux, uy, r1, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.stroke();
        ctx.strokeStyle = 'rgba(45,36,56,0.35)'; ctx.lineWidth = 1.5 * z; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + Math.cos(k * Math.PI / 4) * r1, uy + Math.sin(k * Math.PI / 4) * r1); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(ux, uy, r1 * 0.55, 0, 7); ctx.stroke();
      } else if (p.t === 'windmill') {
        const ht = 3.0, [ux, uy] = up(X, Y, ht);
        ctx.strokeStyle = INK; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.arc(X, Y, 15 * z, 0, 7); ctx.stroke();
        for (let k = 0; k <= 6; k++) { const f = k / 6; ctx.fillStyle = shade('#f6eed6', 0.74 + f * 0.26); ctx.beginPath(); ctx.arc(X + (ux - X) * f, Y + (uy - Y) * f, (15 - f * 6) * z, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#a8553f'; ctx.beginPath(); ctx.arc(ux, uy, 9 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.stroke();
        ctx.save(); ctx.translate(ux, uy); ctx.rotate(t * 0.7);
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = INK; ctx.fillRect(-2 * z, 0, 4 * z, 46 * z); ctx.fillStyle = '#fff6d8'; ctx.fillRect(2 * z, 10 * z, 10 * z, 34 * z); ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * z; ctx.strokeRect(2 * z, 10 * z, 10 * z, 34 * z); for (let q = 16; q < 44; q += 7) { ctx.beginPath(); ctx.moveTo(2 * z, q * z); ctx.lineTo(12 * z, q * z); ctx.stroke(); } }
        ctx.restore();
      } else {
        const [ux, uy] = up(X, Y, 4.2), r = 9 * z;
        poly([[X - r, Y], [X + r, Y], [ux + r * 0.8, uy], [ux - r * 0.8, uy]], '#cf6b4f', 1.8);
        ctx.fillStyle = '#b0503e'; ctx.beginPath(); ctx.arc(ux, uy, r * 0.8, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8 * z; ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ux, uy, r * 0.45, 0, 7); ctx.fill();
        if (city.year >= 1760 && city.year < 1975) for (let k = 0; k < 4; k++) { const ph = ((t * 0.25 + k / 4) % 1); ctx.fillStyle = `rgba(244,240,232,${0.75 * (1 - ph)})`; ctx.beginPath(); ctx.arc(ux + ph * 60 * z, uy - ph * 34 * z, (7 + ph * 20) * z, 0, 7); ctx.fill(); }
      }
      continue;
    }
    const b = it.b, bx = b.x * TILE, by = b.y * TILE, bw = b.w * TILE, bh = b.h * TILE, seed = b.x * 31 + b.y * 17;
    // a striped awning over the pavement outside a shop
    if (b.shop && b.door && b.door.y > b.y) {
      const p1 = up(sx(bx + 4), sy(by + bh), 0.55), p2 = up(sx(bx + bw - 4), sy(by + bh), 0.55), p3 = up(sx(bx + bw - 4), sy(by + bh + 15), 0.4), p4 = up(sx(bx + 4), sy(by + bh + 15), 0.4), n = Math.max(3, b.w * 2);
      for (let k = 0; k < n; k++) poly([lerp(p1, p2, k / n), lerp(p1, p2, (k + 1) / n), lerp(p4, p3, (k + 1) / n), lerp(p4, p3, k / n)], k % 2 ? '#fff6d8' : b.shop, 0);
      poly([p1, p2, p3, p4], null, 1.6);
    }
    const r = box(bx, by, bw, bh, b.ht, b.wall, b, seed);
    roofOf(r, b.roof, b.style || (b.flat ? 'flat' : 'gable'), b.ridge);
    const a = r.a, rw = r.rw, rh = r.rh;
    for (let k = 0; k < (b.chim || 0); k++) {
      const cx2 = a[0] + rw * (b.ridge === 'h' ? (k ? 0.76 : 0.2) : 0.5) - 4 * z, cy2 = a[1] + rh * (b.ridge === 'h' ? 0.5 : (k ? 0.76 : 0.2)) - 4 * z;
      ctx.fillStyle = '#b0503e'; ctx.fillRect(cx2, cy2, 8 * z, 8 * z); ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * z; ctx.strokeRect(cx2, cy2, 8 * z, 8 * z); ctx.fillStyle = INK; ctx.fillRect(cx2 + 2.4 * z, cy2 + 2.4 * z, 3.2 * z, 3.2 * z);
      if (b.smoke && k === 0) for (let q = 0; q < 3; q++) { const ph = ((t * 0.3 + q / 3 + seed * 0.13) % 1); ctx.fillStyle = `rgba(244,240,232,${0.7 * (1 - ph)})`; ctx.beginPath(); ctx.arc(cx2 + 4 * z + ph * 26 * z, cy2 - ph * 16 * z, (3 + ph * 8) * z, 0, 7); ctx.fill(); }
    }
    if (b.flat && b.kind === 'house' || b.kind === 'flats') { const q = hsh(b.x, b.y); ctx.fillStyle = '#8d90a0'; ctx.fillRect(a[0] + rw * (0.2 + q * 0.4), a[1] + rh * 0.25, 9 * z, 7 * z); ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * z; ctx.strokeRect(a[0] + rw * (0.2 + q * 0.4), a[1] + rh * 0.25, 9 * z, 7 * z); ctx.fillStyle = '#bfe6f5'; ctx.fillRect(a[0] + rw * 0.68, a[1] + rh * 0.55, 8 * z, 8 * z); ctx.strokeRect(a[0] + rw * 0.68, a[1] + rh * 0.55, 8 * z, 8 * z); }
    if (b.kind === 'church' && b.tower) { const tw = b.tower; const tr = box(tw.x * TILE, tw.y * TILE, tw.w * TILE, tw.h * TILE, 3.4, b.wall, null, 0); const m = [tr.a[0] + tr.rw / 2, tr.a[1] + tr.rh / 2]; poly([tr.a, tr.b2, m], shade('#6d7f96', 1.15), 1); poly([tr.b2, tr.c, m], shade('#6d7f96', 0.8), 1); poly([tr.c, tr.d, m], shade('#6d7f96', 0.9), 1); poly([tr.d, tr.a, m], '#6d7f96', 1); poly([tr.a, tr.b2, tr.c, tr.d], null, 2); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(m[0], m[1], 3 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * z; ctx.stroke(); }
    if (b.kind === 'infirmary' && city.year >= 1860) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a[0] + rw / 2, a[1] + rh / 2, 13 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.stroke(); ctx.fillStyle = '#e0362e'; ctx.fillRect(a[0] + rw / 2 - 3 * z, a[1] + rh / 2 - 9 * z, 6 * z, 18 * z); ctx.fillRect(a[0] + rw / 2 - 9 * z, a[1] + rh / 2 - 3 * z, 18 * z, 6 * z); }
    if (b.kind === 'office' && city.era === 'modern') { ctx.fillStyle = '#f08aa0'; ctx.fillRect(a[0] + rw * 0.52, a[1] + rh * 0.55, rw * 0.32, rh * 0.22); ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * z; ctx.strokeRect(a[0] + rw * 0.52, a[1] + rh * 0.55, rw * 0.32, rh * 0.22); ctx.fillStyle = '#fff6f0'; ctx.fillRect(a[0] + rw * 0.72, a[1] + rh * 0.55, rw * 0.05, rh * 0.22); }
    if (b.kind === 'police' && city.year >= 1900) { ctx.fillStyle = '#3f6ae0'; ctx.beginPath(); ctx.arc(a[0] + rw / 2, a[1] + rh / 2, 7 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.stroke(); }
    if (b.kind === 'store') { ctx.fillStyle = '#e0362e'; ctx.fillRect(a[0] + rw * 0.06, a[1] + rh * 0.76, rw * 0.88, rh * 0.14); ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * z; ctx.strokeRect(a[0] + rw * 0.06, a[1] + rh * 0.76, rw * 0.88, rh * 0.14); }
    if (b.kind === 'hub' && city.air) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (let k = 0; k < 6; k++) ctx.fillRect(a[0] + (k + 0.15) * rw / 6, a[1] + rh * 0.22, rw / 6 * 0.7, rh * 0.56); }
    if (b.kind === 'pub') { ctx.fillStyle = '#f2c230'; ctx.fillRect(a[0] + rw * 0.36, a[1] + rh * 0.78, rw * 0.28, rh * 0.14); ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * z; ctx.strokeRect(a[0] + rw * 0.36, a[1] + rh * 0.78, rw * 0.28, rh * 0.14); }
  }
}

/** Small map of the whole town, drawn once. */
export function renderMiniMap(city, scale = 2) {
  const c = document.createElement('canvas');
  c.width = city.W * scale; c.height = city.H * scale;
  const g = c.getContext('2d');
  const col = { [G.GRASS]: '#4a8a3c', [G.ROAD]: '#d8d4c8', [G.PAVE]: '#8a8880', [G.BUILD]: '#4a3a34', [G.WATER]: '#2a6aa8', [G.PLAZA]: '#b8ae98', [G.FIELD]: '#7a9a44', [G.YARD]: '#7a7468', [G.APRON]: '#6a6e76', [G.TREE]: '#2e6a2e', [G.SAND]: '#e8d898' };
  for (let y = 0; y < city.H; y++) for (let x = 0; x < city.W; x++) { g.fillStyle = col[city.tiles[y * city.W + x]]; g.fillRect(x * scale, y * scale, scale, scale); }
  return c;
}
