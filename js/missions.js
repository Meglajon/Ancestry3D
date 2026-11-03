// Missions turn exploring the tree into a game. Talk to an ancestor and they may ask you to find someone:
// a person born in a certain town, someone called Edith, someone who worked as a weaver, someone born in the
// 1840s, one of their own parents, or someone from a family they married into. Talk to anyone who fits and
// the mission is done. Rewards depend on the look: XP in Fluffy, ammo (and score) in Retro, coins on the Island.
import { firstName, findEvent, birthYear, seededRandom, hashString, relationship } from './ancestry.js';
import { missionSpeech } from './dialogue.js';

const town = indi => {
  const e = findEvent(indi, 'BIRT', 'CHR', 'BAPM');
  return e?.place ? e.place.split(',')[0].trim() : '';
};
const jobsOf = indi => indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim().toLowerCase());
const given = indi => (indi.given || '').split(/\s+/)[0];

/** Does this person fit the mission? */
export function fits(m, person) {
  const indi = person.indi;
  if (person.id === m.giverId) return false;
  switch (m.type) {
    case 'place': return town(indi).toLowerCase() === m.place.toLowerCase();
    case 'name': return given(indi).toLowerCase() === m.name.toLowerCase();
    case 'job': return jobsOf(indi).some(j => j.includes(m.job.toLowerCase()));
    case 'decade': { const y = birthYear(indi); return y != null && Math.floor(y / 10) * 10 === m.decade; }
    case 'relative': return person.id === m.targetId;
    case 'surname': return (indi.surname || '').toLowerCase() === m.surname.toLowerCase();
  }
  return false;
}

export const MAX_ACTIVE = 3;

export function createMissions({ tree, store, key }) {
  const saved = (() => { try { return JSON.parse(store.get(key) || 'null'); } catch (e) { return null; } })() || {};
  const st = { active: saved.active || [], done: new Set(saved.done || []), declined: new Set(), xp: saved.xp || 0, completed: saved.completed || 0 };
  const save = () => store.set(key, JSON.stringify({ active: st.active, done: [...st.done], xp: st.xp, completed: st.completed }));
  const people = [...tree.people.values()].filter(p => p.gen > 0);
  const rootSurname = (tree.people.get(tree.rootId)?.indi.surname || '').toLowerCase();

  // What this ancestor would ask of you (always the same ask for the same person).
  function missionFor(giver) {
    const rnd = seededRandom(hashString(giver.id + 'mission'));
    const others = people.filter(p => p.id !== giver.id);
    if (!others.length) return null;
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const options = [];
    const parentId = giver.layoutParents?.find(id => tree.people.has(id));
    if (parentId) { const p = tree.people.get(parentId); options.push({ type: 'relative', targetId: p.id, name: firstName(p.indi), rel: p.indi.sex === 'F' ? 'mother' : p.indi.sex === 'M' ? 'father' : 'parent' }); }
    const withTown = others.filter(p => town(p.indi) && town(p.indi).toLowerCase() !== town(giver.indi).toLowerCase());
    if (withTown.length) options.push({ type: 'place', place: town(pick(withTown).indi) });
    const named = others.filter(p => given(p.indi) && given(p.indi).toLowerCase() !== given(giver.indi).toLowerCase());
    if (named.length) options.push({ type: 'name', name: given(pick(named).indi) });
    const workers = others.filter(p => jobsOf(p.indi).length);
    if (workers.length) { const j = pick(jobsOf(pick(workers).indi)); if (j.length < 28) options.push({ type: 'job', job: j }); }
    const dated = others.filter(p => birthYear(p.indi) != null && Math.floor(birthYear(p.indi) / 10) !== Math.floor((birthYear(giver.indi) ?? -99) / 10));
    if (dated.length) options.push({ type: 'decade', decade: Math.floor(birthYear(pick(dated).indi) / 10) * 10 });
    const inlaws = others.filter(p => p.indi.surname && p.indi.surname.toLowerCase() !== rootSurname && p.indi.surname.toLowerCase() !== (giver.indi.surname || '').toLowerCase());
    if (inlaws.length) options.push({ type: 'surname', surname: pick(inlaws).indi.surname });
    if (!options.length) return null;
    const m = { ...pick(options), giverId: giver.id, giverName: firstName(giver.indi) };
    m.id = giver.id + ':' + m.type;
    m.label = label(m);
    return m;
  }
  function label(m) {
    return {
      place: `Find someone born in ${m.place}`, name: `Find someone called ${m.name}`, job: `Find a ${m.job}`,
      decade: `Find someone born in the ${m.decade}s`, relative: `Find ${m.giverName}'s ${m.rel}, ${m.name}`, surname: `Find one of the ${m.surname}s`,
    }[m.type];
  }
  return {
    state: st,
    get active() { return st.active; },
    /** A mission this person could offer right now, with what they say, or null. */
    offer(giver) {
      if (st.active.length >= MAX_ACTIVE || st.done.has(giver.id) || st.declined.has(giver.id) || st.active.some(m => m.giverId === giver.id)) return null;
      const m = missionFor(giver);
      if (!m) return null;
      // skip asks that nobody else in the tree can satisfy
      if (!people.some(p => fits(m, p))) return null;
      return { ...m, speech: missionSpeech(giver, m) };
    },
    accept(m) { const { speech, ...keep } = m; st.active.push(keep); save(); },
    decline(m) { st.declined.add(m.giverId); },
    /** Missions this person completes (removed from the active list). */
    check(person) {
      const done = st.active.filter(m => fits(m, person));
      if (!done.length) return [];
      st.active = st.active.filter(m => !done.includes(m));
      for (const m of done) { st.done.add(m.giverId); st.completed++; }
      save();
      return done;
    },
    addXP(n) { st.xp += n; save(); },
    reset() { st.active = []; st.done.clear(); st.declined.clear(); save(); },
  };
}
