// The Visualisation tab: opens the galaxy or the growing tree full screen, with their controls, an info
// panel for whoever you tap, and video recording.
import { createGalaxy } from './galaxy.js';
import { createGrowTree } from './growtree.js';
import { CanvasRecorder, STAR_LEGEND, starColor, cssColor, fileSafe } from './vizkit.js';
import { displayName } from './ancestry.js';
import { TREE_STYLES } from './treeart.js';
import { VERSES, VERSE_COPYRIGHT } from './verses.js';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
const SEASONS = Object.keys(TREE_STYLES);
let season = SEASONS.includes(store.get('a3d:season')) ? store.get('a3d:season') : 'spring';
let versesOn = store.get('a3d:versesOn') !== '0';
function chosenVerseIds() {
  try { const ids = JSON.parse(store.get('a3d:verses') || 'null'); if (Array.isArray(ids)) return new Set(ids); } catch (e) { /* fall through */ }
  return new Set(VERSES.filter(v => v.on).map(v => v.id));
}
const chosenVerses = () => { const ids = chosenVerseIds(); return VERSES.filter(v => ids.has(v.id)); };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let V = null; // { kind, view, recorder, onClose, base }

function status(text, sticky = false) {
  const el = $('vStatus');
  el.textContent = text || '';
  clearTimeout(status.t);
  if (text && !sticky) status.t = setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 6000);
}

function showInfo(d) {
  const el = $('vInfo');
  if (!d) { el.classList.add('hidden'); return; }
  el.innerHTML = `<button class="vx" aria-label="Close">✕</button><b>${esc(d.name)}</b><div class="vrel">${esc([d.rel, d.life].filter(Boolean).join(' · '))}</div>`
    + d.lines.map(l => `<div>${esc(l)}</div>`).join('') + (d.estimated ? `<div class="vest">${esc(d.estimated)}</div>` : '')
    + (V?.kind === 'galaxy' ? '<button class="vgo" id="vFly">Fly-through to them</button>' : '');
  el.querySelector('.vx').onclick = () => { el.classList.add('hidden'); V?.view.select?.(null); };
  const fly = el.querySelector('#vFly');
  if (fly) fly.onclick = () => V?.view.tourTo();
  el.classList.remove('hidden');
}

function legend(kind) {
  if (kind === 'tree') {
    const st = TREE_STYLES[season];
    return st.legend.map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`).join('')
      + '<div><i style="background:#cdb8ee"></i>birth year estimated</div><div><i style="background:rgba(255,236,150,0.9)"></i>alive in that year</div>';
  }
  if (kind === 'galaxy') {
    return '<div class="vlh">Stars by birth year</div>' + STAR_LEGEND.map(([l, y]) => `<div><i style="background:${cssColor(starColor(y))}"></i>${l}</div>`).join('')
      + '<div><i class="ln" style="background:#5a8cff"></i>through a father</div><div><i class="ln" style="background:#ff73b3"></i>through a mother</div>';
  }
  return '<div><i style="background:#4f8ae8"></i>man</div><div><i style="background:#ee6f9e"></i>woman</div>'
    + '<div><i style="background:#b9a6d8"></i>birth year estimated</div><div><i style="background:rgba(255,230,140,0.8)"></i>alive in that year</div>';
}

async function toggleRecord() {
  if (!V) return;
  if (V.recorder?.recording) { await finishRecording(); return; }
  const target = V.kind === 'galaxy' ? V.view.overlay : V.view.canvas;
  V.recorder = new CanvasRecorder(target, 30);
  if (V.kind === 'galaxy') V.view.setRecording(true);
  if (!V.recorder.start()) { V.view.setRecording?.(false); status('Recording is not supported in this browser.'); return; }
  if (V.kind === 'galaxy') { if (!V.view.touring) V.view.startTour(); }
  else { V.view.restart(); V.view.play(); }
  $('vRec').classList.add('on');
  status('Recording… it stops by itself at the end.', true);
}
async function finishRecording() {
  if (!V?.recorder?.recording) return;
  const r = V.recorder;
  $('vRec').classList.remove('on');
  $('vRec').textContent = '● Record video';
  if (V.kind === 'galaxy') V.view.setRecording(false);
  status('Saving the video…', true);
  const out = await r.stop(`${V.base}-${V.kind === 'galaxy' ? 'galaxy' : 'growing-tree'}`);
  status(out ? `Saved ${out.name} (${(out.size / 1048576).toFixed(1)} MB) to your downloads.` : 'Nothing was recorded.');
}

function tick(state) {
  if (!V) return;
  if (V.recorder?.recording) $('vRec').textContent = `■ Stop ${Math.floor(V.recorder.seconds / 60)}:${String(Math.floor(V.recorder.seconds % 60)).padStart(2, '0')}`;
  if (V.kind === 'galaxy') {
    // while the 'everyone' galaxy settles, say so; clear it once the stars stop moving
    if (state) { V.settling = true; if (!V.recorder?.recording) status(state, true); }
    else if (V.settling) { V.settling = false; status(''); }
    $('vTour').textContent = V.view.touring ? '■ Stop' : '▶ Fly-through';
  } else {
    $('vPlay').textContent = state.playing ? '❚❚ Pause' : '▶ Play';
    const sc = $('vScrub');
    if (document.activeElement !== sc) sc.value = String(Math.round(state.T));
  }
}

export function openViz({ kind, scope = 'ancestors', data, rootId, maxGen, onClose }) {
  closeViz(true);
  try { document.fonts?.load('italic 500 20px Lora').catch(() => {}); } catch (e) { /* fonts are optional */ }
  const host = $('vizHost');
  host.innerHTML = '';
  $('viz').classList.remove('hidden');
  $('viz').dataset.kind = kind;
  const who = displayName(data.individuals.get(rootId));
  $('vTitle').textContent = kind === 'galaxy' ? `Family galaxy · ${who}` : `Growing tree · ${who}`;
  $('vLegend').innerHTML = legend(kind);
  showInfo(null);
  status('');
  V = { kind, onClose, base: fileSafe(who), recorder: null };
  $('vRec').classList.toggle('hidden', !CanvasRecorder.supported());
  $('vRec').classList.remove('on'); $('vRec').textContent = '● Record video';
  try {
    if (kind === 'galaxy') {
      V.view = createGalaxy(host, {
        data, rootId, maxGen, scope, onSelect: showInfo, onFrame: tick,
        onTourEnd: () => { if (V?.recorder?.recording) finishRecording(); },
      });
      if (scope === 'all' && V.view.total > V.view.count) status(`Showing ${V.view.count.toLocaleString()} of ${V.view.total.toLocaleString()} people (the closest relatives first).`);
    } else {
      V.view = createGrowTree(host, {
        data, rootId, maxGen, onSelect: showInfo, onFrame: tick, style: season, verses: chosenVerses(), versesOn,
        onEnd: () => { if (V?.recorder?.recording) setTimeout(finishRecording, 1500); },
      });
      const [a, b] = V.view.range;
      Object.assign($('vScrub'), { min: a, max: b, value: b });
      V.view.setSpeed(+($('vSpeed').dataset.x || 1));
      V.view.setSpacing(document.querySelector('#vSpace button.on')?.dataset.space);
      V.view.setDirection(document.querySelector('#vDir button.on')?.dataset.dir);
      V.view.play();
    }
  } catch (err) {
    console.error(err);
    status(`Could not draw this: ${err.message}`, true);
  }
}

export function closeViz(silent) {
  if (!V) return;
  const v = V;
  V = null;
  if (v.recorder?.recording) v.recorder.stop(`${v.base}-${v.kind}`);
  try { v.view?.dispose(); } catch (e) { /* already gone */ }
  $('viz').classList.add('hidden');
  if (!silent) v.onClose?.();
}
export const vizOpen = () => !!V;
export const vizView = () => V?.view;

// ---- controls ----
$('vClose').onclick = () => closeViz();
$('vTour').onclick = () => { if (!V || V.kind !== 'galaxy') return; if (V.view.touring) V.view.stopTour(); else V.view.startTour(); };
$('vRec').onclick = toggleRecord;
$('vPlay').onclick = () => { if (!V?.view?.state) return; if (V.view.state.playing) V.view.pause(); else V.view.play(); };
$('vRestart').onclick = () => { V?.view?.restart?.(); V?.view?.play?.(); };
$('vScrub').addEventListener('input', e => { if (V?.view?.seek) { V.view.pause(); V.view.seek(+e.target.value); } });
for (const b of document.querySelectorAll('#vDir button')) b.onclick = () => {
  document.querySelectorAll('#vDir button').forEach(x => x.classList.toggle('on', x === b));
  V?.view?.setDirection?.(b.dataset.dir); V?.view?.play?.();
};
function showSeason() {
  const icons = { spring: '🌸', summer: '☀️', autumn: '🍂', night: '🌙' };
  $('vSeason').textContent = `${icons[season]} ${TREE_STYLES[season].name}`;
  $('vVerse').classList.toggle('lit', versesOn);
  $('vVerse').setAttribute('aria-pressed', versesOn);
}
$('vSeason').onclick = () => {
  season = SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length];
  store.set('a3d:season', season);
  showSeason();
  V?.view?.setStyle?.(season);
  if (V?.kind === 'tree') $('vLegend').innerHTML = legend('tree');
};
$('vVerse').onclick = () => {
  versesOn = !versesOn;
  store.set('a3d:versesOn', versesOn ? '1' : '0');
  $('versesToggle').checked = versesOn;
  showSeason();
  V?.view?.setVersesOn?.(versesOn);
};
showSeason();

// ---- choosing the Bible verses (Visualisation tab in the menu) ----
function renderVersePicker() {
  const ids = chosenVerseIds();
  $('verseList').innerHTML = VERSES.map(v => `<label class="verse"><input type="checkbox" data-id="${v.id}"${ids.has(v.id) ? ' checked' : ''}><span><b>${esc(v.ref)}</b> ${esc(v.text)}</span></label>`).join('');
  $('verseSummary').textContent = `Choose verses (${ids.size} of ${VERSES.length} chosen)`;
  $('versesToggle').checked = versesOn;
  $('verseField').classList.toggle('off', !versesOn);
}
$('verseList').addEventListener('change', () => {
  const ids = [...$('verseList').querySelectorAll('input:checked')].map(i => i.dataset.id);
  store.set('a3d:verses', JSON.stringify(ids));
  $('verseSummary').textContent = `Choose verses (${ids.length} of ${VERSES.length} chosen)`;
});
$('versesToggle').addEventListener('change', e => {
  versesOn = e.target.checked;
  store.set('a3d:versesOn', versesOn ? '1' : '0');
  $('verseField').classList.toggle('off', !versesOn);
  showSeason();
});
$('verseAll').onclick = e => { e.preventDefault(); $('verseList').querySelectorAll('input').forEach(i => { i.checked = true; }); $('verseList').dispatchEvent(new Event('change')); };
$('verseNone').onclick = e => { e.preventDefault(); $('verseList').querySelectorAll('input').forEach(i => { i.checked = false; }); $('verseList').dispatchEvent(new Event('change')); };
$('verseCopyright').textContent = VERSE_COPYRIGHT;
renderVersePicker();

for (const b of document.querySelectorAll('#vSpace button')) b.onclick = () => {
  document.querySelectorAll('#vSpace button').forEach(x => x.classList.toggle('on', x === b));
  V?.view?.setSpacing?.(b.dataset.space);
};
const SPEEDS = [0.5, 1, 2, 4];
$('vSpeed').onclick = () => {
  const cur = +($('vSpeed').dataset.x || 1), next = SPEEDS[(SPEEDS.indexOf(cur) + 1) % SPEEDS.length];
  $('vSpeed').dataset.x = next; $('vSpeed').textContent = `${next}×`;
  V?.view?.setSpeed?.(next);
};
document.addEventListener('keydown', e => {
  if (!V) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (V.view.touring) V.view.stopTour(); else closeViz(); }
  else if (e.key === ' ' && V.kind === 'tree' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); $('vPlay').click(); }
}, true);
