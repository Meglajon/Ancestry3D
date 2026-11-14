// Story mode street plans. A plan is a set of points and the roads that join them, in tiles. It can be
// drawn from nothing (a market town grown outwards from its square, the way British towns were) or read from
// OpenStreetMap, so that the town you drive round has the streets the real one has.
// Pure data: no canvas, no DOM except in fetchNet(), so the rest can be tested in node.
import { hashString, seededRandom } from './ancestry.js';

export const NET_VERSION = 3;
const M_PER_TILE = 5;            // one tile is about five metres
const OSM_RADIUS = 620;          // metres of the real town either side of its middle

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Tidy a plan and work out what joins what.
 * Takes { W, H, nodes: [{x, y}], ways: [{ pts: [node index], cls, name, key }] } and returns the same plan with
 * long stretches broken into short hops, loose ends removed, and every node given its neighbours (nb) and
 * whether it is down a dead end (dead).
 */
export function finishNet(net) {
  const nodes = net.nodes.map(n => ({ x: n.x, y: n.y }));
  const uses = new Map();
  for (const w of net.ways) w.pts.forEach((p, i) => uses.set(p, (uses.get(p) || 0) + (i === 0 || i === w.pts.length - 1 ? 2 : 1)));
  const ways = [];
  for (const w of net.ways) {
    // drop points that crowd the one before, unless something else joins there
    const kept = [];
    w.pts.forEach((p, i) => {
      const last = kept[kept.length - 1];
      if (last == null) { kept.push(p); return; }
      if (p === last) return;
      const end = i === w.pts.length - 1, junction = uses.get(p) > 1;
      if (!end && !junction && dist2(nodes[p], nodes[last]) < 2.6) return;
      kept.push(p);
    });
    if (kept.length < 2) continue;
    // and put points into anything longer than a few tiles, so there is always a next thing to steer at
    const out = [kept[0]];
    for (let i = 1; i < kept.length; i++) {
      const a = nodes[kept[i - 1]], b = nodes[kept[i]], d = dist2(a, b), n = Math.max(1, Math.round(d / 5.5));
      for (let k = 1; k < n; k++) { nodes.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); out.push(nodes.length - 1); }
      out.push(kept[i]);
    }
    ways.push({ ...w, pts: out });
  }
  for (const n of nodes) n.nb = [];
  for (const w of ways) for (let i = 1; i < w.pts.length; i++) {
    const a = w.pts[i - 1], b = w.pts[i];
    if (a === b) continue;
    if (!nodes[a].nb.includes(b)) nodes[a].nb.push(b);
    if (!nodes[b].nb.includes(a)) nodes[b].nb.push(a);
  }
  // keep only the biggest piece: everything left can be driven to from everything else
  const comp = new Int32Array(nodes.length).fill(-1);
  let best = -1, bestN = 0;
  for (let s = 0, c = 0; s < nodes.length; s++) {
    if (comp[s] >= 0 || !nodes[s].nb.length) continue;
    let n = 0; const q = [s]; comp[s] = c;
    while (q.length) { const k = q.pop(); n++; for (const m of nodes[k].nb) if (comp[m] < 0) { comp[m] = c; q.push(m); } }
    if (n > bestN) { bestN = n; best = c; }
    c++;
  }
  const remap = new Int32Array(nodes.length).fill(-1), keptNodes = [];
  nodes.forEach((n, i) => { if (comp[i] === best) { remap[i] = keptNodes.length; keptNodes.push(n); } });
  for (const n of keptNodes) n.nb = n.nb.map(m => remap[m]);
  const keptWays = ways.filter(w => remap[w.pts[0]] >= 0).map(w => ({ ...w, pts: w.pts.map(p => remap[p]) }));
  // dead ends: strip the leaves until none are left, and whatever went is a close or a lane to nowhere
  const deg = keptNodes.map(n => n.nb.length), q = [];
  keptNodes.forEach((n, i) => { n.dead = false; if (deg[i] <= 1) q.push(i); });
  while (q.length) { const k = q.pop(); if (keptNodes[k].dead) continue; keptNodes[k].dead = true; for (const m of keptNodes[k].nb) if (!keptNodes[m].dead && --deg[m] <= 1) q.push(m); }
  if (keptNodes.every(n => n.dead)) for (const n of keptNodes) n.dead = false;  // a town that is all one lane
  return { ...net, nodes: keptNodes, ways: keptWays };
}

/**
 * A town drawn from its name alone: a market place in the middle, old roads running out of it in every
 * direction, lanes joining them in broken rings, and closes off the newer streets. No two alike; the same
 * every time for the same town.
 */
export function makeNet(town) {
  const rnd = seededRandom(hashString('net' + town.id));
  const R = 100 + Math.floor(rnd() * 14);
  const W = 2 * R + 36, H = 2 * R + 36;
  const cx = W / 2 + (rnd() - 0.5) * 10, cy = H / 2 + (rnd() - 0.5) * 10;
  const sx = 0.86 + rnd() * 0.28, sy = 2 - sx, tilt = rnd() * Math.PI;
  const at = (r, a) => { const x = Math.cos(a) * r * sx, y = Math.sin(a) * r * sy; return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) }; };
  const nodes = [], ways = [];
  const add = p => { nodes.push({ x: Math.max(5, Math.min(W - 6, p.x)), y: Math.max(5, Math.min(H - 6, p.y)) }); return nodes.length - 1; };
  const radii = [0, 13, 28, 45, 63, 82, R], counts = [1, 5, 8, 12, 16, 19, 21], ringP = [0, 1, 0.82, 0.7, 0.6, 0.48, 0.3];
  // the points: rings of them, each a little out of true
  const ring = radii.map((r, k) => {
    if (k === 0) return [{ a: 0, r: 0, i: add({ x: cx, y: cy }) }];
    const n = counts[k], a0 = rnd() * 6.28, out = [];
    for (let j = 0; j < n; j++) { const a = a0 + (j + (rnd() - 0.5) * 0.5) * 6.2832 / n, rr = r + (rnd() - 0.5) * (k === 1 ? 3 : 6); out.push({ a, r: rr, i: add(at(rr, a)) }); }
    return out;
  });
  const angd = (a, b) => { let d = (a - b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
  const nearest = (k, a) => ring[k].reduce((b, n) => Math.abs(angd(n.a, a)) < Math.abs(angd(b.a, a)) ? n : b);
  const seen = new Set();
  const edge = (A, B, key, cls, bend = 0) => {
    const id = A.i < B.i ? A.i + ':' + B.i : B.i + ':' + A.i;
    if (A.i === B.i || seen.has(id)) return null;
    seen.add(id);
    // a road is never quite straight: one or two points pushed off the line between its ends
    const a = nodes[A.i], b = nodes[B.i], d = dist2(a, b), n = d > 16 ? 2 : 1, pts = [A.i], nx = -(b.y - a.y) / (d || 1), ny = (b.x - a.x) / (d || 1);
    const off = (rnd() - 0.5) * d * 0.22 + bend;
    for (let k = 1; k <= n; k++) { const t = k / (n + 1), s = Math.sin(t * Math.PI) * off * (n === 2 && k === 2 ? (rnd() < 0.5 ? -0.6 : 1) : 1); pts.push(add({ x: a.x + (b.x - a.x) * t + nx * s, y: a.y + (b.y - a.y) * t + ny * s })); }
    pts.push(B.i);
    const w = { pts, cls, key, name: null };
    ways.push(w);
    return w;
  };
  // roads out of town: every point is joined to the nearest one on the ring inside it
  let chain = 0;
  const key = new Map();
  key.set(ring[0][0].i, 'centre');
  for (let k = 1; k < ring.length; k++) {
    const firstChild = new Set();
    for (const n of ring[k]) {
      const p = k === 1 ? ring[0][0] : nearest(k - 1, n.a);
      let kk;
      if (k === 1) { const j = ring[1].indexOf(n); kk = j === 0 || j === 2 ? 'high' : j === 1 ? 'church' : 'road' + (chain++); }
      else if (!firstChild.has(p.i)) { firstChild.add(p.i); kk = key.get(p.i); }
      else kk = 'road' + (chain++);
      key.set(n.i, kk);
      edge(p, n, kk, k <= 3 ? 0 : 1);
    }
    // and now and then one more, the other way, so the middle is not the only way across
    if (k >= 2) for (const p of ring[k - 1]) if (rnd() < 0.4) { const n = nearest(k, p.a); edge(p, n, 'lane' + (chain++), 1); }
  }
  // lanes round the town: broken rings
  const closes = [];
  for (let k = 1; k < ring.length; k++) {
    let run = 0;
    for (let j = 0; j < ring[k].length; j++) {
      const A = ring[k][j], B = ring[k][(j + 1) % ring[k].length];
      if (rnd() > ringP[k]) { run++; continue; }
      const d = dist2(nodes[A.i], nodes[B.i]);
      const w = edge(A, B, k === 1 ? 'market' : 'ring' + k + ':' + run, k <= 2 ? 0 : 1, d * 0.1);
      if (w && k >= 2 && k < ring.length - 1 && d > 15 && rnd() < 0.5) closes.push({ w, k });
    }
  }
  // closes: short dead ends off the lanes, where the newer houses are
  for (const { w, k } of closes) {
    const m = w.pts[Math.floor(w.pts.length / 2)], p = nodes[m], out = rnd() < 0.5 ? 1 : -1;
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, len = 7 + rnd() * 3, sk = (rnd() - 0.5) * 0.5;
    const ux = dx / d * out, uy = dy / d * out;
    const e = add({ x: p.x + (ux * Math.cos(sk) - uy * Math.sin(sk)) * len, y: p.y + (ux * Math.sin(sk) + uy * Math.cos(sk)) * len });
    ways.push({ pts: [m, e], cls: 1, key: 'close' + k + ':' + m, name: null, close: true });
  }
  // a river down one side, crossed wherever a road meets it
  const side = rnd() < 0.5 ? -1 : 1, rx = cx + side * R * (0.42 + rnd() * 0.2), ph = rnd() * 6, amp = 8 + rnd() * 8, lean = (rnd() - 0.5) * 0.3;
  const river = [];
  for (let y = -4; y <= H + 4; y += 4) river.push({ x: rx + Math.sin(y / 34 + ph) * amp + (y - H / 2) * lean, y });
  return finishNet({ v: NET_VERSION, source: 'drawn', W, H, centre: { x: cx, y: cy }, radius: R, nodes, ways, water: [{ line: river, r: 2.6 }], green: [] });
}

const ROADS = { trunk: 0, trunk_link: 0, primary: 0, primary_link: 0, secondary: 0, secondary_link: 0, tertiary: 0, tertiary_link: 0, unclassified: 1, residential: 1, living_street: 1, pedestrian: 1, road: 1 };

/** The Overpass question that fetches a town's streets, water and parks: everything in a box round its middle. */
export function osmQuery(lat, lon, radius = OSM_RADIUS) {
  const r = radius * 1.25, dla = r / 110540, dlo = r / (111320 * Math.cos(lat * Math.PI / 180));
  const box = [lat - dla, lon - dlo, lat + dla, lon + dlo].map(v => v.toFixed(5)).join(',');
  return `[out:json][timeout:40][bbox:${box}];(way["highway"~"^(${Object.keys(ROADS).join('|')})$"];way["waterway"~"^(river|canal)$"];way["natural"="water"];way["leisure"~"^(park|garden|recreation_ground)$"];);out body;>;out skel qt;`;
}

/**
 * Turn an Overpass answer into a plan. Real roads keep their real names; anything too far from the middle is
 * cut off at the edge of the map. Returns null if there is not enough there to make a town of.
 */
export function netFromOsm(json, lat, lon, radius = OSM_RADIUS) {
  const els = (json && json.elements) || [];
  const half = Math.round(radius / M_PER_TILE), W = half * 2 + 24, H = W, k = Math.cos(lat * Math.PI / 180);
  const px = n => ({ x: W / 2 + (n.lon - lon) * k * 111320 / M_PER_TILE, y: H / 2 - (n.lat - lat) * 110540 / M_PER_TILE });
  const raw = new Map();
  for (const e of els) if (e.type === 'node' && e.lat != null) raw.set(e.id, px(e));
  const inside = p => p && p.x >= 6 && p.y >= 6 && p.x <= W - 7 && p.y <= H - 7;
  const nodes = [], index = new Map(), ways = [], water = [], green = [];
  const idx = id => { if (!index.has(id)) { index.set(id, nodes.length); nodes.push(raw.get(id)); } return index.get(id); };
  for (const e of els) {
    if (e.type !== 'way' || !e.nodes || !e.tags) continue;
    const t = e.tags;
    if (t.highway && ROADS[t.highway] != null && t.area !== 'yes' && t.access !== 'private' && t.tunnel !== 'yes') {
      // a road that leaves the map is cut where it leaves, and may come back as another piece
      let run = [];
      const flush = () => { if (run.length > 1) ways.push({ pts: run, cls: ROADS[t.highway], name: t.name || null, key: t.name || 'way' + e.id }); run = []; };
      for (const id of e.nodes) { if (inside(raw.get(id))) run.push(idx(id)); else flush(); }
      flush();
    } else if (t.waterway === 'river' || t.waterway === 'canal') {
      const line = e.nodes.map(id => raw.get(id)).filter(Boolean);
      if (line.length > 1) water.push({ line, r: t.waterway === 'river' ? 2.4 : 1.3 });
    } else if (t.natural === 'water') {
      const poly = e.nodes.map(id => raw.get(id)).filter(Boolean);
      if (poly.length > 3) water.push({ poly });
    } else if (t.leisure) {
      const poly = e.nodes.map(id => raw.get(id)).filter(Boolean);
      if (poly.length > 3) green.push({ poly, name: t.name || null });
    }
  }
  if (ways.length < 6) return null;
  const net = finishNet({ v: NET_VERSION, source: 'osm', W, H, centre: { x: W / 2, y: H / 2 }, radius: half, nodes, ways, water, green });
  if (net.nodes.length < 20) return null;
  // the middle of town is the busiest corner near the middle of the map
  let best = null, bs = -1;
  for (const n of net.nodes) { const d = Math.hypot(n.x - W / 2, n.y - H / 2); if (d > half * 0.35) continue; const s = n.nb.length * 10 - d * 0.25; if (s > bs) { bs = s; best = n; } }
  if (best) net.centre = { x: best.x, y: best.y };
  return net;
}

/** A plan small enough to keep: whole numbers, and only what buildTown needs. */
export function packNet(net) {
  return { v: NET_VERSION, source: net.source, W: net.W, H: net.H, c: [Math.round(net.centre.x), Math.round(net.centre.y)], r: net.radius,
    n: net.nodes.flatMap(n => [Math.round(n.x * 10), Math.round(n.y * 10)]),
    w: net.ways.map(w => [w.cls, w.name || '', w.pts]),
    wa: net.water.map(w => w.line ? ['l', w.r, w.line.flatMap(p => [Math.round(p.x), Math.round(p.y)])] : ['p', 0, w.poly.flatMap(p => [Math.round(p.x), Math.round(p.y)])]),
    g: net.green.map(w => w.poly.flatMap(p => [Math.round(p.x), Math.round(p.y)])) };
}
export function unpackNet(o) {
  if (!o || o.v !== NET_VERSION || !o.n || !o.w) return null;
  const pair = a => { const out = []; for (let i = 0; i + 1 < a.length; i += 2) out.push({ x: a[i], y: a[i + 1] }); return out; };
  const nodes = []; for (let i = 0; i + 1 < o.n.length; i += 2) nodes.push({ x: o.n[i] / 10, y: o.n[i + 1] / 10 });
  return finishNet({ v: o.v, source: o.source, W: o.W, H: o.H, centre: { x: o.c[0], y: o.c[1] }, radius: o.r, nodes,
    ways: o.w.map(([cls, name, pts], i) => ({ cls, name: name || null, key: name || 'way' + i, pts })),
    water: (o.wa || []).map(([t, r, a]) => t === 'l' ? { line: pair(a), r } : { poly: pair(a) }), green: (o.g || []).map(a => ({ poly: pair(a) })) });
}

const cacheKey = town => 'a3d:streets:' + NET_VERSION + ':' + town.id;
/** A plan already fetched and kept on this device: the plan, null if the town is known not to be findable, undefined if never asked. */
export function cachedNet(town) {
  try { const hit = localStorage.getItem(cacheKey(town)); if (hit == null) return undefined; if (hit === 'none') return null; return unpackNet(JSON.parse(hit)) || undefined; } catch (e) { return undefined; }
}
const getJson = async (url, opts, signal) => { const r = await fetch(url, { ...opts, signal }); if (!r.ok) { const e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.json(); };
const pause = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('aborted')); }, { once: true }); });
/**
 * The real streets of a town, from OpenStreetMap: looked up by name, fetched once and kept on this device.
 * Resolves to a plan, or null if the town cannot be found or the map servers cannot be reached in time. The
 * public servers are often busy, so this is patient: it tries again, and may take a minute. Only the town's
 * name is sent. Map data © OpenStreetMap contributors (ODbL).
 */
export async function fetchNet(town, timeoutMs = 80000, onState = () => {}) {
  const had = cachedNet(town);
  if (had !== undefined) { onState({ stage: had ? 'done' : 'none' }); return had; }
  onState({ stage: 'find' });
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  const keepIt = v => { try { localStorage.setItem(cacheKey(town), v); } catch (e) { /* full: fetch again next time */ } };
  try {
    const q = [town.name, town.nation || town.country].filter(Boolean).join(', ');
    // where is it? (two free gazetteers built on OpenStreetMap; the second is only asked if the first fails)
    let lat = null, lon = null;
    try { const g = await getJson('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } }, ctl.signal); if (g && g.length) { lat = +g[0].lat; lon = +g[0].lon; } else if (g) { keepIt('none'); onState({ stage: 'none' }); return null; } } catch (e) { if (ctl.signal.aborted) throw e; }
    if (lat == null) { const g = await getJson('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(q), {}, ctl.signal); const c = g && g.features && g.features[0] && g.features[0].geometry && g.features[0].geometry.coordinates; if (!c) { keepIt('none'); onState({ stage: 'none' }); return null; } lon = +c[0]; lat = +c[1]; }
    if (!isFinite(lat) || !isFinite(lon)) { onState({ stage: 'none' }); return null; }
    // and what streets has it? One server at a time, waiting longer between tries when they say they are busy.
    const body = { method: 'POST', body: 'data=' + encodeURIComponent(osmQuery(lat, lon)), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
    const hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter'];
    let json = null;
    for (let i = 0; i < hosts.length && !json; i++) {
      onState({ stage: 'ask', n: i + 1 });
      try {
        const r = await fetch(hosts[i], { ...body, signal: ctl.signal });
        if (!r.ok) throw new Error('http ' + r.status);
        if (r.body && r.body.getReader) {
          // read it as it comes, so there is something to show
          const rd = r.body.getReader(), dec = new TextDecoder();
          let txt = '', bytes = 0;
          for (;;) { const { done, value } = await rd.read(); if (done) break; bytes += value.length; txt += dec.decode(value, { stream: true }); onState({ stage: 'read', bytes }); }
          json = JSON.parse(txt + dec.decode());
        } else json = await r.json();
      } catch (e) { if (ctl.signal.aborted) throw e; json = null; onState({ stage: 'busy', n: i + 1 }); await pause(3000 + i * 3000, ctl.signal); }
    }
    if (!json) { onState({ stage: 'fail' }); return null; }
    onState({ stage: 'build' });
    const net = netFromOsm(json, lat, lon);
    keepIt(net ? JSON.stringify(packNet(net)) : 'none');
    onState({ stage: net ? 'done' : 'none' });
    return net;
  } catch (e) { onState({ stage: 'fail' }); return null; } finally { clearTimeout(timer); }
}
