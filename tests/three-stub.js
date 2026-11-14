// Test-only stand-in for three.js (the sandbox that runs the tests has no network for the CDN copy).
// Colour maths is real, because period clothes and skin tones use it; everything else swallows calls.
const any = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === Symbol.iterator ? undefined : any()),
  construct: () => any(), apply: () => any(), set: () => true,
});
export class Color {
  constructor(c) { this.r = 1; this.g = 1; this.b = 1; if (c != null) this.set(c); }
  set(c) {
    if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);
    if (typeof c === 'number') { this.r = ((c >> 16) & 255) / 255; this.g = ((c >> 8) & 255) / 255; this.b = (c & 255) / 255; }
    else if (c && c.r !== undefined) { this.r = c.r; this.g = c.g; this.b = c.b; }
    return this;
  }
  clone() { return new Color(this); }
  copy(c) { return this.set(c); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  multiplyScalar(f) { this.r *= f; this.g *= f; this.b *= f; return this; }
  getHex() { const q = v => Math.max(0, Math.min(255, Math.round(v * 255))); return (q(this.r) << 16) | (q(this.g) << 8) | q(this.b); }
  getHexString() { return this.getHex().toString(16).padStart(6, '0'); }
  getHSL(o) { const { r, g, b } = this, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; if (h < 0) h += 1; } o.h = h; o.s = s; o.l = l; return o; }
  setHSL(h, s, l) { const f = n => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; this.r = f(0); this.g = f(8); this.b = f(4); return this; }
  offsetHSL(h, s, l) { const o = this.getHSL({}); return this.setHSL((o.h + h + 1) % 1, Math.max(0, Math.min(1, o.s + s)), Math.max(0, Math.min(1, o.l + l))); }
}
export const OrbitControls = any(), mergeGeometries = any();
export const AdditiveBlending = any();
export const AmbientLight = any();
export const BackSide = any();
export const BoxGeometry = any();
export const BufferAttribute = any();
export const BufferGeometry = any();
export const CanvasTexture = any();
export const CatmullRomCurve3 = any();
export const CircleGeometry = any();
export const ClampToEdgeWrapping = any();
export const ConeGeometry = any();
export const CylinderGeometry = any();
export const DataTexture = any();
export const DirectionalLight = any();
export const DoubleSide = any();
export const Float32BufferAttribute = any();
export const Fog = any();
export const Group = any();
export const HemisphereLight = any();
export const IcosahedronGeometry = any();
export const InstancedMesh = any();
export const LineBasicMaterial = any();
export const LineSegments = any();
export const LinearFilter = any();
export const LinearMipmapLinearFilter = any();
export const Matrix4 = any();
export const Mesh = any();
export const MeshBasicMaterial = any();
export const MeshLambertMaterial = any();
export const MeshToonMaterial = any();
export const NearestFilter = any();
export const NormalBlending = any();
export const PerspectiveCamera = any();
export const PlaneGeometry = any();
export const PointLight = any();
export const Points = any();
export const PointsMaterial = any();
export const Quaternion = any();
export const RGBAFormat = any();
export const RepeatWrapping = any();
export const RingGeometry = any();
export const SRGBColorSpace = any();
export const Scene = any();
export const ShaderMaterial = any();
export const SphereGeometry = any();
export const Sprite = any();
export const SpriteMaterial = any();
export const Vector3 = any();
export const WebGLRenderer = any();
