// Figure builders. Both read the outfit description from outfits.js.
//  - buildFigure: blocky people for the Retro look, and cube-headed voxel people for Blocks.
//  - buildIslandFigure: round, big-headed people for the Island and Platform looks.
// Each NPC is 4 meshes near (body, head, two arms) and 1 merged mesh far away, all sharing one material
// with colours baked into vertex colours, so hundreds can stand around on a phone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ATLAS } from './textures.js';
import { lookFor } from './outfits.js';
export { lookFor };

const shade = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();
const WHITE = '#f0ece0';

function region(r) { return [r[0] / 64, 1 - (r[1] + r[3]) / 64, r[2] / 64, r[3] / 64]; }

function box(w, h, d, x, y, z, color, faceRegion = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  paint(g, color, faceRegion);
  return g;
}
// Remap UVs into the grain region (or a face region on the +Z side) and bake a vertex colour.
function paint(g, color, faceRegion) {
  const uv = g.attributes.uv;
  const grain = region(ATLAS.grain);
  const n = uv.count;
  const isBox = g.type === 'BoxGeometry';
  for (let i = 0; i < n; i++) {
    let r = grain;
    if (isBox && faceRegion && Math.floor(i / 4) === 4) r = region(faceRegion);
    uv.setXY(i, r[0] + uv.getX(i) * r[2], r[1] + uv.getY(i) * r[3]);
  }
  const col = new THREE.Color(color);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
// A tapered 4-sided skirt (frustum), aligned to look boxy. sx/sz stretch it (panniers are wide, not deep).
function frustum(topW, botW, y0, y1, color, sx = 1, sz = 0.75) {
  const h = y1 - y0;
  const g = new THREE.CylinderGeometry(topW, botW, h, 4, 1, false);
  g.rotateY(Math.PI / 4);
  g.scale(sx, 1, sz);
  g.translate(0, y0 + h / 2, 0);
  paint(g, color);
  return g;
}
function merge(list) {
  return mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)), false);
}

let sharedMaterial = null;
export function npcMaterial(atlasTexture) {
  if (!sharedMaterial) sharedMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, vertexColors: true });
  return sharedMaterial;
}

// Skirt shapes: [top half-width, bottom half-width, hem height, x stretch]
const SKIRTS = {
  full: [0.24, 0.42, 0.05, 1], farthingale: [0.46, 0.5, 0.05, 1], panniers: [0.3, 0.42, 0.05, 1.55], bell: [0.24, 0.5, 0.04, 1],
  crinoline: [0.26, 0.64, 0.04, 1], bustle: [0.24, 0.36, 0.04, 1], empire: [0.2, 0.3, 0.05, 1], aline: [0.22, 0.38, 0.05, 1],
  calf: [0.22, 0.3, 0.3, 1], knee: [0.22, 0.28, 0.45, 1], fifties: [0.22, 0.44, 0.3, 1], mini: [0.22, 0.27, 0.62, 1], maxi: [0.22, 0.33, 0.05, 1],
  straight: [0.22, 0.3, 0.05, 1],
};

/** Blocky figure. opts.voxel = cube heads and square limbs for the Blocks look. */
export function buildFigure(look, material, opts = {}) {
  const V = !!opts.voxel;
  const parts = [];
  const legW = V ? 0.2 : 0.16, armW = V ? 0.18 : 0.13;
  const torsoW = V ? 0.46 : 0.48, torsoD = V ? 0.24 : 0.27;
  const sk = look.skirt ? SKIRTS[look.skirt.kind] || SKIRTS.full : null;
  const hemY = sk ? (look.skirt.kind === 'empire' ? 0.05 : sk[2]) : 0;
  const waistY = look.skirt?.kind === 'empire' ? 1.24 : look.female ? 0.95 : 0.88;

  // ---- feet ----
  const feet = (x) => {
    const s = look.shoes;
    if (s === 'clogs') { parts.push(box(0.16, 0.05, 0.26, x, 0.025, 0.03, '#a87a4a')); parts.push(box(0.15, 0.08, 0.22, x, 0.09, 0.02, '#1e1814')); }
    else if (s === 'boots') { parts.push(box(0.15, 0.09, 0.24, x, 0.045, 0.03, '#1e1814')); parts.push(box(0.15, 0.12, 0.17, x, 0.15, 0, '#1e1814')); }
    else if (s === 'buckle') { parts.push(box(0.14, 0.08, 0.23, x, 0.04, 0.03, '#1a1410')); parts.push(box(0.07, 0.04, 0.01, x, 0.07, 0.145, '#c8c8d0')); }
    else if (s === 'trainers') { parts.push(box(0.16, 0.04, 0.26, x, 0.02, 0.03, '#d8d8d8')); parts.push(box(0.15, 0.07, 0.24, x, 0.075, 0.03, '#f4f4f4')); }
    else if (s === 'heels') { parts.push(box(0.11, 0.07, 0.2, x, 0.06, 0.04, '#1a1410')); parts.push(box(0.04, 0.06, 0.04, x, 0.03, -0.05, '#1a1410')); }
    else if (s === 'bare') parts.push(box(0.12, 0.07, 0.2, x, 0.035, 0.03, look.skinShade));
    else parts.push(box(0.14, 0.08, 0.23, x, 0.04, 0.03, '#1a1410'));
  };
  feet(-0.1); feet(0.1);

  // ---- legs ----
  if (look.skirt) {
    if (hemY > 0.1) {
      const stock = look.year >= 1915 ? '#d0a888' : '#2a2420';
      for (const x of [-0.09, 0.09]) parts.push(box(legW * 0.75, hemY, legW * 0.8, x, hemY / 2 + 0.04, 0, look.shoes === 'bare' ? look.skin : stock));
    }
  } else {
    const L = look.legs;
    for (const x of [-0.1, 0.1]) {
      if (L.kind === 'breeches') { parts.push(box(legW + 0.01, 0.38, legW + 0.03, x, 0.67, 0, L.color)); parts.push(box(legW - 0.03, 0.42, legW - 0.01, x, 0.29, 0, L.stockings || WHITE)); }
      else if (L.kind === 'hose' || L.kind === 'trunkhose') parts.push(box(legW - 0.03, 0.78, legW - 0.01, x, 0.47, 0, L.stockings || L.color));
      else if (L.kind === 'flares') { parts.push(box(legW, 0.42, legW + 0.02, x, 0.66, 0, L.color)); parts.push(box(legW + 0.05, 0.36, legW + 0.06, x, 0.27, 0, L.color)); }
      else if (L.kind === 'kilt') { parts.push(box(legW - 0.03, 0.12, legW - 0.01, x, 0.5, 0, look.skin)); parts.push(box(legW - 0.02, 0.36, legW, x, 0.27, 0, L.stockings || '#5a5048')); }
      else parts.push(box(legW, 0.78, legW + 0.02, x, 0.48, 0, L.color));
    }
    if (L.kind === 'trunkhose') parts.push(box(0.5, 0.22, 0.32, 0, 0.78, 0, shade(L.color, 1.15)));
    if (L.kind === 'kilt') parts.push(frustum(0.27, 0.32, 0.5, 0.92, L.color));
  }

  // ---- skirt / torso ----
  const top = look.top;
  if (look.skirt) {
    const [tw, bw, , sx] = sk;
    parts.push(frustum(tw, bw, hemY, waistY, look.skirt.color, sx, look.skirt.kind === 'panniers' ? 0.62 : 0.75));
    if (look.skirt.kind === 'farthingale') parts.push(box(0.92, 0.08, 0.72, 0, waistY - 0.02, 0, look.skirt.color));
    if (look.skirt.kind === 'bustle') parts.push(box(0.36, 0.3, 0.22, 0, 0.78, -0.24, shade(look.skirt.color, 1.08)));
    if (look.striped) for (let i = 0; i < 4; i++) parts.push(frustum(tw + (bw - tw) * (0.2 + i * 0.2) + 0.005, tw + (bw - tw) * (0.24 + i * 0.2) + 0.006, hemY + (waistY - hemY) * (0.8 - i * 0.2), hemY + (waistY - hemY) * (0.84 - i * 0.2), '#e8e0d0'));
    const bodiceH = 1.43 - (look.skirt.kind === 'empire' ? 1.24 : waistY);
    parts.push(box(V ? 0.42 : 0.4, bodiceH, V ? 0.22 : 0.24, 0, 1.43 - bodiceH / 2, 0, top));
    if (look.skirt.kind === 'empire') parts.push(box(0.41, 0.04, 0.25, 0, 1.25, 0, shade(top, 0.8)));
    if (look.apron) {
      const z = ((tw + bw) / 2) * 0.75 * 0.72 + 0.02;
      parts.push(box(0.34, Math.min(0.62, waistY - hemY - 0.05), 0.02, 0, waistY - Math.min(0.62, waistY - hemY - 0.05) / 2, z, look.apron));
      parts.push(box(0.26, 0.24, 0.02, 0, 1.3, 0.13, look.apron));
    }
  } else {
    parts.push(box(torsoW, 0.56, torsoD, 0, 1.15, 0, top));
    parts.push(box(torsoW + 0.01, 0.05, torsoD + 0.01, 0, 0.89, 0, '#1e1610'));
    if (look.apron) parts.push(box(0.38, 0.62, 0.02, 0, 0.82, 0.15, look.apron));
  }
  const c = look.coat;
  if (c) {
    const cw = (look.skirt ? 0.42 : torsoW) + 0.03, cd = (look.skirt ? 0.25 : torsoD) + 0.03;
    const skirtLen = 0.15 + c.length * 0.5;
    if (c.kind === 'smock') {
      parts.push(box(cw + 0.06, 0.6, cd + 0.04, 0, 1.12, 0, c.color));
      parts.push(box(cw + 0.1, skirtLen, cd + 0.06, 0, 0.83 - skirtLen / 2, 0, c.color));
      parts.push(box(cw + 0.07, 0.12, cd + 0.05, 0, 1.18, 0, shade(c.color, 0.88))); // smocking
    } else if (c.kind === 'gansey') {
      parts.push(box(cw, 0.6, cd, 0, 1.13, 0, c.color));
      parts.push(box(cw + 0.01, 0.12, cd + 0.01, 0, 1.32, 0, shade(c.color, 1.2)));
    } else if (c.kind === 'cardigan') {
      parts.push(box(cw, 0.58, cd, 0, 1.14, -0.005, c.color));
      parts.push(box(0.12, 0.5, 0.01, 0, 1.16, cd / 2 + 0.005, top));
    } else {
      parts.push(box(cw, 0.58, cd, 0, 1.14, 0, c.color));
      // the front shows a waistcoat or shirt
      if (!['jerkin', 'doublet', 'gown', 'uniform', 'gansey'].includes(c.kind)) parts.push(box(0.14, 0.42, 0.01, 0, 1.2, cd / 2 + 0.005, look.waistcoat || top));
      if (c.kind === 'tail') parts.push(box(cw - 0.14, skirtLen + 0.1, 0.05, 0, 0.88 - (skirtLen + 0.1) / 2, -cd / 2 + 0.02, c.color));
      else if (c.kind === 'doublet' || c.kind === 'jerkin') parts.push(box(cw + 0.02, 0.12, cd + 0.02, 0, 0.82, 0, shade(c.color, 0.92)));
      else if (c.kind === 'gown') parts.push(box(cw + 0.06, 0.72, cd + 0.04, 0, 0.5, -0.01, c.color));
      else if (c.length > 0.4) parts.push(box(cw + 0.02, skirtLen, cd + 0.02, 0, 0.88 - skirtLen / 2, -0.005, c.color));
      else parts.push(box(cw, 0.12, cd, 0, 0.83, 0, c.color));
      if (c.kind === 'uniform') {
        parts.push(box(cw + 0.01, 0.05, cd + 0.01, 0, 0.9, 0, c.color === '#b0201a' ? WHITE : '#5a4a30'));
        for (let i = 0; i < 4; i++) parts.push(box(0.03, 0.03, 0.01, 0, 1.36 - i * 0.12, cd / 2 + 0.006, '#d8b040'));
      }
    }
  }
  if (look.shawl) {
    const sw = look.skirt ? 0.46 : 0.52;
    parts.push(box(sw, 0.3, 0.3, 0, 1.3, -0.005, look.shawl.color));
    parts.push(box(sw - 0.04, 0.32, 0.03, 0, 1.0, -0.15, look.shawl.color));
    parts.push(box(0.12, 0.26, 0.03, 0, 1.12, 0.14, look.shawl.color));
  }
  // ---- collars ----
  const col = look.collar;
  if (col) {
    const k = col.kind, cc = col.color;
    if (k === 'ruff') { parts.push(box(0.44, 0.07, 0.4, 0, 1.47, 0.01, cc)); parts.push(box(0.38, 0.05, 0.34, 0, 1.52, 0.01, shade(cc, 0.95))); }
    else if (k === 'falling') { parts.push(box(0.52, 0.04, 0.32, 0, 1.43, 0, cc)); parts.push(box(0.3, 0.14, 0.02, 0, 1.37, 0.15, cc)); }
    else if (k === 'cravat') { parts.push(box(0.2, 0.06, 0.2, 0, 1.45, 0.02, cc)); parts.push(box(0.1, 0.16, 0.04, 0, 1.36, 0.15, cc)); }
    else if (k === 'stock') parts.push(box(0.21, 0.08, 0.21, 0, 1.46, 0.02, cc));
    else if (k === 'high') { parts.push(box(0.22, 0.11, 0.22, 0, 1.47, 0.02, cc)); if (col.tie) parts.push(box(0.06, 0.3, 0.02, 0, 1.27, 0.158, col.tie)); }
    else if (k === 'tie') { parts.push(box(0.2, 0.05, 0.2, 0, 1.45, 0.02, WHITE)); parts.push(box(0.06, 0.34, 0.02, 0, 1.26, 0.158, cc)); }
    else if (k === 'neckerchief') { parts.push(box(0.23, 0.08, 0.23, 0, 1.45, 0.01, cc)); parts.push(box(0.07, 0.09, 0.03, 0, 1.38, 0.14, cc)); }
    else if (k === 'dogcollar') { parts.push(box(0.21, 0.07, 0.21, 0, 1.46, 0.02, BLACKISH)); parts.push(box(0.06, 0.05, 0.01, 0, 1.46, 0.125, cc)); }
    else if (k === 'bands') { parts.push(box(0.21, 0.06, 0.21, 0, 1.46, 0.02, cc)); parts.push(box(0.03, 0.14, 0.01, -0.025, 1.37, 0.15, cc)); parts.push(box(0.03, 0.14, 0.01, 0.025, 1.37, 0.15, cc)); }
    else if (k === 'fichu') { parts.push(box(0.4, 0.1, 0.26, 0, 1.4, 0.005, cc)); parts.push(box(0.2, 0.12, 0.02, 0, 1.31, 0.13, cc)); }
    else if (k === 'partlet') parts.push(box(0.3, 0.12, 0.24, 0, 1.43, 0.01, cc));
    else if (k === 'square') parts.push(box(0.26, 0.1, 0.01, 0, 1.36, 0.125, cc));
    else if (k === 'smallcollar') parts.push(box(0.24, 0.05, 0.22, 0, 1.44, 0.02, cc));
    else if (k === 'highneck') parts.push(box(0.2, 0.1, 0.2, 0, 1.47, 0.01, cc));
    else if (k === 'widecollar') { parts.push(box(0.12, 0.08, 0.01, -0.07, 1.39, 0.15, cc)); parts.push(box(0.12, 0.08, 0.01, 0.07, 1.39, 0.15, cc)); }
  }
  const body = new THREE.Mesh(merge(parts), material);

  // ---- head (pivot at the neck) ----
  const hp = [];
  const hw = V ? 0.42 : 0.3, hh = V ? 0.42 : 0.32, hd = V ? 0.42 : 0.28, hc = V ? 0.26 : 0.24;
  const faceR = V ? (look.female ? ATLAS.voxF : ATLAS.voxM) : (look.female ? ATLAS.female : ATLAS.male);
  hp.push(box(0.12, 0.08, 0.12, 0, 0.04, 0, look.skinShade));
  hp.push(box(hw, hh, hd, 0, hc, 0, look.skin, faceR));
  const top_ = hc + hh / 2, fz = hd / 2, hair = look.hair;
  const style = look.hairStyle;
  const hairCap = () => { hp.push(box(hw + 0.02, 0.07, hd + 0.02, 0, top_ + 0.02, -0.005, hair)); hp.push(box(hw + 0.02, hh * 0.55, 0.07, 0, top_ - hh * 0.25, -fz - 0.02, hair)); };
  const hairSides = (len) => { hp.push(box(0.04, len, hd * 0.65, -hw / 2 - 0.01, top_ - len / 2, -0.03, hair)); hp.push(box(0.04, len, hd * 0.65, hw / 2 + 0.01, top_ - len / 2, -0.03, hair)); };
  if (style === 'wig') {
    const wig = look.year < 1720 ? hair : (look.tier === 'gentry' ? '#e8e4dc' : '#c8c4bc');
    hp.push(box(hw + 0.06, 0.1, hd + 0.04, 0, top_ + 0.03, -0.01, wig));
    hp.push(box(0.07, hh * 0.8, hd * 0.8, -hw / 2 - 0.03, top_ - hh * 0.4, -0.02, wig));
    hp.push(box(0.07, hh * 0.8, hd * 0.8, hw / 2 + 0.03, top_ - hh * 0.4, -0.02, wig));
    hp.push(box(hw + 0.04, hh * (look.year < 1720 ? 1.3 : 0.8), 0.08, 0, top_ - hh * (look.year < 1720 ? 0.6 : 0.4), -fz - 0.03, wig));
  } else if (style !== 'hidden' && style !== 'bald') {
    hairCap();
    if (style === 'short') hairSides(0.14);
    else if (style === 'long') { hairSides(hh * 1.0); hp.push(box(hw + 0.04, hh * 1.25, 0.08, 0, top_ - hh * 0.6, -fz - 0.02, hair)); }
    else if (style === 'queue') { hairSides(0.14); hp.push(box(0.05, 0.2, 0.05, 0, top_ - hh * 0.9, -fz - 0.05, hair)); hp.push(box(0.08, 0.04, 0.03, 0, top_ - hh * 0.6, -fz - 0.06, '#1a1a1a')); }
    else if (style === 'bun') { hairSides(0.2); hp.push(box(0.14, 0.12, 0.1, 0, top_ - 0.06, -fz - 0.08, hair)); }
    else if (style === 'updo') { hairSides(0.18); hp.push(box(hw - 0.02, 0.1, hd - 0.04, 0, top_ + 0.08, -0.02, hair)); }
    else if (style === 'parted') { hairSides(hh * 0.75); hp.push(box(0.16, 0.1, 0.1, 0, top_ - hh * 0.7, -fz - 0.06, hair)); }
    else if (style === 'bob') hairSides(hh * 0.7);
    else if (style === 'curls') { hairSides(hh * 0.6); hp.push(box(0.06, 0.08, 0.08, -hw / 2 - 0.03, top_ - hh * 0.6, 0.04, hair)); hp.push(box(0.06, 0.08, 0.08, hw / 2 + 0.03, top_ - hh * 0.6, 0.04, hair)); }
  }
  // facial hair, drawn on the face
  const mouthY = hc - hh * 0.26;
  if (look.facial === 'moustache' || look.facial === 'mutton' || look.facial === 'goatee') hp.push(box(hw * 0.46, 0.03, 0.02, 0, mouthY + 0.03, fz + 0.005, hair));
  if (look.facial === 'beard') { hp.push(box(hw + 0.01, hh * 0.38, 0.04, 0, hc - hh * 0.32, fz - 0.005, hair)); hp.push(box(hw + 0.01, hh * 0.4, hd * 0.5, 0, hc - hh * 0.3, 0.02, hair)); }
  if (look.facial === 'mutton') { hp.push(box(0.04, hh * 0.45, hd * 0.4, -hw / 2 - 0.005, hc - hh * 0.1, 0.06, hair)); hp.push(box(0.04, hh * 0.45, hd * 0.4, hw / 2 + 0.005, hc - hh * 0.1, 0.06, hair)); }
  if (look.facial === 'goatee') hp.push(box(0.07, 0.07, 0.02, 0, mouthY - 0.05, fz + 0.005, hair));
  // shawl over the head
  if (look.shawl?.overHead) { hp.push(box(hw + 0.08, 0.08, hd + 0.08, 0, top_ + 0.03, -0.02, look.shawl.color)); hp.push(box(0.05, hh + 0.05, hd + 0.04, -hw / 2 - 0.04, hc, -0.03, look.shawl.color)); hp.push(box(0.05, hh + 0.05, hd + 0.04, hw / 2 + 0.04, hc, -0.03, look.shawl.color)); hp.push(box(hw + 0.08, hh + 0.08, 0.05, 0, hc, -fz - 0.04, look.shawl.color)); }
  else addHat(hp, look.hat, { hw, hh, hd, top: top_, fz, hc });
  const head = new THREE.Mesh(merge(hp), material);
  head.position.y = 1.44;

  // ---- arms ----
  const sleeveCol = look.coat && !['smock', 'gansey'].includes(look.coat.kind) ? look.coat.color : look.coat ? look.coat.color : look.top;
  const armGeo = () => {
    const sleeve = look.sleeves === 'short' ? 0.24 : 0.54;
    const list = [box(armW, sleeve, armW + 0.01, 0, -sleeve / 2, 0, sleeveCol)];
    if (sleeve < 0.54) list.push(box(armW - 0.02, 0.54 - sleeve, armW - 0.01, 0, -sleeve - (0.54 - sleeve) / 2, 0, look.skin));
    if (look.collar?.kind === 'ruff' || (look.year < 1800 && look.tier === 'gentry')) list.push(box(armW + 0.03, 0.04, armW + 0.04, 0, -0.53, 0, WHITE));
    list.push(box(armW - 0.02, 0.1, armW, 0, -0.6, 0.005, look.skin));
    return merge(list);
  };
  const shoulderX = look.skirt ? (V ? 0.3 : 0.27) : (V ? 0.32 : 0.31);
  const armL = new THREE.Mesh(armGeo(), material); armL.position.set(-shoulderX, 1.42, 0);
  const armR = new THREE.Mesh(armGeo(), material); armR.position.set(shoulderX, 1.42, 0);
  armL.rotation.z = -0.06; armR.rotation.z = 0.06;
  return assemble(body, head, armL, armR, material, look.height * 1.05);
}
const BLACKISH = '#18181c';

function addHat(hp, h, d) {
  if (!h) return;
  const { hw, hd, top: T, fz } = d;
  const c = h.color;
  const brim = (w, dz = 0, y = T + 0.03) => hp.push(box(w, 0.03, w * 0.95, 0, y, dz, c));
  const crown = (w, hgt, y = T + 0.03, col = c) => hp.push(box(w, hgt, w, 0, y + hgt / 2, 0, col));
  const k = h.kind;
  if (k === 'top') { brim(hw + 0.12); crown(hw - 0.04, 0.3); hp.push(box(hw - 0.03, 0.04, hw - 0.03, 0, T + 0.07, 0, '#3a1414')); }
  else if (k === 'bowler') { brim(hw + 0.08); crown(hw - 0.02, 0.13); }
  else if (k === 'trilby') { brim(hw + 0.12); crown(hw - 0.02, 0.11); hp.push(box(hw - 0.01, 0.03, hw - 0.01, 0, T + 0.06, 0, '#1a1a1a')); }
  else if (k === 'boater') { brim(hw + 0.12); crown(hw - 0.02, 0.07); hp.push(box(hw - 0.01, 0.03, hw - 0.01, 0, T + 0.06, 0, '#1a1a2a')); }
  else if (k === 'tricorn') { hp.push(box(hw + 0.16, 0.08, hd + 0.08, 0, T + 0.05, 0, c)); crown(hw - 0.06, 0.1, T + 0.06); }
  else if (k === 'wide' || k === 'round' || k === 'straw') { brim(hw + (k === 'straw' ? 0.26 : 0.18)); crown(hw - 0.02, k === 'straw' ? 0.06 : 0.12); }
  else if (k === 'cavalier') { brim(hw + 0.2); crown(hw - 0.02, 0.13); hp.push(box(0.05, 0.05, 0.3, hw / 2, T + 0.14, -0.04, '#f4f0e8')); }
  else if (k === 'capotain') { brim(hw + 0.14); crown(hw - 0.02, 0.14); crown(hw - 0.07, 0.14, T + 0.17); }
  else if (k === 'tudor') { hp.push(box(hw + 0.12, 0.05, hd + 0.12, 0, T + 0.02, 0, c)); hp.push(box(hw - 0.02, 0.04, hd - 0.02, 0, T + 0.06, 0, c)); }
  else if (k === 'flat') { hp.push(box(hw + 0.03, 0.07, hd + 0.04, 0, T + 0.02, -0.01, c)); hp.push(box(hw, 0.025, 0.12, 0, T - 0.01, fz + 0.04, c)); }
  else if (k === 'cap') hp.push(box(hw + 0.03, 0.1, hd + 0.04, 0, T + 0.03, 0, c));
  else if (k === 'bonnetcap') { hp.push(box(hw + 0.06, 0.07, hd + 0.06, 0, T + 0.03, 0, c)); hp.push(box(0.06, 0.05, 0.06, 0, T + 0.09, 0, '#b02020')); }
  else if (k === 'peaked') { hp.push(box(hw + 0.04, 0.08, hd + 0.04, 0, T + 0.02, 0, c)); hp.push(box(hw - 0.02, 0.02, 0.1, 0, T - 0.02, fz + 0.04, '#141414')); hp.push(box(0.05, 0.04, 0.01, 0, T + 0.02, fz + 0.025, '#d8b040')); }
  else if (k === 'helmet') { hp.push(box(hw + 0.18, 0.03, hd + 0.2, 0, T + 0.02, 0, c)); crown(hw - 0.02, 0.08, T + 0.02); }
  else if (k === 'shako') { crown(hw - 0.02, 0.22, T); hp.push(box(hw - 0.02, 0.02, 0.1, 0, T, fz + 0.04, '#141414')); hp.push(box(0.04, 0.1, 0.04, 0, T + 0.28, 0.06, '#f0ece0')); }
  else if (k === 'welsh') { hp.push(box(hw + 0.04, 0.06, hd + 0.04, 0, T - 0.01, 0, '#f0ece0')); brim(hw + 0.18); hp.push(box(hw - 0.04, 0.3, hw - 0.04, 0, T + 0.2, 0, c)); }
  else if (k === 'cloche') { hp.push(box(hw + 0.06, 0.14, hd + 0.06, 0, T - 0.02, -0.01, c)); hp.push(box(hw + 0.07, 0.03, hd + 0.07, 0, T - 0.08, 0, shade(c, 1.3))); }
  else if (k === 'smallhat' || k === 'tilthat') { hp.push(box(hw * 0.75, 0.03, hd * 0.65, 0.03, T + 0.03, 0.03, c)); hp.push(box(hw * 0.5, 0.08, hd * 0.45, 0.03, T + 0.08, 0.03, c)); hp.push(box(0.05, 0.05, 0.03, -0.04, T + 0.12, 0.02, '#c84040')); }
  else if (k === 'bighat') { brim(hw + 0.28, 0.01); crown(hw, 0.1); hp.push(box(0.1, 0.06, 0.08, 0.1, T + 0.15, 0.06, '#e88a9a')); }
  else if (k === 'headscarf') { hp.push(box(hw + 0.05, 0.08, hd + 0.05, 0, T + 0.02, -0.01, c)); hp.push(box(0.04, 0.18, hd, -hw / 2 - 0.025, T - 0.1, -0.02, c)); hp.push(box(0.04, 0.18, hd, hw / 2 + 0.025, T - 0.1, -0.02, c)); hp.push(box(hw + 0.05, 0.2, 0.04, 0, T - 0.08, -fz - 0.025, c)); hp.push(box(0.08, 0.06, 0.05, 0, T + 0.06, fz - 0.02, c)); }
  else if (k === 'maidcap') { hp.push(box(hw * 0.85, 0.04, hd * 0.6, 0, T + 0.02, -0.04, c)); hp.push(box(hw * 0.85, 0.06, 0.02, 0, T + 0.03, fz * 0.3, c)); }
  else if (k === 'fontange') { hp.push(box(hw + 0.02, 0.06, hd + 0.02, 0, T + 0.01, -0.01, c)); hp.push(box(hw * 0.75, 0.18, 0.03, 0, T + 0.12, fz * 0.4, c)); }
  else if (k === 'frenchhood') { hp.push(box(hw + 0.04, 0.07, hd * 0.6, 0, T + 0.02, 0.02, '#c8a040')); hp.push(box(hw + 0.06, 0.08, hd * 0.5, 0, T + 0.05, -0.04, c)); hp.push(box(hw + 0.04, 0.34, 0.06, 0, T - 0.14, -fz - 0.03, c)); }
  else if (k === 'poke' || k === 'bonnet') { hp.push(box(hw + 0.06, 0.12, hd + 0.04, 0, T + 0.01, -0.02, c)); hp.push(box(0.05, 0.24, hd, -hw / 2 - 0.03, T - 0.12, -0.01, c)); hp.push(box(0.05, 0.24, hd, hw / 2 + 0.03, T - 0.12, -0.01, c)); hp.push(box(hw + 0.12, 0.22, 0.05, 0, T - 0.02, fz + 0.04, c)); hp.push(box(0.04, 0.1, 0.02, 0.1, T - 0.24, fz - 0.01, '#c84a6a')); }
  else if (k === 'coif' || k === 'mob') { hp.push(box(hw + 0.04, 0.12, hd + 0.04, 0, T + 0.01, -0.01, c)); hp.push(box(0.04, 0.24, hd, -hw / 2 - 0.02, T - 0.13, -0.01, c)); hp.push(box(0.04, 0.24, hd, hw / 2 + 0.02, T - 0.13, -0.01, c)); hp.push(box(hw + 0.04, 0.24, 0.04, 0, T - 0.12, -fz - 0.02, c)); if (k === 'mob') hp.push(box(hw + 0.1, 0.04, hd + 0.1, 0, T - 0.03, 0, c)); }
}

function assemble(body, head, armL, armR, material, scale, extra = []) {
  const bake = (mesh) => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); };
  const lod = new THREE.Mesh(merge([bake(body), bake(head), bake(armL), bake(armR), ...extra.map(bake)]), material);
  lod.visible = false;
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(body, head, armL, armR, lod);
  inner.scale.setScalar(scale);
  root.add(inner);
  const setDetail = (near) => {
    if (near === root.userData.near) return;
    root.userData.near = near;
    body.visible = head.visible = armL.visible = armR.visible = near;
    for (const e of extra) e.visible = near;
    lod.visible = !near;
  };
  root.userData.near = true;
  return { root, inner, body, head, armL, armR, lod, setDetail };
}

// ---------------- Island villagers ----------------
// Round big-headed figures: smooth low-poly shapes, toon shading, vertex colours.

function tint(g, color) {
  const col = new THREE.Color(color);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
const sphere = (r, x, y, z, color, sx = 1, sy = 1, sz = 1, seg = 8) => tint(at(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)).scale(sx, sy, sz), x, y, z), color);
const cyl = (rt, rb, h, x, y, z, color, seg = 8) => tint(at(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z), color);
const cap = (r, x, y, z, color, thetaLen = 0.55, tilt = 0) => {
  const g = new THREE.SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI * thetaLen);
  if (tilt) g.rotateX(tilt);
  return tint(at(g, x, y, z), color);
};
const ibox = (w, h, d, x, y, z, color) => tint(at(new THREE.BoxGeometry(w, h, d), x, y, z), color);

let islandMat = null;
export function islandMaterial(ramp) {
  if (!islandMat) islandMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  return islandMat;
}

// Turn era colours (lots of Victorian black and brown) into cheerful island versions with the same hue.
function islandize(hex, seedHue, minL = 0.5) {
  const c = new THREE.Color(hex), hsl = {};
  c.getHSL(hsl);
  const h = hsl.s < 0.12 ? seedHue : hsl.h;
  const keepWhite = hsl.l > 0.8;
  const sat = keepWhite ? hsl.s : Math.min(0.75, Math.max(0.42, hsl.s * 1.4 + 0.2));
  const light = keepWhite ? 0.92 : Math.min(0.74, Math.max(minL, hsl.l * 0.5 + 0.42));
  return '#' + new THREE.Color().setHSL(h, sat, light).getHexString();
}

/** Island figure. opts.legs: keep legs as separate meshes for walking (player avatar). */
export function buildIslandFigure(look, material, opts = {}) {
  const seedHue = ((look.year || 1900) * 0.6180339 + (look.skin.charCodeAt(2) || 0) * 0.13) % 1;
  const isl = (hex, k = 0, minL) => islandize(hex, (seedHue + k) % 1, minL);
  const top = isl(look.top), skin = look.skin, hair = look.hair;
  look.topSoft = top;
  const shoeCol = look.shoes === 'clogs' ? '#c8955a' : look.shoes === 'trainers' ? '#ffffff' : look.shoes === 'bare' ? skin : '#5a3a2a';
  const bodyParts = [];
  const legParts = [[], []];
  const sk = look.skirt;
  const L = look.legs;
  [0, 1].forEach(i => {
    let legColor = sk ? (look.year >= 1915 ? skin : '#5a4a4a') : isl(L.color, 0.45, 0.42);
    if (!sk && (L.kind === 'breeches' || L.kind === 'kilt')) {
      legParts[i].push(cyl(0.065, 0.06, 0.12, 0, -0.06, 0, L.kind === 'kilt' ? skin : legColor, 8));
      legParts[i].push(cyl(0.062, 0.058, 0.12, 0, -0.17, 0, isl(L.stockings || '#f0ece0', 0.6, 0.6), 8));
    } else if (!sk && L.kind === 'flares') {
      legParts[i].push(cyl(0.065, 0.085, 0.24, 0, -0.12, 0, legColor, 8));
    } else legParts[i].push(cyl(0.065, 0.06, 0.24, 0, -0.12, 0, legColor, 8));
    legParts[i].push(sphere(0.085, 0, -0.25, 0.03, shoeCol, 1, 0.6, 1.3, 6));
  });
  // skirt radii relative to the island body
  const IS = { full: [0.17, 0.32], farthingale: [0.32, 0.34], panniers: [0.2, 0.32], bell: [0.17, 0.36], crinoline: [0.18, 0.44], bustle: [0.17, 0.28], empire: [0.15, 0.24],
    aline: [0.16, 0.3], calf: [0.16, 0.26], knee: [0.16, 0.24], fifties: [0.16, 0.34], mini: [0.16, 0.22], maxi: [0.16, 0.26], straight: [0.16, 0.24] };
  if (sk) {
    const [rt, rb] = IS[sk.kind] || IS.full;
    const hemUp = { calf: 0.06, knee: 0.1, mini: 0.16, fifties: 0.06 }[sk.kind] || 0;
    const scol = isl(sk.color, 0.1);
    const g = cyl(rt, rb, 0.38 - hemUp, 0, 0.43 + hemUp / 2, 0, scol, 12);
    if (sk.kind === 'panniers') g.scale(1.4, 1, 0.85);
    bodyParts.push(g);
    if (sk.kind === 'bustle') bodyParts.push(sphere(0.16, 0, 0.5, -0.2, scol, 1, 0.9, 0.8, 8));
    bodyParts.push(cyl(0.15, 0.17, 0.2, 0, 0.7, 0, top, 10));
    if (look.apron) bodyParts.push(ibox(0.26, 0.3 - hemUp, 0.02, 0, 0.45 + hemUp / 2, (rt + rb) / 2 + 0.02, isl(look.apron, 0, 0.88)));
  } else {
    bodyParts.push(cyl(0.16, 0.2, 0.42, 0, 0.5, 0, top, 10));
    bodyParts.push(cyl(0.2, 0.2, 0.08, 0, 0.3, 0, isl(L.color, 0.45, 0.42), 10));
    if (L.kind === 'kilt') bodyParts.push(cyl(0.2, 0.25, 0.16, 0, 0.24, 0, isl(L.color, 0.3), 10));
    if (look.apron) bodyParts.push(ibox(0.26, 0.3, 0.02, 0, 0.42, 0.2, isl(look.apron, 0, 0.5)));
  }
  const c = look.coat;
  if (c) {
    const cc = isl(c.color, 0.2);
    if (c.kind === 'smock') bodyParts.push(cyl(0.2, 0.26, 0.48, 0, 0.47, 0, isl(c.color, 0, 0.85), 10));
    else if (c.kind === 'cardigan') bodyParts.push(cyl(0.175, 0.215, 0.38, 0, 0.52, -0.01, cc, 10));
    else {
      bodyParts.push(cyl(0.172, 0.212, 0.4, 0, 0.51, 0, cc, 10));
      if (c.length > 0.4) bodyParts.push(cyl(0.212, 0.25, 0.16 + c.length * 0.1, 0, 0.26, 0, cc, 10));
      if (!['doublet', 'jerkin', 'uniform', 'gansey'].includes(c.kind)) bodyParts.push(ibox(0.09, 0.26, 0.02, 0, 0.56, 0.19, isl(look.waistcoat || look.top, 0.5, 0.6)));
    }
  }
  if (look.shawl) bodyParts.push(cap(0.25, 0, 0.6, 0, isl(look.shawl.color, 0.7), 0.55));
  const col = look.collar;
  if (col) {
    const w = isl(col.color, 0, 0.88);
    if (col.kind === 'ruff') bodyParts.push(cyl(0.24, 0.24, 0.06, 0, 0.8, 0, w, 14));
    else if (col.kind === 'falling') bodyParts.push(cyl(0.12, 0.26, 0.05, 0, 0.77, 0, w, 14));
    else if (['tie', 'high'].includes(col.kind) && (col.tie || col.kind === 'tie')) bodyParts.push(ibox(0.05, 0.22, 0.02, 0, 0.6, 0.2, isl(col.tie || col.color, 0.3)));
    else if (['cravat', 'fichu', 'neckerchief', 'bands', 'dogcollar', 'stock', 'smallcollar', 'highneck', 'partlet', 'square'].includes(col.kind)) bodyParts.push(sphere(0.07, 0, 0.74, 0.15, w, 1.4, 0.8, 0.6, 6));
  }

  const headParts = [];
  const H = 0.34;
  headParts.push(sphere(H, 0, H, 0, skin, 1.02, 0.95, 0.95, 14));
  for (const sx of [-1, 1]) {
    headParts.push(sphere(0.045, sx * 0.11, H + 0.02, H * 0.9, '#2a1e1a', 0.8, 1.15, 0.4, 6));
    headParts.push(sphere(0.012, sx * 0.11 + 0.012, H + 0.05, H * 0.93, '#ffffff', 1, 1, 0.5, 4));
    headParts.push(sphere(0.05, sx * 0.19, H - 0.07, H * 0.8, '#ff9aa6', 1, 0.55, 0.35, 6));
  }
  headParts.push(sphere(0.03, 0, H - 0.04, H * 0.95, shade(skin, 0.85), 1, 0.8, 0.8, 6));
  headParts.push(sphere(0.035, 0, H - 0.12, H * 0.88, '#8a3a3a', 1.3, 0.5, 0.5, 6));
  const f = look.facial;
  if (f === 'beard') headParts.push(sphere(0.25, 0, H - 0.14, 0.08, hair, 1.05, 0.75, 0.95, 8));
  if (f === 'moustache' || f === 'mutton' || f === 'goatee') headParts.push(sphere(0.06, 0, H - 0.09, H * 0.9, hair, 1.6, 0.45, 0.5, 6));
  if (f === 'mutton') for (const sx of [-1, 1]) headParts.push(sphere(0.07, sx * 0.27, H - 0.06, 0.08, hair, 0.6, 1.5, 1, 6));
  if (f === 'goatee') headParts.push(sphere(0.05, 0, H - 0.2, H * 0.82, hair, 1, 1, 0.6, 6));
  const st = look.hairStyle;
  const hidden = st === 'hidden' || look.shawl?.overHead;
  if (st === 'wig') {
    const wig = look.year < 1720 ? hair : '#ece8e0';
    headParts.push(cap(H + 0.05, 0, H + 0.02, -0.01, wig, 0.55, -0.25));
    for (const sx of [-1, 1]) headParts.push(sphere(0.12, sx * 0.3, H - 0.02, -0.04, wig, 0.8, 1.2, 1, 8));
  } else if (!hidden && st !== 'bald') {
    headParts.push(cap(H + 0.025, 0, H + 0.01, -0.01, hair, 0.5, -0.25));
    if (['long', 'parted', 'curls', 'bob'].includes(st)) headParts.push(sphere(0.3, 0, H - (st === 'bob' ? 0.02 : 0.08), -0.12, hair, 1.1, st === 'bob' ? 0.85 : 1.05, 0.75, 8));
    else headParts.push(sphere(0.3, 0, H + 0.02, -0.08, hair, 1.08, 0.95, 0.9, 8));
    if (st === 'bun' || st === 'parted') headParts.push(sphere(0.11, 0, H + (st === 'parted' ? -0.05 : 0.22), -0.24, hair, 1, 1, 1, 8));
    if (st === 'updo') headParts.push(sphere(0.2, 0, H + 0.3, -0.05, hair, 1.2, 0.7, 1, 8));
    if (st === 'queue') headParts.push(cyl(0.03, 0.03, 0.25, 0, H - 0.2, -0.33, hair, 6));
    if (st === 'curls') for (const sx of [-1, 1]) headParts.push(sphere(0.08, sx * 0.3, H - 0.1, 0.06, hair, 1, 1.3, 1, 6));
  }
  if (look.shawl?.overHead) headParts.push(cap(H + 0.07, 0, H + 0.02, -0.04, isl(look.shawl.color, 0.7), 0.68, -0.45));
  else addIslandHat(headParts, look.hat, H, isl);
  const head = new THREE.Mesh(merge(headParts), material);
  head.position.y = 0.8;

  const sleeveCol = c && c.kind !== 'smock' ? isl(c.color, 0.2) : c ? isl(c.color, 0, 0.85) : top;
  const shortSleeve = look.sleeves === 'short';
  const arm = () => merge([
    cyl(0.06, 0.055, shortSleeve ? 0.14 : 0.3, 0, shortSleeve ? -0.07 : -0.15, 0, sleeveCol, 8),
    ...(shortSleeve ? [cyl(0.05, 0.05, 0.16, 0, -0.22, 0, skin, 6)] : []),
    sphere(0.065, 0, -0.32, 0, skin, 1, 1, 1, 6),
  ]);
  const armL = new THREE.Mesh(arm(), material); armL.position.set(-0.21, 0.74, 0);
  const armR = new THREE.Mesh(arm(), material); armR.position.set(0.21, 0.74, 0);
  armL.rotation.z = -0.25; armR.rotation.z = 0.25;

  const legL = new THREE.Mesh(merge(legParts[0]), material); legL.position.set(-0.09, 0.27, 0);
  const legR = new THREE.Mesh(merge(legParts[1]), material); legR.position.set(0.09, 0.27, 0);
  const body = new THREE.Mesh(merge(bodyParts), material);
  const bake = (mesh) => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); };
  if (!opts.legs) body.geometry = merge([body.geometry, bake(legL), bake(legR)]);
  const fig = assemble(body, head, armL, armR, material, look.female ? 1.12 : 1.18, opts.legs ? [legL, legR] : []);
  if (opts.legs) fig.inner.add(legL, legR);
  fig.legL = legL; fig.legR = legR; fig.island = true;
  return fig;
}

function addIslandHat(hp, h, H, isl) {
  if (!h) return;
  const keep = ['coif', 'mob', 'maidcap', 'fontange'].includes(h.kind);
  const c = keep ? '#fffaf0' : isl(h.color, 0.15, h.color === '#18181c' ? 0.36 : 0.45);
  const y = H * 1.75;
  const k = h.kind;
  const brim = (r, yy = y) => hp.push(cyl(r, r, 0.03, 0, yy, 0, c, 16));
  if (k === 'top' || k === 'welsh' || k === 'shako') { brim(k === 'shako' ? 0.2 : 0.38); hp.push(cyl(0.2, k === 'welsh' ? 0.24 : 0.21, k === 'welsh' ? 0.46 : 0.36, 0, y + (k === 'welsh' ? 0.24 : 0.19), 0, c, 12)); if (k !== 'welsh') hp.push(cyl(0.212, 0.212, 0.06, 0, y + 0.05, 0, '#c84a4a', 12)); }
  else if (k === 'bowler' || k === 'round') { brim(0.34); hp.push(cap(0.24, 0, y, 0, c, 0.5)); }
  else if (k === 'trilby' || k === 'boater' || k === 'wide' || k === 'cavalier' || k === 'straw' || k === 'bighat') {
    brim(k === 'straw' || k === 'bighat' ? 0.5 : k === 'wide' || k === 'cavalier' ? 0.44 : 0.38);
    hp.push(cyl(0.2, 0.24, k === 'boater' ? 0.1 : 0.16, 0, y + 0.07, 0, c, 12));
    if (k === 'bighat') hp.push(sphere(0.07, 0.15, y + 0.12, 0.12, '#ff8fb4', 1, 1, 1, 6));
    if (k === 'cavalier') hp.push(sphere(0.06, 0.18, y + 0.14, -0.06, '#ffffff', 1, 1, 3, 6));
  }
  else if (k === 'tricorn') { hp.push(cyl(0.42, 0.42, 0.12, 0, y + 0.02, 0, c, 3)); hp.push(cap(0.24, 0, y + 0.04, 0, c, 0.5)); }
  else if (k === 'capotain') { brim(0.4); hp.push(cyl(0.17, 0.23, 0.36, 0, y + 0.18, 0, c, 12)); }
  else if (k === 'tudor' || k === 'bonnetcap') { hp.push(sphere(0.38, 0, y - 0.02, 0, c, 1, 0.22, 1, 12)); if (k === 'bonnetcap') hp.push(sphere(0.05, 0, y + 0.08, 0, '#e04040', 1, 1, 1, 6)); }
  else if (k === 'flat' || k === 'cap' || k === 'peaked') { hp.push(cap(0.37, 0, y - 0.1, -0.02, c, 0.32)); if (k !== 'cap') hp.push(sphere(0.2, 0, y - 0.05, 0.3, k === 'peaked' ? '#222222' : c, 1.2, 0.18, 0.8, 8)); }
  else if (k === 'helmet') { brim(0.44, y - 0.04); hp.push(cap(0.26, 0, y - 0.04, 0, c, 0.4)); }
  else if (k === 'cloche') { hp.push(cap(0.39, 0, y - 0.16, 0, c, 0.45)); hp.push(cyl(0.36, 0.36, 0.05, 0, y - 0.02, 0, c, 16)); }
  else if (k === 'smallhat' || k === 'tilthat') { hp.push(cyl(0.18, 0.2, 0.08, 0.04, y + 0.02, 0.04, c, 10)); hp.push(sphere(0.05, -0.06, y + 0.08, 0.04, '#ff8fb4', 1, 1, 1, 6)); }
  else if (k === 'headscarf') { hp.push(cap(0.39, 0, H, -0.03, c, 0.6, -0.4)); hp.push(sphere(0.06, 0, y - 0.02, 0.3, c, 1.4, 1, 1, 6)); }
  else if (k === 'maidcap') { hp.push(cap(0.3, 0, H + 0.12, -0.05, c, 0.3, -0.3)); }
  else if (k === 'fontange') { hp.push(cap(0.36, 0, H + 0.02, -0.03, c, 0.5, -0.4)); hp.push(ibox(0.24, 0.16, 0.03, 0, y + 0.05, 0.12, c)); }
  else { // coif, mob, bonnet, poke, frenchhood
    hp.push(cap(0.4, 0, H, -0.03, c, 0.62, -0.5));
    if (k === 'poke' || k === 'bonnet') { hp.push(cyl(0.05, 0.05, 0.02, 0, H - 0.24, 0.24, '#e86a8a', 8)); hp.push(tint(at(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16).rotateX(1.2), 0, H + 0.12, 0.12), c)); }
    if (k === 'frenchhood') hp.push(cyl(0.34, 0.34, 0.05, 0, H + 0.25, -0.02, '#e0b84a', 16));
    if (k === 'mob') hp.push(cyl(0.42, 0.42, 0.03, 0, H + 0.28, -0.02, c, 16));
  }
}
