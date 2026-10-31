import { readFileSync } from 'node:fs';
import { parseGedcom, datePhrase, shortDate, dateYear } from '../js/gedcom.js';
import { collectAncestors, layoutAncestors, relationship, pathPhrase, displayName } from '../js/ancestry.js';
import assert from 'node:assert/strict';

const data = parseGedcom(readFileSync(new URL('../sample/demo.ged', import.meta.url), 'utf8'));
const tree = layoutAncestors(collectAncestors(data, '@I1@', 12));
console.log('individuals', data.individuals.size, 'ancestors', tree.people.size, 'maxGen', tree.maxGen, 'radii', tree.radii.map(r=>r.toFixed(1)).join(','));
const collapsed = [...tree.people.values()].filter(p => p.lines > 1);
console.log('collapse:', collapsed.map(p => `${displayName(p.indi)} x${p.lines}`).join('; '));
assert.ok(collapsed.length >= 2);
assert.equal(datePhrase('12 MAR 1872'), 'on 12 March 1872');
assert.equal(datePhrase('ABT 1850'), 'around 1850');
assert.equal(datePhrase('BET 1850 AND 1860'), 'between 1850 and 1860');
assert.equal(datePhrase('MAR 1872'), 'in March 1872');
assert.equal(shortDate('ABT 1850'), 'c.1850');
assert.equal(dateYear('1749/50'), 1749);
assert.equal(relationship(4, 'F'), 'great-great-grandmother');
assert.equal(relationship(6, 'M'), '4× great-grandfather');
assert.equal(pathPhrase(13), "mother's father's mother");
// CRLF + CONC/CONT + note refs + odd spacing
const t = parseGedcom("0 HEAD\r\n0 @N1@ NOTE Line one\r\n1 CONT line two\r\n1 CONC  joined\r\n0 @X@ INDI\r\n1 NAME  Anne  /O'Neil/\r\n1 SEX F\r\n1 NOTE @N1@\r\n1 BIRT\r\n2 DATE 1 JAN 1900\r\n0 TRLR");
const x = t.individuals.get('@X@');
assert.equal(x.surname, "O'Neil");
assert.equal(x.notes[0], 'Line one\nline two joined');
assert.equal(x.events[0].date, '1 JAN 1900');
// layout sanity: nobody closer than 2.5m to someone else
const arr = [...tree.people.values()];
let minD = 1e9;
for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) minD = Math.min(minD, Math.hypot(arr[i].x - arr[j].x, arr[i].z - arr[j].z));
console.log('min NPC spacing', minD.toFixed(2));
assert.ok(minD > 2.5);
console.log('ok');

// Big full tree stays compact and uncrowded
{
  const L = ['0 HEAD']; let id = 1, fid = 1;
  const make = (gen, y) => { const me = id++; L.push(`0 @I${me}@ INDI`, `1 NAME P${me} /F${gen}/`, `1 SEX ${me % 2 ? 'F' : 'M'}`, '1 BIRT', `2 DATE ${y}`);
    if (gen < 10) { const f = make(gen + 1, y - 28), m = make(gen + 1, y - 26); const F = fid++; L.push(`0 @F${F}@ FAM`, `1 HUSB @I${f}@`, `1 WIFE @I${m}@`, `1 CHIL @I${me}@`); } return me; };
  make(0, 2000);
  const big = layoutAncestors(collectAncestors(parseGedcom(L.join('\n')), '@I1@', 14));
  const pts = [...big.people.values()];
  // grid-bucket nearest-neighbour check
  const cell = 3, grid = new Map();
  for (const p of pts) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); (grid.get(k) || grid.set(k, []).get(k)).push(p); }
  let md = 1e9;
  for (const p of pts) { const cx = Math.floor(p.x / cell), cz = Math.floor(p.z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get((cx + i) + ',' + (cz + j)) || []) if (q !== p) md = Math.min(md, Math.hypot(p.x - q.x, p.z - q.z)); }
  console.log('full 10-gen tree:', pts.length, 'people, world radius', big.worldRadius.toFixed(0), 'm, rows', big.rows.join(','), 'min spacing', md.toFixed(2));
  assert.ok(md > 2.5);
  assert.ok(big.worldRadius < 160);
}
console.log('ok big');

// Couples mode: spouses stand together, everyone else stays apart
{
  const t2 = layoutAncestors(collectAncestors(data, '@I1@', 12), { couples: true });
  const arr2 = [...t2.people.values()].filter(p => p.gen > 0);
  let pairs = 0, minOther = 1e9;
  for (let i = 0; i < arr2.length; i++) for (let j = i + 1; j < arr2.length; j++) {
    const d = Math.hypot(arr2[i].x - arr2[j].x, arr2[i].z - arr2[j].z);
    if (arr2[i].spouseInUnit === arr2[j].id) { pairs++; assert.ok(Math.abs(d - 1.4) < 0.01); }
    else minOther = Math.min(minOther, d);
  }
  console.log('couples mode:', pairs, 'couples side by side; min distance between others', minOther.toFixed(2), 'radius', t2.worldRadius.toFixed(0));
  assert.ok(pairs > 20 && minOther > 2.5);
}

// Half fan and tree layouts: nobody crowded, everyone ahead of the root, sensible size
{
  const L = ['0 HEAD']; let id = 1, fid = 1;
  const make = (gen, y) => { const me = id++; L.push(`0 @I${me}@ INDI`, `1 NAME P${me} /F${gen}/`, `1 SEX ${me % 2 ? 'F' : 'M'}`, '1 BIRT', `2 DATE ${y}`);
    if (gen < 9) { const f = make(gen + 1, y - 28), m = make(gen + 1, y - 26); const F = fid++; L.push(`0 @F${F}@ FAM`, `1 HUSB @I${f}@`, `1 WIFE @I${m}@`, `1 CHIL @I${me}@`); } return me; };
  make(0, 2000);
  const big = parseGedcom(L.join('\n'));
  const minDist = (pts, skipSpouse) => {
    const cell = 3, grid = new Map(); let md = 1e9;
    for (const p of pts) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); (grid.get(k) || grid.set(k, []).get(k)).push(p); }
    for (const p of pts) { const cx = Math.floor(p.x / cell), cz = Math.floor(p.z / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get((cx + i) + ',' + (cz + j)) || []) if (q !== p && !(skipSpouse && p.spouseInUnit === q.id)) md = Math.min(md, Math.hypot(p.x - q.x, p.z - q.z)); }
    return md;
  };
  for (const shape of ['half', 'tree']) for (const [label, d] of [['demo', data], ['full 9-gen', big]]) for (const couples of [false, true]) {
    const t = layoutAncestors(collectAncestors(d, d === data ? '@I1@' : '@I1@', 12), { shape, couples });
    const pts = [...t.people.values()];
    const root = t.people.get('@I1@');
    const md = minDist(pts.filter(p => p.gen > 0), couples);
    const ahead = pts.every(p => p.gen === 0 || p.z < root.z + 1);
    console.log(`${shape} ${label}${couples ? ' couples' : ''}: ${pts.length} people, world radius ${t.worldRadius.toFixed(0)} m, min spacing ${md.toFixed(2)}, all ahead ${ahead}`);
    assert.ok(md > 2.5, 'spacing');
    assert.ok(ahead, 'ahead of root');
    assert.ok(Math.abs(t.hub.x - root.x) < 1e-9 && Math.abs(t.hub.z - root.z) < 1e-9);
  }
}
console.log('ok shapes');
