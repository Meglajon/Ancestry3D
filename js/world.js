// The courtyard. Generations are concentric rings on the ground; lines of descent run along the floor
// (blue = through a father, red = through a mother).
// Two 3D looks share one layout (the Fluffy look is drawn in 2D by fluffy.js):
//  - 'doom':   flagstones, brick wall, torches and a burning sky (Retro)
//  - 'island': a grassy island with sand paths, trees, flowers, the sea all round, and floating brick
//              platforms and coins to jump for
import * as THREE from 'three';
import { floorTexture, brickTexture, techTexture, skyTexture, flameFrames, labelTexture, toTexture, npcAtlas,
  grassTexture, sandTexture, skyGradientTexture, toonRamp } from './textures.js';
import { buildFigure, lookFor, npcMaterial, buildIslandFigure, islandMaterial } from './npc.js';
import { relationship, birthYear, seededRandom } from './ancestry.js';
import { platformsAndCoins } from './envs.js';
import { bandGeometry, placeGuideLabels, openSpots } from './guides.js';
import { retroProps } from './props.js';

const THEMES = {
  doom: {
    paternal: '#3a78ff', maternal: '#ff3a2a', gold: '#ffd030', marriage: '#ffd030',
    fog: '#200a06', background: '#1a0806', fogFar: 60,
  },
  island: {
    paternal: '#6aa8ff', maternal: '#ff8fb4', gold: '#ffc94a', marriage: '#ffb84a',
    fog: '#cfeeff', background: '#9fd8fa', fogFar: 75,
  },
};

function stripGeometry(segments, width, y) {
  // segments: [{a:{x,z}, b:{x,z}, color}]
  const pos = [], col = [];
  for (const s of segments) {
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * width / 2, nz = (dx / len) * width / 2;
    const p = [
      [s.a.x + nx, y, s.a.z + nz], [s.a.x - nx, y, s.a.z - nz], [s.b.x + nx, y, s.b.z + nz],
      [s.a.x - nx, y, s.a.z - nz], [s.b.x - nx, y, s.b.z - nz], [s.b.x + nx, y, s.b.z + nz],
    ];
    for (const v of p) { pos.push(...v); col.push(s.color.r, s.color.g, s.color.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const GEN_COLORS = ['#ffd030', '#30d0ff', '#60ff60', '#ff60ff', '#ff9030', '#a0a0ff', '#ff5050', '#50ffc0', '#ffff70', '#c080ff', '#80ff40', '#ff80a0', '#40c0ff'];
const GEN_NAMES = g => g === 0 ? 'YOU' : g === 1 ? 'PARENTS' : g === 2 ? 'GRANDPARENTS' : g === 3 ? 'GREAT-GRANDPARENTS' : g === 4 ? '2X GREAT-GRANDPARENTS' : `${g - 2}X GREAT-GRANDPARENTS`;

// ---------------- Doom environment ----------------
function doomEnvironment(scene, tree, world) {
  const R = tree.worldRadius;
  scene.add(new THREE.HemisphereLight('#ffd8b0', '#3a2018', 1.4));
  const sun = new THREE.DirectionalLight('#ffb070', 1.6); sun.position.set(30, 50, 20); scene.add(sun);
  scene.add(new THREE.AmbientLight('#604030', 0.6));

  const skyR = Math.max(400, R + 140);
  world.skyRadius = skyR;
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(skyR, skyR, 260, 48, 1, true),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.material.map.repeat.set(3, 1);
  sky.position.y = 60;
  sky.renderOrder = -1;
  scene.add(sky);
  const skyCap = new THREE.Mesh(new THREE.CircleGeometry(skyR, 48), new THREE.MeshBasicMaterial({ color: '#1a0606', fog: false, side: THREE.BackSide }));
  skyCap.rotation.x = -Math.PI / 2; skyCap.position.y = 189;
  scene.add(skyCap);

  const floorTex = toTexture(floorTexture());
  floorTex.repeat.set(R / 2, R / 2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 2, 96), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const outer = new THREE.Mesh(new THREE.RingGeometry(R + 1.5, skyR + 20, 48, 1), new THREE.MeshBasicMaterial({ color: '#160c08' }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01;
  scene.add(outer);

  const ringGroup = new THREE.Group();
  for (const gd of tree.guides) {
    const g = gd.g;
    const color = new THREE.Color(GEN_COLORS[g % GEN_COLORS.length]);
    const ring = new THREE.Mesh(bandGeometry(gd, 1.35, 1.6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
    ring.position.y = 0.012;
    ringGroup.add(ring);
    placeGuideLabels(ringGroup, gd, labelTexture(`GEN ${g} · ${GEN_NAMES(g)}`, GEN_COLORS[g % GEN_COLORS.length]), [8, 0.5], 2.4);
  }
  scene.add(ringGroup);

  const wallTex = toTexture(brickTexture());
  const circumference = Math.PI * 2 * (R + 1.5);
  wallTex.repeat.set(Math.round(circumference / 4), 1.5);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.5, R + 1.5, 6, Math.max(32, Math.round(circumference / 4)), 1, true),
    new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.BackSide }));
  wall.position.y = 3;
  scene.add(wall);
  const techTex = toTexture(techTexture());
  techTex.repeat.set(1, 1.5);
  const pillarCount = Math.max(8, Math.round(circumference / 14));
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 6.4, 1.2), new THREE.MeshLambertMaterial({ map: techTex }), pillarCount);
  const flameMat = flameFrames().map(t => new THREE.SpriteMaterial({ map: t, fog: false }));
  const m = new THREE.Matrix4();
  for (let i = 0; i < pillarCount; i++) {
    const a = (i / pillarCount) * Math.PI * 2;
    m.makeRotationY(-a); m.setPosition(Math.cos(a) * (R + 1), 3.2, Math.sin(a) * (R + 1));
    pillars.setMatrixAt(i, m);
    const fl = new THREE.Sprite(flameMat[i % 4]);
    fl.scale.set(0.7, 1.4, 1);
    fl.position.set(Math.cos(a) * (R - 0.1), 3.4, Math.sin(a) * (R - 0.1));
    fl.userData.phase = i;
    scene.add(fl);
    world.torches.push(fl);
  }
  scene.add(pillars);

  // Spawn pad where you start
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.08, 8), new THREE.MeshLambertMaterial({ map: techTex, color: '#b0a090' }));
  dais.position.set(tree.hub.x, 0.04, tree.hub.z);
  scene.add(dais);
  world.wallRadius = R + 1.5;

  const propsUpdate = retroProps(scene, tree, world, flameMat);
  let lastT = null;
  world.envUpdate = t => {
    const dt = lastT == null ? 0 : Math.min(0.1, t - lastT); lastT = t;
    propsUpdate(t, dt);
    const f = Math.floor(t * 8);
    for (const fl of world.torches) fl.material = flameMat[(((f + fl.userData.phase) % 4) + 4) % 4];
  };
}

// ---------------- Island environment ----------------
function islandEnvironment(scene, tree, world) {
  const R = tree.worldRadius;
  const rnd = seededRandom(7 + tree.people.size);
  scene.add(new THREE.HemisphereLight('#e8f6ff', '#6fbf55', 1.25));
  const sun = new THREE.DirectionalLight('#fff2d6', 2.1); sun.position.set(-30, 60, 25); scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const ramp = toonRamp();
  world.ramp = ramp;
  const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: ramp });

  const skyR = Math.max(420, R + 160);
  world.skyRadius = skyR;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(skyR, 32, 16), new THREE.MeshBasicMaterial({ map: skyGradientTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);
  // Fluffy clouds
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const a = rnd() * Math.PI * 2, d = skyR * (0.55 + rnd() * 0.3), y = 60 + rnd() * 80;
    for (let k = 0; k < 5; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(8 + rnd() * 8, 10, 8), cloudMat);
      puff.position.set((k - 2) * 9 + rnd() * 4, rnd() * 5, rnd() * 6);
      puff.scale.y = 0.6;
      g.add(puff);
    }
    g.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
    g.lookAt(0, y, 0);
    scene.add(g);
  }

  // Sea, beach, island
  const sea = new THREE.Mesh(new THREE.CircleGeometry(skyR, 48), new THREE.MeshBasicMaterial({ color: '#4cc3e6' }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.6;
  scene.add(sea);
  const shallows = new THREE.Mesh(new THREE.RingGeometry(R + 6, R + 16, 96, 1), new THREE.MeshBasicMaterial({ color: '#8fe3f0', transparent: true, opacity: 0.8 }));
  shallows.rotation.x = -Math.PI / 2; shallows.position.y = -0.55;
  scene.add(shallows);
  world.foam = new THREE.Mesh(new THREE.RingGeometry(R + 5.6, R + 6.3, 96, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
  world.foam.rotation.x = -Math.PI / 2; world.foam.position.y = -0.5;
  scene.add(world.foam);
  const sandTex = sandTexture(); sandTex.repeat.set(R / 3, R / 3);
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(R + 2, R + 7, 0.62, 96, 1), new THREE.MeshLambertMaterial({ map: sandTex }));
  beach.position.y = -0.31;
  scene.add(beach);
  const grassTex = grassTexture(); grassTex.repeat.set(R / 4, R / 4);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(R + 1.6, 96), new THREE.MeshLambertMaterial({ map: grassTex }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = 0.005;
  scene.add(grass);

  // Generation rings as sandy paths with painted labels
  const ringGroup = new THREE.Group();
  const pathMat = new THREE.MeshLambertMaterial({ map: sandTexture() });
  for (const gd of tree.guides) {
    const g = gd.g;
    const ring = new THREE.Mesh(bandGeometry(gd, 1.0, 1.9, 2), pathMat);
    ring.position.y = 0.012;
    ringGroup.add(ring);
    const name = GEN_NAMES(g).toLowerCase().replace(/(^|\s|-)\w/g, c => c.toUpperCase()).replace('X ', '× ');
    placeGuideLabels(ringGroup, gd, labelTexture(`Gen ${g} · ${name}`, '#7a5230', 512, '700 17px "Fredoka", "Nunito", sans-serif', null, true), [8, 0.5], 1.45);
  }
  scene.add(ringGroup);

  // Central plaza
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), toon('#e8dcc4'));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(tree.hub.x, 0.02, tree.hub.z);
  scene.add(plaza);
  const plazaRim = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 40, 1), toon('#c9b48e'));
  plazaRim.rotation.x = -Math.PI / 2; plazaRim.position.set(tree.hub.x, 0.021, tree.hub.z);
  scene.add(plazaRim);

  // Trees around the shore and in gaps between people
  const spots = [];
  const ok = (x, z, clear) => {
    if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < 4) return false;
    for (const p of tree.people.values()) if (Math.hypot(p.x - x, p.z - z) < clear) return false;
    for (const s of spots) if (Math.hypot(s[0] - x, s[1] - z) < 3.2) return false;
    return true;
  };
  const shore = Math.max(16, Math.round((Math.PI * 2 * (R - 2)) / 6));
  for (let i = 0; i < shore; i++) {
    const a = (i / shore) * Math.PI * 2 + rnd() * 0.05, r = R - 2 - rnd() * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ok(x, z, 3)) spots.push([x, z, 0.85 + rnd() * 0.4, rnd() < 0.25 ? 'palm' : 'round']);
  }
  for (let i = 0; i < Math.min(120, R * 1.2); i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * (R - 10);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ok(x, z, 4.5)) spots.push([x, z, 0.75 + rnd() * 0.35, 'round']);
  }
  world.trees = spots;
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 7); trunkGeo.translate(0, 0.8, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.25, 1); crownGeo.scale(1, 0.9, 1); crownGeo.translate(0, 2.4, 0);
  const fruitGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, toon('#8a5a3a'), spots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: ramp }), spots.length);
  const fruits = new THREE.InstancedMesh(fruitGeo, toon('#ffffff'), spots.length * 3);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const fruitCols = ['#ff5a4a', '#ffb43a', '#ff7aa8', '#c8e04a'];
  spots.forEach(([x, z, s, kind], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    sc.set(s, s * (kind === 'palm' ? 1.35 : 1), s); pos.set(x, 0, z);
    mtx.compose(pos, q, sc);
    trunks.setMatrixAt(i, mtx);
    crowns.setMatrixAt(i, mtx);
    crowns.setColorAt(i, new THREE.Color(kind === 'palm' ? '#4fb84a' : ['#3fa64a', '#5cbf4f', '#349a52'][i % 3]));
    const fc = new THREE.Color(fruitCols[i % fruitCols.length]);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      mtx.makeTranslation(x + Math.cos(a) * 1.05 * s, (2.2 + (k % 2) * 0.4) * s, z + Math.sin(a) * 1.05 * s);
      fruits.setMatrixAt(i * 3 + k, mtx);
      fruits.setColorAt(i * 3 + k, fc);
    }
  });
  scene.add(trunks, crowns, fruits);

  // Floating brick platforms and coins (the jump-and-collect part of the island)
  const coinsUpdate = platformsAndCoins(scene, tree, world, spots.map(([x, z]) => [x, z, 1.6]));
  const onPlatform = (x, z) => world.platforms.some(p => Math.abs(p.x - x) < p.hw + 0.6 && Math.abs(p.z - z) < p.hw + 0.6);

  // Flowers: tiny instanced blooms scattered over the grass
  const nFlowers = Math.min(900, Math.round(R * R * 0.12));
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), nFlowers);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4).translate(0, 0.11, 0), new THREE.MeshLambertMaterial({ color: '#3a8a3a' }), nFlowers);
  const flowerCols = ['#ff6f8f', '#ffd84a', '#ffffff', '#b98aff', '#ff8a4a', '#6ad0ff'];
  let n = 0;
  for (let i = 0; i < nFlowers * 3 && n < nFlowers; i++) {
    const a = rnd() * Math.PI * 2, r = 3 + Math.sqrt(rnd()) * (R - 3);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    let clear = true;
    for (const p of tree.people.values()) if (Math.abs(p.x - x) < 1 && Math.abs(p.z - z) < 1) { clear = false; break; }
    if (!clear || onPlatform(x, z)) continue;
    mtx.makeTranslation(x, 0.24, z); bloom.setMatrixAt(n, mtx); bloom.setColorAt(n, new THREE.Color(flowerCols[n % flowerCols.length]));
    mtx.makeTranslation(x, 0, z); stems.setMatrixAt(n, mtx);
    n++;
  }
  bloom.count = stems.count = n;
  scene.add(bloom, stems);
  world.wallRadius = R + 0.5;
  world.colliders.push(...spots.map(([x, z, s]) => ({ x, z, r: 0.45 * s + 0.1 })));

  world.envUpdate = t => {
    world.foam.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.25;
    world.foam.scale.setScalar(1 + Math.sin(t * 1.3) * 0.004);
    coinsUpdate(t);
  };
}

export function buildWorld(scene, tree, opts = {}) {
  const theme = THEMES[opts.theme] ? opts.theme : 'doom';
  const T = THEMES[theme];
  const world = { npcs: [], byId: new Map(), torches: [], radius: tree.worldRadius, theme, colliders: [], platforms: [] };
  scene.background = new THREE.Color(T.background);
  scene.fog = new THREE.Fog(T.fog, 6, T.fogFar);
  if (theme === 'island') islandEnvironment(scene, tree, world);
  else doomEnvironment(scene, tree, world);
  const PATERNAL = new THREE.Color(T.paternal), MATERNAL = new THREE.Color(T.maternal), GOLD = new THREE.Color(T.gold);

  // Lines of descent
  const segs = tree.edges.map(e => ({ a: tree.people.get(e.child), b: tree.people.get(e.parent), color: e.side === 'paternal' ? PATERNAL : MATERNAL }));
  const lineMat = theme === 'doom' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true });
  scene.add(new THREE.Mesh(stripGeometry(segs, theme === 'island' ? 0.32 : 0.22, 0.025), lineMat));
  // Couples standing together get a little link between them
  const links = [];
  for (const p of tree.people.values()) {
    if (p.spouseInUnit && p.id < p.spouseInUnit) links.push({ a: p, b: tree.people.get(p.spouseInUnit), color: new THREE.Color(T.marriage) });
  }
  if (links.length) scene.add(new THREE.Mesh(stripGeometry(links, 0.5, 0.03), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));
  world.lineage = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: GOLD }));
  scene.add(world.lineage);

  const people = [...tree.people.values()].filter(p => p.gen > 0);
  const discs = new THREE.InstancedMesh(new THREE.CircleGeometry(theme === 'island' ? 0.55 : 0.75, theme === 'island' ? 16 : 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: theme === 'island' ? 0.22 : 0.5, depthWrite: false, color: '#ffffff' }), Math.max(1, people.length));
  const mm = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

  // NPCs (the root is the player, so they are not placed)
  let material;
  if (theme === 'island') material = islandMaterial(world.ramp || (world.ramp = toonRamp()));
  else {
    const atlas = toTexture(npcAtlas());
    atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
    material = npcMaterial(atlas);
  }
  const root = tree.people.get(tree.rootId);
  const rootYear = birthYear(root.indi) ?? 1990;
  world.rootLook = lookFor(root, rootYear);
  world.material = material;
  people.forEach((person, i) => {
    const look = lookFor(person, rootYear - person.gen * 29);
    const fig = theme === 'island' ? buildIslandFigure(look, material) : buildFigure(look, material);
    fig.root.position.set(person.x, 0, person.z);
    // Face inward, toward the child they descend through.
    const target = person.primaryChild ? tree.people.get(person.primaryChild) : { x: 0, z: 0 };
    fig.root.rotation.y = Math.atan2(target.x - person.x, target.z - person.z);
    scene.add(fig.root);
    const npc = { person, x: person.x, z: person.z, look, fig, baseYaw: fig.root.rotation.y, yaw: fig.root.rotation.y, phase: (i * 1.37) % 6.28,
      waved: false, wave: 0, talking: false, met: false, flinch: 0, armRest: theme === 'island' ? 0.25 : 0.06, look };
    world.npcs.push(npc);
    world.byId.set(person.id, npc);
    const col = theme === 'island' ? new THREE.Color('#2a5a2a') : (person.ahnen % 2 === 0 ? PATERNAL : MATERNAL);
    mm.copy(rot); mm.setPosition(person.x, 0.03, person.z);
    discs.setMatrixAt(i, mm);
    discs.setColorAt(i, col);
  });
  if (theme === 'island') discs.material.color.set('#000000');
  scene.add(discs);

  // Waypoint beacon
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35, blending: theme === 'island' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beacon.position.y = 20;
  beacon.visible = false;
  scene.add(beacon);
  world.beacon = beacon;

  world.setLineage = (id) => {
    const segs2 = [];
    let p = tree.people.get(id);
    while (p && p.primaryChild) {
      const c = tree.people.get(p.primaryChild);
      segs2.push({ a: c, b: p, color: GOLD });
      p = c;
    }
    world.lineage.geometry.dispose();
    world.lineage.geometry = stripGeometry(segs2, 0.42, 0.035);
  };

  world.update = (t) => {
    world.envUpdate?.(t);
    beacon.material.opacity = (theme === 'island' ? 0.3 : 0.25) + Math.sin(t * 4) * 0.1;
  };
  return world;
}

export { GEN_NAMES, GEN_COLORS, relationship, THEMES };
