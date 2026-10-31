// Environments for the Platform look (a bright 3D-platformer land) and the Blocks look (a voxel world).
import * as THREE from 'three';
import { seededRandom } from './ancestry.js';
import { labelTexture } from './textures.js';
import { bandGeometry, placeGuideLabels, spotsAlong, segDist as segDistG } from './guides.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function cvs(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, rx = 1, ry = 1, smooth = false) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = smooth;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const noise = (x, rnd, w, h, base, amt) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = (rnd() - 0.5) * amt; x.fillStyle = `rgb(${Math.max(0, base[0] + v) | 0},${Math.max(0, base[1] + v) | 0},${Math.max(0, base[2] + v) | 0})`; x.fillRect(i, j, 1, 1); } };

// World-scale planar UVs for flat ground pieces (x/z in metres / size).
function groundUVs(g, size) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / size, -p.getY(i) / size);
  return g;
}

// ---------------- Platform: a bright 3D-platformer land ----------------
// Checkered grass, rolling hills, yellow paths for the rings, floating brick platforms to jump on
// and coins to collect. world.platforms and world.coins are used by the jump physics in main.js.
export function platformEnvironment(scene, tree, world) {
  const R = tree.worldRadius;
  const rnd = seededRandom(1985);
  scene.add(new THREE.HemisphereLight('#ffffff', '#5aa83a', 1.35));
  const sun = new THREE.DirectionalLight('#fffbe8', 2.0); sun.position.set(30, 80, 40); scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffffff', 0.3));
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const skyR = Math.max(420, R + 160);
  world.skyRadius = skyR;
  const skyC = cvs(4, 256, (x) => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2a7ae8'); g.addColorStop(0.6, '#6ab8ff'); g.addColorStop(1, '#c8ecff'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); });
  const skyT = tex(skyC, 1, 1, true); skyT.wrapT = THREE.ClampToEdgeWrapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(skyR, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);
  // puffy clouds with flat bottoms
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const a = rnd() * Math.PI * 2, d = skyR * (0.5 + rnd() * 0.3), y = 70 + rnd() * 70;
    for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(7 + rnd() * 6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cloudMat); p.position.set((k - 1.5) * 9, 0, rnd() * 4); g.add(p); }
    g.position.set(Math.cos(a) * d, y, Math.sin(a) * d); g.lookAt(0, y, 0); scene.add(g);
  }
  // distant rolling hills
  const hillCols = ['#3aa83a', '#2e9a3e', '#4ab84a'];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.1, d = R + 30 + rnd() * 50, r = 14 + rnd() * 22;
    const h = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(hillCols[i % 3]));
    h.scale.y = 0.8 + rnd() * 0.8; h.position.set(Math.cos(a) * d, -1.5, Math.sin(a) * d); scene.add(h);
  }
  // water all round, an earthy cliff edge, and the checkered grass
  const sea = new THREE.Mesh(new THREE.CircleGeometry(skyR, 48), new THREE.MeshBasicMaterial({ color: '#3ab0f0' }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -2; scene.add(sea);
  const cliffT = tex(cvs(16, 16, (x) => { x.fillStyle = '#c87a3a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a85a2a'; x.fillRect(0, 5, 16, 2); x.fillRect(0, 12, 16, 2); x.fillStyle = '#e8a050'; for (let k = 0; k < 6; k++) x.fillRect(Math.floor(rnd() * 15), Math.floor(rnd() * 15), 2, 1); }), Math.round(Math.PI * 2 * (R + 2) / 2), 1);
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(R + 2, R + 2.6, 2, 64, 1, true), new THREE.MeshLambertMaterial({ map: cliffT }));
  cliff.position.y = -1; scene.add(cliff);
  const checker = tex(cvs(2, 2, (x) => { x.fillStyle = '#5ccd3e'; x.fillRect(0, 0, 2, 2); x.fillStyle = '#4ebd34'; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1); }));
  const grass = new THREE.Mesh(groundUVs(new THREE.CircleGeometry(R + 2, 96), 4), new THREE.MeshLambertMaterial({ map: checker }));
  grass.rotation.x = -Math.PI / 2; scene.add(grass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 2, 0.35, 6, 96), lam('#3a9a2a'));
  rim.rotation.x = Math.PI / 2; scene.add(rim);
  // yellow paths for the generation rings
  const pathT = tex(cvs(16, 16, (x) => { x.fillStyle = '#f8d850'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#e8b830'; for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4, 16, 1); x.fillRect((r % 2) * 4 + 0, r * 4, 1, 4); x.fillRect((r % 2) * 4 + 8, r * 4, 1, 4); } }));
  const pathMat = new THREE.MeshLambertMaterial({ map: pathT });
  const brickT = tex(cvs(16, 16, (x) => { x.fillStyle = '#c8602a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a2a10'; for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); x.fillRect(r % 2 ? 4 : 0, r * 4, 1, 3); x.fillRect(r % 2 ? 12 : 8, r * 4, 1, 3); } x.fillStyle = '#f0905a'; for (let r = 0; r < 4; r++) x.fillRect(0, r * 4, 16, 1); }));
  const brickMat = new THREE.MeshLambertMaterial({ map: brickT });
  const labelGroup = new THREE.Group();
  for (const gd of tree.guides) {
    const path = new THREE.Mesh(bandGeometry(gd, 0.9, 2, 1.2), pathMat);
    path.position.y = 0.02; scene.add(path);
    placeGuideLabels(labelGroup, gd, labelTexture(`GEN ${gd.g}`, '#ffffff', 256, '22px "Lilita One", "Fredoka", sans-serif', 'rgba(60,30,10,0.9)', true), [3, 0.5], 1.45, 0.04);
  }
  scene.add(labelGroup);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.3, 24), pathMat);
  plaza.position.set(tree.hub.x, 0.15, tree.hub.z); scene.add(plaza);
  world.platforms.push({ x: tree.hub.x, z: tree.hub.z, hw: 1.9, hd: 1.9, top: 0.3, round: 2.6 });

  // Keep clear of people and the lines between them
  const segs = tree.edges.map(e => [tree.people.get(e.child), tree.people.get(e.parent)]);
  const segDist = segDistG;
  const used = [];
  const clear = (x, z, d) => {
    if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < 5 || Math.hypot(x, z) > R - 2) return false;
    for (const p of tree.people.values()) if (Math.hypot(p.x - x, p.z - z) < d) return false;
    for (const u of used) if (Math.hypot(u[0] - x, u[1] - z) < d + u[2]) return false;
    return true;
  };
  // Floating brick platforms (some in steps) with coins on top
  const plats = [];
  for (let i = 0; i < 400 && plats.length < Math.min(40, Math.round(R * 0.6)); i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * (R - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!clear(x, z, 3.2)) continue;
    let nearLine = false; for (const [p, q] of segs) if (segDist(x, z, p, q) < 1.6) { nearLine = true; break; }
    if (nearLine) continue;
    const n = 2 + Math.floor(rnd() * 3), top = 1.5 + (rnd() < 0.35 ? 1.4 : 0);
    const rot = rnd() * Math.PI;
    plats.push({ x, z, n, top, rot });
    used.push([x, z, n * 0.6 + 1]);
  }
  const cubes = [];
  for (const p of plats) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    for (let k = 0; k < p.n; k++) {
      const off = (k - (p.n - 1) / 2) * 1.0;
      cubes.push([p.x + c * off, p.top - 0.5, p.z - s * off]);
    }
    // a lower step to climb up to the high ones
    if (p.top > 2) { const sx = p.x + s * 2.4, sz = p.z + c * 2.4; cubes.push([sx, 1.0, sz]); world.platforms.push({ x: sx, z: sz, hw: 0.5, hd: 0.5, top: 1.5, rot: p.rot }); }
    world.platforms.push({ x: p.x, z: p.z, hw: p.n * 0.5, hd: 0.5, top: p.top, rot: p.rot });
  }
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), brickMat, Math.max(1, cubes.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  cubes.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); blocks.setMatrixAt(i, m); });
  blocks.count = cubes.length; scene.add(blocks);
  // rotate each platform's cubes to its heading
  let ci = 0;
  for (const p of plats) {
    q.setFromAxisAngle(up, p.rot);
    for (let k = 0; k < p.n; k++) { const [x, y, z] = cubes[ci]; m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); blocks.setMatrixAt(ci++, m); }
    if (p.top > 2) ci++;
  }

  // Coins: rows along the paths, and over every platform
  const coins = [];
  for (const gd of tree.guides) {
    for (const { x, z } of spotsAlong(gd, 1.45, 9)) {
      let ok = true; for (const p of tree.people.values()) if (Math.hypot(p.x - x, p.z - z) < 1.4) { ok = false; break; }
      if (ok) coins.push({ x, y: 1.0, z });
    }
  }
  for (const p of plats) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    for (let k = 0; k < p.n; k++) { const off = (k - (p.n - 1) / 2); coins.push({ x: p.x + c * off, y: p.top + 0.8, z: p.z - s * off }); }
    coins.push({ x: p.x, y: p.top + 2.2, z: p.z });
  }
  const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16).rotateX(Math.PI / 2);
  const coinMesh = new THREE.InstancedMesh(coinGeo, new THREE.MeshLambertMaterial({ color: '#ffcc22', emissive: '#7a5200' }), Math.max(1, coins.length));
  coinMesh.count = coins.length;
  scene.add(coinMesh);
  world.coins = coins;
  world.coinMesh = coinMesh;

  // Bushes and big round flowers
  const bushGeo = new THREE.SphereGeometry(0.7, 10, 8);
  const bushes = [];
  for (let i = 0; i < 300 && bushes.length < 50; i++) {
    const a = rnd() * Math.PI * 2, r = 5 + rnd() * (R - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (clear(x, z, 2.6)) { bushes.push([x, z]); used.push([x, z, 1.4]); }
  }
  const bush = new THREE.InstancedMesh(bushGeo, lam('#2eaa3a'), bushes.length * 3 || 1);
  let bi = 0;
  for (const [x, z] of bushes) for (let k = 0; k < 3; k++) { m.compose(new THREE.Vector3(x + (k - 1) * 0.75, 0.35 + (k === 1 ? 0.2 : 0), z), new THREE.Quaternion(), new THREE.Vector3(1, 0.85, 1)); bush.setMatrixAt(bi++, m); }
  bush.count = bi; scene.add(bush);
  const flowers = [];
  for (let i = 0; i < 400 && flowers.length < 80; i++) {
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * (R - 5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (clear(x, z, 1.4)) flowers.push([x, z, ['#ff4a4a', '#ffffff', '#ff9a2a', '#ff6ad0'][flowers.length % 4]]);
  }
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6).translate(0, 0.35, 0), lam('#2a8a2a'), flowers.length || 1);
  const petals = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10).rotateX(Math.PI / 2).translate(0, 0.8, 0), lam('#ffffff'), flowers.length || 1);
  const centre = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 0.8, 0.05), lam('#ffe040'), flowers.length || 1);
  flowers.forEach(([x, z, col], i) => { m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(-x, -z)), new THREE.Vector3(1, 1, 1)); stem.setMatrixAt(i, m); petals.setMatrixAt(i, m); petals.setColorAt(i, new THREE.Color(col)); centre.setMatrixAt(i, m); });
  stem.count = petals.count = centre.count = flowers.length;
  scene.add(stem, petals, centre);
  world.colliders.push(...bushes.map(([x, z]) => ({ x, z, r: 1.1 })));
  world.wallRadius = R + 1.6;

  const cm = new THREE.Matrix4(), cq = new THREE.Quaternion();
  world.envUpdate = t => {
    cq.setFromAxisAngle(up, t * 2.5);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      cm.compose(new THREE.Vector3(c.x, c.y + Math.sin(t * 2 + i) * 0.06, c.z), cq, c.taken ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(1, 1, 1));
      coinMesh.setMatrixAt(i, cm);
    }
    coinMesh.instanceMatrix.needsUpdate = true;
  };
}

// ---------------- Blocks: a voxel world ----------------
function blockTex(kind, rnd) {
  return cvs(16, 16, (x) => {
    if (kind === 'grass') { noise(x, rnd, 16, 16, [96, 158, 62], 30); }
    else if (kind === 'dirt') noise(x, rnd, 16, 16, [134, 96, 66], 30);
    else if (kind === 'stone') noise(x, rnd, 16, 16, [128, 128, 128], 30);
    else if (kind === 'gravel') { noise(x, rnd, 16, 16, [140, 130, 124], 50); }
    else if (kind === 'sand') noise(x, rnd, 16, 16, [222, 210, 160], 20);
    else if (kind === 'log') { noise(x, rnd, 16, 16, [104, 80, 50], 20); x.fillStyle = 'rgba(40,28,16,0.6)'; for (let i = 1; i < 16; i += 4) x.fillRect(i, 0, 1, 16); }
    else if (kind === 'leaves') { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const v = rnd(); x.fillStyle = v < 0.15 ? '#1e4a14' : v < 0.6 ? '#3a7a2a' : '#4a9234'; x.fillRect(i, j, 1, 1); } }
    else if (kind === 'water') noise(x, rnd, 16, 16, [52, 96, 200], 18);
    else if (kind.startsWith('wool')) { const c = kind === 'woolblue' ? [52, 72, 200] : [190, 50, 44]; noise(x, rnd, 16, 16, c, 26); }
    else if (kind === 'grassside') { noise(x, rnd, 16, 16, [134, 96, 66], 30); for (let i = 0; i < 16; i++) { x.fillStyle = '#5e9e3e'; x.fillRect(i, 0, 1, 3 + (rnd() < 0.4 ? 1 : 0)); } }
  });
}

export function blocksEnvironment(scene, tree, world) {
  const R = tree.worldRadius;
  const rnd = seededRandom(2011);
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a8a5a', 1.3));
  const sun = new THREE.DirectionalLight('#ffffff', 1.5); sun.position.set(20, 80, 30); scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const T = k => { const t = tex(blockTex(k, rnd)); return t; };
  const lam = (k) => new THREE.MeshLambertMaterial({ map: T(k) });
  world.skyRadius = Math.max(400, R + 140);
  // Sky: flat blue with a square sun
  const sunSq = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: '#fffbd0', fog: false }));
  sunSq.position.set(-150, 220, -250); sunSq.lookAt(0, 0, 0); scene.add(sunSq);
  // Clouds: flat white slabs drifting
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  const clouds = new THREE.InstancedMesh(cloudGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, fog: false }), 40);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { m.compose(new THREE.Vector3((rnd() - 0.5) * 600, 60, (rnd() - 0.5) * 600), new THREE.Quaternion(), new THREE.Vector3(12 + rnd() * 30, 4, 10 + rnd() * 24)); clouds.setMatrixAt(i, m); }
  scene.add(clouds);
  world.clouds = clouds;
  // Grass ground with a cut edge of dirt and stone, sitting in water
  const grassTop = T('grass');
  const ground = new THREE.Mesh(groundUVs(new THREE.CircleGeometry(R + 2, 96), 1), new THREE.MeshLambertMaterial({ map: grassTop }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const side = T('grassside'); side.repeat.set(Math.round(Math.PI * 2 * (R + 2)), 1);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R + 2, R + 2, 1, 64, 1, true), new THREE.MeshLambertMaterial({ map: side }));
  edge.position.y = -0.5; scene.add(edge);
  const stoneSide = T('stone'); stoneSide.repeat.set(Math.round(Math.PI * 2 * (R + 2)), 3);
  const edge2 = new THREE.Mesh(new THREE.CylinderGeometry(R + 2, R + 2, 3, 64, 1, true), new THREE.MeshLambertMaterial({ map: stoneSide }));
  edge2.position.y = -2.5; scene.add(edge2);
  const water = new THREE.Mesh(groundUVs(new THREE.RingGeometry(R + 2, world.skyRadius, 64, 1), 1), new THREE.MeshLambertMaterial({ map: T('water'), transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.9; scene.add(water);
  // Gravel paths for the generation rings
  const gravel = lam('gravel');
  const labelGroup = new THREE.Group();
  for (const gd of tree.guides) {
    const path = new THREE.Mesh(bandGeometry(gd, 0.9, 2, 1), gravel);
    path.position.y = 0.02; scene.add(path);
    placeGuideLabels(labelGroup, gd, labelTexture(`Gen ${gd.g}`, '#ffffff', 256, '18px "Pixelify Sans", monospace', 'rgba(60,60,60,0.9)'), [3, 0.5], 1.45, 0.04);
  }
  scene.add(labelGroup);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 5), new THREE.MeshLambertMaterial({ map: T('stone') }));
  plaza.position.set(tree.hub.x, 0.05, tree.hub.z); scene.add(plaza);
  // Oak trees made of blocks
  const spots = [];
  const clear = (x, z, d) => { if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < 5) return false; for (const p of tree.people.values()) if (Math.hypot(p.x - x, p.z - z) < d) return false; for (const s of spots) if (Math.hypot(s[0] - x, s[1] - z) < 5) return false; return true; };
  for (let i = 0; i < 300 && spots.length < 40; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * (R - 6);
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    if (clear(x, z, 4.5)) spots.push([x, z]);
  }
  const logs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam('log'), spots.length * 5 || 1);
  const leafCells = [];
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 6; dy++) {
    const edgeCut = (Math.abs(dx) === 2 && Math.abs(dz) === 2) || (dy >= 5 && (Math.abs(dx) === 2 || Math.abs(dz) === 2)) || (dy === 6 && Math.abs(dx) + Math.abs(dz) > 1);
    if (!edgeCut && !(dx === 0 && dz === 0 && dy < 5)) leafCells.push([dx, dy, dz]);
  }
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam('leaves'), spots.length * leafCells.length || 1);
  let li = 0, gi = 0;
  spots.forEach(([x, z]) => {
    for (let y = 0; y < 5; y++) { m.makeTranslation(x, y + 0.5, z); logs.setMatrixAt(li++, m); }
    for (const [dx, dy, dz] of leafCells) { m.makeTranslation(x + dx, dy + 0.5, z + dz); leaves.setMatrixAt(gi++, m); }
  });
  logs.count = li; leaves.count = gi;
  scene.add(logs, leaves);
  // Flowers: crossed pixel sprites
  const flowerTex = (col) => { const t = tex(cvs(16, 16, (x) => { x.clearRect(0, 0, 16, 16); x.fillStyle = '#3a8a2a'; x.fillRect(7, 6, 2, 10); x.fillRect(5, 11, 2, 2); x.fillStyle = col; x.fillRect(6, 2, 4, 4); x.fillStyle = '#ffe060'; x.fillRect(7, 3, 2, 2); })); return t; };
  for (const col of ['#e02a2a', '#ffd020', '#ffffff']) {
    const mat = new THREE.MeshLambertMaterial({ map: flowerTex(col), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const geo = mergeCross();
    const nF = Math.min(140, Math.round(R * 2));
    const fl = new THREE.InstancedMesh(geo, mat, nF);
    let k = 0;
    for (let i = 0; i < nF * 3 && k < nF; i++) {
      const a = rnd() * Math.PI * 2, r = 4 + Math.sqrt(rnd()) * (R - 4);
      const x = Math.round(Math.cos(a) * r) + 0.5, z = Math.round(Math.sin(a) * r) + 0.5;
      let ok = true; for (const p of tree.people.values()) if (Math.abs(p.x - x) < 1.2 && Math.abs(p.z - z) < 1.2) { ok = false; break; }
      if (!ok) continue;
      m.makeTranslation(x, 0.4, z); fl.setMatrixAt(k++, m);
    }
    fl.count = k;
    scene.add(fl);
  }
  world.colliders.push(...spots.map(([x, z]) => ({ x, z, r: 0.75 })));
  world.wallRadius = R + 1.5;
  world.envUpdate = t => { clouds.position.x = (t * 0.6) % 60; };
}

function mergeCross() {
  const a = new THREE.PlaneGeometry(0.8, 0.8); a.rotateY(Math.PI / 4);
  const b = new THREE.PlaneGeometry(0.8, 0.8); b.rotateY(-Math.PI / 4);
  const pos = [...a.attributes.position.array, ...b.attributes.position.array];
  const uv = [...a.attributes.uv.array, ...b.attributes.uv.array];
  const nrm = [...a.attributes.normal.array, ...b.attributes.normal.array];
  const idx = [...a.index.array, ...b.index.array.map(i => i + 4)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}
