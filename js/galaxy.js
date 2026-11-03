// Galaxy view: the family as glowing stars in 3D space. Each person is a star coloured by the century they
// were born in (older stars burn redder), lines of descent are faint threads between them, and you are the
// sun at the centre. Drag to orbit, scroll or pinch to zoom, tap a star to read about them, or take the
// fly-through: a camera tour out from you along your longest line, which can be recorded to a video.
//  - scope 'ancestors': your ancestors laid out like the courtyard, twisted into spiral arms.
//  - scope 'all': everyone in the file, pulled into shape by a little physics simulation (families clump).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { collectAncestors, layoutAncestors, parentsOf, relationship, seededRandom, hashString, displayName, lifespan } from './ancestry.js';
import { estimateYears, personLines, starColor } from './vizkit.js';

const MAX_ALL = 12000;

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.25, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildAncestorNodes(data, rootId, maxGen) {
  const tree = layoutAncestors(collectAncestors(data, rootId, maxGen), { shape: 'circle' });
  const R = Math.max(30, tree.worldRadius);
  const rnd = seededRandom(hashString(rootId) + 3);
  const nodes = [], index = new Map();
  for (const p of tree.people.values()) {
    const r = Math.hypot(p.x, p.z), th = Math.atan2(p.z, p.x) + (r / R) * 1.9;
    const y = (rnd() - 0.5) * (1.5 + r * 0.09) + Math.sin(th * 2) * r * 0.04;
    index.set(p.id, nodes.length);
    nodes.push({ id: p.id, indi: p.indi, gen: p.gen, anc: true, x: Math.cos(th) * r, y, z: Math.sin(th) * r });
  }
  const edges = tree.edges.map(e => [index.get(e.child), index.get(e.parent), e.side === 'paternal' ? 0 : 1]);
  const lineOf = new Map();
  for (const p of tree.people.values()) lineOf.set(p.id, p.primaryChild);
  return { nodes, edges, index, R, lineOf, settled: true };
}

function buildAllNodes(data, rootId) {
  const rnd = seededRandom(hashString(rootId) + 11);
  const nodes = [], index = new Map(), edges = [];
  const ancestors = collectAncestors(data, rootId, 40).people;
  const neighbours = id => {
    const indi = data.individuals.get(id), out = [];
    const p = parentsOf(data, id);
    if (p.father) out.push([p.father, 1]); if (p.mother) out.push([p.mother, 1]);
    for (const fid of indi.fams) {
      const f = data.families.get(fid); if (!f) continue;
      for (const s of [f.husb, f.wife]) if (s && s !== id && data.individuals.has(s)) out.push([s, 0]);
      for (const c of f.children) if (data.individuals.has(c)) out.push([c, -1]);
    }
    return out;
  };
  const add = (id, gen, x, y, z) => {
    index.set(id, nodes.length);
    nodes.push({ id, indi: data.individuals.get(id), gen, anc: ancestors.has(id), x, y, z, vx: 0, vy: 0, vz: 0 });
  };
  // Breadth-first from you: each relative starts next to the person who led to them, a little further out.
  const queue = [rootId];
  add(rootId, 0, 0, 0, 0);
  for (let qi = 0; qi < queue.length && nodes.length < MAX_ALL; qi++) {
    const id = queue[qi], me = nodes[index.get(id)];
    for (const [nid, dg] of neighbours(id)) {
      if (index.has(nid) || nodes.length >= MAX_ALL) continue;
      const out = Math.hypot(me.x, me.z) || 1;
      const a = rnd() * Math.PI * 2;
      add(nid, me.gen + dg, me.x + Math.cos(a) * 3 + (me.x / out) * 2.5, me.y + (rnd() - 0.5) * 2, me.z + Math.sin(a) * 3 + (me.z / out) * 2.5);
      queue.push(nid);
    }
  }
  const connected = nodes.length;
  // People with no link to you float round the edge in their own little clusters.
  if (nodes.length < MAX_ALL) {
    for (const id of data.individuals.keys()) {
      if (index.has(id)) continue;
      if (nodes.length >= MAX_ALL) break;
      const a = rnd() * Math.PI * 2, r = 60 + rnd() * 40;
      add(id, 0, Math.cos(a) * r, (rnd() - 0.5) * 6, Math.sin(a) * r);
    }
  }
  for (const [id, i] of index) {
    const p = parentsOf(data, id);
    if (p.father && index.has(p.father)) edges.push([i, index.get(p.father), 0]);
    if (p.mother && index.has(p.mother)) edges.push([i, index.get(p.mother), 1]);
  }
  for (const f of data.families.values()) if (f.husb && f.wife && index.has(f.husb) && index.has(f.wife)) edges.push([index.get(f.husb), index.get(f.wife), 2]);
  const lineOf = new Map();
  for (const p of ancestors.values()) lineOf.set(p.id, p.primaryChild);
  return { nodes, edges, index, R: 60, lineOf, settled: false, connected, total: data.individuals.size };
}

// One step of the "all" layout: springs along family links, gentle repulsion between nearby stars (grid
// buckets keep it fast), a pull toward the middle and a squash toward a flat disc so it reads as a galaxy.
function relax(G, alpha) {
  const { nodes, edges } = G;
  const cell = 7, grid = new Map(), key = (x, z) => ((Math.floor(x / cell) + 4096) << 13) | (Math.floor(z / cell) + 4096);
  for (let i = 0; i < nodes.length; i++) { const n = nodes[i], k = key(n.x, n.z); let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(i); }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], cx = Math.floor(n.x / cell), cz = Math.floor(n.z / cell);
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) {
      const b = grid.get(((cx + gx + 4096) << 13) | (cz + gz + 4096)); if (!b) continue;
      for (const j of b) {
        if (j <= i) continue;
        const m = nodes[j];
        let dx = n.x - m.x, dy = n.y - m.y, dz = n.z - m.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > cell * cell) continue;
        if (d2 < 0.01) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d2 = 0.5; }
        const f = Math.min(2, 9 / d2) * alpha;
        n.vx += dx * f; n.vy += dy * f; n.vz += dz * f; m.vx -= dx * f; m.vy -= dy * f; m.vz -= dz * f;
      }
    }
  }
  for (const [a, b, kind] of edges) {
    const n = nodes[a], m = nodes[b];
    const dx = m.x - n.x, dy = m.y - n.y, dz = m.z - n.z, d = Math.hypot(dx, dy, dz) || 0.01;
    const rest = kind === 2 ? 1.6 : 4.2, k = (d - rest) / d * 0.06 * alpha;
    n.vx += dx * k; n.vy += dy * k; n.vz += dz * k; m.vx -= dx * k; m.vy -= dy * k; m.vz -= dz * k;
  }
  let moved = 0;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    n.vx -= n.x * 0.0015 * alpha; n.vz -= n.z * 0.0015 * alpha; n.vy -= n.y * 0.03 * alpha;
    n.vx *= 0.82; n.vy *= 0.82; n.vz *= 0.82;
    n.x += n.vx; n.y += n.vy; n.z += n.vz;
    moved += Math.abs(n.vx) + Math.abs(n.vz);
  }
  nodes[0].x = nodes[0].y = nodes[0].z = 0;
  return moved / nodes.length;
}

export function createGalaxy(host, opts) {
  const { data, rootId, maxGen = 10, scope = 'ancestors', onSelect = () => {}, onTourEnd = () => {} } = opts;
  const G = scope === 'all' ? buildAllNodes(data, rootId) : buildAncestorNodes(data, rootId, maxGen);
  const years = estimateYears(data, G.nodes.map(n => n.id));
  const N = G.nodes.length;

  // ---- renderer, scene, overlay ----
  const canvas = document.createElement('canvas');
  canvas.className = 'vizGL';
  const overlay = document.createElement('canvas');
  overlay.className = 'vizOverlay';
  host.append(canvas, overlay);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(1.75, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05040c');
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 20000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
  controls.minDistance = 2; controls.maxDistance = G.R * 8;
  const R = () => G.R;

  // background stars and nebula clouds
  const rnd = seededRandom(77);
  {
    const n = 2500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 3000 + rnd() * 2000, s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#c8d0ff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
    const nebCols = [['rgba(120,60,200,0.55)', 'rgba(120,60,200,0)'], ['rgba(40,120,200,0.45)', 'rgba(40,120,200,0)'], ['rgba(200,70,140,0.4)', 'rgba(200,70,140,0)']];
    for (let i = 0; i < 7; i++) {
      const [a, b] = nebCols[i % 3];
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(a, b), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      const ang = rnd() * Math.PI * 2, d = 900 + rnd() * 900;
      sp.position.set(Math.cos(ang) * d, (rnd() - 0.5) * 900, Math.sin(ang) * d);
      sp.scale.setScalar(900 + rnd() * 900);
      scene.add(sp);
    }
  }

  // ---- the family as points ----
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), tw = new Float32Array(N);
  G.nodes.forEach((n, i) => {
    const y = years.get(n.id);
    n.year = y?.birth ?? null; n.est = y?.est;
    const c = starColor(n.year).map(v => n.est ? v * 0.8 + 0.12 : v);
    col.set(c, i * 3);
    size[i] = i === 0 ? 0 : scope === 'all' ? (n.anc ? 4.2 : 2.6) : 3.6 + Math.max(0, 6 - n.gen) * 0.35;
    tw[i] = rnd();
  });
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 }, uTime: { value: 0 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aTw;
      uniform float uScale; uniform float uTime;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.85 + 0.15 * sin(uTime * 1.7 + aTw * 40.0);
        gl_PointSize = clamp(aSize * twinkle * uScale / -mv.z, 1.5, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float glow = pow(1.0 - r, 2.2);
        float core = smoothstep(0.32, 0.0, r);
        gl_FragColor = vec4(vColor * glow + vec3(core * 0.85), glow);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // threads between parents and children (blue through fathers, pink through mothers, gold for couples)
  const E = G.edges.length;
  const lpos = new Float32Array(E * 6), lcol = new Float32Array(E * 6);
  const EC = [[0.35, 0.55, 1.0], [1.0, 0.45, 0.7], [1.0, 0.8, 0.35]];
  G.edges.forEach(([a, b, k], i) => {
    const bright = scope === 'all' ? (G.nodes[a].anc && G.nodes[b].anc ? 1 : 0.35) : 1;
    const c = EC[k].map(v => v * bright);
    lcol.set(c, i * 6); lcol.set(c, i * 6 + 3);
  });
  const lgeo = new THREE.BufferGeometry();
  const lposAttr = new THREE.BufferAttribute(lpos, 3);
  lgeo.setAttribute('position', lposAttr);
  lgeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: scope === 'all' ? 0.22 : 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  lines.frustumCulled = false;
  scene.add(lines);

  // a faint glowing disc and star dust along the arms, so the family reads as a galaxy
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: glowTexture('rgba(255,210,150,0.55)', 'rgba(90,50,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.5 }));
  disc.rotation.x = -Math.PI / 2;
  scene.add(disc);
  let dust = null;
  const dustTex = glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const makeDust = () => {
    if (dust) { scene.remove(dust); dust.geometry.dispose(); }
    const per = Math.max(1, Math.min(8, Math.round(6000 / Math.max(1, N))));
    const dpos = new Float32Array(N * per * 3), dcol = new Float32Array(N * per * 3);
    const dr = seededRandom(5);
    G.nodes.forEach((n, i) => {
      for (let k = 0; k < per; k++) {
        const j = (i * per + k) * 3, sp = 2 + dr() * 4;
        dpos[j] = n.x + (dr() - 0.5) * sp * 2; dpos[j + 1] = n.y + (dr() - 0.5) * sp * 0.6; dpos[j + 2] = n.z + (dr() - 0.5) * sp * 2;
        const c = col.subarray(i * 3, i * 3 + 3), f = 0.25 + dr() * 0.25;
        dcol[j] = c[0] * f + 0.12 * f; dcol[j + 1] = c[1] * f; dcol[j + 2] = c[2] * f + 0.2 * f;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.0, map: dustTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);
    disc.scale.setScalar(fitRadius() * 2.6);
  };

  // you: the sun
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,250,220,1)', 'rgba(255,170,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sun.scale.setScalar(7);
  scene.add(sun);
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, depthWrite: false, depthTest: false }));
  marker.visible = false;
  scene.add(marker);

  const syncPositions = () => {
    G.nodes.forEach((n, i) => { pos[i * 3] = n.x; pos[i * 3 + 1] = n.y; pos[i * 3 + 2] = n.z; });
    posAttr.needsUpdate = true;
    G.edges.forEach(([a, b], i) => { const n = G.nodes[a], m = G.nodes[b]; lpos[i * 6] = n.x; lpos[i * 6 + 1] = n.y; lpos[i * 6 + 2] = n.z; lpos[i * 6 + 3] = m.x; lpos[i * 6 + 4] = m.y; lpos[i * 6 + 5] = m.z; });
    lposAttr.needsUpdate = true;
  };
  syncPositions();
  const fitRadius = () => {
    let r = 10;
    for (const n of G.nodes) r = Math.max(r, Math.hypot(n.x, n.z));
    return r;
  };

  // ---- camera start ----
  let fitR = fitRadius();
  if (G.settled) makeDust(); else disc.scale.setScalar(fitR * 2.6);
  camera.position.set(0, fitR * 1.15, fitR * 1.65);
  controls.target.set(0, 0, 0);

  // ---- sizing ----
  function resize() {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    overlay.width = Math.round(w * dpr); overlay.height = Math.round(h * dpr);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    starMat.uniforms.uScale.value = (h * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- picking ----
  const v = new THREE.Vector3();
  const screenOf = (n, out = {}) => {
    v.set(n.x, n.y, n.z).project(camera);
    out.x = (v.x + 1) / 2 * overlay.width / dpr; out.y = (1 - v.y) / 2 * overlay.height / dpr; out.front = v.z < 1;
    return out;
  };
  function pick(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const mx = cx - rect.left, my = cy - rect.top;
    let best = null, bd = 18;
    const s = {};
    for (const n of G.nodes) { screenOf(n, s); if (!s.front) continue; const d = Math.hypot(s.x - mx, s.y - my); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  // Tap a star to fly to that person; double-tap (or double-click) to take the fly-through to them.
  let hover = null, selected = null, downAt = null, lastTap = null;
  const onMove = e => { if (e.pointerType === 'mouse') hover = pick(e.clientX, e.clientY); canvas.style.cursor = hover ? 'pointer' : ''; };
  const onDown = e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = e => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6 || performance.now() - downAt.t > 400) return;
    const now = performance.now();
    const n = pick(e.clientX, e.clientY);
    const double = lastTap && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24;
    lastTap = double ? null : { x: e.clientX, y: e.clientY, t: now };
    if (double && n) { startTour(n); return; }
    if (!n) { if (!tour) select(null); return; }
    if (tour) stopTour(false, true);
    select(n);
    focusSelected();
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const describe = n => {
    const info = personLines(n.indi);
    let rel;
    if (n.id === rootId) rel = 'You';
    else if (n.anc && G.lineOf.has(n.id)) {
      let g = 0, p = n.id; while (p && p !== rootId && g < 60) { p = G.lineOf.get(p); g++; }
      rel = relationship(g, n.indi.sex).replace(/^./, c => c.toUpperCase());
    } else rel = n.gen > 0 ? `${n.gen} generation${n.gen === 1 ? '' : 's'} above you` : n.gen < 0 ? `${-n.gen} generation${n.gen === -1 ? '' : 's'} below you` : 'Your generation';
    return { ...info, rel, estimated: n.est && n.year ? `born around ${n.year} (estimated)` : '' };
  };
  function select(n) {
    selected = n;
    marker.visible = !!n;
    if (n) { marker.position.set(n.x, n.y, n.z); controls.autoRotate = false; }
    onSelect(n ? describe(n) : null);
  }
  // Glide the camera and the point it orbits to a new place: it eases out, cruises and eases in.
  function glideTo(to, toT) {
    const dist = camera.position.distanceTo(to) + controls.target.distanceTo(toT) * 0.5;
    flyTo = { from: camera.position.clone(), fromT: controls.target.clone(), to, toT, t: 0, secs: Math.max(1.3, Math.min(4, 0.9 + Math.sqrt(dist) * 0.22)) };
  }
  function focusSelected() {
    if (!selected) return;
    const toT = new THREE.Vector3(selected.x, selected.y, selected.z);
    const dir = camera.position.clone().sub(toT).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    glideTo(toT.clone().addScaledVector(dir, 14).add(new THREE.Vector3(0, 5, 0)), toT);
    controls.autoRotate = false;
  }
  let flyTo = null;
  const smoother = s => s * s * s * (s * (s * 6 - 15) + 10); // zero speed and zero acceleration at both ends

  // ---- fly-through ----
  // The tour is a list of stops joined into one smooth curve that the camera flows along.
  let tour = null;
  const nodeVec = n => new THREE.Vector3(n.x, n.y, n.z);
  const chainTo = target => {
    const chain = [];
    let p = target.id;
    while (p && p !== rootId && G.index.has(p)) { chain.unshift(G.nodes[G.index.get(p)]); p = G.lineOf.get(p); }
    return p === rootId ? chain : null;
  };
  function buildTour(target) {
    const picked = !!target;
    if (!target) {
      // the furthest-back ancestor (most generations away) gives the longest road out from you
      let farG = -1;
      for (const n of G.nodes) {
        if (!n.anc || n.id === rootId) continue;
        const c = chainTo(n);
        if (c && c.length > farG) { farG = c.length; target = n; }
      }
    }
    const fr = fitRadius();
    const stops = [];
    const stop = (pos, look, node = null) => stops.push({ pos, look, node });
    stop(camera.position.clone(), controls.target.clone());
    const chain = target ? chainTo(target) : [];
    if (chain) {
      // out from you along the line of descent
      if (camera.position.length() < fr * 1.1) stop(new THREE.Vector3(0, fr * 1.3, fr * 0.9), new THREE.Vector3(), null);
      stop(new THREE.Vector3(5, 7, 13), new THREE.Vector3(), G.nodes[0]);
      let prev = new THREE.Vector3();
      chain.forEach((n, i) => {
        const p = nodeVec(n);
        const along = p.clone().sub(prev).setY(0);
        if (along.lengthSq() < 0.01) along.set(1, 0, 0);
        along.normalize();
        const side = new THREE.Vector3(-along.z, 0, along.x).multiplyScalar(i % 2 ? 6 : -6);
        stop(p.clone().addScaledVector(along, -10).add(side).add(new THREE.Vector3(0, 4, 0)), p, n);
        prev = p;
      });
    } else if (target) {
      // not on one of your lines (someone else in the file): fly straight there
      const p = nodeVec(target), dir = camera.position.clone().sub(p).setY(0).normalize();
      stop(p.clone().addScaledVector(dir, 30).add(new THREE.Vector3(0, 14, 0)), p, null);
      stop(p.clone().addScaledVector(dir, 12).add(new THREE.Vector3(0, 4, 0)), p, target);
    }
    let endTarget = new THREE.Vector3();
    if (picked) {
      // a tour to someone you picked ends circling them
      endTarget = nodeVec(target);
    } else {
      const last = stops[stops.length - 1].look.clone();
      stop(last.clone().multiplyScalar(1.3).add(new THREE.Vector3(0, fr * 0.5, 0)), last.clone().multiplyScalar(0.6), null);
      stop(new THREE.Vector3(-fr * 0.9, fr * 1.15, -fr * 0.9), new THREE.Vector3(), null);
    }
    // One continuous glide: the camera eases away at the start, cruises, slows almost to a stop as it reaches
    // each person where the path changes direction, then accelerates away again without waiting.
    const camCurve = new THREE.CatmullRomCurve3(stops.map(s => s.pos), false, 'centripetal');
    const lookCurve = new THREE.CatmullRomCurve3(stops.map(s => s.look), false, 'centripetal');
    const n = stops.length, M = Math.max(60, 40 * (n - 1));
    const tAt = [], lenAt = [];
    let acc = 0, prevP = camCurve.getPoint(0);
    for (let j = 0; j <= M; j++) {
      const p = camCurve.getPoint(j / M);
      acc += p.distanceTo(prevP); prevP = p;
      tAt.push(j / M); lenAt.push(acc);
    }
    const L = Math.max(1, acc);
    const knotLen = stops.map((_, i) => lenAt[Math.round(i / (n - 1) * M)]);
    // how sharply the path turns at each stop (0 straight on .. 1 straight back)
    const sharp = stops.map((_, i) => {
      if (i === 0 || i === n - 1) return 0;
      const a = stops[i].pos.clone().sub(stops[i - 1].pos).normalize(), b = stops[i + 1].pos.clone().sub(stops[i].pos).normalize();
      return Math.min(1, Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) / Math.PI * 1.6);
    });
    const cruise = Math.max(9, Math.min(30, fr * 0.11));
    const speedAt = d => {
      let k = Math.min(1, 0.12 + Math.sqrt(Math.min(1, d / 14)) * 0.88, Math.sqrt(Math.max(0, (L - d) / 18)) + 0.0);
      for (let i = 1; i < n - 1; i++) {
        // slow right down into each change of direction, then pull away again straight away (no waiting)
        const g = Math.exp(-Math.pow((d - knotLen[i]) / (7 + 5 * sharp[i]), 2));
        k *= 1 - g * 0.95;
      }
      return cruise * Math.max(0.025, k);
    };
    return { stops, camCurve, lookCurve, tAt, lenAt, knotLen, L, speedAt, d: 0, endTarget, look: controls.target.clone() };
  }
  const paramAt = (T, d) => {
    // curve parameter for a distance travelled (binary search the arc-length table)
    let lo = 0, hi = T.lenAt.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T.lenAt[mid] < d) lo = mid; else hi = mid; }
    const span = T.lenAt[hi] - T.lenAt[lo] || 1;
    return T.tAt[lo] + (T.tAt[hi] - T.tAt[lo]) * Math.max(0, Math.min(1, (d - T.lenAt[lo]) / span));
  };
  // Moves the camera one frame along the tour. Returns the person to caption (or null).
  function stepTour(dt) {
    const T = tour;
    T.d = Math.min(T.L, T.d + T.speedAt(T.d) * dt);
    const u = paramAt(T, T.d);
    camera.position.copy(T.camCurve.getPoint(u));
    // the gaze leads the camera a little and follows a moment behind, so turns are gentle
    const want = T.lookCurve.getPoint(Math.min(1, u + 0.25 / (T.stops.length - 1)));
    T.look.lerp(want, 1 - Math.exp(-dt * 3));
    camera.lookAt(T.look);
    // caption whoever is the nearest stop
    let caption = null, bd = Infinity;
    T.knotLen.forEach((kl, i) => { const dd = Math.abs(kl - T.d); if (dd < bd && dd < 22) { bd = dd; caption = T.stops[i].node; } });
    if (T.d >= T.L - 0.01) stopTour(true);
    return caption;
  }
  function startTour(target) {
    flyTo = null;
    tour = buildTour(target || null);
    controls.enabled = false; controls.autoRotate = false;
    if (target) select(target); else select(null);
  }
  function stopTour(finished, quiet) {
    if (!tour) return;
    const end = finished ? tour.endTarget : tour.look.clone();
    tour = null;
    controls.enabled = true;
    controls.target.copy(end);
    controls.autoRotate = !selected || finished;
    controls.update();
    if (!quiet) onTourEnd(!!finished);
  }

  // ---- drawing the labels (also recorded into the video) ----
  const ctx = overlay.getContext('2d');
  let recordingCopy = false;
  const title = `The family galaxy of ${displayName(data.individuals.get(rootId))}`;
  function label(n, text, sub, strong) {
    const s = screenOf(n);
    if (!s.front || s.x < -50 || s.y < -50 || s.x > overlay.width / dpr + 50 || s.y > overlay.height / dpr + 50) return;
    ctx.font = `${strong ? 700 : 600} ${strong ? 15 : 12}px Fredoka, Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = strong ? '#fff6dc' : 'rgba(230,230,255,0.82)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
    ctx.fillText(text, s.x + 9, s.y - (sub ? 7 : 0));
    if (sub) { ctx.font = `600 11px Nunito, system-ui, sans-serif`; ctx.fillStyle = 'rgba(200,205,240,0.8)'; ctx.fillText(sub, s.x + 9, s.y + 8); }
    ctx.shadowBlur = 0;
  }
  function drawOverlay(caption) {
    const w = overlay.width / dpr, h = overlay.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (recordingCopy) ctx.drawImage(canvas, 0, 0, w, h); else ctx.clearRect(0, 0, w, h);
    // names of nearby ancestors as you fly past
    const near = [];
    for (const n of G.nodes) {
      if (!n.anc || n === selected || n.id === rootId) continue;
      const d = camera.position.distanceTo(v.set(n.x, n.y, n.z));
      if (d < 26) near.push([d, n]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, n] of near.slice(0, 18)) label(n, displayName(n.indi), lifespan(n.indi));
    label(G.nodes[0], displayName(G.nodes[0].indi), 'You', true);
    if (hover && hover !== selected) label(hover, displayName(hover.indi), lifespan(hover.indi), true);
    if (selected) label(selected, displayName(selected.indi), lifespan(selected.indi), true);
    if (caption) {
      const d = describe(caption);
      const lines = [d.name, [d.rel, d.life].filter(Boolean).join(' · '), d.birthPlace].filter(Boolean);
      ctx.font = '700 20px Fredoka, Nunito, system-ui, sans-serif';
      const bw = Math.min(w - 32, Math.max(...lines.map((l, i) => { ctx.font = i ? '600 15px Nunito, system-ui, sans-serif' : '700 20px Fredoka, Nunito, system-ui, sans-serif'; return ctx.measureText(l).width; })) + 36);
      const bh = 22 + lines.length * 22, bx = (w - bw) / 2, by = h - bh - 74;
      ctx.fillStyle = 'rgba(10,8,30,0.72)'; roundRect(ctx, bx, by, bw, bh, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,150,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      lines.forEach((l, i) => { ctx.font = i ? '600 15px Nunito, system-ui, sans-serif' : '700 20px Fredoka, Nunito, system-ui, sans-serif'; ctx.fillStyle = i ? '#cfd3f5' : '#fff2cc'; ctx.fillText(l, w / 2, by + 12 + i * 22); });
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 14px Fredoka, Nunito, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,240,210,0.75)';
    ctx.fillText(title, 14, h - 16);
  }

  // ---- loop ----
  let raf = 0, last = performance.now(), alpha = 1, settleFrames = 0;
  const statusText = () => G.settled ? '' : `Pulling ${G.nodes.length.toLocaleString()} stars into shape…`;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!G.settled) {
      const t0 = performance.now();
      let movement = 0;
      do { movement = relax(G, alpha); alpha = Math.max(0.15, alpha * 0.995); settleFrames++; } while (performance.now() - t0 < 9);
      syncPositions();
      if ((movement < 0.004 && settleFrames > 120) || settleFrames > 900) {
        G.settled = true; fitR = fitRadius(); controls.maxDistance = fitR * 6; G.R = fitR;
        makeDust();
        if (!tour) glideTo(new THREE.Vector3(0, fitR * 1.15, fitR * 1.65), new THREE.Vector3());
        if (selected) marker.position.set(selected.x, selected.y, selected.z);
      }
    }
    starMat.uniforms.uTime.value = now / 1000;
    sun.material.opacity = 0.85 + Math.sin(now / 600) * 0.15;
    let caption = null;
    if (tour) {
      caption = stepTour(dt);
    } else if (flyTo) {
      flyTo.t = Math.min(1, flyTo.t + dt / (flyTo.secs || 1.6));
      const e = smoother(flyTo.t);
      camera.position.lerpVectors(flyTo.from, flyTo.to, e);
      controls.target.lerpVectors(flyTo.fromT, flyTo.toT, e);
      if (flyTo.t >= 1) flyTo = null;
      controls.update();
    } else controls.update();
    // the disc's glow only looks right from above or below; fade it out as the camera dips into the plane
    disc.material.opacity = 0.5 * Math.min(1, Math.abs(camera.position.y) / Math.max(8, fitR * 0.35));
    marker.scale.setScalar(Math.max(1.2, camera.position.distanceTo(marker.position) * 0.05));
    renderer.render(scene, camera);
    drawOverlay(caption);
    opts.onFrame?.(statusText());
  }
  raf = requestAnimationFrame(frame);

  return {
    overlay,
    get touring() { return !!tour; },
    startTour: () => startTour(null), stopTour: () => stopTour(false), focusSelected, select,
    tourTo: () => { if (selected) startTour(selected); },
    screenOf: id => { const i = G.index.get(id); return i == null ? null : screenOf(G.nodes[i]); }, // used by the tests
    ancestorIds: () => G.nodes.filter(n => n.anc).map(n => n.id),
    setRecording(on) { recordingCopy = on; },
    count: N, scope, connected: G.connected, total: G.total,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      controls.dispose();
      scene.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose?.(); });
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove(); overlay.remove();
    },
  };
}

function ringTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = '#ffd36a'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
