// Generation guides: the paths/lines on the ground that mark each generation, for any layout.
// A guide is a ring or arc round the root (fan layouts) or a straight row (tree layout).
// Offsets (d) are measured toward the root: 0 is the line people stand on, 1.5 is 1.5 m nearer the centre.
import * as THREE from 'three';

/** Flat band between offsets d0 and d1 (toward the root), lying on y=0 in world coordinates. */
export function bandGeometry(guide, d0, d1, uvSize = 0) {
  let g;
  if (guide.kind === 'row') {
    g = new THREE.PlaneGeometry(guide.x1 - guide.x0, d1 - d0, Math.max(1, Math.round((guide.x1 - guide.x0) / 4)), 1);
    g.rotateX(-Math.PI / 2);
    g.translate((guide.x0 + guide.x1) / 2, 0, guide.z + (d0 + d1) / 2);
  } else {
    const segs = Math.max(24, Math.round(guide.r * guide.tl * 0.8));
    g = new THREE.RingGeometry(Math.max(0.01, guide.r - d1), Math.max(0.02, guide.r - d0), segs, 1, -(guide.t0 + guide.tl), guide.tl);
    g.rotateX(-Math.PI / 2);
    g.translate(guide.cx, 0, guide.cz);
  }
  if (uvSize) {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / uvSize, p.getZ(i) / uvSize);
  }
  return g;
}

/** Evenly spaced points along a guide at offset d, with a heading for floor text readable walking outward. */
export function spotsAlong(guide, d, spacing) {
  const out = [];
  if (guide.kind === 'row') {
    const len = guide.x1 - guide.x0, n = Math.max(1, Math.floor(len / spacing));
    for (let i = 0; i < n; i++) out.push({ x: guide.x0 + (i + 0.5) * len / n, z: guide.z + d, rotY: 0, a: -Math.PI / 2 });
  } else {
    const r = guide.r - d, arc = r * guide.tl, n = Math.max(1, Math.floor(arc / spacing));
    const full = guide.tl > Math.PI * 1.99;
    for (let i = 0; i < n; i++) {
      const a = guide.t0 + guide.tl * (full ? i / n : (i + 0.5) / n);
      out.push({ x: guide.cx + Math.cos(a) * r, z: guide.cz + Math.sin(a) * r, rotY: -a - Math.PI / 2, a });
    }
  }
  return out;
}

/** Floor labels along a guide: a handful of text planes. */
export function placeGuideLabels(group, guide, tex, size = [8, 0.5], d = 1.45, y = 0.03) {
  const len = guide.kind === 'row' ? guide.x1 - guide.x0 : guide.r * guide.tl;
  const count = Math.max(guide.kind === 'row' ? 2 : 3, Math.round(len / (guide.kind === 'row' ? 22 : 75)));
  const spots = spotsAlong(guide, d, len / count);
  for (const s of spots) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plane.rotation.order = 'YXZ';
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.y = s.rotY;
    plane.position.set(s.x, y, s.z);
    group.add(plane);
  }
}

/** Distance from a point to a segment in the ground plane. */
export function segDist(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
  let t = ((px - a.x) * dx + (pz - a.z) * dz) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
}

/**
 * Pick open spots in the courtyard, clear of the root, people, family lines and each other.
 * Returns [{x, z}]; `used` (shared between callers) is extended so later props avoid earlier ones.
 */
export function openSpots(tree, rnd, { count, clearPeople = 3, clearLines = 1.2, clearOther = 3, used = [], margin = 3, hubClear = 5 }) {
  const out = [];
  const segs = tree.edges.map(e => [tree.people.get(e.child), tree.people.get(e.parent)]);
  const R = tree.worldRadius - margin;
  for (let i = 0; i < count * 30 && out.length < count; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - tree.hub.x, z - tree.hub.z) < hubClear) continue;
    let ok = true;
    for (const p of tree.people.values()) if (Math.abs(p.x - x) < clearPeople && Math.hypot(p.x - x, p.z - z) < clearPeople) { ok = false; break; }
    if (ok && clearLines > 0) for (const [p, q] of segs) if (segDist(x, z, p, q) < clearLines) { ok = false; break; }
    if (ok) for (const u of used) if (Math.hypot(u.x - x, u.z - z) < clearOther + (u.r || 0)) { ok = false; break; }
    if (!ok) continue;
    const spot = { x, z };
    out.push(spot);
    used.push(spot);
  }
  return out;
}
