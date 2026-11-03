// Jump-and-collect extras for the Island look: floating brick platforms to jump on and coins to collect.
// world.platforms and world.coins are read by the jump physics in main.js.
import * as THREE from 'three';
import { seededRandom } from './ancestry.js';
import { spotsAlong, segDist } from './guides.js';

function cvs(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Adds floating brick platforms (some with a step up to them) and spinning coins to an island.
 * Keeps clear of the plaza, people, the lines between them and anything listed in `avoid` ([x, z, r]).
 * Returns an update(t) function that spins the coins.
 */
export function platformsAndCoins(scene, tree, world, avoid = []) {
  const R = tree.worldRadius;
  const rnd = seededRandom(1985);
  const brickT = tex(cvs(16, 16, (x) => {
    x.fillStyle = '#d07040'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#7a3a1c'; for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); x.fillRect(r % 2 ? 4 : 0, r * 4, 1, 3); x.fillRect(r % 2 ? 12 : 8, r * 4, 1, 3); }
    x.fillStyle = '#f0a070'; for (let r = 0; r < 4; r++) x.fillRect(0, r * 4, 16, 1);
  }));
  const grassTop = tex(cvs(16, 16, (x) => {
    x.fillStyle = '#6ccf52'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#58b84a'; for (let i = 0; i < 16; i += 2) x.fillRect(i, (i * 7) % 16, 1, 1);
  }));
  // brick sides with a grassy top, like a little piece of the island lifted up
  const brickMat = new THREE.MeshLambertMaterial({ map: brickT });
  const topMat = new THREE.MeshLambertMaterial({ map: grassTop });
  const mats = [brickMat, brickMat, topMat, brickMat, brickMat, brickMat];

  const segs = tree.edges.map(e => [tree.people.get(e.child), tree.people.get(e.parent)]);
  const used = avoid.slice();
  const clear = (x, z, d) => {
    if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < 5 || Math.hypot(x, z) > R - 3) return false;
    for (const p of tree.people.values()) if (Math.hypot(p.x - x, p.z - z) < d) return false;
    for (const u of used) if (Math.hypot(u[0] - x, u[1] - z) < d * 0.6 + u[2]) return false;
    return true;
  };
  const plats = [];
  for (let i = 0; i < 500 && plats.length < Math.min(36, Math.round(R * 0.55)); i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * (R - 9);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!clear(x, z, 3.2)) continue;
    let nearLine = false; for (const [p, q] of segs) if (segDist(x, z, p, q) < 1.6) { nearLine = true; break; }
    if (nearLine) continue;
    const n = 2 + Math.floor(rnd() * 3), top = 1.5 + (rnd() < 0.35 ? 1.4 : 0);
    plats.push({ x, z, n, top, rot: rnd() * Math.PI });
    used.push([x, z, n * 0.6 + 1]);
  }
  const cubes = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const p of plats) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    const q = new THREE.Quaternion().setFromAxisAngle(up, p.rot);
    for (let k = 0; k < p.n; k++) {
      const off = (k - (p.n - 1) / 2);
      cubes.push([p.x + c * off, p.top - 0.5, p.z - s * off, q]);
    }
    // a lower step to climb up to the high ones
    if (p.top > 2) {
      const sx = p.x + s * 2.4, sz = p.z + c * 2.4;
      cubes.push([sx, 1.0, sz, q]);
      world.platforms.push({ x: sx, z: sz, hw: 0.5, hd: 0.5, top: 1.5, rot: p.rot });
    }
    world.platforms.push({ x: p.x, z: p.z, hw: p.n * 0.5, hd: 0.5, top: p.top, rot: p.rot });
  }
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats, Math.max(1, cubes.length));
  const m = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  cubes.forEach(([x, y, z, q], i) => { m.compose(new THREE.Vector3(x, y, z), q, one); blocks.setMatrixAt(i, m); });
  blocks.count = cubes.length;
  scene.add(blocks);

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

  const cm = new THREE.Matrix4(), cq = new THREE.Quaternion(), zero = new THREE.Vector3(0, 0, 0), v = new THREE.Vector3();
  return t => {
    cq.setFromAxisAngle(up, t * 2.5);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      cm.compose(v.set(c.x, c.y + Math.sin(t * 2 + i) * 0.06, c.z), cq, c.taken ? zero : one);
      coinMesh.setMatrixAt(i, cm);
    }
    coinMesh.instanceMatrix.needsUpdate = true;
  };
}
