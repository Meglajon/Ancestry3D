// Shared helpers for the Visualisation tab: filling in missing years, short person descriptions,
// star colours by century, and recording a canvas to a video file.
import { birthYear, deathYear, displayName, lifespan, findEvent, parentsOf } from './ancestry.js';
import { dateYear } from './gedcom.js';

/**
 * Birth and death years for the given ids, estimating any that are missing from their family
 * (a child born ~28 years after a parent, a marriage at ~25, a life of ~60 years).
 * Returns Map(id -> { birth, death, est }) where est is true when the birth year was guessed.
 */
export function estimateYears(data, ids) {
  const out = new Map();
  for (const id of ids) {
    const indi = data.individuals.get(id);
    const b = birthYear(indi), d = deathYear(indi);
    out.set(id, { birth: b, death: d, est: b == null });
  }
  const kidsOf = id => {
    const indi = data.individuals.get(id), kids = [];
    for (const fid of indi?.fams || []) for (const c of data.families.get(fid)?.children || []) kids.push(c);
    return kids;
  };
  const marriageYear = id => {
    for (const fid of data.individuals.get(id)?.fams || []) {
      const e = data.families.get(fid)?.events.find(ev => ev.tag === 'MARR');
      const y = e && dateYear(e.date);
      if (y) return y;
    }
    return null;
  };
  const known = id => out.get(id)?.birth ?? birthYear(data.individuals.get(id));
  for (let pass = 0; pass < 4; pass++) {
    for (const [id, r] of out) {
      if (r.birth != null) continue;
      const guesses = [];
      for (const c of kidsOf(id)) { const y = known(c); if (y != null) guesses.push(y - 28); }
      const p = parentsOf(data, id);
      for (const pid of [p.father, p.mother]) { const y = pid && known(pid); if (y != null) guesses.push(y + 28); }
      if (!guesses.length) { const m = marriageYear(id); if (m) guesses.push(m - 25); }
      if (!guesses.length && r.death != null) guesses.push(r.death - 60);
      if (guesses.length) r.birth = Math.round(guesses.reduce((a, b) => a + b, 0) / guesses.length);
    }
  }
  return out;
}

const place = (indi, ...tags) => {
  const e = findEvent(indi, ...tags);
  return e?.place ? e.place.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(', ') : '';
};

/** A few short lines about someone for info panels and captions. */
export function personLines(indi) {
  const lines = [];
  const life = lifespan(indi);
  const bp = place(indi, 'BIRT', 'CHR', 'BAPM'), dp = place(indi, 'DEAT', 'BURI');
  const b = birthYear(indi), d = deathYear(indi);
  if (b || bp) lines.push(`Born ${b || ''}${bp ? (b ? ' in ' : 'in ') + bp : ''}`.trim());
  if (d || dp) lines.push(`Died ${d || ''}${dp ? (d ? ' in ' : 'in ') + dp : ''}`.trim());
  const jobs = [...new Set(indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value))].slice(0, 2);
  if (jobs.length) lines.push(jobs.join(', '));
  return { name: displayName(indi), life, lines, birthPlace: bp };
}

// Older stars burn redder: 1500s deep orange through to pale blue for the 2000s.
const CENTURY = [[1450, [1.0, 0.42, 0.25]], [1600, [1.0, 0.6, 0.3]], [1750, [1.0, 0.82, 0.45]], [1850, [1.0, 0.96, 0.82]], [1925, [0.75, 0.88, 1.0]], [2010, [0.5, 0.7, 1.0]]];
export function starColor(year) {
  if (year == null) return [0.78, 0.7, 0.95];
  if (year <= CENTURY[0][0]) return CENTURY[0][1].slice();
  for (let i = 1; i < CENTURY.length; i++) {
    if (year <= CENTURY[i][0]) {
      const [y0, a] = CENTURY[i - 1], [y1, b] = CENTURY[i], k = (year - y0) / (y1 - y0);
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return CENTURY[CENTURY.length - 1][1].slice();
}
export const STAR_LEGEND = [['before 1600', 1550], ['1700s', 1750], ['1800s', 1850], ['1900s', 1930], ['2000s', 2010], ['year unknown', null]];
export const cssColor = rgb => `rgb(${rgb.map(v => Math.round(v * 255)).join(',')})`;

/** Records a canvas to a video file and offers it as a download when stopped. */
export class CanvasRecorder {
  constructor(canvas, fps = 30) { this.canvas = canvas; this.fps = fps; this.rec = null; this.chunks = []; this.started = 0; }
  static supported() { return typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream; }
  static mime() {
    for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* keep looking */ }
    }
    return '';
  }
  get recording() { return !!this.rec; }
  get seconds() { return this.rec ? (performance.now() - this.started) / 1000 : 0; }
  start() {
    if (this.rec || !CanvasRecorder.supported()) return false;
    const mime = CanvasRecorder.mime();
    try {
      const stream = this.canvas.captureStream(this.fps);
      this.rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : undefined);
    } catch (e) { this.rec = null; return false; }
    this.chunks = [];
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start(250);
    this.started = performance.now();
    return true;
  }
  /** Stops and resolves with { url, name, size } once the file is ready (or null if nothing was recorded). */
  stop(baseName = 'ancestry') {
    const rec = this.rec;
    if (!rec) return Promise.resolve(null);
    this.rec = null;
    return new Promise(resolve => {
      rec.onstop = () => {
        const type = rec.mimeType || 'video/webm';
        const blob = new Blob(this.chunks, { type });
        if (!blob.size) { resolve(null); return; }
        const name = `${baseName}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        resolve({ url, name, size: blob.size });
      };
      try { rec.stop(); } catch (e) { resolve(null); }
    });
  }
}

export const fileSafe = s => String(s).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'family';
