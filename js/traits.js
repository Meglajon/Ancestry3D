// Per-person traits worked out from the GEDCOM record: where they come from, what work they did,
// how much schooling that suggests, the decade they would have dressed in, and their colouring.
import { resolvePlace, TONE_RAMP, TONE_GROUPS, TONE_TINT, HAIR_BY_GROUP } from './places.js';
import { dateYear } from './gedcom.js';
import { findEvent, birthYear, deathYear, parentsOf, hashString, seededRandom } from './ancestry.js';
import * as THREE from 'three';

// ---- occupations ----
// [regex, category, class tier]. Tiers: labour < skilled < trade < gentry
const JOBS = [
  [/\b(coal ?miner|collier|miner|hewer|pit|putter|drawer|banksman|onsetter|quarr(y|ier))/, 'miner', 'labour'],
  [/\b(weaver|spinner|piecer|doffer|carder|comber|mill ?hand|mill ?worker|winder|reeler|throstle|warper|minder|beamer|cotton|wool|worsted|flax|silk|textile|fustian|card room|power.?loom|hand.?loom)/, 'textile', 'labour'],
  [/\b(ag(ricultural)? ?lab|farm ?lab|labourer|laborer|navvy|husbandman|hind|ploughman|plowman|carter|drover|shepherd|cowman|cottager|gardener)/, 'farmlab', 'labour'],
  [/\b(farmer|yeoman|grazier|smallholder|crofter|tenant)/, 'farmer', 'skilled'],
  [/\b(servant|maid|housemaid|kitchen|cook|charwoman|char|laundress|washerwoman|nurse ?maid|scullery|footman|groom|coachman|butler|housekeeper|domestic)/, 'servant', 'labour'],
  [/\b(fisher|fisherman|trawler|net ?maker|fish ?wife|gutter)/, 'fishing', 'labour'],
  [/\b(docker|dock ?lab|stevedore|porter|lighterman|waterman)/, 'dock', 'labour'],
  [/\b(seaman|sailor|mariner|master mariner|ship|boatman|bargee|keelman)/, 'sea', 'skilled'],
  [/\b(railway|engine driver|fireman|signalman|platelayer|guard|plate ?layer|locomotive|station master)/, 'rail', 'skilled'],
  [/\b(blacksmith|smith|farrier|wheelwright|cooper|carpenter|joiner|cabinet|mason|bricklayer|plasterer|slater|thatcher|plumber|glazier|painter|builder)/, 'craft', 'skilled'],
  [/\b(moulder|fitter|turner|boilermaker|engineer|puddler|forge|iron|steel|nailer|chain ?maker|brass|tool ?maker|machinist|mechanic|electrician|welder)/, 'metal', 'skilled'],
  [/\b(potter|pottery|thrower|placer|kiln|saggar|glass)/, 'pottery', 'skilled'],
  [/\b(shoemaker|cordwainer|tailor|dressmaker|seamstress|milliner|hatter|clogger|saddler|tanner|currier|baker|butcher|brewer|miller|maltster|confectioner)/, 'trade', 'skilled'],
  [/\b(grocer|shopkeeper|shop ?keeper|draper|publican|innkeeper|licensed|victualler|beer ?seller|hawker|dealer|merchant|chemist|druggist|pawnbroker|tobacconist|stationer|ironmonger)/, 'shop', 'trade'],
  [/\b(clerk|bookkeeper|book.?keeper|typist|secretary|telephonist|cashier|accountant|civil servant|insurance|agent|post ?man|postmistress|policeman|constable)/, 'clerk', 'trade'],
  [/\b(teacher|schoolmaster|schoolmistress|governess|tutor|pupil teacher|lecturer)/, 'teacher', 'trade'],
  [/\b(nurse|midwife)/, 'nurse', 'trade'],
  [/\b(soldier|private|corporal|sergeant|gunner|sapper|trooper|army|regiment|militia|royal navy|marine)/, 'military', 'labour'],
  [/\b(officer|captain|major|colonel|lieutenant|commander|admiral|general)/, 'officer', 'gentry'],
  [/\b(clergyman|clerk in holy orders|vicar|rector|curate|minister|priest|pastor|chaplain|reverend|bishop)/, 'clergy', 'gentry'],
  [/\b(surgeon|physician|doctor|apothecary|dentist)/, 'medical', 'gentry'],
  [/\b(solicitor|attorney|barrister|lawyer|notary|magistrate|judge)/, 'law', 'gentry'],
  [/\b(gentleman|gentlewoman|esquire|esq|landowner|landed|proprietor|independent means|annuitant|living on own means|own means|lady|baronet|knight)/, 'gentleman', 'gentry'],
  [/\b(manufacturer|mill owner|industrialist|banker|architect|surveyor|engineer \(civil\)|civil engineer|ship ?owner)/, 'owner', 'gentry'],
  [/\b(software|developer|programmer|it |analyst|manager|director|consultant|designer|pharmacist|scientist|professor)/, 'modern', 'trade'],
];

export function classifyJob(text) {
  const t = ' ' + (text || '').toLowerCase() + ' ';
  for (const [re, cat, tier] of JOBS) if (re.test(t)) return { cat, tier };
  return null;
}

function occupationsOf(indi) {
  return indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value);
}

const TIER_RANK = { labour: 0, skilled: 1, trade: 2, gentry: 3 };

/** Compute traits for every person in the tree (mutates person.traits). */
export function computeTraits(tree, data) {
  const people = [...tree.people.values()];
  for (const p of people) {
    const indi = p.indi;
    const birth = findEvent(indi, 'BIRT', 'CHR', 'BAPM');
    let plac = birth?.place, placeInferred = false;
    if (!plac) { plac = (findEvent(indi, 'RESI', 'CENS') || findEvent(indi, 'DEAT', 'BURI'))?.place; placeInferred = !!plac; }
    const place = resolvePlace(plac);
    const jobs = occupationsOf(indi);
    let job = null;
    for (const j of jobs) { const c = classifyJob(j); if (c && (!job || TIER_RANK[c.tier] > TIER_RANK[job.tier])) job = { ...c, title: j }; }
    const notes = indi.notes.join(' ').toLowerCase();
    const by = birthYear(indi);
    const dy = deathYear(indi);
    p.traits = { place, placeInferred, plac: plac || '', job, jobs, birthYear: by, deathYear: dy,
      illiterate: /\b(signed|made) (with )?(an |his |her )?(x|mark)\b|illiterate|could not (read|write)/.test(notes) };
  }
  // Infer missing class from father, then spouse; otherwise from period.
  for (const p of people) {
    const t = p.traits;
    if (t.job) { t.tier = t.job.tier; t.tierInferred = false; continue; }
    let inferred = null;
    const par = parentsOf(data, p.id);
    const tryIndi = id => {
      const i = id && data.individuals.get(id);
      if (!i) return null;
      let best = null;
      for (const j of occupationsOf(i)) { const c = classifyJob(j); if (c && (!best || TIER_RANK[c.tier] > TIER_RANK[best.tier])) best = c; }
      return best;
    };
    inferred = tryIndi(par.father);
    if (!inferred) for (const fid of p.indi.fams) { const f = data.families.get(fid); const sp = f && (f.husb === p.id ? f.wife : f.husb); inferred = tryIndi(sp); if (inferred) break; }
    const year = t.birthYear ?? 1900;
    t.tier = inferred ? inferred.tier : (year < 1880 ? 'labour' : 'skilled');
    t.tierInferred = true;
    t.inferredFrom = inferred ? inferred.cat : null;
  }
  // Schooling: 0 none/little, 1 basic (dame school / board school), 2 good (grammar, apprenticeship), 3 higher.
  for (const p of people) {
    const t = p.traits, y = t.birthYear ?? 1900;
    let edu = { labour: 0, skilled: 1, trade: 2, gentry: 3 }[t.tier];
    if (y >= 1870) edu = Math.max(edu, 1); // Education Act 1870/1880: everyone gets some schooling
    if (y >= 1935) edu = Math.max(edu, 2);
    if (t.illiterate) edu = 0;
    t.edu = edu;
  }
  // Colouring. Founders (no parents in the file) take the typical colouring of their birthplace;
  // everyone else is a blend of their parents, so a child of Yorkshire parents born in India still looks like them.
  const byGenDesc = people.slice().sort((a, b) => b.gen - a.gen);
  const groupCounts = {};
  for (const p of people) if (p.traits.place.tone !== 'unknown') groupCounts[p.traits.place.tone] = (groupCounts[p.traits.place.tone] || 0) + 1;
  const commonGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'nweu';
  for (const p of byGenDesc) {
    const t = p.traits;
    const rnd = seededRandom(hashString('tone' + p.id));
    const parentsT = [p.father, p.mother].map(id => id && tree.people.get(id)?.traits).filter(x => x && x.tone != null);
    if (parentsT.length) {
      const avg = parentsT.reduce((a, x) => a + x.tone, 0) / parentsT.length;
      t.tone = Math.max(0, Math.min(TONE_RAMP.length - 1, avg + (rnd() - 0.5) * 0.8));
      t.toneGroup = parentsT[Math.floor(rnd() * parentsT.length)].toneGroup;
      t.hairPool = parentsT.flatMap(x => x.hairPool);
      t.toneSource = 'parents';
    } else {
      const group = t.place.tone === 'unknown' ? commonGroup : t.place.tone;
      const opts = TONE_GROUPS[group] || TONE_GROUPS.nweu;
      t.tone = opts[Math.floor(rnd() * opts.length)] + (rnd() - 0.5) * 0.6;
      t.tone = Math.max(0, Math.min(TONE_RAMP.length - 1, t.tone));
      t.toneGroup = group;
      t.hairPool = HAIR_BY_GROUP[group] || HAIR_BY_GROUP.nweu;
      t.toneSource = t.place.tone === 'unknown' ? 'family' : 'birthplace';
    }
    t.skin = toneColor(t.tone, t.toneGroup);
    // Speech follows the family when someone is born abroad to British Isles parents (e.g. in India).
    const BRIT = ['England', 'Wales', 'Scotland', 'Ireland', 'Isle of Man', 'Channel Islands'];
    const parentPlace = parentsT.map(x => x.voicePlace || x.place).find(pl => pl && BRIT.includes(pl.country));
    t.voicePlace = t.place.key === 'unknown' || (!BRIT.includes(t.place.country) && parentPlace && t.toneSource === 'parents') ? (parentPlace || t.place) : t.place;
    t.hair = t.hairPool[Math.floor(rnd() * t.hairPool.length)];
  }
  // Dress for the decade of their adult life (about age 30), not the year they were born.
  const rootYear = birthYear(tree.people.get(tree.rootId).indi) ?? 1990;
  for (const p of people) {
    const t = p.traits;
    const by = t.birthYear ?? (rootYear - p.gen * 29);
    t.estBirthYear = by;
    let dress = by + 30;
    if (t.deathYear && t.deathYear < dress) dress = Math.max(by + 18, t.deathYear);
    t.dressYear = Math.min(dress, new Date().getFullYear());
    t.oldAge = t.deathYear && t.deathYear - by > 70;
  }
  return tree;
}

function toneColor(tone, group) {
  const i = Math.floor(tone), f = tone - i;
  const a = new THREE.Color(TONE_RAMP[i]), b = new THREE.Color(TONE_RAMP[Math.min(TONE_RAMP.length - 1, i + 1)]);
  const c = a.lerp(b, f);
  if (TONE_TINT[group]) c.lerp(new THREE.Color(TONE_TINT[group]), 0.25);
  return '#' + c.getHexString();
}
