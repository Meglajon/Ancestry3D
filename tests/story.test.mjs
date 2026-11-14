// Story mode plot: every person in the demo file must make a playable story, and so must awkward trees.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parseGedcom } from '../js/gedcom.js';
import { buildStory, placeTown, residentsOf, oddJob, fareBetween, inkCost, eraOf, jobGroup } from '../js/storyplot.js';

const LOTS = new Set(['@found', 'church', 'hall', 'pub', 'works', 'farm', 'school', 'hub', 'garage', 'market', 'infirmary', 'police', 'post', 'office', 'phone', 'home']);
const STEPS = new Set(['goto', 'talk', 'carry', 'collect', 'chase', 'race', 'travel', 'escape', 'tail', 'defend', 'catch', 'search', 'frenzy']);
function check(story, label) {
  assert.ok(story.missions.length >= 4, label + ': too few missions');
  assert.equal(story.missions[0].id, 'final-notice');
  assert.equal(story.missions.at(-1).id, 'case-closed');
  assert.ok(story.missions.some(m => m.id === 'blank-page'), label + ': no finale');
  const ids = new Set();
  story.missions.forEach((m, i) => {
    assert.equal(m.index, i);
    assert.ok(!ids.has(m.id), label + ': duplicate mission ' + m.id); ids.add(m.id);
    assert.ok(story.towns.has(m.town), `${label}: ${m.id} is in an unknown town`);
    assert.ok(Number.isInteger(m.year) && m.year <= story.now && m.year > 800, `${label}: ${m.id} year ${m.year}`);
    assert.ok(m.title && m.steps.length, `${label}: ${m.id} is empty`);
    assert.ok(m.giver.who === 'auto' || m.giver.who === 'dot' || story.tree.people.has(m.giver.who), `${label}: ${m.id} giver`);
    for (const l of [...m.intro, ...m.outro]) assert.ok(l.greet || (l.text && !/undefined|null|NaN/.test(l.text)), `${label}: ${m.id} line "${l.text}"`);
    for (const s of m.steps) {
      assert.ok(STEPS.has(s.t), `${label}: ${m.id} step ${s.t}`);
      assert.ok(s.text && !/undefined|null|NaN/.test(s.text), `${label}: ${m.id} step text "${s.text}"`);
      if (s.bark) assert.ok(s.bark.text && (s.bark.name || s.bark.who), `${label}: ${m.id} bark`);
      if (s.names) assert.equal(s.names.length, s.n, `${label}: ${m.id} names`);
      if (s.miss) for (const v of Object.values(s.miss)) assert.ok(!/undefined|null|NaN/.test(v), `${label}: ${m.id} "${v}"`);
      if (s.hop) assert.ok(s.hop.length >= 1 && s.hop.every(y => Number.isInteger(y) && y <= story.now), `${label}: ${m.id} hop ${s.hop}`);
      for (const k of [s.at, s.from, s.to, s.around, s.switch && s.switch.to, ...(s.stops || []), ...(s.spots || []), ...(s.via || [])]) if (k) assert.ok(LOTS.has(k), `${label}: ${m.id} lot ${k}`);
      if (s.t === 'travel') assert.ok(story.towns.has(s.town));
      if (s.quiz) { assert.ok(s.quiz.options.length >= 3 && s.quiz.answer >= 0 && s.quiz.answer < s.quiz.options.length); assert.equal(new Set(s.quiz.options).size, s.quiz.options.length, `${label}: quiz repeats an option`); }
      for (const line of s.lines || []) assert.ok(!/undefined|null|NaN/.test(line), `${label}: ${m.id} "${line}"`);
    }
    if (m.reward.proof) assert.ok(story.proofs.includes(m.reward.proof));
  });
  assert.equal(new Set(story.proofs.map(p => p.id)).size, story.proofs.length, label + ': duplicate proofs');
  for (const f of story.favours) {
    assert.ok(story.towns.has(f.town) && f.steps.length && f.title && f.after >= 0, `${label}: favour ${f.id}`);
    assert.ok(!story.tree.people.has(f.giver.who) || !story.chapters.some(c => c.id === f.giver.who), `${label}: favour from a chapter ancestor`);
    for (const l of [...f.intro, ...f.outro]) assert.ok(!/undefined|null|NaN/.test(l.text), `${label}: favour line "${l.text}"`);
    for (const s of f.steps) for (const k of [s.at, s.from, s.to, s.around, ...(s.stops || [])]) if (k) assert.ok(LOTS.has(k), `${label}: favour lot ${k}`);
  }
}

const data = parseGedcom(readFileSync(new URL('../sample/demo.ged', import.meta.url), 'utf8'));
const demo = buildStory(data, '@I1@', { now: 2026 });
check(demo, 'demo');
console.log('favours:', demo.favours.map(f => `${f.title} for ${f.brief}`).join(' | '));
console.log(`demo story: ${demo.missions.length} missions, ${demo.chapters.length} chapters, ${demo.proofs.length} proofs, ${demo.towns.size} towns`);
console.log(demo.chapters.map(c => `${c.name} (${c.rel}) ${c.town.name} ${c.year} [${c.set}]`).join('\n'));
assert.ok(demo.chapters.length >= 5);
assert.ok(demo.chapters.every((c, i, a) => i === 0 || c.year <= a[i - 1].year), 'chapters should go back in time');
assert.ok(new Set(demo.chapters.map(c => c.set)).size >= 4, 'set pieces should vary');
// Everybody in the file can be the hero.
let n = 0;
for (const id of data.individuals.keys()) { check(buildStory(data, id, { now: 2026 }), id); n++; }
console.log('ok every person as hero:', n);

// Awkward trees
const ged = lines => parseGedcom(['0 HEAD', ...lines, '0 TRLR'].join('\n'));
check(buildStory(ged(['0 @A@ INDI', '1 NAME Solo /Person/']), '@A@', { now: 2026 }), 'alone, no dates');
check(buildStory(ged(['0 @A@ INDI', '1 NAME Kid /One/', '1 FAMC @F@', '0 @B@ INDI', '1 NAME Dad //', '1 SEX M', '1 FAMS @F@', '0 @F@ FAM', '1 HUSB @B@', '1 CHIL @A@']), '@A@', { now: 2026 }), 'one parent, nothing known');
const abroad = buildStory(ged(['0 @A@ INDI', '1 NAME Ana /Silva/', '1 SEX F', '1 BIRT', '2 DATE 1980', '2 PLAC Boston, MA', '1 FAMC @F@',
  '0 @B@ INDI', '1 NAME Rui /Silva/', '1 SEX M', '1 BIRT', '2 DATE 3 MAR 1950', '2 PLAC Lisbon, Portugal', '1 OCCU Fisherman', '1 EMIG', '2 DATE 1972', '1 FAMS @F@',
  '0 @C@ INDI', '1 NAME Mei /Chen/', '1 SEX F', '1 BIRT', '2 DATE 1952', '2 PLAC Guangzhou, China', '1 FAMS @F@',
  '0 @F@ FAM', '1 HUSB @B@', '1 WIFE @C@', '1 CHIL @A@', '1 MARR', '2 DATE 1975', '2 PLAC Boston, MA']), '@A@', { now: 2026 });
check(abroad, 'abroad');
assert.equal(abroad.home.left, false, 'America drives on the right');
assert.ok(abroad.foreign && !abroad.missions.some(m => m.id === 'golden-door'), 'a tree that already goes abroad needs no Ellis Island detour');
assert.ok([...abroad.towns.values()].some(t => t.name === 'Lisbon'));
const old = buildStory(ged(['0 @A@ INDI', '1 NAME Old /Root/', '1 BIRT', '2 DATE 1802', '2 PLAC Wick, Caithness, Scotland', '1 DEAT', '2 DATE 1870']), '@A@', { now: 2026 });
check(old, 'long dead hero');
assert.ok(old.now < 1900, 'the present is the hero\'s own lifetime');

// Places, fares, ink
assert.equal(placeTown('Parish Church, Pemberton, Wigan, Lancashire, England').name, 'Pemberton');
assert.equal(placeTown('12 Mill Lane, Halifax, Yorkshire, England').name, 'Halifax');
assert.equal(placeTown('Kingston, Jamaica').nation, 'Jamaica');
assert.equal(placeTown(''), null);
assert.equal(fareBetween(placeTown('Leeds, Yorkshire, England'), placeTown('Halifax, Yorkshire, England')), 40);
assert.ok(fareBetween(placeTown('Leeds, Yorkshire, England'), placeTown('Kingston, Jamaica')) > fareBetween(placeTown('Leeds, Yorkshire, England'), placeTown('Cork, County Cork, Ireland')));
assert.equal(inkCost(2026, 2026), 0);
assert.ok(inkCost(2026, 1790) > inkCost(2026, 1989));
assert.equal(eraOf(1871), 'victorian'); assert.equal(eraOf(1700), 'early'); assert.equal(eraOf(2026), 'modern');
assert.equal(jobGroup('Coal miner'), 'haul'); assert.equal(jobGroup('Power-loom weaver'), 'cloth'); assert.equal(jobGroup(''), 'odd');
const hx = placeTown('Halifax, Yorkshire, England');
assert.ok(residentsOf(data, hx, 1871).length > 3, 'people from the file walk the streets of their own town');
const job = oddJob(hx, 1871, 7);
assert.ok(job.steps[0].from !== job.steps[0].to && LOTS.has(job.steps[0].from));
console.log('ok story');
