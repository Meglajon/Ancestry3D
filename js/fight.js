// Fight back mode for the Retro look. Ancestors leave you alone until you shoot them; then they pull out a
// weapon from their time and walk after you, swinging at you when they're close. Knock them out and they
// go home to their spot, calm again until the next time. You have health (first-aid kits top it up) and a
// score; if your health runs out you go back to the middle and everyone calms down.
import * as THREE from 'three';
import { firstName, displayName } from './ancestry.js';
import { angerQuip, koQuip } from './dialogue.js';

const mat = {};
const M = c => (mat[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const cyl = (r0, r1, len, color, y) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 7), M(color)); g.position.y = y; return g; };
const box = (w, h, d, color, x, y, z) => { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color)); g.position.set(x, y, z); return g; };

// Weapons point away from the hand along -Y, like a continuation of the arm.
function buildWeapon(kind) {
  const g = new THREE.Group();
  if (kind === 'club') { g.add(cyl(0.07, 0.035, 0.6, '#6a4424', -0.3)); }
  else if (kind === 'rollingpin') { g.add(cyl(0.05, 0.05, 0.42, '#d8b07a', -0.3), cyl(0.02, 0.02, 0.12, '#b88a50', -0.06), cyl(0.02, 0.02, 0.12, '#b88a50', -0.56)); }
  else if (kind === 'pitchfork') {
    g.add(cyl(0.02, 0.02, 1.1, '#8a6a44', -0.45));
    g.add(box(0.26, 0.03, 0.03, '#6a6a6a', 0, -1.0, 0));
    for (const x of [-0.11, 0, 0.11]) g.add(box(0.025, 0.24, 0.025, '#8a8a8a', x, -1.12, 0));
  } else if (kind === 'umbrella') {
    g.add(cyl(0.015, 0.015, 0.8, '#1a1a1a', -0.35));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 8), M('#20202a')); c.position.y = -0.55; c.rotation.x = Math.PI; g.add(c);
  } else if (kind === 'pan') {
    g.add(cyl(0.02, 0.02, 0.32, '#3a2a1a', -0.16));
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.04, 14), M('#2a2a2e')); d.position.set(0, -0.48, 0); d.rotation.x = Math.PI / 2; g.add(d);
  } else if (kind === 'broom') {
    g.add(cyl(0.02, 0.02, 1.0, '#9a7a4a', -0.4));
    g.add(box(0.2, 0.26, 0.08, '#c8a860', 0, -1.0, 0));
  } else { g.add(cyl(0.018, 0.018, 0.75, '#3a2a1e', -0.35)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), M('#c8a050'))); }
  return g;
}
function weaponFor(look) {
  const job = look.job || '';
  if (/farm|agric|lab/.test(job)) return 'pitchfork';
  if (look.female) return ['rollingpin', 'pan', 'umbrella', 'broom'][Math.floor((look.height * 1000) % 4)];
  if (look.year > 1880 && look.tier === 'gentry') return 'umbrella';
  return ['club', 'cane', 'club', 'pitchfork'][Math.floor((look.height * 1000) % 4)];
}

export function createFight(ctx) {
  // ctx: { world, message, sfx, impacts, onHurt(dmg, npc), onKO(npc, points), store, key }
  const st = { on: false, health: 100, score: 0, best: +(ctx.store.get(ctx.key) || 0), kos: 0 };
  let quipN = 0;
  const angry = new Set();

  function ensureWeapon(n) {
    if (n.weapon) return n.weapon;
    n.weapon = buildWeapon(weaponFor(n.look));
    n.weapon.position.set(0, -0.58, 0.04);
    n.fig.armR.add(n.weapon);
    return n.weapon;
  }
  function anger(n) {
    if (n.angry) return;
    n.angry = true; angry.add(n);
    n.hp = 18 + Math.min(10, n.person.gen * 1.5);
    n.attackCD = 0.9; n.swing = 0; n.draw = 0;
    n.speed = 3.3 + ((n.phase * 7) % 1) * 0.9;
    ensureWeapon(n).visible = true;
    ctx.message(`${firstName(n.person.indi)}: "${angerQuip(n.person, quipN++)}"`);
  }
  function calm(n) {
    n.angry = false; angry.delete(n);
    if (n.weapon) n.weapon.visible = false;
    n.x = n.person.x; n.z = n.person.z; n.swing = 0;
    n.fig.root.position.set(n.x, 0, n.z);
    n.yaw = n.baseYaw; n.fig.root.rotation.y = n.baseYaw;
    n.fig.armR.rotation.set(0, 0, n.armRest); n.fig.armL.rotation.set(0, 0, -n.armRest);
    n.fig.inner.position.y = 0;
  }
  function knockOut(n) {
    const pts = 100 + 25 * n.person.gen;
    st.score += pts; st.kos++;
    for (let k = 0; k < 6; k++) ctx.impacts?.spawn(new THREE.Vector3(n.x + (Math.random() - 0.5), 0.3 + Math.random() * 1.4, n.z + (Math.random() - 0.5)));
    ctx.message(`${firstName(n.person.indi)}: "${koQuip(n.person, quipN++)}"`);
    ctx.message(`Knocked out ${displayName(n.person.indi)}! +${pts}`);
    ctx.onKO?.(n, pts);
    calm(n);
    saveBest();
  }
  function saveBest() { if (st.score > st.best) { st.best = st.score; ctx.store.set(ctx.key, String(st.best)); } }
  function hit(n, dmg = 1) {
    if (!st.on) return false;
    const first = !n.angry;
    anger(n);
    n.hp -= dmg;
    st.score += 2 * dmg;
    if (n.hp <= 0) knockOut(n);
    return first;
  }
  function blast(x, z, player) {
    if (!st.on) return;
    for (const n of ctx.world.npcs) if (Math.hypot(n.x - x, n.z - z) < 3.5) hit(n, 9);
    if (player && Math.hypot(player.x - x, player.z - z) < 3.2) hurt(16, null);
  }
  function hurt(dmg, n) {
    st.health = Math.max(0, st.health - dmg);
    ctx.onHurt?.(dmg, n, st.health);
    if (st.health <= 0) {
      saveBest();
      ctx.message(`You were knocked out! Score ${st.score.toLocaleString()} (best ${st.best.toLocaleString()}). Back to the start.`);
      saveBest();
      for (const a of [...angry]) calm(a);
      st.health = 100;
      ctx.onDeath?.();
    }
  }
  const tmp = new THREE.Vector3();
  function update(dt, t, player) {
    if (!st.on) return;
    const W = ctx.world;
    for (const n of angry) {
      const dx = player.x - n.x, dz = player.z - n.z, d = Math.hypot(dx, dz) || 0.001;
      const fig = n.fig;
      fig.root.visible = true; fig.setDetail(true);
      n.draw = Math.min(1, n.draw + dt * 4);
      if (n.weapon) n.weapon.scale.setScalar(0.3 + 0.7 * n.draw);
      // walk after you, round anything in the way
      const moving = d > 1.25 && n.swing <= 0;
      if (moving) {
        n.x += dx / d * n.speed * dt; n.z += dz / d * n.speed * dt;
        for (const c of W.colliders) {
          if (c.barrel && !c.barrel.alive) continue;
          const ox = n.x - c.x, oz = n.z - c.z, od = Math.hypot(ox, oz), min = c.r + 0.35;
          if (od < min && od > 0.001) { n.x = c.x + ox / od * min; n.z = c.z + oz / od * min; }
        }
        for (const o of angry) {
          if (o === n) continue;
          const ox = n.x - o.x, oz = n.z - o.z, od = Math.hypot(ox, oz);
          if (od < 0.8 && od > 0.001) { n.x += ox / od * (0.8 - od) * 0.5; n.z += oz / od * (0.8 - od) * 0.5; }
        }
        const r = Math.hypot(n.x, n.z), maxR = W.wallRadius - 0.8;
        if (r > maxR) { n.x *= maxR / r; n.z *= maxR / r; }
      }
      fig.root.position.set(n.x, 0, n.z);
      n.yaw = Math.atan2(dx, dz);
      fig.root.rotation.y = n.yaw;
      fig.head.rotation.set(0, 0, 0);
      n.dist = d;
      // swing when close
      n.attackCD -= dt;
      if (d < 1.5 && n.attackCD <= 0 && n.swing <= 0) { n.swing = 0.55; n.struck = false; n.attackCD = 1.15 + Math.random() * 0.6; }
      if (n.swing > 0) {
        n.swing -= dt;
        const p = 1 - Math.max(0, n.swing) / 0.55;
        fig.armR.rotation.x = p < 0.45 ? -2.0 - (p / 0.45) * 0.9 : -2.9 + ((p - 0.45) / 0.55) * 3.2;
        fig.armR.rotation.z = n.armRest;
        if (p > 0.62 && !n.struck) {
          n.struck = true;
          ctx.sfx?.swish?.();
          if (Math.hypot(player.x - n.x, player.z - n.z) < 1.9) hurt(Math.round(6 + Math.random() * 6), n);
        }
      } else {
        fig.armR.rotation.x = -2.1 + Math.sin(t * 6 + n.phase) * 0.15;
        fig.armR.rotation.z = n.armRest;
      }
      fig.armL.rotation.x = moving ? Math.sin(t * 10 + n.phase) * 0.7 : 0;
      fig.inner.position.y = moving ? Math.abs(Math.sin(t * 10 + n.phase)) * 0.07 : 0;
    }
    // first-aid kits
    for (const m of W.medkits || []) {
      if (m.taken || st.health >= 100 || Math.abs(m.x - player.x) > 0.9 || Math.abs(m.z - player.z) > 0.9) continue;
      W.takeMedkit(m);
      st.health = Math.min(100, st.health + 35);
      ctx.message('Picked up a first-aid kit. +35 health');
      ctx.onHeal?.();
    }
  }
  function setOn(on) {
    st.on = !!on;
    ctx.world.setFight?.(st.on);
    if (!st.on) for (const a of [...angry]) calm(a);
    st.health = 100;
  }
  return {
    state: st, hit, blast, update, setOn, anger,
    get angryCount() { return angry.size; },
    reset() { for (const a of [...angry]) calm(a); st.health = 100; st.score = 0; st.kos = 0; },
  };
}
