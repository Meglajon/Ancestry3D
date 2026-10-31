// Ancestor collection, relationships and ground layout. Generations are concentric rings laid flat on
// the ground, and every ancestor stands directly "outward" from the child they descend through.

import { dateYear } from './gedcom.js';

export function displayName(indi) {
  if (!indi) return 'Unknown';
  const parts = [indi.prefix, indi.given, indi.surname].filter(Boolean);
  let n = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (indi.suffix) n += ' ' + indi.suffix;
  return n || 'Unnamed soul';
}

export function firstName(indi) {
  if (!indi) return 'Unknown';
  return (indi.nickname || (indi.given || '').split(/\s+/)[0] || indi.surname || 'Stranger');
}

export function findEvent(indi, ...tags) {
  if (!indi) return null;
  for (const t of tags) {
    const e = indi.events.find(ev => ev.tag === t);
    if (e) return e;
  }
  return null;
}

export function birthYear(indi) {
  const e = findEvent(indi, 'BIRT', 'CHR', 'BAPM');
  return e ? dateYear(e.date) : null;
}
export function deathYear(indi) {
  const e = findEvent(indi, 'DEAT', 'BURI', 'CREM');
  return e ? dateYear(e.date) : null;
}

export function lifespan(indi) {
  const b = birthYear(indi), d = deathYear(indi);
  if (b && d) return `${b}–${d}`;
  if (b) return `b.${b}`;
  if (d) return `d.${d}`;
  return '';
}

// Port of AncestryUtil.CalculateRelationship with friendlier wording.
export function relationship(gen, sex) {
  const male = sex === 'M', female = sex === 'F';
  const base = male ? ['you', 'father', 'grandfather'] : female ? ['you', 'mother', 'grandmother'] : ['you', 'parent', 'grandparent'];
  if (gen <= 2) return base[gen];
  const greats = gen - 2;
  if (greats === 1) return 'great-' + base[2];
  if (greats === 2) return 'great-great-' + base[2];
  return `${greats}× great-` + base[2];
}

// Ahnentafel number -> "your father's mother's father"
export function pathPhrase(ahnen) {
  if (ahnen <= 1) return '';
  const bits = ahnen.toString(2).slice(1);
  return bits.split('').map(b => (b === '0' ? 'father' : 'mother')).join("'s ");
}

export function parentsOf(data, id) {
  const indi = data.individuals.get(id);
  if (!indi || !indi.famc) return { father: null, mother: null };
  const fam = data.families.get(indi.famc);
  if (!fam) return { father: null, mother: null };
  return {
    father: fam.husb && data.individuals.has(fam.husb) ? fam.husb : null,
    mother: fam.wife && data.individuals.has(fam.wife) ? fam.wife : null,
  };
}

// Count how many ancestors each individual has within `maxGen` (used for the root picker).
export function countAncestors(data, rootId, maxGen) {
  const seen = new Set([rootId]);
  let frontier = [rootId];
  for (let g = 0; g < maxGen && frontier.length; g++) {
    const next = [];
    for (const id of frontier) {
      const p = parentsOf(data, id);
      for (const pid of [p.father, p.mother]) if (pid && !seen.has(pid)) { seen.add(pid); next.push(pid); }
    }
    frontier = next;
  }
  return seen.size;
}

/**
 * Walk the ancestors of rootId breadth-first so each person is first met at their closest generation.
 * Returns { people: Map(id -> person), edges: [{child, parent, side}], maxGen }.
 */
export function collectAncestors(data, rootId, maxGen) {
  const people = new Map();
  const queue = [{ id: rootId, child: null, ahnen: 1, gen: 0 }];
  for (let qi = 0; qi < queue.length; qi++) {
    const { id, child, ahnen, gen } = queue[qi];
    if (people.has(id)) continue;
    const indi = data.individuals.get(id);
    if (!indi) continue;
    people.set(id, { id, indi, gen, ahnen, primaryChild: child, father: null, mother: null, lines: 0, layoutParents: [] });
    if (gen >= maxGen) continue;
    const p = parentsOf(data, id);
    if (p.father) queue.push({ id: p.father, child: id, ahnen: ahnen * 2, gen: gen + 1 });
    if (p.mother) queue.push({ id: p.mother, child: id, ahnen: ahnen * 2 + 1, gen: gen + 1 });
  }

  const edges = [];
  for (const person of people.values()) {
    const p = parentsOf(data, person.id);
    if (p.father && people.has(p.father)) { person.father = p.father; edges.push({ child: person.id, parent: p.father, side: 'paternal' }); }
    if (p.mother && people.has(p.mother)) { person.mother = p.mother; edges.push({ child: person.id, parent: p.mother, side: 'maternal' }); }
  }
  // Children (within the set) of each person, for counting lines of descent.
  const kids = new Map();
  for (const e of edges) { if (!kids.has(e.parent)) kids.set(e.parent, []); kids.get(e.parent).push(e.child); }
  const memo = new Map();
  const visiting = new Set();
  const lines = id => {
    if (id === rootId) return 1;
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) return 0; // malformed (cyclic) file
    visiting.add(id);
    let n = 0;
    for (const c of kids.get(id) || []) n += lines(c);
    visiting.delete(id);
    memo.set(id, n);
    return n;
  };
  let maxGenFound = 0;
  for (const person of people.values()) {
    person.lines = lines(person.id);
    person.childrenInTree = kids.get(person.id) || [];
    maxGenFound = Math.max(maxGenFound, person.gen);
    if (person.primaryChild) people.get(person.primaryChild).layoutParents.push(person.id);
  }
  // Father before mother inside each wedge.
  for (const person of people.values()) {
    person.layoutParents.sort((a, b) => people.get(a).ahnen - people.get(b).ahnen);
  }
  return { people, edges, maxGen: maxGenFound, rootId };
}

/**
 * Ground layout. Each person owns an angular wedge proportional to the number of family lines behind
 * them; parents split their child's wedge (father first). Ring radii grow so neighbours never crowd.
 */
export function layoutAncestors(tree, opts = {}) {
  const ringGap = opts.ringGap ?? 7;
  const minSpacing = opts.minSpacing ?? 2.8;
  const { people, rootId } = tree;
  const weight = new Map();
  const w = id => {
    if (weight.has(id)) return weight.get(id);
    const p = people.get(id);
    let s = 0;
    for (const pid of p.layoutParents) s += w(pid);
    const v = Math.max(1, s);
    weight.set(id, v);
    return v;
  };
  w(rootId);

  // Start the father's side on the left of the player's initial view (player looks along -Z).
  const assign = (id, start, span) => {
    const p = people.get(id);
    p.angle = start + span / 2;
    p.wedgeStart = start;
    p.wedgeSpan = span;
    const total = p.layoutParents.reduce((a, pid) => a + w(pid), 0) || 1;
    let a = start;
    for (const pid of p.layoutParents) {
      const s = span * (w(pid) / total);
      assign(pid, a, s);
      a += s;
    }
  };
  assign(rootId, Math.PI, Math.PI * 2);

  // Group each generation into units. Normally a unit is one person; with couples on, the father and
  // mother of the same child form one unit standing side by side where their two wedges meet.
  const couples = !!opts.couples;
  const coupleGap = opts.coupleGap ?? 1.4;
  const unitSpacing = couples ? minSpacing + coupleGap : minSpacing;
  const byGen = [];
  for (const p of people.values()) {
    if (p.gen === 0) continue;
    (byGen[p.gen] ||= []);
  }
  const seenUnit = new Set();
  for (const p of people.values()) {
    if (p.gen === 0 || seenUnit.has(p.id)) continue;
    let members = [p];
    if (couples && p.primaryChild) {
      const sibs = people.get(p.primaryChild).layoutParents.map(id => people.get(id)).filter(q => q.gen === p.gen);
      if (sibs.length === 2) members = sibs;
    }
    members.forEach(m => seenUnit.add(m.id));
    const angle = members.length === 2 ? members[0].wedgeStart + members[0].wedgeSpan : p.angle;
    byGen[p.gen].push({ members, angle });
  }
  // Crowded generations are split into up to 5 staggered rows instead of pushing the ring far out,
  // so a big tree stays walkable.
  const rowDepth = opts.rowDepth ?? 2.6;
  const maxRows = opts.maxRows ?? 5;
  const radii = [0];
  const rows = [1];
  let outer = 0;
  for (let g = 1; g < byGen.length; g++) {
    const ring = (byGen[g] || []).slice().sort((a, b) => a.angle - b.angle);
    let minSep = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i].angle, b = i + 1 < ring.length ? ring[i + 1].angle : ring[0].angle + Math.PI * 2;
      if (ring.length > 1) minSep = Math.min(minSep, b - a);
    }
    const needed = isFinite(minSep) && minSep > 0 ? unitSpacing / minSep : 0;
    const base = outer + ringGap;
    let k = 1;
    if (needed > base) k = Math.min(maxRows, Math.ceil(needed / base));
    if (k > ring.length) k = Math.max(1, ring.length);
    radii[g] = Math.max(base, needed / k);
    rows[g] = k;
    outer = radii[g] + (k - 1) * rowDepth;
    ring.forEach((u, i) => { u.row = k > 1 ? i % k : 0; });
    // the ring wraps around: the last units must not share a row with the first ones
    if (k > 1 && ring.length > k) {
      const n = ring.length;
      let extra = k;
      for (let i = n - k; i < n; i++) {
        for (let j = 0; j < k; j++) {
          if (ring[i].row === ring[j].row && (n - i + j) < k) { ring[i].row = extra++; break; }
        }
      }
      outer = radii[g] + (extra - 1) * rowDepth;
    }
    for (const u of ring) {
      const r = radii[g] + u.row * rowDepth;
      const cx = Math.cos(u.angle) * r, cz = Math.sin(u.angle) * r;
      const tx = -Math.sin(u.angle), tz = Math.cos(u.angle); // tangent, toward increasing angle
      u.members.forEach((m, i) => {
        const off = u.members.length === 2 ? (i === 0 ? -coupleGap / 2 : coupleGap / 2) : 0;
        m.row = u.row;
        m.radius = r;
        m.x = cx + tx * off;
        m.z = cz + tz * off;
        m.spouseInUnit = u.members.length === 2 ? u.members[1 - i].id : null;
      });
    }
  }
  const root = people.get(rootId);
  root.radius = 0; root.x = 0; root.z = 0; root.row = 0;
  tree.radii = radii;
  tree.rows = rows;
  tree.worldRadius = (outer || ringGap) + 10;
  return tree;
}

export function familiesAsSpouse(data, id) {
  const indi = data.individuals.get(id);
  if (!indi) return [];
  return indi.fams.map(fid => data.families.get(fid)).filter(Boolean);
}

// Small deterministic hash used to vary looks and lines of dialogue per person.
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
