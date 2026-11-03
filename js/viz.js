// The Visualisation tab: opens the galaxy or the growing tree full screen, with their controls, an info
// panel for whoever you tap, and video recording.
import { createGalaxy } from './galaxy.js';
import { createGrowTree } from './growtree.js';
import { CanvasRecorder, STAR_LEGEND, starColor, cssColor, fileSafe } from './vizkit.js';
import { displayName } from './ancestry.js';

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
    + (V?.kind === 'galaxy' ? '<button class="vgo" id="vFly">Fly to them</button>' : '');
  el.querySelector('.vx').onclick = () => { el.classList.add('hidden'); V?.view.select?.(null); };
  const fly = el.querySelector('#vFly');
  if (fly) fly.onclick = () => V?.view.focusSelected();
  el.classList.remove('hidden');
}

function legend(kind) {
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
        data, rootId, maxGen, onSelect: showInfo, onFrame: tick,
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
