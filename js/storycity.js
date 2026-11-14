// Story mode towns. Every town in the file gets its own street plan (seeded from its name), and the same
// streets exist in every year: the further back you go, the more of the outskirts are still fields, the
// roads turn from tarmac to setts to mud, and slate gives way to thatch.
import { hashString, seededRandom } from './ancestry.js';
import { eraOf, lotName } from './storyplot.js';

export const TILE = 32;
export const G = { GRASS: 0, ROAD: 1, PAVE: 2, BUILD: 3, WATER: 4, PLAZA: 5, FIELD: 6, YARD: 7, APRON: 8, TREE: 9 };
const NB = 7; // blocks each way
const STONE = new Set(['pennine', 'cotswold', 'granite', 'scotstone', 'tenement', 'lakeland', 'blackhouse', 'welsh', 'valleys', 'irishcottage', 'colliery']);
const MED = new Set(['med', 'stucco', 'flatroof']);
const WOOD = new Set(['clapboard', 'veranda', 'wooden', 'nordic', 'chattel', 'stilt']);
const pick = (r, a) => a[Math.floor(r() * a.length)];

const SPECIAL_SIZE = { church: [4, 6], hall: [6, 4], pub: [3, 3], post: [4, 3], police: [4, 3], school: [6, 3], infirmary: [6, 4], office: [4, 4], works: [0, 0], farm: [4, 3], hub: [6, 3] };

/** Build the town as it stood in `year`. */
export function buildTown(town, year, opts = {}) {
  const era = eraOf(year);
  const rnd = seededRandom(hashString('town' + town.id));
  const xs = [], ys = [];
  let p = 8;
  for (let i = 0; i <= NB; i++) { xs.push(p); p += 10 + Math.floor(rnd() * 4); }
  p = 8;
  for (let i = 0; i <= NB; i++) { ys.push(p); p += 10 + Math.floor(rnd() * 4); }
  const W = xs[NB] + 2 + 13, H = ys[NB] + 2 + 8;
  const tiles = new Uint8Array(W * H);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = v; };
  const fill = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v); };
  const buildings = [], homes = [], props = [], lots = {}, parkSpots = [];
  const air = year >= 1950;

  // Sea along the east side; woods round the rest.
  fill(xs[NB] + 2, 0, W - 1, H - 1, G.WATER);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * (xs[NB] + 2)), y = Math.floor(rnd() * H);
    if (x < xs[0] - 1 || y < ys[0] - 1 || y > ys[NB] + 2) set(x, y, G.TREE);
  }
  // Roads
  for (const x of xs) fill(x, ys[0], x + 1, ys[NB] + 1, G.ROAD);
  for (const y of ys) fill(xs[0], y, xs[NB] + 1, y + 1, G.ROAD);

  // What each block is.
  const use = Array.from({ length: NB }, () => Array(NB).fill('homes'));
  const C = 3;
  use[C][C] = 'market';
  const ring1 = [];
  for (let j = C - 1; j <= C + 1; j++) for (let i = C - 1; i <= C + 1; i++) if (i !== C || j !== C) ring1.push([i, j]);
  for (let i = ring1.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ring1[i], ring1[j]] = [ring1[j], ring1[i]]; }
  ['church', 'hall', 'pub', 'post', 'police', 'school', 'infirmary', 'office'].forEach((k, n) => { use[ring1[n][1]][ring1[n][0]] = k; });
  const ring2 = [];
  for (let j = 1; j <= 5; j++) for (let i = 1; i <= 5; i++) if (Math.max(Math.abs(i - C), Math.abs(j - C)) === 2) ring2.push([i, j]);
  const wk = ring2[Math.floor(rnd() * ring2.length)];
  use[wk[1]][wk[0]] = 'works';
  let pk = ring2[Math.floor(rnd() * ring2.length)];
  if (pk === wk) pk = ring2[(ring2.indexOf(wk) + 5) % ring2.length];
  use[pk[1]][pk[0]] = 'park';
  use[C][NB - 1] = 'hub';
  use[2 + Math.floor(rnd() * 3)][0] = 'farm';
  // Blocks that are only something special for part of the town's history.
  use[NB - 1][1 + Math.floor(rnd() * 5)] = 'retail';
  use[0][1 + Math.floor(rnd() * 5)] = 'allot';
  let gs = ring2[Math.floor(rnd() * ring2.length)];
  if (use[gs[1]][gs[0]] !== 'homes') gs = ring2.find(r => use[r[1]][r[0]] === 'homes');
  use[gs[1]][gs[0]] = 'gas';

  const blocks = [];
  for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) {
    const x0 = xs[bi] + 2, x1 = xs[bi + 1] - 1, y0 = ys[bj] + 2, y1 = ys[bj + 1] - 1;
    const ring = Math.max(Math.abs(bi - C), Math.abs(bj - C));
    const r1 = rnd(), r2 = rnd();
    // The old core has always been there; the rest was built outwards over the centuries.
    const built = ring <= 1 ? 0 : ring === 2 ? 1690 + Math.floor(r1 * 190) : 1850 + Math.floor(r1 * 125);
    const b = { bi, bj, x0, y0, x1, y1, ix0: x0 + 1, iy0: y0 + 1, ix1: x1 - 1, iy1: y1 - 1, ring, built, kind: use[bj][bi], seed: Math.floor(r2 * 1e9) };
    blocks.push(b);
    fill(x0, y0, x1, y1, G.PAVE);
    fill(b.ix0, b.iy0, b.ix1, b.iy1, G.GRASS);
  }

  const addB = (x, y, w, h, kind, extra = {}) => { const b = { x, y, w, h, kind, ...extra }; buildings.push(b); fill(x, y, x + w - 1, y + h - 1, G.BUILD); return b; };
  const rowHouses = (rr, x0, x1, y, depth, doorY, attached, list) => {
    let x = x0;
    while (x1 - x + 1 >= 2) {
      let w = 2 + Math.floor(rr() * 3);
      if (x1 - (x + w) + 1 < 2) w = x1 - x + 1;
      const gap = !attached && w > 2 && rr() < 0.6 ? 1 : 0;
      list.push({ x, y, w: w - gap, h: depth, door: { x: x + Math.floor((w - gap) / 2), y: doorY } });
      x += w;
    }
  };
  const lot = (kind, tx, ty, b) => { lots[kind] = { kind, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, tx, ty, b, name: lotName(kind, town, year) }; };

  for (const b of blocks) {
    const rr = seededRandom(b.seed);
    const iw = b.ix1 - b.ix0 + 1, ih = b.iy1 - b.iy0 + 1;
    const exists = year >= b.built;
    const attached = b.ring <= 2;
    let kind = b.kind;
    if (kind === 'gas' && !(year >= 1840 && year < 1975)) kind = 'homes';
    if (kind === 'retail' && year < 1985) kind = 'homes';
    if (kind === 'allot' && year < 1900) kind = 'homes';
    if (kind === 'gas') {
      fill(b.ix0, b.iy0, b.ix1, b.iy1, G.YARD);
      const gx = b.ix0 + Math.floor(iw / 2) - (iw >= 8 ? 1 : 0), gy = b.iy0 + Math.floor(ih / 2);
      fill(gx - 1, gy - 1, gx + 1, gy + 1, G.BUILD);
      props.push({ t: 'gasometer', x: gx, y: gy, r: 2.0 });
      addB(b.ix1 - 2, b.iy1 - 1, 3, 2, 'shed');
      continue;
    }
    if (kind === 'retail') {
      fill(b.ix0, b.iy0, b.ix1, b.iy1, G.YARD);
      addB(b.ix0, b.iy0, iw, Math.max(3, ih - 5), 'store');
      props.push({ t: 'bays', x: b.ix0, y: b.iy1 - 2, w: iw });
      for (let i = 0; i < iw; i += 2) parkSpots.push({ x: (b.ix0 + i + 0.5) * TILE, y: (b.iy1 - 0.9) * TILE, ang: -Math.PI / 2 });
      continue;
    }
    if (kind === 'allot') {
      fill(b.ix0, b.iy0, b.ix1, b.iy1, G.FIELD); b.field = 'allot';
      for (let i = 0; i < 7; i++) props.push({ t: 'shed', x: b.ix0 + Math.floor(rr() * iw), y: b.iy0 + Math.floor(rr() * ih) });
      continue;
    }
    if (kind === 'market') {
      fill(b.x0, b.y0, b.x1, b.y1, G.PLAZA);
      lot('market', b.x0 + Math.floor((b.x1 - b.x0) / 2), b.y1, null);
      lot('phone', b.x0, b.y0, null);
      for (let i = 0; i < 5; i++) props.push({ t: 'stall', x: b.ix0 + 1 + Math.floor(rr() * (iw - 2)), y: b.iy0 + 1 + Math.floor(rr() * (ih - 3)), c: pick(rr, ['#c8443a', '#3a6ac8', '#e0b030', '#3a9a5a', '#e8e0d0']) });
      props.push({ t: 'cross', x: b.x0 + (b.x1 - b.x0) / 2, y: b.y0 + (b.y1 - b.y0) / 2, memorial: year >= 1920 });
      if (year < 1837) props.push({ t: 'stocks', x: b.ix1 - 1, y: b.iy1 - 1 });
      props.push({ t: 'phone', x: b.x0, y: b.y0 });
      props.push({ t: 'board', x: lots.market.tx, y: b.y1 - 1 });
      continue;
    }
    if (kind === 'homes') {
      const list = [];
      const depth = ih >= 8 ? 3 : 2;
      rowHouses(rr, b.ix0, b.ix1, b.iy0, depth, b.y0, attached, list);
      rowHouses(rr, b.ix0, b.ix1, b.iy1 - depth + 1, depth, b.y1, attached, list);
      const treeSpots = Array.from({ length: 4 }, () => [b.ix0 + Math.floor(rr() * iw), b.iy0 + depth + Math.floor(rr() * Math.max(1, ih - depth * 2))]);
      if (exists) {
        for (const h of list) { const hb = addB(h.x, h.y, h.w, h.h, 'house', { door: h.door }); homes.push({ tx: h.door.x, ty: h.door.y, x: (h.door.x + 0.5) * TILE, y: (h.door.y + 0.5) * TILE, b: hb }); }
        if (ih - depth * 2 >= 2) for (const [tx, ty] of treeSpots.slice(0, 2)) set(tx, ty, G.TREE);
      } else {
        fill(b.ix0, b.iy0, b.ix1, b.iy1, G.FIELD);
        b.field = pick(rr, ['plough', 'pasture', 'crop']);
        for (const [tx, ty] of treeSpots) set(tx, ty, G.TREE);
      }
      continue;
    }
    if (kind === 'park') {
      if (exists && year >= 1860) props.push({ t: 'bandstand', x: b.ix0 + iw / 2 - 0.5, y: b.iy0 + 1.5 });
      if (exists && year >= 1900 && ih >= 7) props.push({ t: 'pitch', x: b.ix0 + 1, y: b.iy1 - 3, w: iw - 2, h: 3.4 });
      if (year < 1714) props.push({ t: 'maypole', x: b.ix0 + iw / 2 - 0.5, y: b.iy0 + ih / 2 });
      const n = 10;
      for (let i = 0; i < n; i++) set(b.ix0 + Math.floor(rr() * iw), b.iy0 + Math.floor(rr() * ih), G.TREE);
      const px = b.ix0 + 2 + Math.floor(rr() * Math.max(1, iw - 5)), py = b.iy0 + 2 + Math.floor(rr() * Math.max(1, ih - 5));
      fill(px, py, px + 1, py + 1, G.WATER);
      if (!exists) b.field = 'pasture';
      continue;
    }
    // Landmarks: one main building facing the road to the south, with its own grounds.
    let [bw, bh] = SPECIAL_SIZE[b.kind];
    const ground = { church: G.GRASS, school: G.YARD, works: G.YARD, police: G.YARD, farm: G.FIELD, hub: G.APRON, pub: G.YARD }[b.kind] ?? G.GRASS;
    fill(b.ix0, b.iy0, b.ix1, b.iy1, ground);
    if (b.kind === 'hub') fill(b.x0, b.y0, b.x1, b.y1, G.APRON);
    if (b.kind === 'works') { bw = iw; bh = ih - 3; }
    if (b.kind === 'farm') b.field = 'crop';
    const bx = b.ix0 + Math.floor((iw - bw) / 2), by = b.iy1 - bh + 1;
    const main = addB(bx, by, bw, bh, b.kind);
    lot(b.kind, bx + Math.floor(bw / 2), b.y1, main);
    if (b.kind === 'church') {
      main.tower = { x: bx + 1, y: by + bh - 2, w: 2, h: 2 };
      for (let i = 0; i < 12; i++) { const gx = b.ix0 + Math.floor(rr() * iw), gy = b.iy0 + Math.floor(rr() * ih); if (gx < bx - 0 || gx >= bx + bw) props.push({ t: 'grave', x: gx, y: gy }); }
      set(b.ix0, b.iy0, G.TREE); set(b.ix1, b.iy0, G.TREE);
    } else if (b.kind === 'pub') {
      // the lock-up is behind the pub, facing the road to the north
      const gx = b.ix0 + Math.floor((iw - 3) / 2);
      const g = addB(gx, b.iy0, 3, 2, 'garage');
      lot('garage', gx + 1, b.y0, g);
    } else if (b.kind === 'works') {
      props.push({ t: 'chimney', x: bx + bw - 1.5, y: by + 0.8 });
      if (year >= 1760) props.push({ t: 'chimney', x: bx + 1.2, y: by + bh - 1.2 });
    } else if (b.kind === 'farm') {
      addB(b.ix0, b.iy0, 3, 3, 'barn');
      for (let i = 0; i < 4; i++) props.push({ t: 'hay', x: b.ix0 + 4 + Math.floor(rr() * Math.max(1, iw - 5)), y: b.iy0 + Math.floor(rr() * 3) });
      set(b.ix1, b.iy0, G.TREE); set(b.ix1, b.iy0 + 2, G.TREE);
      if (year < 1850) { set(b.ix1 - 1, b.iy0 + 4, G.BUILD); props.push({ t: 'windmill', x: b.ix1 - 1, y: b.iy0 + 4 }); }
    } else if (b.kind === 'hub') {
      const my = (b.y0 + b.y1) / 2;
      if (air) {
        fill(xs[NB] + 2, b.y0 - 5, W - 3, b.y1 + 5, G.APRON);
        props.push({ t: 'runway', x: xs[NB] + 6.5, y: b.y0 - 4, w: 4, h: b.y1 - b.y0 + 9 });
        props.push({ t: 'plane', x: xs[NB] + 4.5, y: my - 2 });
      } else {
        fill(xs[NB] + 2, b.y0 - 2, xs[NB] + 3, b.y1 + 2, G.APRON);
        props.push({ t: year >= 1840 ? 'steamer' : 'sail', x: xs[NB] + 6.5, y: my });
        for (let i = 0; i < 5; i++) props.push({ t: 'crate', x: b.ix0 + Math.floor(rr() * iw), y: b.iy0 + Math.floor(rr() * 2) });
      }
    } else if (['hall', 'post', 'police', 'school', 'infirmary', 'office'].includes(b.kind)) {
      // a short row of houses along the back of the block
      if (by - b.iy0 >= 3) {
        const list = [];
        rowHouses(rr, b.ix0, b.ix1, b.iy0, 2, b.y0, true, list);
        for (const h of list) { const hb = addB(h.x, h.y, h.w, h.h, 'house', { door: h.door }); homes.push({ tx: h.door.x, ty: h.door.y, x: (h.door.x + 0.5) * TILE, y: (h.door.y + 0.5) * TILE, b: hb }); }
      }
    }
  }
  // Street lamps on the corners of built-up blocks.
  if (year >= 1810) for (const b of blocks) if (year >= b.built && b.kind !== 'market') { props.push({ t: 'lamp', x: b.x0, y: b.y0 }); props.push({ t: 'lamp', x: b.x1, y: b.y1 }); }

  // Colours for the year and the part of the world.
  const er = seededRandom(hashString(town.id + era));
  const house = town.house || 'midbrick';
  const stone = STONE.has(house), med = MED.has(house), wood = WOOD.has(house);
  const old = era === 'early' || era === 'georgian';
  const wallSet = med ? ['#e8dcc0', '#f0e6d0', '#e0c8a0', '#d8b890'] : wood ? ['#d8d4c8', '#b8c4c8', '#c8b8a0', '#a8544a', '#7a8a9a'] : stone ? ['#9a8a6e', '#8c7e66', '#a39478', '#7e735e']
    : old ? ['#e6dcc4', '#d8ccb0', '#8a4a38', '#c8bca0'] : ['#8a4a38', '#7a4034', '#96523e', '#6e3a30', '#a05a44'];
  const roofSet = med ? ['#c06a3a', '#b05a30', '#c87a48'] : old ? ['#b89a4a', '#a88a40', '#c4a656', '#b89a4a', '#6a6258']
    : era === 'victorian' ? ['#484c58', '#525664', '#3e424c'] : era === 'vintage' ? ['#484c58', '#525664', '#8e4a36']
      : era === 'retro' ? ['#8e4a36', '#7a4030', '#525664', '#484c58'] : ['#8e4a36', '#7a4030', '#525664', '#8a8e94', '#6a6e78'];
  const SPECIAL = {
    church: ['#a09880', '#5a6068', 1.6], hall: [stone || old ? '#a8987a' : '#b8a888', '#5a8a78', 1.8], pub: ['#e8e2d0', '#3a3a40', 1.2], post: ['#96523e', '#4a3a36', 1.3],
    police: ['#6a7688', '#3a4250', 1.3], school: ['#96523e', old ? '#a88a40' : '#525664', 1.2], infirmary: ['#e4e0d8', old ? '#a88a40' : '#7a8088', 1.6], office: ['#7c7e84', '#8e9096', era === 'modern' ? 3.2 : 1.6],
    works: [stone ? '#8c7e66' : '#7a4034', old ? '#6a6258' : '#55595f', 2.0], farm: [stone ? '#9a8a6e' : '#e6dcc4', old ? '#b89a4a' : '#6a4a3a', 1.0], barn: ['#6a4a30', old ? '#a88a40' : '#7a3a2a', 1.2],
    shed: ['#6a5a48', '#4a4e58', 0.7], store: ['#d8d4c8', '#9a9ea4', 1.3],
    hub: [air ? '#b8c8d4' : '#8a7a62', air ? '#5a7a9a' : '#4a4e58', 1.5], garage: [year >= 1900 ? '#7a8478' : '#6a4a30', year >= 1900 ? '#5c665c' : old ? '#a88a40' : '#4a4e58', 0.8],
  };
  for (const b of buildings) {
    if (b.kind === 'house') {
      b.wall = pick(er, wallSet); b.roof = pick(er, roofSet); b.ht = old ? 0.75 : 0.95 + er() * 0.25;
      b.thatch = /^#(b89a4a|a88a40|c4a656)$/.test(b.roof);
      b.flat = b.roof === '#8a8e94' || b.roof === '#6a6e78';
    } else { const s = SPECIAL[b.kind]; b.wall = s[0]; b.roof = s[1]; b.ht = s[2]; b.thatch = s[1] === '#a88a40' || s[1] === '#b89a4a'; b.flat = b.kind === 'office' || b.kind === 'hub' || b.kind === 'police' || b.kind === 'store'; }
    b.ridge = b.w >= b.h ? 'h' : 'v';
  }

  const ground = {
    road: era === 'early' || era === 'georgian' ? '#8a7250' : era === 'victorian' ? '#6c6860' : era === 'vintage' ? '#58585e' : '#3e4046',
    pave: era === 'early' || era === 'georgian' ? '#7e8a4e' : era === 'victorian' ? '#9a968c' : '#a8a8a4',
    grass: med ? '#9aa85a' : '#5a9a48', field: '#8aa850', plaza: old ? '#9a8c70' : '#8c8880', yard: old ? '#8a7a5a' : '#7a766c',
    apron: air ? '#5a5e66' : '#8a7a62', water: '#3a7ab8', marks: era === 'retro' || era === 'modern', setts: era === 'victorian' || era === 'vintage', mud: era === 'early' || era === 'georgian',
  };
  // Street names: the High Street, Market Street, Church Lane, and the rest after the family.
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
  const streets = { h: ys.map((y, j) => j === C ? (local ? local[0] : named('High', 0, false)) : j === C + 1 ? (local ? local[1] : named('Market', 0, false)) : named(pool[pi++ % pool.length], j, false)),
    v: xs.map((x, i) => i === C ? (local ? local[2] : named('Church', 0, true)) : i === NB ? (local ? local[3] : named(air ? 'Airport' : 'Quay', 1, true)) : named(pool[pi++ % pool.length], i, true)) };
  const tramJ = year >= 1895 && year <= 1958 ? C : -1;
  const city = {
    town, year, era, W, H, tiles, xs, ys, blocks, buildings, homes, props, lots, ground, air, left: town.left !== false, streets, tramJ, parkSpots,
    graves: props.filter(p => p.t === 'grave'),
    /** The street a point is on, or ''. */
    streetAt(x, y) {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      const j = ys.findIndex(v => ty === v || ty === v + 1), i = xs.findIndex(v => tx === v || tx === v + 1);
      return j >= 0 && tx >= xs[0] && tx <= xs[NB] + 1 ? streets.h[j] : i >= 0 && ty >= ys[0] && ty <= ys[NB] + 1 ? streets.v[i] : '';
    },
    wpx: W * TILE, hpx: H * TILE, chunks: new Map(),
    at(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H ? G.WATER : tiles[ty * W + tx]; },
    solid(tx, ty) { const t = this.at(tx, ty); return t === G.BUILD || t === G.WATER || t === G.TREE; },
    solidAt(x, y) { return this.solid(Math.floor(x / TILE), Math.floor(y / TILE)); },
    rough(x, y) { const t = this.at(Math.floor(x / TILE), Math.floor(y / TILE)); return t === G.GRASS || t === G.FIELD; },
    homeFor(id) { return homes.length ? homes[hashString('home' + id) % homes.length] : lots.market; },
    /** A lot by kind; 'home' needs the person it belongs to. */
    lot(kind, who) { if (kind === 'home') { const h = this.homeFor(who || 'x'); return { kind, x: h.x, y: h.y, tx: h.tx, ty: h.ty, name: 'the house' }; } return lots[kind] || lots.market; },
  };
  city.roadCells = roadCells(city);
  return city;
}

// Every stretch of road as lane positions, for traffic.
function roadCells(city) {
  const { xs, ys } = city;
  return { nx: xs.length, ny: ys.length,
    node: (i, j) => ({ x: (xs[i] + 1) * TILE, y: (ys[j] + 1) * TILE }) };
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

function renderChunk(city, cx, cy) {
  const c = document.createElement('canvas');
  c.width = c.height = CHUNK * TILE;
  const g = c.getContext('2d');
  const { ground: gr, xs, ys } = city;
  const isV = x => xs.some(v => x === v || x === v + 1), isH = y => ys.some(v => y === v || y === v + 1);
  for (let ty = cy * CHUNK; ty < (cy + 1) * CHUNK; ty++) for (let tx = cx * CHUNK; tx < (cx + 1) * CHUNK; tx++) {
    const t = city.at(tx, ty), X = (tx - cx * CHUNK) * TILE, Y = (ty - cy * CHUNK) * TILE, n = hsh(tx, ty);
    const f = 0.94 + n * 0.12;
    if (t === G.ROAD) {
      g.fillStyle = shade(gr.road, f); g.fillRect(X, Y, TILE, TILE);
      if (gr.setts) { g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(X, Y + k * 8 + 0.5); g.lineTo(X + TILE, Y + k * 8 + 0.5); g.stroke(); } }
      if (gr.mud) { g.fillStyle = 'rgba(60,40,20,0.18)'; g.fillRect(X + n * 20, Y + hsh(ty, tx) * 20, 10, 5); g.fillRect(X + hsh(tx + 9, ty) * 22, Y + n * 24, 6, 3); }
      const v = isV(tx), h = isH(ty);
      if (gr.marks && v !== h) {
        g.fillStyle = 'rgba(240,240,230,0.85)';
        if (v && xs.includes(tx) && ty % 2 === 0) g.fillRect(X + TILE - 1.5, Y + 6, 3, 20);
        if (h && ys.includes(ty) && tx % 2 === 0) g.fillRect(X + 6, Y + TILE - 1.5, 20, 3);
      }
      if (city.tramJ >= 0 && (ty === ys[city.tramJ] || ty === ys[city.tramJ] + 1)) { g.fillStyle = 'rgba(190,196,204,0.75)'; g.fillRect(X, Y + 9, TILE, 2); g.fillRect(X, Y + 21, TILE, 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y + 11, TILE, 1); g.fillRect(X, Y + 23, TILE, 1); }
    } else if (t === G.PAVE) {
      g.fillStyle = shade(gr.pave, f); g.fillRect(X, Y, TILE, TILE);
      if (!gr.mud) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, 16, 16); g.strokeRect(X + 16.5, Y + 16.5, 16, 16); }
      else { g.fillStyle = 'rgba(90,70,40,0.25)'; g.fillRect(X + n * 18, Y + 8, 12, 4); }
    } else if (t === G.WATER) {
      g.fillStyle = shade(gr.water, 0.92 + n * 0.14); g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(X + n * 18, Y + hsh(ty, tx) * 26, 9, 2);
    } else if (t === G.PLAZA) {
      g.fillStyle = shade(gr.plaza, f); g.fillRect(X, Y, TILE, TILE);
      g.strokeStyle = 'rgba(0,0,0,0.1)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) g.strokeRect(X + ((k + ty) % 2) * 8 + 0.5, Y + k * 8 + 0.5, 16, 8);
    } else if (t === G.FIELD) {
      const stripe = ((tx + ty) >> 1) % 2;
      g.fillStyle = shade(gr.field, f * (0.94 + stripe * 0.1)); g.fillRect(X, Y, TILE, TILE);
      g.strokeStyle = 'rgba(70,60,20,0.2)'; g.lineWidth = 2; for (let k = 4; k < TILE; k += 8) { g.beginPath(); g.moveTo(X, Y + k); g.lineTo(X + TILE, Y + k); g.stroke(); }
    } else if (t === G.YARD) {
      g.fillStyle = shade(gr.yard, f); g.fillRect(X, Y, TILE, TILE);
    } else if (t === G.APRON) {
      g.fillStyle = shade(gr.apron, f); g.fillRect(X, Y, TILE, TILE);
      if (!city.air) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, TILE, 10); g.strokeRect(X + 0.5, Y + 10.5, TILE, 11); }
    } else if (t === G.BUILD) {
      g.fillStyle = '#2a2622'; g.fillRect(X, Y, TILE, TILE);
    } else {
      g.fillStyle = shade(gr.grass, f); g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(X + n * 26, Y + hsh(ty, tx) * 26, 3, 3);
      if (t === G.TREE) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X + 20, Y + 20, 15, 13, 0, 0, 7); g.fill(); }
    }
  }
  // flat props
  g.save(); g.translate(-cx * CHUNK * TILE, -cy * CHUNK * TILE);
  for (const p of city.props) {
    if (p.x < cx * CHUNK - 8 || p.x > (cx + 1) * CHUNK + 8 || p.y < cy * CHUNK - 14 || p.y > (cy + 1) * CHUNK + 14) continue;
    drawFlatProp(g, p, city);
  }
  // street names painted along the road (not on mud)
  if (!gr.mud) {
    g.font = '700 10px "Nunito", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = gr.marks ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.34)';
    const X0 = cx * CHUNK - 6, X1 = (cx + 1) * CHUNK + 6, Y0 = cy * CHUNK - 6, Y1 = (cy + 1) * CHUNK + 6;
    ys.forEach((y, j) => { if (y < Y0 || y > Y1) return; for (let i = 0; i < xs.length - 1; i++) { const mx = (xs[i] + xs[i + 1]) / 2 + 1; if (mx > X0 && mx < X1) g.fillText(city.streets.h[j].toUpperCase(), mx * TILE, (y + (city.left ? 0.5 : 1.5)) * TILE); } });
    xs.forEach((x, i) => { if (x < X0 || x > X1) return; for (let j = 0; j < ys.length - 1; j++) { const my = (ys[j] + ys[j + 1]) / 2 + 1; if (my > Y0 && my < Y1) { g.save(); g.translate((x + (city.left ? 1.5 : 0.5)) * TILE, my * TILE); g.rotate(-Math.PI / 2); g.fillText(city.streets.v[i].toUpperCase(), 0, 0); g.restore(); } } });
  }
  g.restore();
  return c;
}

function drawFlatProp(g, p, city) {
  const X = p.x * TILE, Y = p.y * TILE;
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
  ctx.fillStyle = city.ground.water; ctx.fillRect(0, 0, view.w, view.h);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    if (cx < 0 || cy < 0 || cx * CHUNK >= city.W || cy * CHUNK >= city.H) continue;
    const key = cx + ',' + cy;
    let ch = city.chunks.get(key);
    if (!ch) { ch = renderChunk(city, cx, cy); city.chunks.set(key, ch); }
    const sx = Math.floor((cx * cs - view.x) * view.z + view.w / 2), sy = Math.floor((cy * cs - view.y) * view.z + view.h / 2);
    ctx.drawImage(ch, sx, sy, Math.ceil(cs * view.z) + 1, Math.ceil(cs * view.z) + 1);
  }
}

const LEAN = 0.085; // how far roofs lean away from the middle of the screen, per storey
/** Buildings, trees and tall props, leaning away from the middle of the screen like the old top-down city games. */
export function drawTall(ctx, city, view, t) {
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
  // trees and lamps in view
  const tx0 = Math.max(0, Math.floor(x0 / TILE)), tx1 = Math.min(city.W - 1, Math.floor(x1 / TILE)), ty0 = Math.max(0, Math.floor(y0 / TILE)), ty1 = Math.min(city.H - 1, Math.floor(y1 / TILE));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (city.tiles[ty * city.W + tx] === G.TREE) list.push({ tree: true, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, n: hsh(tx, ty), d: Math.hypot((tx + 0.5) * TILE - cxw, (ty + 0.5) * TILE - cyw) });
  for (const p of city.props) if ((p.t === 'lamp' || p.t === 'chimney' || p.t === 'gasometer' || p.t === 'windmill') && p.x * TILE > x0 && p.x * TILE < x1 && p.y * TILE > y0 && p.y * TILE < y1) list.push({ prop: p, d: Math.hypot(p.x * TILE - cxw, p.y * TILE - cyw) });
  list.sort((a, b) => b.d - a.d);
  const up = (X, Y, ht) => [hw + (X - hw) * (1 + ht * LEAN), hh + (Y - hh) * (1 + ht * LEAN)];
  const quad = (a, b, c, d, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
  const box = (bx, by, bw, bh, ht, wall, roof, o = {}) => {
    const A = [sx(bx), sy(by)], B = [sx(bx + bw), sy(by)], Cc = [sx(bx + bw), sy(by + bh)], D = [sx(bx), sy(by + bh)];
    const a = up(A[0], A[1], ht), b = up(B[0], B[1], ht), c = up(Cc[0], Cc[1], ht), d = up(D[0], D[1], ht);
    quad(A, B, b, a, shade(wall, 0.78)); quad(D, Cc, c, d, shade(wall, 1.0)); quad(A, D, d, a, shade(wall, 0.88)); quad(B, Cc, c, b, shade(wall, 0.7));
    quad(a, b, c, d, roof);
    const rw = b[0] - a[0], rh = d[1] - a[1];
    if (o.flat) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, 3 * z); ctx.strokeRect(a[0] + 2 * z, a[1] + 2 * z, rw - 4 * z, rh - 4 * z); }
    else if (o.ridge === 'h') { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(a[0], a[1] + rh / 2, rw, rh / 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(a[0], a[1] + rh / 2 - z, rw, 2 * z); }
    else { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(a[0] + rw / 2, a[1], rw / 2, rh); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(a[0] + rw / 2 - z, a[1], 2 * z, rh); }
    if (o.thatch) { ctx.strokeStyle = 'rgba(90,70,20,0.3)'; ctx.lineWidth = 1; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(a[0], a[1] + rh * k / 5); ctx.lineTo(b[0], a[1] + rh * k / 5); ctx.stroke(); } }
    return { a, rw, rh };
  };
  for (const it of list) {
    if (it.tree) {
      const [ux, uy] = up(sx(it.x), sy(it.y), 1.1), r = (13 + it.n * 6) * z;
      ctx.fillStyle = '#5a4028'; ctx.beginPath(); ctx.moveTo(sx(it.x) - 3 * z, sy(it.y)); ctx.lineTo(sx(it.x) + 3 * z, sy(it.y)); ctx.lineTo(ux, uy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = it.n > 0.5 ? '#2e7a34' : '#3a8a3a'; ctx.beginPath(); ctx.arc(ux, uy, r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(ux - r * 0.25, uy - r * 0.25, r * 0.55, 0, 7); ctx.fill();
      continue;
    }
    if (it.prop) {
      const p = it.prop, X = sx((p.x + 0.5) * TILE), Y = sy((p.y + 0.5) * TILE);
      if (p.t === 'lamp') {
        const [ux, uy] = up(X, Y, 0.9);
        ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ux, uy); ctx.stroke();
        ctx.fillStyle = city.era === 'victorian' || city.era === 'georgian' ? 'rgba(255,220,130,0.9)' : 'rgba(240,240,220,0.9)'; ctx.beginPath(); ctx.arc(ux, uy, 3.5 * z, 0, 7); ctx.fill();
      } else if (p.t === 'gasometer') {
        const ht = 2.3, r0 = p.r * TILE * z, [ux, uy] = up(X, Y, ht), r1 = r0 * (1 + ht * LEAN);
        for (let k = 0; k <= 6; k++) { const f = k / 6; ctx.fillStyle = shade('#6a7a72', 0.7 + f * 0.25); ctx.beginPath(); ctx.arc(X + (ux - X) * f, Y + (uy - Y) * f, r0 + (r1 - r0) * f, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#8a9a90'; ctx.beginPath(); ctx.arc(ux, uy, r1, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5 * z; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + Math.cos(k * Math.PI / 4) * r1, uy + Math.sin(k * Math.PI / 4) * r1); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(ux, uy, r1 * 0.55, 0, 7); ctx.stroke();
      } else if (p.t === 'windmill') {
        const ht = 3.0, [ux, uy] = up(X, Y, ht);
        for (let k = 0; k <= 6; k++) { const f = k / 6; ctx.fillStyle = shade('#e8e2d0', 0.72 + f * 0.28); ctx.beginPath(); ctx.arc(X + (ux - X) * f, Y + (uy - Y) * f, (15 - f * 6) * z, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#5a4028'; ctx.beginPath(); ctx.arc(ux, uy, 8 * z, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(ux, uy); ctx.rotate(t * 0.7);
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#4a3420'; ctx.fillRect(-1.5 * z, 0, 3 * z, 44 * z); ctx.fillStyle = 'rgba(240,234,214,0.92)'; ctx.fillRect(1.5 * z, 10 * z, 9 * z, 34 * z); ctx.strokeStyle = 'rgba(90,64,40,0.6)'; ctx.lineWidth = z; for (let q = 14; q < 44; q += 6) { ctx.beginPath(); ctx.moveTo(1.5 * z, q * z); ctx.lineTo(10.5 * z, q * z); ctx.stroke(); } }
        ctx.restore();
      } else {
        const [ux, uy] = up(X, Y, 4.2), r = 9 * z;
        quad([X - r, Y], [X + r, Y], [ux + r * 0.8, uy], [ux - r * 0.8, uy], '#7a4034');
        ctx.fillStyle = '#5a2c24'; ctx.beginPath(); ctx.arc(ux, uy, r * 0.8, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1412'; ctx.beginPath(); ctx.arc(ux, uy, r * 0.5, 0, 7); ctx.fill();
        if (city.year >= 1760 && city.year < 1975) for (let k = 0; k < 4; k++) { const ph = ((t * 0.25 + k / 4) % 1); ctx.fillStyle = `rgba(90,90,90,${0.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(ux + ph * 60 * z, uy - ph * 34 * z, (8 + ph * 22) * z, 0, 7); ctx.fill(); }
      }
      continue;
    }
    const b = it.b, bx = b.x * TILE, by = b.y * TILE, bw = b.w * TILE, bh = b.h * TILE;
    const r = box(bx, by, bw, bh, b.ht, b.wall, b.roof, b);
    const { a, rw, rh } = r;
    if (b.kind === 'house' && !b.flat) { ctx.fillStyle = '#4a2a22'; ctx.fillRect(a[0] + rw * 0.2, a[1] + rh * 0.42, 5 * z, 5 * z); if (b.w > 2) ctx.fillRect(a[0] + rw * 0.72, a[1] + rh * 0.42, 5 * z, 5 * z); }
    if (b.kind === 'church' && b.tower) { const tw = b.tower; const tr = box(tw.x * TILE, tw.y * TILE, tw.w * TILE, tw.h * TILE, 3.4, b.wall, '#6a7078', { flat: true }); ctx.fillStyle = '#d8c060'; ctx.fillRect(tr.a[0] + tr.rw / 2 - 1.5 * z, tr.a[1] + tr.rh * 0.2, 3 * z, tr.rh * 0.6); ctx.fillRect(tr.a[0] + tr.rw * 0.3, tr.a[1] + tr.rh * 0.38, tr.rw * 0.4, 3 * z); }
    if (b.kind === 'infirmary' && city.year >= 1860) { ctx.fillStyle = '#f4f0e8'; ctx.fillRect(a[0] + rw / 2 - 12 * z, a[1] + rh / 2 - 12 * z, 24 * z, 24 * z); ctx.fillStyle = '#c8302a'; ctx.fillRect(a[0] + rw / 2 - 3 * z, a[1] + rh / 2 - 9 * z, 6 * z, 18 * z); ctx.fillRect(a[0] + rw / 2 - 9 * z, a[1] + rh / 2 - 3 * z, 18 * z, 6 * z); }
    if (b.kind === 'works' && !b.thatch) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let k = 0; k < b.w; k++) ctx.fillRect(a[0] + (k + 0.5) * rw / b.w, a[1], rw / b.w / 2, rh); }
    if (b.kind === 'office' && city.era === 'modern') { ctx.fillStyle = '#6c6e74'; ctx.fillRect(a[0] + rw * 0.15, a[1] + rh * 0.15, rw * 0.3, rh * 0.25); ctx.fillStyle = '#f08aa0'; ctx.fillRect(a[0] + rw * 0.55, a[1] + rh * 0.55, rw * 0.3, rh * 0.2); }
    if (b.kind === 'police' && city.year >= 1900) { ctx.fillStyle = '#3a6ad8'; ctx.beginPath(); ctx.arc(a[0] + rw / 2, a[1] + rh / 2, 7 * z, 0, 7); ctx.fill(); }
    if (b.kind === 'store') { ctx.fillStyle = '#c8443a'; ctx.fillRect(a[0] + rw * 0.06, a[1] + rh * 0.78, rw * 0.88, rh * 0.12); ctx.fillStyle = '#7c8086'; for (let k = 0; k < 3; k++) ctx.fillRect(a[0] + rw * (0.15 + k * 0.28), a[1] + rh * 0.2, rw * 0.12, rh * 0.2); }
    if (b.kind === 'hub' && city.air) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < 6; k++) ctx.fillRect(a[0] + (k + 0.15) * rw / 6, a[1] + rh * 0.2, rw / 6 * 0.7, rh * 0.6); }
  }
}

/** Small map of the whole town, drawn once. */
export function renderMiniMap(city, scale = 2) {
  const c = document.createElement('canvas');
  c.width = city.W * scale; c.height = city.H * scale;
  const g = c.getContext('2d');
  const col = { [G.GRASS]: '#4a8a3c', [G.ROAD]: '#d8d4c8', [G.PAVE]: '#8a8880', [G.BUILD]: '#4a3a34', [G.WATER]: '#2a6aa8', [G.PLAZA]: '#b8ae98', [G.FIELD]: '#7a9a44', [G.YARD]: '#7a7468', [G.APRON]: '#6a6e76', [G.TREE]: '#2e6a2e' };
  for (let y = 0; y < city.H; y++) for (let x = 0; x < city.W; x++) { g.fillStyle = col[city.tiles[y * city.W + x]]; g.fillRect(x * scale, y * scale, scale, scale); }
  return c;
}
