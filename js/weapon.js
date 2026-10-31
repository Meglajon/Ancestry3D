// Viewmodel weapons: the minigun (Retro) and a blocky punching arm (Blocks).
// The classic minigun, for the Retro look. Rendered as a first-person viewmodel in its own little
// scene on top of the world. It spins up, chatters, throws casings and kicks up puffs where rounds land.
// Ancestors who get hit flinch and tell you off; nobody is hurt.
import * as THREE from 'three';
import { toTexture } from './textures.js';
import { seededRandom } from './ancestry.js';

function pixelCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  return c;
}

function metalTexture(base, seed) {
  const rnd = seededRandom(seed);
  return toTexture(pixelCanvas(16, 16, x => {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const v = base + (rnd() - 0.5) * 28 + (j % 8 === 0 ? -18 : 0);
      x.fillStyle = `rgb(${v | 0},${v | 0},${(v + 6) | 0})`; x.fillRect(i, j, 1, 1);
    }
  }));
}

function flashTexture() {
  const t = toTexture(pixelCanvas(32, 32, x => {
    const rnd = seededRandom(9);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rnd() * 0.3, len = 9 + rnd() * 7;
      for (let s = 0; s < len; s++) {
        const px = 16 + Math.cos(a) * s, py = 16 + Math.sin(a) * s, heat = 1 - s / len;
        x.fillStyle = heat > 0.65 ? '#fff8c0' : heat > 0.35 ? '#ffc030' : '#f06010';
        x.fillRect(px | 0, py | 0, 2, 2);
      }
    }
    x.fillStyle = '#ffffff'; x.fillRect(13, 13, 6, 6);
  }));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function puffFrames() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const rnd = seededRandom(40 + f);
    const t = toTexture(pixelCanvas(16, 16, x => {
      const r = 2 + f * 1.8;
      for (let k = 0; k < 26; k++) {
        const a = rnd() * 6.28, d = rnd() * r;
        const v = 170 + rnd() * 70 - f * 25;
        x.fillStyle = `rgba(${v | 0},${(v * 0.95) | 0},${(v * 0.85) | 0},${1 - f * 0.2})`;
        x.fillRect((8 + Math.cos(a) * d) | 0, (8 + Math.sin(a) * d) | 0, 2, 2);
      }
      if (f < 2) { x.fillStyle = '#ffe070'; x.fillRect(7, 7, 2, 2); }
    }));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    frames.push(new THREE.SpriteMaterial({ map: t, transparent: true }));
  }
  return frames;
}

export function createMinigun(skinColor) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffe0c0', '#40281c', 1.6));
  const key = new THREE.DirectionalLight('#ffb070', 1.4); key.position.set(1, 2, 1); scene.add(key);
  const flashLight = new THREE.PointLight('#ffb040', 0, 3); flashLight.position.set(0.05, -0.15, -0.9); scene.add(flashLight);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);

  const dark = new THREE.MeshLambertMaterial({ map: metalTexture(70, 1) });
  const steel = new THREE.MeshLambertMaterial({ map: metalTexture(130, 2) });
  const olive = new THREE.MeshLambertMaterial({ color: '#5a5a3a', map: metalTexture(150, 3) });
  const brass = new THREE.MeshLambertMaterial({ color: '#d0a040' });
  const skin = new THREE.MeshLambertMaterial({ color: skinColor || '#e0b090' });
  const glove = new THREE.MeshLambertMaterial({ color: '#3a3a2a' });

  const gun = new THREE.Group();
  // rotating barrel cluster, pointing down -Z
  const barrels = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 6), steel);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * 0.055, Math.sin(a) * 0.055, -0.39);
    barrels.add(b);
  }
  for (const z of [-0.12, -0.46, -0.76]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.035, 8), dark);
    ring.rotation.x = Math.PI / 2; ring.position.z = z;
    barrels.add(ring);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), dark);
  hub.rotation.x = Math.PI / 2; hub.position.z = -0.4;
  barrels.add(hub);
  gun.add(barrels);
  // housing, motor, handles, ammo box and belt
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.22), olive); housing.position.set(0, -0.07, 0.1); gun.add(housing);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), dark); motor.rotation.z = Math.PI / 2; motor.position.set(0.11, -0.08, 0.1); gun.add(motor);
  const carry = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26), dark); carry.position.set(0, 0.11, 0.0); gun.add(carry);
  for (const z of [-0.1, 0.1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.03), dark); post.position.set(0, 0.07, z); gun.add(post); }
  const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.16), olive); ammoBox.position.set(-0.17, -0.2, 0.12); gun.add(ammoBox);
  const belt = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), brass);
    r.position.set(-0.13 + i * 0.022, -0.05 + Math.sin(i * 0.6) * 0.02, 0.12);
    belt.add(r);
  }
  gun.add(belt);
  // hands gripping the side handles
  const handR = new THREE.Group();
  handR.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), dark));
  const fistR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), skin); fistR.position.y = -0.02; handR.add(fistR);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), glove); cuff.position.set(0, -0.08, 0.02); handR.add(cuff);
  handR.position.set(0.13, -0.15, 0.16);
  gun.add(handR);
  const handL = handR.clone(); handL.position.set(-0.08, -0.15, -0.1); handL.rotation.z = 0.5; gun.add(handL);

  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), transparent: true, depthTest: false }));
  flash.scale.set(0.26, 0.26, 1); flash.position.set(0, 0, -0.86); flash.visible = false;
  gun.add(flash);

  gun.position.set(0.13, -0.26, -0.56);
  gun.rotation.set(0.12, 0.06, 0);
  scene.add(gun);

  // ejected casings (in viewmodel space)
  const casings = [];
  const casingGeo = new THREE.BoxGeometry(0.008, 0.008, 0.022);
  for (let i = 0; i < 24; i++) {
    const c = new THREE.Mesh(casingGeo, brass); c.visible = false; scene.add(c);
    casings.push({ mesh: c, v: new THREE.Vector3(), life: 0 });
  }
  let casingIdx = 0;

  const state = { spin: 0, angle: 0, cooldown: 0, kick: 0, ammo: 400, maxAmmo: 400, swayT: 0, firedThisFrame: false };

  /** dt, trigger held?, player speed → returns number of rounds fired this frame */
  function update(dt, trigger, speed) {
    state.spin += ((trigger && state.ammo > 0 ? 1 : 0) - state.spin) * Math.min(1, dt * (trigger ? 3.2 : 1.4));
    state.angle += state.spin * dt * 32;
    barrels.rotation.z = state.angle;
    let shots = 0;
    state.cooldown -= dt;
    if (trigger && state.spin > 0.7 && state.ammo > 0) {
      while (state.cooldown <= 0 && state.ammo > 0) { state.cooldown += 1 / 18; shots++; state.ammo--; }
    } else {
      state.cooldown = Math.max(0, state.cooldown);
      if (!trigger) state.ammo = Math.min(state.maxAmmo, state.ammo + dt * 12);
    }
    if (shots) {
      state.kick = 1;
      flash.visible = true;
      flash.material.rotation = Math.random() * 6.28;
      flash.scale.setScalar(0.18 + Math.random() * 0.14);
      flashLight.intensity = 6;
      for (let s = 0; s < shots; s++) {
        const c = casings[casingIdx++ % casings.length];
        c.mesh.visible = true; c.life = 0.7;
        c.mesh.position.set(gun.position.x + 0.12, gun.position.y + 0.02, gun.position.z + 0.05);
        c.v.set(0.9 + Math.random() * 0.6, 0.9 + Math.random() * 0.6, 0.2 + Math.random() * 0.3);
      }
    } else {
      flash.visible = false;
      flashLight.intensity *= 0.5;
    }
    state.kick *= Math.pow(0.001, dt);
    state.swayT += dt * Math.min(1, speed / 4) * 7;
    const sway = Math.min(1, speed / 4);
    gun.position.set(0.13 + Math.sin(state.swayT) * 0.012 * sway + (Math.random() - 0.5) * 0.006 * state.kick,
      -0.26 - Math.abs(Math.cos(state.swayT)) * 0.012 * sway + (Math.random() - 0.5) * 0.006 * state.kick,
      -0.56 + state.kick * 0.025);
    for (const c of casings) {
      if (!c.mesh.visible) continue;
      c.life -= dt;
      c.v.y -= 6 * dt;
      c.mesh.position.addScaledVector(c.v, dt);
      c.mesh.rotation.x += dt * 20; c.mesh.rotation.y += dt * 13;
      if (c.life <= 0) c.mesh.visible = false;
    }
    return shots;
  }

  return { scene, camera, gun, update, state, pellets: 1, spread: 0.04, range: 120, kind: 'minigun' };
}

/** World-space impact puffs (dust and sparks, no gore). */
export function createImpacts(worldScene) {
  const frames = puffFrames();
  const pool = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(frames[0]); s.visible = false; s.scale.setScalar(0.45);
    worldScene.add(s);
    pool.push({ s, t: 0 });
  }
  let idx = 0;
  return {
    spawn(pos) {
      const p = pool[idx++ % pool.length];
      p.s.position.copy(pos); p.t = 0; p.s.visible = true; p.s.material = frames[0];
    },
    update(dt) {
      for (const p of pool) {
        if (!p.s.visible) continue;
        p.t += dt;
        const f = Math.floor(p.t / 0.07);
        if (f >= frames.length) { p.s.visible = false; continue; }
        p.s.material = frames[f];
        p.s.position.y += dt * 0.4;
      }
    },
  };
}

/**
 * Trace one round from `origin` along `dir` (unit Vector3). NPCs are treated as upright cylinders.
 * Returns { npc?, point } for the first thing hit, or null if it flies off into the sky.
 */
export function traceShot(origin, dir, npcs, wallRadius, range = 120) {
  let best = null, bestT = range;
  for (const n of npcs) {
    if (!n.fig.root.visible || n.dist > 70) continue;
    const ox = origin.x - n.person.x, oz = origin.z - n.person.z;
    const a = dir.x * dir.x + dir.z * dir.z;
    if (a < 1e-6) continue;
    const b = 2 * (ox * dir.x + oz * dir.z), c = ox * ox + oz * oz - 0.42 * 0.42;
    const disc = b * b - 4 * a * c;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t <= 0.05 || t >= bestT) continue;
    const y = origin.y + dir.y * t;
    if (y < 0 || y > 1.85) continue;
    bestT = t; best = n;
  }
  // floor
  if (dir.y < -1e-4) {
    const t = -origin.y / dir.y;
    if (t > 0 && t < bestT) { bestT = t; best = null; }
  }
  // outer wall (circle)
  {
    const a = dir.x * dir.x + dir.z * dir.z, b = 2 * (origin.x * dir.x + origin.z * dir.z), c = origin.x * origin.x + origin.z * origin.z - wallRadius * wallRadius;
    const disc = b * b - 4 * a * c;
    if (a > 1e-6 && disc >= 0) {
      const t = (-b + Math.sqrt(disc)) / (2 * a);
      const y = origin.y + dir.y * t;
      if (t > 0 && t < bestT && y < 6) { bestT = t; best = null; }
    }
  }
  if (bestT >= range) return null;
  return { npc: best, point: origin.clone().addScaledVector(dir, bestT) };
}

// ---------------- Blocky arm (Blocks look) ----------------
export function createArm(skinColor, sleeveColor) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a8a5a', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 1.0); key.position.set(1, 2, 1); scene.add(key);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
  const arm = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.34), new THREE.MeshLambertMaterial({ color: sleeveColor || '#3a6ac8' }));
  sleeve.position.z = 0.12; arm.add(sleeve);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.155, 0.26), new THREE.MeshLambertMaterial({ color: skinColor || '#e0b090' }));
  hand.position.z = -0.17; arm.add(hand);
  arm.position.set(0.28, -0.26, -0.42); arm.rotation.set(0.25, -0.35, 0.15);
  scene.add(arm);
  const state = { swing: 0, cooldown: 0, swayT: 0, ammo: null };
  function update(dt, trigger, speed) {
    state.cooldown -= dt;
    let shots = 0;
    if (trigger && state.cooldown <= 0) { state.swing = 1; state.cooldown = 0.35; }
    if (state.swing > 0) { const before = state.swing; state.swing = Math.max(0, state.swing - dt * 3.5); if (before > 0.6 && state.swing <= 0.6) shots = 1; }
    state.swayT += dt * Math.min(1, speed / 4) * 7;
    const sway = Math.min(1, speed / 4);
    const k = Math.sin(state.swing * Math.PI);
    arm.position.set(0.28 - k * 0.12 + Math.sin(state.swayT) * 0.02 * sway, -0.26 + k * 0.08 - Math.abs(Math.cos(state.swayT)) * 0.02 * sway, -0.42 - k * 0.12);
    arm.rotation.set(0.25 + k * 0.6, -0.35 + k * 0.3, 0.15);
    return shots;
  }
  return { scene, camera, gun: arm, update, state, pellets: 1, spread: 0.02, range: 3, kind: 'arm', melee: true };
}
