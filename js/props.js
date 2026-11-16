// Set dressing for the Retro look, in the spirit of 90s demon shooters: toxic waste barrels (shoot them
// and they burst), burning barrels, tech floor lamps, candelabras, stacked crates, broken columns and
// boxes of bullets to pick up. Everything is placed in open ground away from people and family lines.
import * as THREE from 'three';
import { toTexture } from './textures.js';
import { seededRandom } from './ancestry.js';
import { openSpots } from './guides.js';

function cvs(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
const noise = (x, rnd, x0, y0, w, h, base, amt) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = (rnd() - 0.5) * amt; x.fillStyle = `rgb(${Math.max(0, base[0] + v) | 0},${Math.max(0, base[1] + v) | 0},${Math.max(0, base[2] + v) | 0})`; x.fillRect(x0 + i, y0 + j, 1, 1); } };

function textures(rnd) {
  const barrel = cvs(32, 32, (x) => {
    noise(x, rnd, 0, 0, 32, 32, [92, 104, 80], 22);
    x.fillStyle = '#2e3428'; x.fillRect(0, 4, 32, 2); x.fillRect(0, 26, 32, 2);
    x.fillStyle = '#c8b020'; x.fillRect(10, 12, 12, 8);
    x.fillStyle = '#1a1a1a'; for (let i = 0; i < 3; i++) x.fillRect(12 + i * 3, 13, 2, 6);
    x.fillStyle = 'rgba(80,220,60,0.8)'; x.fillRect(4, 0, 3, 5); x.fillRect(22, 0, 2, 7); // drips
  });
  const rust = cvs(32, 32, (x) => { noise(x, rnd, 0, 0, 32, 32, [120, 70, 40], 34); x.fillStyle = '#3a2214'; x.fillRect(0, 4, 32, 2); x.fillRect(0, 26, 32, 2); });
  const crate = cvs(32, 32, (x) => {
    noise(x, rnd, 0, 0, 32, 32, [70, 76, 84], 16);
    x.fillStyle = '#a0a6ae'; x.fillRect(0, 0, 32, 2); x.fillRect(0, 30, 32, 2); x.fillRect(0, 0, 2, 32); x.fillRect(30, 0, 2, 32);
    x.fillStyle = '#4a4e56'; for (let i = 0; i < 28; i++) { x.fillRect(2 + i, 2 + i, 2, 2); x.fillRect(28 - i, 2 + i, 2, 2); }
    x.fillStyle = '#d8b030'; x.fillRect(4, 4, 6, 3);
  });
  const stone = cvs(32, 32, (x) => { noise(x, rnd, 0, 0, 32, 32, [150, 142, 128], 26); x.fillStyle = 'rgba(40,36,30,0.6)'; for (let i = 3; i < 32; i += 6) x.fillRect(i, 0, 1, 32); x.fillRect(0, 0, 32, 2); });
  const medkit = cvs(16, 16, (x) => { noise(x, rnd, 0, 0, 16, 16, [228, 226, 220], 10); x.fillStyle = '#c81e1e'; x.fillRect(6, 3, 4, 10); x.fillRect(3, 6, 10, 4); x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); });
  const ammo = cvs(16, 16, (x) => { noise(x, rnd, 0, 0, 16, 16, [86, 92, 54], 18); x.fillStyle = '#2a2e1a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 7, 16, 1); x.fillStyle = '#e8d070'; x.fillRect(5, 3, 6, 2); });
  return { barrel: toTexture(barrel), rust: toTexture(rust), crate: toTexture(crate), stone: toTexture(stone), ammo: toTexture(ammo), medkit: toTexture(medkit) };
}

export function retroProps(scene, tree, world, flameMat) {
  const rnd = seededRandom(666 + tree.people.size);
  const T = textures(rnd);
  const used = [];
  const R = tree.worldRadius;
  const scale = Math.max(1, Math.min(3, (R * R) / 2500)); // more props in a bigger courtyard
  const lam = (map, color = '#ffffff', emissive) => new THREE.MeshLambertMaterial({ map, color, ...(emissive ? { emissive } : {}) });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);

  // Toxic barrels, in little clusters
  const barrels = [];
  for (const s of openSpots(tree, rnd, { count: Math.round(9 * scale), clearPeople: 3, clearLines: 1.4, clearOther: 4, used })) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, d = k ? 0.95 : 0;
      const b = { x: s.x + Math.cos(a) * d, z: s.z + Math.sin(a) * d };
      let ok = true; for (const p of tree.people.values()) if (Math.hypot(p.x - b.x, p.z - b.z) < 2.2) { ok = false; break; }
      for (const o of barrels) if (Math.hypot(o.x - b.x, o.z - b.z) < 0.85) ok = false;
      if (ok) barrels.push({ ...b, r: 0.42, h: 1.15, alive: true, respawn: 0, rot: rnd() * 6.28 });
    }
  }
  const barrelBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 12).translate(0, 0.55, 0), lam(T.barrel), Math.max(1, barrels.length));
  const barrelTop = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12).translate(0, 1.11, 0), new THREE.MeshBasicMaterial({ color: '#5aff3a' }), Math.max(1, barrels.length));
  const setBarrel = (i, visible) => {
    const b = barrels[i];
    q.setFromAxisAngle(up, b.rot);
    m.compose(new THREE.Vector3(b.x, 0, b.z), q, visible ? one : new THREE.Vector3(0.0001, 0.0001, 0.0001));
    barrelBody.setMatrixAt(i, m); barrelTop.setMatrixAt(i, m);
    barrelBody.instanceMatrix.needsUpdate = barrelTop.instanceMatrix.needsUpdate = true;
  };
  barrels.forEach((b, i) => setBarrel(i, true));
  barrelBody.count = barrelTop.count = barrels.length;
  scene.add(barrelBody, barrelTop);

  // Burning barrels (with animated flames, reusing the torch frames)
  const fires = openSpots(tree, rnd, { count: Math.round(6 * scale), clearPeople: 3, clearLines: 1.2, clearOther: 5, used });
  const fireBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.38, 0.4, 1.0, 12, 1, true).translate(0, 0.5, 0), lam(T.rust), Math.max(1, fires.length));
  fires.forEach((f, i) => {
    m.makeTranslation(f.x, 0, f.z); fireBody.setMatrixAt(i, m);
    const fl = new THREE.Sprite(flameMat[i % 4]); fl.scale.set(0.8, 1.2, 1); fl.position.set(f.x, 1.45, f.z); fl.userData.phase = i * 3;
    scene.add(fl); world.torches.push(fl);
  });
  fireBody.count = fires.length; scene.add(fireBody);

  // Tech floor lamps
  const lamps = openSpots(tree, rnd, { count: Math.round(7 * scale), clearPeople: 2.5, clearLines: 1, clearOther: 6, used });
  const lampPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 8).translate(0, 1.1, 0), lam(null, '#5a5e66'), Math.max(1, lamps.length));
  const lampBase = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 8).translate(0, 0.1, 0), lam(null, '#3a3c42'), Math.max(1, lamps.length));
  const lampHead = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8).translate(0, 2.4, 0), new THREE.MeshBasicMaterial({ color: '#e8f4ff' }), Math.max(1, lamps.length));
  lamps.forEach((l, i) => { m.makeTranslation(l.x, 0, l.z); lampPole.setMatrixAt(i, m); lampBase.setMatrixAt(i, m); lampHead.setMatrixAt(i, m); });
  lampPole.count = lampBase.count = lampHead.count = lamps.length;
  scene.add(lampPole, lampBase, lampHead);

  // Candelabras: three candles on a stand
  const candles = openSpots(tree, rnd, { count: Math.round(4 * scale), clearPeople: 2.5, clearLines: 1, clearOther: 6, used });
  const candleGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.5, 6).translate(0, 0.75, 0);
  const armGeo = new THREE.BoxGeometry(0.7, 0.05, 0.05).translate(0, 1.5, 0);
  const stand = new THREE.InstancedMesh(candleGeo, lam(null, '#8a7a3a'), Math.max(1, candles.length));
  const arms = new THREE.InstancedMesh(armGeo, lam(null, '#8a7a3a'), Math.max(1, candles.length));
  const flameSmall = flameMat.map(mm => mm);
  candles.forEach((c, i) => {
    const rot = rnd() * Math.PI;
    q.setFromAxisAngle(up, rot); m.compose(new THREE.Vector3(c.x, 0, c.z), q, one);
    stand.setMatrixAt(i, m); arms.setMatrixAt(i, m);
    for (const off of [-0.32, 0, 0.32]) {
      const fl = new THREE.Sprite(flameSmall[(i + 1) % 4]); fl.scale.set(0.18, 0.32, 1);
      fl.position.set(c.x + Math.cos(rot) * off, 1.72 + (off === 0 ? 0.08 : 0), c.z - Math.sin(rot) * off);
      fl.userData.phase = i + Math.round(Math.abs(off) * 10); scene.add(fl); world.torches.push(fl);
    }
  });
  stand.count = arms.count = candles.length; scene.add(stand, arms);

  // Stacked crates
  const crateSpots = openSpots(tree, rnd, { count: Math.round(7 * scale), clearPeople: 3.2, clearLines: 1.6, clearOther: 5, used });
  const crateList = [];
  for (const c of crateSpots) {
    const rot = rnd() * Math.PI, n = 1 + Math.floor(rnd() * 3);
    crateList.push({ x: c.x, z: c.z, y: 0.6, rot, s: 1.2 });
    if (n > 1) crateList.push({ x: c.x + Math.cos(rot) * 1.25, z: c.z - Math.sin(rot) * 1.25, y: 0.6, rot, s: 1.2 });
    if (n > 2) crateList.push({ x: c.x + Math.cos(rot) * 0.6, z: c.z - Math.sin(rot) * 0.6, y: 1.65, rot: rot + 0.3, s: 0.9 });
  }
  const crates = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam(T.crate), Math.max(1, crateList.length));
  crateList.forEach((c, i) => { q.setFromAxisAngle(up, c.rot); m.compose(new THREE.Vector3(c.x, c.y * (c.s / 1.2) + (c.y > 1 ? 0.15 : 0), c.z), q, new THREE.Vector3(c.s, c.s, c.s)); crates.setMatrixAt(i, m); });
  crates.count = crateList.length; scene.add(crates);

  // Broken stone columns
  const cols = openSpots(tree, rnd, { count: Math.round(5 * scale), clearPeople: 3, clearLines: 1.2, clearOther: 6, used });
  const colMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.48, 1, 10).translate(0, 0.5, 0), lam(T.stone), Math.max(1, cols.length));
  const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.25, 1.1).translate(0, 0.125, 0), lam(T.stone, '#c8c0b0'), Math.max(1, cols.length));
  cols.forEach((c, i) => {
    const h = 0.8 + rnd() * 2.6;
    m.compose(new THREE.Vector3(c.x, 0, c.z), q.setFromAxisAngle(up, rnd() * 6), new THREE.Vector3(1, h, 1)); colMesh.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(c.x, 0, c.z), q, one); capMesh.setMatrixAt(i, m);
  });
  colMesh.count = capMesh.count = cols.length; scene.add(colMesh, capMesh);

  // Boxes of bullets to pick up
  const ammoSpots = openSpots(tree, rnd, { count: Math.round(5 * scale), clearPeople: 2, clearLines: 0, clearOther: 4, used });
  const ammo = ammoSpots.map(a => ({ ...a, taken: false, respawn: 0, rot: rnd() * 6 }));
  const ammoMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.32, 0.4).translate(0, 0.16, 0), lam(T.ammo), Math.max(1, ammo.length));
  const setAmmo = (i, visible) => { const a = ammo[i]; q.setFromAxisAngle(up, a.rot); m.compose(new THREE.Vector3(a.x, 0, a.z), q, visible ? one : new THREE.Vector3(0.0001, 0.0001, 0.0001)); ammoMesh.setMatrixAt(i, m); ammoMesh.instanceMatrix.needsUpdate = true; };
  ammo.forEach((a, i) => setAmmo(i, true));
  ammoMesh.count = ammo.length; scene.add(ammoMesh);

  // First-aid kits: only out in Fight back mode
  const medkits = openSpots(tree, rnd, { count: Math.round(3 * scale), clearPeople: 2, clearLines: 0, clearOther: 5, used }).map(a => ({ ...a, taken: false, respawn: 0, rot: rnd() * 6 }));
  const medMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.3, 0.5).translate(0, 0.15, 0), lam(T.medkit), Math.max(1, medkits.length));
  let fight = false;
  const setMed = (i, visible) => { const a = medkits[i]; q.setFromAxisAngle(up, a.rot); m.compose(new THREE.Vector3(a.x, 0, a.z), q, visible && fight ? one : new THREE.Vector3(0.0001, 0.0001, 0.0001)); medMesh.setMatrixAt(i, m); medMesh.instanceMatrix.needsUpdate = true; };
  medkits.forEach((a, i) => setMed(i, true));
  medMesh.count = medkits.length; scene.add(medMesh);
  world.medkits = medkits;
  // In Fight back mode pickups turn up somewhere new each time, at random
  const relocate = a => {
    const avoid = [...ammo, ...medkits].filter(o => o !== a).map(o => ({ x: o.x, z: o.z, r: 3 }));
    for (const c of world.colliders) avoid.push({ x: c.x, z: c.z, r: c.r });
    const [spot] = openSpots(tree, Math.random, { count: 1, clearPeople: 2, clearLines: 0, clearOther: 2, used: avoid });
    if (spot) { a.x = spot.x; a.z = spot.z; a.rot = Math.random() * 6; }
  };
  world.setFight = on => {
    fight = !!on;
    if (fight) { ammo.forEach((a, i) => { relocate(a); setAmmo(i, !a.taken); }); medkits.forEach(relocate); }
    medkits.forEach((a, i) => setMed(i, !a.taken));
  };
  world.takeMedkit = (a) => { const i = medkits.indexOf(a); if (i < 0 || a.taken) return; a.taken = true; a.respawn = 25 + Math.random() * 20; setMed(i, false); };

  world.colliders.push(
    ...barrels.map(b => ({ x: b.x, z: b.z, r: 0.42, barrel: b })),
    ...fires.map(f => ({ x: f.x, z: f.z, r: 0.42 })),
    ...lamps.map(l => ({ x: l.x, z: l.z, r: 0.3 })),
    ...candles.map(c => ({ x: c.x, z: c.z, r: 0.25 })),
    ...crateList.filter(c => c.y < 1).map(c => ({ x: c.x, z: c.z, r: 0.75 })),
    ...cols.map(c => ({ x: c.x, z: c.z, r: 0.55 })),
  );
  world.shootables = barrels;
  world.pickups = ammo;

  // Explosions: a fireball of flame sprites that swells and fades
  const booms = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameMat[0].map, transparent: true, fog: false, depthWrite: false }));
    s.visible = false; scene.add(s); booms.push({ s, t: 0 });
  }
  let bi = 0;
  world.explodeBarrel = (b) => {
    const i = barrels.indexOf(b);
    if (i < 0 || !b.alive) return;
    b.alive = false; b.respawn = 25;
    setBarrel(i, false);
    const e = booms[bi++ % booms.length];
    e.s.position.set(b.x, 1.0, b.z); e.t = 0; e.s.visible = true;
  };
  world.takeAmmo = (a) => { const i = ammo.indexOf(a); if (i < 0 || a.taken) return; a.taken = true; a.respawn = fight ? 16 + Math.random() * 16 : 30; setAmmo(i, false); };

  return (t, dt) => {
    for (const e of booms) {
      if (!e.s.visible) continue;
      e.t += dt;
      const k = e.t / 0.6;
      if (k >= 1) { e.s.visible = false; continue; }
      e.s.scale.set(1 + k * 3.5, 1.4 + k * 4, 1);
      e.s.material.opacity = 1 - k * k;
      e.s.material.map = flameMat[Math.floor(e.t * 20) % 4].map;
    }
    barrels.forEach((b, i) => { if (!b.alive && (b.respawn -= dt) <= 0) { b.alive = true; setBarrel(i, true); } });
    ammo.forEach((a, i) => { if (a.taken && (a.respawn -= dt) <= 0) { a.taken = false; if (fight) relocate(a); setAmmo(i, true); } });
    medkits.forEach((a, i) => { if (a.taken && (a.respawn -= dt) <= 0) { a.taken = false; relocate(a); setMed(i, true); } });
  };
}
