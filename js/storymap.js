// Story mode journeys: a small hand-drawn map of the world, enough to draw a dotted line from one town
// in the family tree to another. Places are positioned by the region the main game's gazetteer puts them in.
import { hashString } from './ancestry.js';

// [longitude, latitude] for each region key in places.js
const GEO = {
  lancashire: [-2.7, 53.8], manchester: [-2.24, 53.48], liverpool: [-2.98, 53.4], yorkshire: [-1.55, 53.8], sheffield: [-1.47, 53.38], hull: [-0.33, 53.74],
  northeast: [-1.6, 54.97], cumbria: [-3.1, 54.6], cheshire: [-2.6, 53.2], potteries: [-2.18, 53.0], blackcountry: [-2.08, 52.5], midlands: [-1.9, 52.45],
  eastmidlands: [-1.15, 52.95], lincolnshire: [-0.54, 53.23], cotswolds: [-1.9, 51.8], westcountry: [-3.5, 50.75], cornwall: [-5.0, 50.3], bristol: [-2.6, 51.45],
  london: [-0.12, 51.5], southeast: [0.5, 51.2], eastanglia: [1.2, 52.6], england: [-1.5, 52.6], wales: [-3.8, 52.4], southwales: [-3.4, 51.7],
  lowlands: [-3.6, 55.6], glasgow: [-4.25, 55.86], edinburgh: [-3.19, 55.95], highlands: [-5.0, 57.3], ireland: [-8.0, 53.2], dublin: [-6.26, 53.35], ulster: [-6.6, 54.7],
  isleofman: [-4.5, 54.2], channel: [-2.2, 49.3], usa: [-77, 40], canada: [-79, 45], australia: [147, -35], newzealand: [174, -41], southafrica: [24, -30],
  germany: [10, 51], netherlands: [5, 52.2], belgium: [4.4, 50.8], france: [2.3, 47.5], scandinavia: [14, 60], italy: [12.5, 42.5], spain: [-3.7, 40.4], portugal: [-8.5, 39.6],
  greece: [23, 38.5], easteurope: [21, 51], russia: [37.6, 55.7], mena: [40, 30], northafrica: [10, 32], southasia: [78, 22], eastasia: [112, 32], seasia: [103, 10],
  westafrica: [-2, 8], africa: [25, 0], caribbean: [-76.8, 18.1], latinamerica: [-58, -20], unknown: [-1.5, 52.6],
};
// Coastlines, very roughly.
const LAND = [
  [[-5.7, 50.1], [-3.5, 50.2], [-1.8, 50.6], [0.3, 50.8], [1.4, 51.2], [0.9, 51.5], [1.7, 52.6], [0.3, 53.0], [-0.1, 53.6], [-1.2, 54.6], [-1.6, 55.6], [-3.0, 56.0], [-2.0, 57.6], [-3.3, 58.6], [-5.0, 58.6], [-5.8, 57.6], [-5.5, 56.4], [-4.9, 55.5], [-3.4, 54.9], [-3.1, 53.4], [-4.5, 53.3], [-4.2, 52.3], [-5.2, 51.8], [-3.2, 51.4], [-4.3, 51.2]],
  [[-10, 51.6], [-8.2, 51.8], [-6.2, 52.2], [-6.0, 53.4], [-5.6, 54.6], [-6.3, 55.2], [-8.2, 55.3], [-8.6, 54.3], [-10, 54.2], [-9.6, 53.2], [-10.4, 52.2]],
  [[-9.3, 36.9], [-6, 36.2], [-0.5, 37.6], [3.2, 41.9], [6, 43.1], [9, 44.3], [12.3, 41.7], [15.6, 38], [18.4, 40.2], [13.6, 45.6], [19.5, 41.8], [23, 36.5], [26.5, 40.8], [29, 41.2], [40, 43], [50, 46], [60, 55], [60, 68], [40, 67], [30, 70], [20, 69.5], [12, 65], [5.5, 61.5], [7.5, 58], [11, 59], [12.5, 56], [10, 57.5], [8.3, 54.9], [7, 53.5], [4.5, 52.2], [2.5, 51], [1.5, 50.2], [-1.6, 49.6], [-4.7, 48.4], [-1.2, 46.2], [-1.8, 43.4], [-9.2, 43.2]],
  [[-17, 14.7], [-13, 27], [-6, 35.8], [10, 37.3], [11, 33.5], [20, 32.5], [32, 31.3], [35, 28], [43, 11.5], [51, 11.8], [40, -4], [40.5, -15], [35, -24.5], [26, -34], [18.5, -34.3], [12, -17], [9, 3], [-8, 4.4]],
  [[29, 41.2], [36, 36.5], [35.5, 31], [43.5, 12.6], [52, 17], [58.5, 23], [56.5, 26.5], [66.5, 25.3], [72.8, 19], [77.5, 8], [80.2, 13.2], [88.5, 21.8], [94, 16.5], [98.5, 8.5], [103.5, 1.5], [101, 13], [109, 11.5], [106, 20], [114, 22.3], [122, 30], [119, 38.5], [126.5, 34.5], [129.5, 41], [140, 48], [143, 59], [162, 60], [170, 66], [180, 68], [180, 72], [110, 76], [70, 73], [60, 68], [60, 55], [50, 46], [40, 43]],
  [[-168, 66], [-156, 71], [-125, 70], [-95, 72], [-80, 73], [-62, 60], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 25], [-83, 30], [-90, 29], [-97, 26], [-95, 18.5], [-88, 16], [-83, 10], [-79, 9], [-85, 11], [-95, 16], [-105, 20], [-110, 23.5], [-117, 32.5], [-124.5, 40], [-124, 48.5], [-135, 58.5], [-152, 58], [-165, 61]],
  [[-79, 9], [-72, 12], [-60, 8.5], [-50, 0], [-35, -6], [-39, -17], [-48, -27], [-57, -37], [-66, -45], [-69, -54], [-74, -50], [-71, -30], [-70, -18], [-80, -5]],
  [[114, -22], [122, -18], [130, -12], [136, -12], [142, -11], [146, -19], [153, -27], [150, -37], [144, -38.5], [138, -35], [131, -31.5], [124, -33.5], [115, -34.5]],
  [[172.7, -34.5], [178.5, -37.7], [175, -41.5], [171, -44], [166.5, -46], [170, -43], [172.7, -40.7], [174, -39]],
  [[130, 31.5], [136, 34], [141, 36], [141.5, 41], [140, 43], [145, 44], [141, 45.5], [139.5, 39], [136, 36], [132, 34.5]],
  [[-85, 22], [-80, 23.2], [-74.2, 20.3], [-77.5, 19.8]], [[-78.4, 18.5], [-76.2, 18.2], [-77.2, 17.7]],
  [[-24, 65.5], [-18, 66.5], [-13.5, 65], [-18, 63.4], [-22.5, 63.8]],
];

/** Where a town sits on the map. Towns in the same region are nudged apart so a short hop still shows. */
export function townGeo(town) {
  const base = GEO[town.key] || GEO.unknown, h = hashString(town.id) >>> 0;
  const far = Math.abs(base[0]) > 12 || base[1] < 45 ? 3 : 0.42;
  return [base[0] + ((h % 1000) / 1000 - 0.5) * far, base[1] + (((h >> 10) % 1000) / 1000 - 0.5) * far * 0.7];
}

/**
 * Draw the map with the journey from one town to another; u (0..1) is how far along the traveller is.
 * Returns nothing; the caller draws titles over it.
 */
export function drawRouteMap(g, w, h, dpr, from, to, u, icon) {
  const A = townGeo(from), B = townGeo(to);
  const lat0 = (A[1] + B[1]) / 2, kx = Math.cos(lat0 * Math.PI / 180);
  // the short way round the world
  let dl = B[0] - A[0];
  if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
  const lon0 = A[0] + dl / 2;
  const span = Math.max(Math.abs(dl) * kx, Math.abs(B[1] - A[1]) * 1.25, 2.2) * 1.75;
  const sc = Math.min(w, h * 1.5) / span;
  const X = lon => { let d = lon - lon0; if (d > 180) d -= 360; else if (d < -180) d += 360; return w / 2 + d * kx * sc; };
  const Y = lat => h * 0.54 - (lat - lat0) * sc;
  g.fillStyle = '#b9d2d6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = dpr;
  const step = span > 60 ? 20 : span > 20 ? 10 : span > 6 ? 2 : 1;
  for (let lon = Math.floor((lon0 - span) / step) * step; lon < lon0 + span; lon += step) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), h); g.stroke(); }
  for (let lat = Math.floor((lat0 - span) / step) * step; lat < lat0 + span; lat += step) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(w, Y(lat)); g.stroke(); }
  g.fillStyle = '#e4d6ac'; g.strokeStyle = '#8a7648'; g.lineWidth = 1.5 * dpr; g.lineJoin = 'round';
  for (const poly of LAND) {
    g.beginPath();
    let px = null;
    poly.forEach(([lon, lat], i) => { const x = X(lon), y = Y(lat); if (i && Math.abs(x - px) > w * 0.9) g.moveTo(x, y); else if (i) g.lineTo(x, y); else g.moveTo(x, y); px = x; });
    g.closePath(); g.fill(); g.stroke();
  }
  const ax = X(A[0]), ay = Y(A[1]), bx = ax + dl * kx * sc, by = Y(B[1]);
  const arc = Math.min(h * 0.22, Math.hypot(bx - ax, by - ay) * 0.28);
  const pt = v => [ax + (bx - ax) * v, ay + (by - ay) * v - Math.sin(v * Math.PI) * arc];
  g.strokeStyle = '#a8322a'; g.lineWidth = 4 * dpr; g.setLineDash([10 * dpr, 9 * dpr]); g.beginPath();
  for (let i = 0; i <= 40; i++) { const [x, y] = pt(u * i / 40); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.setLineDash([]);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [x, y, t, below] of [[ax, ay, from, ay >= by], [bx, by, to, by > ay]]) {
    g.fillStyle = '#2a2218'; g.beginPath(); g.arc(x, y, 7 * dpr, 0, 7); g.fill(); g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(x, y, 3 * dpr, 0, 7); g.fill();
    const ly = y + (below ? 30 : -34) * dpr;
    g.font = `700 ${Math.round(20 * dpr)}px "Fredoka", "Nunito", sans-serif`; g.lineWidth = 5 * dpr; g.strokeStyle = 'rgba(244,236,216,0.9)'; g.strokeText(t.name, x, ly); g.fillStyle = '#2a2218'; g.fillText(t.name, x, ly);
    g.font = `700 ${Math.round(13 * dpr)}px "Nunito", sans-serif`; g.strokeText(t.nation || '', x, ly + 20 * dpr); g.fillStyle = '#6a5a40'; g.fillText(t.nation || '', x, ly + 20 * dpr);
  }
  const [px, py] = pt(u), [qx, qy] = pt(Math.min(1, u + 0.01));
  g.save(); g.translate(px, py); g.rotate(Math.atan2(qy - py, qx - px)); g.font = `${Math.round(30 * dpr)}px sans-serif`; g.fillStyle = '#2a2218'; g.fillText(icon, 0, 0); g.restore();
}
