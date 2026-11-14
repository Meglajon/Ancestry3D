// Story mode ("Relative Speed"): turns a GEDCOM tree into the cast, towns, chapters and missions of the story.
// The plot is the same for every family; the people, places, years, jobs and events come from the file.
// Pure data in, pure data out (no drawing), so it can be tested with node.
import { dateYear, datePhrase } from './gedcom.js';
import { displayName, firstName, findEvent, birthYear, deathYear, relationship, parentsOf, collectAncestors, hashString, seededRandom, lifespan } from './ancestry.js';
import { resolvePlace } from './places.js';

// ---------------- Eras ----------------
export const ERA_NAMES = { modern: 'Present day', retro: 'Post-war', vintage: 'Early 1900s', victorian: 'Victorian', georgian: 'Georgian', early: 'Stuart and before' };
export function eraOf(year) {
  return year >= 1990 ? 'modern' : year >= 1950 ? 'retro' : year >= 1900 ? 'vintage' : year >= 1837 ? 'victorian' : year >= 1714 ? 'georgian' : 'early';
}
const ERA_ARRIVAL = {
  modern: 'Traffic, takeaways and a phone signal.',
  retro: 'Coal smoke, corner shops and somebody\'s wireless through an open window.',
  vintage: 'Trams, flat caps and motor cars that still frighten the horses.',
  victorian: 'Gas lamps, horse muck and a hundred chimneys.',
  georgian: 'Mud to the axles, a coach horn somewhere, and not one pavement.',
  early: 'Thatch, woodsmoke and a church bell. The road is mostly a suggestion.',
};
export function eraWords(year) {
  return {
    modern: { van: 'Redaction van', law: 'the police', ride: 'car', hub: 'airport', boat: 'flight', phone: 'phone box' },
    retro: { van: 'grey Redaction van', law: 'the police', ride: 'motor', hub: 'airport', boat: 'flight', phone: 'phone box' },
    vintage: { van: 'grey motor-van', law: 'the bobbies', ride: 'motor', hub: 'station quay', boat: 'steamer', phone: 'telegraph office' },
    victorian: { van: 'grey carriage', law: 'the constables', ride: 'cart', hub: 'station quay', boat: 'steamer', phone: 'telegraph office' },
    georgian: { van: 'grey coach', law: 'the watch', ride: 'cart', hub: 'packet quay', boat: 'packet ship', phone: 'parish notice board' },
    early: { van: 'grey wagon', law: 'the watch', ride: 'cart', hub: 'packet quay', boat: 'ship', phone: 'parish notice board' },
  }[eraOf(year)];
}

// ---------------- Places ----------------
const LEFT_SIDE = new Set(['England', 'Wales', 'Scotland', 'Ireland', 'Isle of Man', 'Channel Islands', 'Australia', 'New Zealand', 'South Africa', 'India', 'the Caribbean', 'South East Asia', 'Africa']);
const CONTINENT = {
  usa: 'am', canada: 'am', latinamerica: 'am', caribbean: 'am', australia: 'oc', newzealand: 'oc', southafrica: 'af', westafrica: 'af', africa: 'af', northafrica: 'af',
  mena: 'as', southasia: 'as', eastasia: 'as', seasia: 'as',
};
const NOT_TOWN = /\b(church|chapel|cathedral|abbey|minster|cemetery|churchyard|crematorium|hospital|infirmary|workhouse|district|street|road|lane|avenue|terrace|farm|house|cottage|cottages|hall|row|square|parish|barracks)\b/i;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A GEDCOM place as a town the game can build: { id, name, key, country, nation, house, label, left }. */
export function placeTown(plac) {
  if (!plac) return null;
  const parts = plac.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const r = resolvePlace(plac);
  const name = parts.find(p => !/\d/.test(p) && !NOT_TOWN.test(p) && !/^(st|saint|ss)\.? /i.test(p)) || parts[parts.length - 1];
  const last = parts[parts.length - 1];
  const nation = r.country && ['England', 'Wales', 'Scotland', 'Ireland'].includes(r.country) ? r.country
    : parts.length > 1 && last.length > 3 && last !== name ? last : (r.country || '').replace(/^the /, '') || last;
  return { id: slug(name + ' ' + (r.country || nation)), name, key: r.key, country: r.country || nation, nation, house: r.house, label: r.label, left: LEFT_SIDE.has(r.country) || r.key === 'unknown' };
}
const DEFAULT_TOWN = { id: 'hometown-england', name: 'Hometown', key: 'england', country: 'England', nation: 'England', house: 'midbrick', label: 'England', left: true };
const NEW_YORK = { id: 'new-york-the-united-states', name: 'New York', key: 'usa', country: 'the United States', nation: 'United States', house: 'cityterrace', label: 'America', left: false };

/** Ticket price between two towns: a coach or train at home, a crossing abroad. */
export function fareBetween(a, b) {
  if (!a || !b || a.id === b.id) return 0;
  if (a.country === b.country) return 40;
  const ca = CONTINENT[a.key] || 'eu', cb = CONTINENT[b.key] || 'eu';
  return ca === cb ? 160 : 320;
}
/** Ink for the Parish Engine: dearer the further you turn the pages back. */
export const inkCost = (y1, y2) => y1 === y2 ? 0 : Math.round(15 + Math.abs(y1 - y2) / 6);

const PUBS = ['The Red Lion', 'The Crown', 'The Plough', 'The Kings Arms', 'The White Hart', 'The Bull', 'The Swan', 'The Bell', 'The George', 'The Black Horse', 'The Rose and Crown', 'The Wheatsheaf'];
const FARMS = ['Hollin', 'Top o\'th\' Hill', 'Brook', 'Nether', 'High Ash', 'Lane End', 'Church', 'Moor Side', 'Bank', 'Green'];
/** What each landmark is called in a given town and year. */
export function lotName(kind, town, year) {
  const e = eraOf(year), h = hashString(town.id) >>> 0;
  const works = { mill: 'the mill', colliery: 'the pit', pennine: 'the mill', valleys: 'the pit', cityterrace: 'the docks', london: 'the works', tenement: 'the shipyard' }[town.house] || 'the works';
  switch (kind) {
    case 'church': return 'the parish church';
    case 'hall': return year >= 1930 ? 'the Records Office' : year >= 1837 ? 'the Register Office' : 'the vestry hall';
    case 'pub': return PUBS[h % PUBS.length];
    case 'works': return year < 1760 ? 'the forge' : works;
    case 'farm': return FARMS[(h >>> 3) % FARMS.length] + ' Farm';
    case 'school': return year >= 1870 ? 'the school' : 'the dame school';
    case 'hub': return eraWords(year).hub.replace(/^/, 'the ');
    case 'garage': return year >= 1950 ? 'Dot\'s lock-up' : year >= 1900 ? 'the motor shed' : 'the tithe barn';
    case 'market': return 'the market place';
    case 'infirmary': return year >= 1948 ? 'the hospital' : year >= 1750 ? 'the infirmary' : 'the apothecary';
    case 'police': return year >= 1900 ? 'the police station' : year >= 1829 ? 'the constabulary' : 'the watch-house';
    case 'post': return year >= 1840 ? 'the post office' : 'the posting house';
    case 'office': return e === 'modern' ? 'Blank & Void' : 'the counting house';
    case 'phone': return 'the ' + eraWords(year).phone;
    case 'home': return 'the house';
    default: return 'the ' + kind;
  }
}

// ---------------- People ----------------
const JOB_GROUPS = [
  [/coal|collier|miner|hewer|pit|quarr|iron|steel|forge|puddler|foundry|potter|kiln|navvy|brick|labourer|laborer/, 'haul'],
  [/weav|spinn|piecer|doffer|carder|mill|cotton|wool|worsted|silk|textile|loom|tailor|dressmak|seamstress|millin|draper|hatter/, 'cloth'],
  [/farm|agric|ag lab|shepherd|crofter|plough|husbandman|yeoman|cowman|drover|gardener|grazier/, 'farm'],
  [/servant|maid|cook|housekeeper|butler|footman|laundress|char|domestic|scullery|groom/, 'serve'],
  [/fisher|trawler|sailor|seaman|mariner|docker|stevedore|boatman|waterman|bargee|ship/, 'sea'],
  [/railway|engine driver|signalman|porter|platelayer|postman|post ?mistress|carter|carrier|coachman|driver|chauffeur|conductor/, 'rail'],
  [/grocer|baker|butcher|publican|innkeeper|shop|hawker|dealer|merchant|brewer|miller|victualler|chemist|confectioner|stationer/, 'shop'],
  [/smith|carpenter|joiner|mason|builder|wheelwright|cooper|shoemaker|cordwainer|clogger|plumber|electrician|mechanic|fitter|turner|engineer|painter|saddler|thatcher|welder|machinist|chain|nailer|tool/, 'craft'],
  [/nurse|midwife|doctor|surgeon|physician|apothecary|dentist/, 'care'],
  [/teacher|schoolm|governess|tutor|lecturer|vicar|rector|curate|minister|priest|clergy|reverend/, 'school'],
  [/soldier|private|corporal|sergeant|gunner|sapper|trooper|army|regiment|militia|navy|marine|officer|captain|constable|police/, 'arms'],
  [/clerk|book.?keeper|typist|secretary|accountant|agent|solicitor|attorney|lawyer|manager|software|developer|analyst|consultant|designer|civil servant|cashier|insurance/, 'desk'],
  [/gentleman|gentlewoman|esquire|landowner|proprietor|own means|baronet|lady|manufacturer|banker/, 'gentry'],
];
export function jobGroup(title) {
  const t = (title || '').toLowerCase();
  for (const [re, g] of JOB_GROUPS) if (re.test(t)) return g;
  return 'odd';
}
const PRON = { M: ['he', 'him', 'his'], F: ['she', 'her', 'her'], U: ['they', 'them', 'their'] };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const q = s => '«' + s + '»'; // protected from dialect rules (names, places, dates)
const evPlace = (indi, ...tags) => { for (const t of tags) for (const e of indi.events) if (e.tag === t && e.place) return e.place; return ''; };

function describe(p, data, hints) {
  const indi = p.indi;
  const jobs = indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim());
  const [he, him, his] = PRON[indi.sex] || PRON.U;
  const town = placeTown(evPlace(indi, 'BIRT', 'CHR', 'BAPM') || evPlace(indi, 'RESI', 'CENS') || evPlace(indi, 'DEAT', 'BURI'));
  const by = birthYear(indi) ?? hints.by ?? null;
  return {
    id: p.id, indi, gen: p.gen, ahnen: p.ahnen, name: displayName(indi), first: firstName(indi), surname: indi.surname || '', sex: indi.sex,
    by, byKnown: birthYear(indi) != null, dy: deathYear(indi), life: lifespan(indi), town, jobs, job: jobs[0] || '', group: jobGroup(jobs.join(' ')),
    rel: p.gen === 0 ? 'self' : relationship(p.gen, indi.sex), he, him, his,
  };
}

// The family in which `childId` was born, seen from parent `id`: spouse, marriage, siblings.
function familyThrough(data, id, childId) {
  const child = childId && data.individuals.get(childId);
  const fam = child?.famc && data.families.get(child.famc);
  if (!fam) return { fam: null, spouse: null, marriage: null, kids: [] };
  const sid = fam.husb === id ? fam.wife : fam.husb;
  return { fam, spouse: sid ? data.individuals.get(sid) || null : null, marriage: fam.events.find(e => e.tag === 'MARR') || null, kids: fam.children.map(c => data.individuals.get(c)).filter(Boolean) };
}

// ---------------- Choosing the cast ----------------
function chooseChapters(tree, data, now) {
  const people = tree.people, root = people.get(tree.rootId);
  // how far each line goes back
  const depth = new Map();
  const dep = id => {
    if (depth.has(id)) return depth.get(id);
    depth.set(id, 0);
    const p = people.get(id);
    const d = Math.max(0, ...[p.father, p.mother].filter(Boolean).map(x => 1 + dep(x)));
    depth.set(id, d);
    return d;
  };
  const known = p => (evPlace(p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS', 'DEAT', 'BURI') ? 2 : 0) + (birthYear(p.indi) != null ? 1 : 0) + (p.indi.events.some(e => e.tag === 'OCCU') ? 1 : 0);
  // The spine: follow the best-documented line as far as it goes.
  const spine = [];
  let cur = root;
  while (cur) {
    const ps = [cur.father, cur.mother].filter(Boolean).map(id => people.get(id));
    if (!ps.length) break;
    ps.sort((a, b) => (dep(b.id) * 3 + known(b)) - (dep(a.id) * 3 + known(a)) || a.ahnen - b.ahnen);
    spine.push(ps[0]);
    cur = ps[0];
  }
  // Estimated birth years so everyone can be placed in time.
  const est = new Map();
  const rootBy = birthYear(root.indi) ?? now - 30;
  est.set(root.id, rootBy);
  const order = [...people.values()].sort((a, b) => a.gen - b.gen);
  for (const p of order) {
    if (est.has(p.id)) continue;
    const childBy = p.primaryChild ? est.get(p.primaryChild) : rootBy;
    est.set(p.id, birthYear(p.indi) ?? (childBy ?? rootBy) - 28);
  }
  // Which spine people get a chapter: the nearest three, a couple on the way, and the very top.
  let picks = spine.map((p, i) => i);
  if (spine.length > 6) {
    const last = spine.length - 1;
    picks = [...new Set([0, 1, 2, Math.round(2 + (last - 2) / 3), Math.round(2 + 2 * (last - 2) / 3), last])];
  }
  const chosen = picks.map(i => ({ p: spine[i], spine: true }));
  // Detours off the spine: somebody born in another country, somebody who emigrated, somebody who served.
  const homeCountry = placeTown(evPlace(root.indi, 'BIRT', 'RESI', 'CENS') || (spine[0] && evPlace(spine[0].indi, 'BIRT', 'RESI', 'CENS')))?.country || 'England';
  const onSpine = new Set(chosen.map(c => c.p.id));
  const countries = new Set([homeCountry, ...chosen.map(c => placeTown(evPlace(c.p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS'))?.country).filter(Boolean)]);
  const others = order.filter(p => p.gen > 0 && !onSpine.has(p.id) && birthYear(p.indi) != null);
  const abroad = others.find(p => { const t = placeTown(evPlace(p.indi, 'BIRT', 'CHR', 'BAPM')); return t && t.key !== 'unknown' && !countries.has(t.country); });
  const emigrant = others.find(p => p !== abroad && (p.indi.events.some(e => e.tag === 'EMIG' || e.tag === 'IMMI')));
  const served = others.find(p => p !== abroad && p !== emigrant && (p.indi.events.some(e => /MIL/.test(e.tag)) || jobGroup(p.indi.events.filter(e => e.tag === 'OCCU').map(e => e.value).join(' ')) === 'arms'));
  const detours = [abroad, emigrant, served].filter(Boolean).slice(0, 2);
  for (const p of detours) chosen.push({ p, spine: false });
  // Go back in time in order, but the top of the spine is always the finale.
  const top = spine.length ? spine[spine.length - 1] : null;
  chosen.sort((a, b) => (a.p === top) - (b.p === top) || est.get(b.p.id) - est.get(a.p.id));
  return { chosen, est, spine, homeCountry, foreign: chosen.some(c => { const t = placeTown(evPlace(c.p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS')); return t && t.country !== homeCountry; }) };
}

// ---------------- Mission text ----------------
const DAY_JOBS = {
  haul: c => ({ title: 'Three Loads', ask: `Three loads from ${c.works} down to ${c.hub} before the hooter goes. Every one that's late is a day's pay docked, and I've none to spare. Thy contraption looks strong enough.`,
    steps: [{ t: 'carry', from: 'works', to: 'hub', n: 3, label: /potter|kiln/.test(c.jobL) ? 'crates of pots' : /iron|steel|forge|puddl|foundry/.test(c.jobL) ? 'loads of pig iron' : /quarr|brick/.test(c.jobL) ? 'loads of stone' : 'loads of coal', timed: 1.25, text: `Haul three loads from ${c.works} to ${c.hub}` }] }),
  cloth: c => ({ title: 'Cut From the Same Cloth', ask: `Two pieces of finished cloth to go to the draper in ${c.market}. Finished, mind. One splash of muck and it comes out of my wages, so drive it like it was a christening gown.`,
    steps: [{ t: 'carry', from: 'works', to: 'market', n: 2, label: 'pieces of cloth', gentle: true, timed: 1.5, text: `Take the cloth from ${c.works} to ${c.market} without a bump` }] }),
  haulB: c => ({ title: 'Runaway Tubs', ask: `A string of tubs has broken loose from ${c.works} and gone rattling off down the town. Six of them, loaded. Catch every one before something catches them, and the gaffer need never know.`,
    steps: [{ t: 'collect', around: 'works', radius: 17, n: 6, label: 'runaway tubs', timed: 1.5, text: `Catch the runaway tubs near ${c.works}` }] }),
  clothB: c => ({ title: 'The Knocker-Up', ask: `Half the street is still abed and the gates shut on the stroke. Anybody locked out loses the day. Go round and rattle every window, then be at ${c.works} before the hooter.`,
    steps: [{ t: 'race', stops: ['pub', 'school', 'post', 'farm', 'works'], timed: 1.15, text: `Wake the street and reach ${c.works} before the hooter` }] }),
  farmB: c => ({ title: 'Market Day', ask: `Two churns for ${c.market}, and they'll not keep in this heat. Mind the ruts, mind the dog, and mind you get a fair price.`,
    steps: [{ t: 'carry', from: 'farm', to: 'market', n: 2, label: 'milk churns', timed: 1.2, text: `Take the churns from ${c.farm} to ${c.market}` }] }),
  serveB: c => ({ title: 'The Mistress Is Out', ask: `The mistress is to be driven to church and the coachman's nowhere. Somebody in a grey coat stood him a drink. She notices every bump, mind. Every one.`,
    steps: [{ t: 'carry', from: 'home', to: 'church', n: 1, label: 'passenger', passenger: 'the mistress', gentle: true, timed: 1.5, text: 'Drive the mistress to church without a bump' }] }),
  farm: c => ({ title: 'Gone Astray', ask: `Somebody in a grey coat left the gate open and every beast I own is out on the lane. Round them up, then take the cart to ${c.market} before the dealers go home.`,
    steps: [{ t: 'collect', around: 'farm', radius: 15, n: 6, label: c.year < 1800 ? 'pigs' : 'sheep', timed: 1.6, text: `Round up the strays near ${c.farm}` }, { t: 'carry', from: 'farm', to: 'market', n: 1, label: 'cart of produce', timed: 1.3, text: `Get the cart to ${c.market}` }] }),
  serve: c => ({ title: 'Below Stairs', ask: `The mistress wants the whole list fetched before she rings for tea, and she rings early when she's vexed. I can't be in four places at once. Can you?`,
    steps: [{ t: 'race', stops: ['market', 'post', 'pub', 'infirmary', 'home'], timed: 1.2, text: 'Fetch everything on the list and get back before the bell' }] }),
  sea: c => ({ title: 'Fresh Today', ask: `Two boxes off the boat and they want to be in ${c.market} while they still smell of the sea and not of Friday. Go on, shift.`,
    steps: [{ t: 'carry', from: 'hub', to: 'market', n: 2, label: 'boxes of fish', timed: 1.1, text: `Rush the catch from ${c.hub} to ${c.market}` }] }),
  rail: c => ({ title: 'The Round', ask: `Bags for ${c.post}, ${c.hall}, the school and ${c.pub}, and the timetable waits for nobody. I'll ride along and shout if you're late.`,
    steps: [{ t: 'race', stops: ['hub', 'post', 'hall', 'school', 'pub'], timed: 1.15, text: 'Do the round before the timetable catches you' }] }),
  shop: c => ({ title: 'Orders Out', ask: `Five orders, five doors, and every one of them expects it before dinner. A shop lives on its name. Don't lose me mine.`,
    steps: [{ t: 'race', stops: ['pub', 'school', 'infirmary', 'church', 'farm'], timed: 1.2, text: 'Deliver all five orders' }] }),
  craft: c => { const thing = c.year < 1930 ? 'mended wheel' : 'mended generator'; return { title: 'Made to Last', ask: `That's a week of my work on the bench, wanted at the church, and a ${thing} wanted at ${c.farm}. Set it down gently. I'll know if you didn't.`,
    steps: [{ t: 'carry', from: 'works', to: 'church', n: 1, label: c.year < 1900 ? 'new bell frame' : 'new church gate', gentle: true, timed: 1.6, text: 'Deliver the finished work to the church in one piece' }, { t: 'carry', from: 'works', to: 'farm', n: 1, label: thing, timed: 1.4, text: `Take the ${thing} to ${c.farm}` }] }; },
  care: c => ({ title: 'On Call', ask: `There's a man hurt up at ${c.farm} and nothing with wheels to fetch him. Bring him to ${c.infirmary}, quick but smooth. He has enough broken already.`,
    steps: [{ t: 'carry', from: 'farm', to: 'infirmary', n: 1, label: 'patient', passenger: 'the patient', gentle: true, timed: 1.3, text: `Bring the patient from ${c.farm} to ${c.infirmary}` }] }),
  school: c => ({ title: 'Truants', ask: `Half my flock has bolted. Somebody told them there was a grey man giving out toffee. Round them up before the inspector arrives and finds me teaching the furniture.`,
    steps: [{ t: 'collect', around: 'school', radius: 17, n: 6, label: 'truants', timed: 1.5, text: 'Round up the truants' }] }),
  arms: c => ({ title: 'Dispatches', ask: `Orders for the constabulary, the quay, the hall and the church tower, and back to me. At the double. Consider it a test of character.`,
    steps: [{ t: 'race', stops: ['police', 'hub', 'hall', 'church', 'home'], timed: 1.1, text: 'Carry the dispatches at the double' }] }),
  desk: c => ({ title: 'In Triplicate', ask: `Stamped at ${c.hall}, countersigned at ${c.post}, witnessed at ${c.police} and back on my desk before the office shuts. That's how things get done properly.`,
    steps: [{ t: 'race', stops: ['hall', 'post', 'police', 'home'], timed: 1.15, text: 'Get the papers stamped, signed and witnessed' }] }),
  gentry: c => ({ title: 'Driving the Quality', ask: `You may drive me to ${c.hall} and then to church. You will not jolt me, you will not splash me, and you will not speak unless the vehicle is on fire.`,
    steps: [{ t: 'carry', from: 'home', to: 'hall', n: 1, label: 'passenger', passenger: c.first, gentle: true, text: `Drive ${c.first} to ${c.hall}. Gently.` }, { t: 'carry', from: 'hall', to: 'church', n: 1, label: 'passenger', passenger: c.first, gentle: true, text: `Now to the church. Still gently.` }] }),
  odd: c => ({ title: 'Earning Your Keep', ask: `If you're stopping, you can make yourself useful. Two loads from ${c.market} to ${c.pub}, and there's a drink in it if nothing gets broken.`,
    steps: [{ t: 'carry', from: 'market', to: 'pub', n: 2, label: c.year < 1900 ? 'barrels' : 'crates', timed: 1.4, text: `Carry two loads from ${c.market} to ${c.pub}` }] }),
};

function quizFor(c, cast, rnd) {
  const opts = (right, pool) => {
    const wrong = [...new Set(pool.filter(x => x && x !== right))];
    for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
    const options = [right, ...wrong.slice(0, 3)];
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    return options.length >= 3 ? { options, answer: options.indexOf(right) } : null;
  };
  const qs = [];
  const mother = c.mother, father = c.father;
  if (mother?.surname && mother.surname !== c.surname) qs.push(() => ({ q: 'What was my mother\'s name before she wed?', ...opts(mother.surname, cast.surnames) }));
  if (father) qs.push(() => ({ q: 'What is my father\'s Christian name?', ...opts(firstName(father), cast.maleNames) }));
  if (c.spouse) qs.push(() => ({ q: `Who ${c.year >= (c.marriageYear || 0) ? 'did I marry' : 'am I walking out with'}?`, ...opts(displayName(c.spouse), cast.names) }));
  if (c.byKnown) qs.push(() => ({ q: 'What year was I born?', ...opts(String(c.by), [c.by - 11, c.by + 7, c.by - 4, c.by + 13, c.by - 19].map(String)) }));
  if (c.job) qs.push(() => ({ q: 'What do I do for my living?', ...opts(c.job, cast.jobs) }));
  if (c.town) qs.push(() => ({ q: 'Where was I born?', ...opts(c.town.name, cast.towns) }));
  const order = qs.map((f, i) => [rnd(), f]).sort((a, b) => a[0] - b[0]);
  for (const [, f] of order) { const z = f(); if (z.options) return z; }
  return null;
}

/**
 * Build the whole story for one root person.
 * Returns { title, hero, villain, benefactor, towns, home, now, chapters, missions, proofs }.
 */
export function buildStory(data, rootId, opts = {}) {
  const now = opts.now || new Date().getFullYear();
  const tree = opts.tree || collectAncestors(data, rootId, opts.maxGen || 12);
  const rootP = tree.people.get(rootId);
  const rnd = seededRandom(hashString('story' + rootId + data.individuals.size));
  const { chosen, est, spine, homeCountry, foreign } = chooseChapters(tree, data, now);

  const towns = new Map();
  const town = t => { if (!t) return null; if (!towns.has(t.id)) towns.set(t.id, t); return towns.get(t.id); };
  const hero = describe(rootP, data, { by: est.get(rootId) });
  const rootDeath = deathYear(rootP.indi);
  const present = Math.min(now, rootDeath ?? now, hero.byKnown && hero.by + 95 < now ? hero.by + 35 : now);
  const home = town(hero.town || (spine[0] && placeTown(evPlace(spine[0].indi, 'BIRT', 'RESI', 'CENS', 'DEAT'))) || DEFAULT_TOWN);

  // Things to make quiz wrong answers from.
  const all = [...tree.people.values()].map(p => p.indi);
  const cast = {
    surnames: [...new Set(all.map(i => i.surname).filter(Boolean))], names: all.map(displayName),
    maleNames: [...new Set(all.filter(i => i.sex === 'M').map(firstName))],
    jobs: [...new Set(all.flatMap(i => i.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim())))],
    towns: [...new Set(all.map(i => placeTown(evPlace(i, 'BIRT', 'CHR', 'BAPM'))?.name).filter(Boolean))],
  };
  for (const pad of [['surnames', ['Hargreaves', 'Pickles', 'Entwistle', 'Dobson']], ['maleNames', ['Josiah', 'Ezra', 'Abel', 'Enoch']], ['jobs', ['Rat catcher', 'Lamplighter', 'Knocker-up', 'Tripe dresser']], ['towns', ['Ormskirk', 'Todmorden', 'Wick', 'Skibbereen']], ['names', ['Josiah Pickles', 'Hannah Entwistle', 'Abel Dobson']]]) {
    if (cast[pad[0]].length < 5) cast[pad[0]].push(...pad[1]);
  }

  // ---- Chapters ----
  let lastTown = home;
  const usedSets = {}, usedJobs = {}, proven = new Set(['birth' + rootId]);
  const chapters = chosen.map(({ p, spine: onSpine }, i) => {
    const c = describe(p, data, { by: est.get(p.id) });
    const fam = familyThrough(data, p.id, p.primaryChild);
    const par = parentsOf(data, p.id);
    c.spine = onSpine;
    c.child = p.primaryChild ? data.individuals.get(p.primaryChild) : null;
    c.spouse = fam.spouse; c.marriage = fam.marriage; c.kids = fam.kids;
    c.father = par.father ? data.individuals.get(par.father) : null;
    c.mother = par.mother ? data.individuals.get(par.mother) : null;
    c.marriageYear = dateYear(fam.marriage?.date);
    const childBy = c.child ? birthYear(c.child) : null;
    const childBirth = c.child && findEvent(c.child, 'BIRT');
    const isTop = i === chosen.length - 1;
    // Which real event the chapter's big mission is built on: the least-used kind this person has.
    c.emig = c.indi.events.find(e => e.tag === 'EMIG' || e.tag === 'IMMI') || null;
    c.census = c.indi.events.find(e => (e.tag === 'CENS' || e.tag === 'RESI') && e.date) || null;
    c.bapt = findEvent(c.indi, 'CHR', 'BAPM');
    const laterTown = placeTown(childBirth?.place) || placeTown(evPlace(c.indi, 'DEAT', 'BURI'));
    c.movedTo = c.town && laterTown && laterTown.country !== c.town.country ? laterTown : null;
    const avail = [];
    if (c.emig || c.movedTo) avail.push('emig');
    if (c.group === 'arms' || c.indi.events.some(e => /MIL/.test(e.tag))) avail.push('arms');
    // (a birth or a wedding is only proved once, however many of the family get a chapter)
    if (c.spouse && !proven.has('wed' + fam.fam.id)) avail.push('wedding');
    if (c.child && !proven.has('birth' + c.child.id)) avail.push('birth');
    if (c.census) avail.push('census');
    if (c.bapt) avail.push('baptism');
    avail.push('chase');
    c.set = isTop ? 'finale' : avail.slice().sort((a, b) => (usedSets[a] || 0) - (usedSets[b] || 0))[0];
    usedSets[c.set] = (usedSets[c.set] || 0) + 1;
    if (c.set === 'wedding') proven.add('wed' + fam.fam.id);
    if (c.set === 'birth') proven.add('birth' + c.child.id);
    // The chapter happens where and when that event did.
    const evTown = c.set === 'wedding' ? placeTown(fam.marriage?.place) : c.set === 'birth' ? placeTown(childBirth?.place) : c.set === 'census' ? placeTown(c.census.place) : null;
    c.town = town(evTown && evTown.key !== 'unknown' ? evTown : c.town || lastTown);
    lastTown = c.town;
    let year = c.set === 'birth' && childBy != null ? childBy
      : c.set === 'emig' ? dateYear(c.emig?.date) ?? Math.min(c.by + 22, (childBy ?? 9999) - 1)
        : c.set === 'census' ? dateYear(c.census.date)
          : c.set === 'arms' ? c.by + 21
            : c.set === 'finale' ? c.by + 24
              : c.marriageYear ?? (childBy != null ? childBy - 1 : c.by + 25);
    year = Math.max(c.by + 16, Math.min(year, (c.dy ?? c.by + 70) - (c.set === 'birth' ? 0 : 1), present - 1));
    c.year = year;
    c.index = i;
    return c;
  });
  const finale = chapters.length ? chapters[chapters.length - 1] : null;
  const benefactor = chapters.filter(c => c.spine)[Math.min(2, Math.max(0, chapters.filter(c => c.spine).length - 1))] || hero;
  const surname = hero.surname || benefactor.surname || 'family';

  const missions = [];
  const proofs = [];
  const add = m => { m.index = missions.length; missions.push(m); return m; };
  const proof = (kind, who, title, detail) => { const pr = { id: kind + ':' + who.id, kind, person: who.id, title, detail }; proofs.push(pr); return pr; };
  const names = (t, y) => ({ church: lotName('church', t, y), hall: lotName('hall', t, y), pub: lotName('pub', t, y), works: lotName('works', t, y), farm: lotName('farm', t, y), hub: lotName('hub', t, y), market: lotName('market', t, y), infirmary: lotName('infirmary', t, y), police: lotName('police', t, y), post: lotName('post', t, y), garage: lotName('garage', t, y), phone: lotName('phone', t, y) });
  const H = names(home, present);
  const heroBirth = findEvent(rootP.indi, 'BIRT');
  const relOfB = benefactor === hero ? 'own' : benefactor.rel;
  const estateOf = benefactor === hero ? `the ${surname} family` : `${benefactor.name}${benefactor.life ? ' (' + benefactor.life + ')' : ''}`;
  const next = chapters[0];

  // ---- Prologue (present day, home town) ----
  add({
    id: 'final-notice', act: 'Prologue', title: 'Final Notice', town: home.id, year: present, giver: { who: 'auto' }, hour: 9,
    brief: 'A solicitor\'s letter, a ringing phone box and a car that should not exist.',
    intro: [
      { who: 'letter', text: `FINAL NOTICE. Re: the dormant estate of ${estateOf}${benefactor.town && benefactor !== hero ? ', late of ' + benefactor.town.name : ''}. Unless a proven line of descent is lodged by the last day of the month, the estate passes to our client. No reply is necessary. Yours faithfully, S. Blank, Blank & Void, Probate Genealogists.` },
      { who: 'note', text: `You have never heard of Blank & Void. You have barely heard of ${benefactor === hero ? 'any estate' : benefactor.first}. ` + (present >= 1925 ? `Outside, ${H.phone} on the corner is ringing. Nobody rings phone boxes any more.` : `Outside, somebody has pinned a note to ${H.phone}, and it has your name on it.`) },
    ],
    steps: [
      { t: 'goto', at: 'phone', foot: true, text: present >= 1925 ? `Answer ${H.phone}` : `Read the note on ${H.phone}` },
      { t: 'talk', who: 'dot', at: 'phone', text: present >= 1925 ? `Answer ${H.phone}` : `Read the note on ${H.phone}`, lines: [
        `Is that ${hero.first}? ${benefactor === hero ? 'The ' + surname + ' heir' : cap(benefactor.first) + '\'s ' + (benefactor.gen ? 'great-'.repeat(Math.max(0, benefactor.gen - 2)) + (benefactor.gen > 1 ? 'grandchild' : 'child') : 'heir')}? Thank heavens. Dot Quill, County Archivist, retired.`,
        `Don't sign anything. Silas Blank doesn't find heirs. He removes them. Names are going out of the registers like chalk off a slate, and yours is next in the queue.`,
        `Come to my lock-up behind ${H.pub}. Tell nobody. Oh, and I do hope you can drive.`] },
      { t: 'goto', at: 'garage', text: `Go to ${H.garage}` },
      { t: 'talk', who: 'dot', at: 'garage', text: 'Talk to Dot', lines: [
        `There she is. My late husband's estate car. We call her the Heirloom.`,
        `I fitted the Parish Engine myself. It runs on register ink and it reads the road like a page. Get her up to speed on a straight road and she turns the years back. I was a very bored archivist.`,
        `But first, ${H.hall}. I want the ${surname} file out of there before Blank's people shred it. Get in, the door sticks.`] },
      { t: 'goto', at: 'hall', need: 'heirloom', text: `Drive the Heirloom to ${H.hall}` },
      { t: 'chase', from: 'hall', hp: 4, label: 'the Redaction van', drop: `the ${surname} file`, text: 'Erasers! Ram the grey van until it drops the file' },
    ],
    outro: [{ who: 'dot', text: `One birth certificate: ${hero.name}${heroBirth?.date ? ', born ' + datePhrase(heroBirth.date) : ''}${hero.town ? ' in ' + hero.town.name : ''}. That's proof number one, and it proves you exist, which is a start. Now we go backwards, one generation at a time, faster than he can rub them out.` }],
    reward: { cash: 150, proof: proof('birth', hero, `Birth of ${hero.name}`, [heroBirth?.date && cap(datePhrase(heroBirth.date)), hero.town?.name].filter(Boolean).join(', ') || 'Certified copy') },
  });
  add({
    id: 'ink-money', act: 'Prologue', title: 'Ink Money', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
    brief: 'The Engine drinks ink, ink costs money, and you have neither.',
    intro: [{ who: 'dot', text: `The Engine drinks ink, and proper iron-gall register ink costs a fortune. So does every ticket you'll need. You'll have to earn your way through history like everybody in your tree did.` },
      { who: 'dot', text: `Start small. ${H.pub} wants two crates fetched from ${H.market}. After this, look for the £ signs around any town in any year: there's always somebody who needs something shifted.` }],
    steps: [{ t: 'carry', from: 'market', to: 'pub', n: 2, label: 'crates', timed: 1.6, text: `Carry two crates from ${H.market} to ${H.pub}` }],
    outro: [{ who: 'dot', text: `Honest money. Don't spend it all on tickets. Well, do. That's what it's for.` }],
    reward: { cash: 180 },
  });
  if (next) add({
    id: 'first-jump', act: 'Prologue', title: 'Relative Speed', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
    brief: `Take the Heirloom back to ${next.year}.`,
    intro: [{ who: 'dot', text: `Your ${next.rel} ${next.first}${next.job ? ', the ' + next.job.toLowerCase() : ''}. ${next.town.id === home.id ? 'Right here in ' + home.name : cap(next.town.name) + (next.town.country !== home.country ? ', ' + next.town.nation : '')}, ${next.year}. That's the first page Blank will go for.` },
      { who: 'dot', text: `${next.town.id === home.id ? '' : (next.town.country !== home.country ? `You'll need to get to ${next.town.nation} first: tickets at ${H.hub}. ` : `Get yourself to ${next.town.name} first: tickets at ${H.hub}. `)}Then set the dial with T, find a long straight road and keep your foot down until the dial reaches the year. Don't lift off. She hates it when you lift off.` }],
    steps: [{ t: 'travel', town: next.town.id, year: next.year, text: `Get to ${next.town.name} in ${next.year}` }],
    outro: [{ who: 'note', text: `${next.town.name}, ${next.year}. ${ERA_ARRIVAL[eraOf(next.year)]}` }],
    reward: { cash: 60 },
  });

  // ---- One chapter per chosen ancestor ----
  chapters.forEach((c, i) => {
    const isFinale = c === finale;
    const N = names(c.town, c.year), w = eraWords(c.year);
    const ctx = { ...N, year: c.year, first: c.first, jobL: c.jobs.join(' ').toLowerCase() };
    const pay = 160 + i * 50;
    const act = isFinale ? 'Finale' : `Chapter ${i + 1}`;
    const base = { act, town: c.town.id, year: c.year, chapter: i };
    const relLine = `${c.name}, your ${c.rel}`;
    const quiz = quizFor(c, cast, rnd);
    // 1. Meet them
    add({
      ...base, id: `meet-${i}`, title: isFinale ? 'Brick Wall' : `Meeting ${c.first}`, giver: { who: c.id, at: 'home' },
      brief: `Find ${relLine}, in ${c.town.name}, ${c.year}.`,
      intro: [{ who: c.id, greet: true },
        { who: c.id, text: `Family, you say. There's a grey fellow been round all week saying the same, and asking after the parish book. I trust nobody who can't tell me something only kin would know.` }],
      steps: [{ t: 'talk', who: c.id, at: 'home', quiz, text: `Talk to ${c.first}`, lines: quiz ? [] : [`Well. You've the look of us, I'll give you that.`] }],
      outro: [{ who: c.id, text: isFinale
        ? `Then you're mine, sure enough, though how is past my wits. There's nobody behind me in any book, you know. I'm where it starts.`
        : `Then you're one of ours, though I can't think how. Sit down. You look half starved and wholly lost.` }],
      reward: { cash: 60 + i * 10 },
    });
    // 2. A day's work
    // The same trade twice in one family gets a different day's work the second time.
    const jobKeys = [c.group, c.group + 'B', 'odd', 'shop', 'rail', 'serve'].filter(k => DAY_JOBS[k]);
    const jobKey = jobKeys.find(k => !usedJobs[k]) || c.group;
    if (!isFinale) usedJobs[jobKey] = true;
    const job = (DAY_JOBS[jobKey] || DAY_JOBS.odd)(ctx);
    if (!isFinale) add({
      ...base, id: `work-${i}`, title: job.title, giver: { who: c.id, at: c.group === 'farm' ? 'farm' : ['haul', 'cloth', 'craft'].includes(c.group) ? 'works' : c.group === 'sea' ? 'hub' : 'home' },
      brief: `${c.first}${c.job ? ' the ' + c.job.toLowerCase() : ''} could use a hand.`,
      intro: [{ who: c.id, text: (c.job ? `I'm ${/^[aeiou]/i.test(c.job) ? 'an' : 'a'} «${c.job.toLowerCase()}», and it's no life for the idle. ` : '') + job.ask }],
      steps: job.steps,
      outro: [{ who: c.id, text: `Not bad. Not bad at all, for somebody who talks like you do. Here, you've earned it.` }],
      reward: { cash: pay },
    });
    // 3. The set piece, built on a real event from the file
    const groom = c.sex === 'F' ? c.spouse : c.indi, bride = c.sex === 'F' ? c.indi : c.spouse;
    const emig = c.emig, census = c.census, bapt = c.bapt;
    const childBirth = c.child && findEvent(c.child, 'BIRT');
    const kind = c.set;
    const when = d => d ? ' ' + datePhrase(d) : '';
    let set;
    if (kind === 'wedding') {
      const g = groom ? firstName(groom) : 'the groom', b = bride ? firstName(bride) : 'the bride';
      set = { title: 'Get Me to the Church', brief: `${g} and ${b} are to be married${when(c.marriage?.date)}. Blank would rather they weren't.`,
        ask: `It's my wedding morning and ${c.sex === 'F' ? `«${g}» has not come` : `I'm stuck here`}. Somebody's had the wheels off every ${w.ride} in the street and the parson won't wait past the bells. ${c.sex === 'F' ? `He'll be at «${N.pub}», sick with nerves. Fetch him to church or there's no wedding, and then where will you be?` : `Get me to that church. If I'm not wed today then there's no us, and by the look on your face there's no you.`}`,
        steps: [{ t: 'carry', from: c.sex === 'F' ? 'pub' : 'home', to: 'church', n: 1, label: 'groom', passenger: g, timed: 1.05, text: `Get ${g} to ${N.church} before the bells stop` },
          { t: 'chase', from: 'church', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the marriage register', text: `They've snatched the register! Stop the ${w.van}` }],
        done: `${g} and ${b}, married. It's in the book and the ink's dry.`,
        proof: proof('marriage', c, `Marriage of ${groom ? displayName(groom) : g} and ${bride ? displayName(bride) : b}`, [c.marriage?.date && cap(datePhrase(c.marriage.date)), placeTown(c.marriage?.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'birth') {
      const kid = firstName(c.child);
      set = { title: 'Special Delivery', brief: `${kid} is due${when(childBirth?.date)}, and the midwife is nowhere to be found.`,
        ask: `The baby's coming and the midwife's not: some grey devil has ${c.year >= 1900 ? 'let her tyres down' : 'lamed her pony'}. Fetch her from «${N.infirmary}», and drive like the child's life hangs on it. Yours might, come to think.`,
        steps: [{ t: 'carry', from: 'infirmary', to: 'home', n: 1, label: 'midwife', passenger: 'the midwife', timed: 1.0, text: `Rush the midwife from ${N.infirmary} to the house` },
          { t: 'collect', around: 'hall', radius: 14, n: 6, label: 'register pages', timed: 1.4, text: `Blank's men have scattered the birth register. Collect every page near ${N.hall}` }],
        done: `${displayName(c.child)}, born safe and written down. ${c.child.id === rootId ? 'That one is you, by the way.' : 'One more link that holds.'}`,
        proof: proof('birth', { id: c.child.id }, `Birth of ${displayName(c.child)}`, [childBirth?.date && cap(datePhrase(childBirth.date)), placeTown(childBirth?.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'emig') {
      const dest = (c.movedTo || placeTown(evPlace(c.indi, 'IMMI', 'DEAT', 'BURI')))?.nation;
      const air = c.year >= 1950;
      set = { title: air ? 'Final Call' : 'The Last Boat', brief: `${c.first} is leaving${dest && dest !== c.town.nation ? ' for ' + dest : ''}${when(emig?.date)}. The ${w.boat} will not wait.`,
        ask: `Everything I own is in two trunks and the ${w.boat} ${air ? 'leaves within the hour' : 'sails on the tide'}${dest && dest !== c.town.nation ? ' for «' + dest + '»' : ''}. Every ${air ? 'taxi' : 'carter'} in town has been paid by some grey gentleman to be busy. Get the trunks to «${N.hub}», then come back for me.`,
        steps: [{ t: 'carry', from: 'home', to: 'hub', n: 2, label: 'trunks', timed: 1.2, text: `Get both trunks to ${N.hub}` },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'traveller', passenger: c.first, timed: 1.0, text: `Now ${c.first}. The ${w.boat} is about to leave` },
          { t: 'chase', from: 'hub', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the passenger list', text: `Erasers have the passenger list. Stop the ${w.van}` }],
        done: `${c.name}, on the passenger list in black and white. Wherever ${c.he} went, ${c.he} went on the record.`,
        proof: proof('passage', c, `Passage of ${c.name}`, [emig?.date ? cap(datePhrase(emig.date)) : String(c.year), dest && 'bound for ' + dest].filter(Boolean).join(', ') || 'Passenger list') };
    } else if (kind === 'arms') {
      set = { title: 'The King\'s Shilling', brief: `${c.first} has orders, and somebody has been at the muster roll.`,
        ask: `I'm to report and the muster roll's gone missing with my name on it. No roll, no record, and a man with no record never served. Run these dispatches round and then get me to «${N.hub}» before the column moves off.`,
        steps: [{ t: 'race', stops: ['police', 'hall', 'church', 'post', 'home'], timed: 1.1, text: 'Carry the dispatches round the town' },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'soldier', passenger: c.first, timed: 1.0, text: `Get ${c.first} to ${N.hub} before the column leaves` }],
        done: `${c.name}, on the muster roll. Served, counted and remembered.`,
        proof: proof('service', c, `Service record of ${c.name}`, c.job || 'Muster roll') };
    } else if (kind === 'census') {
      set = { title: 'Count Me In', brief: `Census night${when(census.date)}. The enumerator has lost his nerve and most of his schedules.`,
        ask: `The census man's been round in tears. A grey ${w.ride === 'cart' ? 'carriage' : 'van'} knocked him flat and took his schedules. If this street isn't counted tonight, we were never here. Do his round for him and get the book back.`,
        steps: [{ t: 'race', stops: ['home', 'pub', 'farm', 'school', 'market', 'church'], timed: 1.25, text: 'Do the enumerator\'s round before midnight' },
          { t: 'chase', from: 'hall', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the census schedules', text: `Get the schedules back from the ${w.van}` }],
        done: `${c.name}${c.job ? ', ' + c.job.toLowerCase() : ''}, counted at ${c.town.name}. Present and correct.`,
        proof: proof('census', c, `Census entry for ${c.name}`, [dateYear(census.date), placeTown(census.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'baptism') {
      set = { title: 'Wet the Baby\'s Head', brief: `${c.first}'s own baptism entry${when(bapt.date)} is coming loose from the book.`,
        ask: `Parson says the register fell open in the night and the wind took the pages. In a shut vestry. With the door locked. The page with my name on is out there somewhere, and I'd like to go on having been christened.`,
        steps: [{ t: 'collect', around: 'church', radius: 15, n: 7, label: 'register pages', timed: 1.4, text: `Gather the register pages around ${N.church}` },
          { t: 'chase', from: 'church', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the last page', text: `The last page is in the ${w.van}. Stop it` }],
        done: `${c.name}, baptised${when(bapt.date)}. Back in the book.`,
        proof: proof('baptism', c, `Baptism of ${c.name}`, [bapt.date && cap(datePhrase(bapt.date)), placeTown(bapt.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'chase') {
      set = { title: 'Struck Out', brief: `Blank's men are at ${N.hall} with a bottle of ink remover.`,
        ask: `That grey lot are at «${N.hall}» this minute with the book open at our page. I saw them through the window. Whatever that contraption of yours does, do it now.`,
        steps: [{ t: 'goto', at: 'hall', timed: 1.0, text: `Get to ${N.hall}` },
          { t: 'chase', from: 'hall', hp: 5 + Math.min(3, i), label: `the ${w.van}`, drop: 'the parish book', text: `Stop the ${w.van} and get the book back` }],
        done: `${c.name}: the entry stands.`,
        proof: proof('entry', c, `Parish entry for ${c.name}`, [c.life, c.town.name].filter(Boolean).join(', ')) };
    }
    if (set) add({
      ...base, id: `proof-${i}`, title: set.title, giver: { who: c.id, at: 'home' }, brief: set.brief,
      hour: { wedding: 10.5, birth: 2.5, emig: 6, arms: 7, census: 20.2, baptism: 11, chase: 22.5 }[kind],
      intro: [{ who: c.id, text: set.ask }], steps: set.steps,
      outro: [{ who: 'dot', text: `${set.done} Proof ${proofs.length} of ${chapters.length + 1}.` + (chapters[i + 1] && chapters[i + 1] !== finale ? ` Next: ${chapters[i + 1].name}, your ${chapters[i + 1].rel}, ${chapters[i + 1].town.name}, ${chapters[i + 1].year}.` : '') }],
      reward: { cash: pay + 120, proof: set.proof },
    });

    // The Golden Door: everybody's tree passes somebody's manifest. Only if the file never leaves home.
    if (!foreign && present > 1907 && !isFinale && i === Math.min(1, chapters.length - 2)) {
      const ny = town(NEW_YORK);
      add({ act: 'Interlude', id: 'golden-door', title: 'The Golden Door', town: ny.id, year: 1907, giver: { who: 'dot', at: 'phone' }, hour: 6.2,
        brief: 'Blank has gone wholesale: Ellis Island, 1907, twelve million names.',
        intro: [{ who: 'dot', text: `A note in Dot's handwriting, pinned where you'd find it: "He's gone wholesale. Ellis Island, New York, 1907. Twelve million names on those manifests and he means to thin them out. Not your family's, perhaps, but somebody's. Go."` }],
        steps: [{ t: 'collect', around: 'hub', radius: 17, n: 8, label: 'manifest pages', timed: 1.5, text: 'Collect the ship\'s manifest pages blowing along the waterfront' },
          { t: 'chase', from: 'hub', hp: 6, label: 'the grey motor-van', drop: 'a crate of manifests', text: 'Stop the grey motor-van before it reaches the incinerator' }],
        outro: [{ who: 'dot', text: `Twelve million strangers who'll never know your name. That's the job, dear. Now, back to your own lot.` }],
        reward: { cash: 520 } });
    }
    // Before the finale: the raid on Blank & Void, back in the present.
    if (!isFinale && chapters[i + 1] === finale) addLedger();
    if (isFinale) {
      const g = `the ${w.van}`;
      add({
        ...base, id: 'blank-page', title: 'The Blank Page', giver: { who: c.id, at: 'home' }, hour: 18.6,
        brief: `${c.name} is the top of your tree. If ${c.his} name never goes in the book, nobody below it does either.`,
        intro: [{ who: c.id, text: `There's a gentleman at the church this hour, grey as a gravestone, turning the parson's book to my page. He said the queerest thing. He said, "Somebody has to be nobody." What did he mean by it?` },
          { who: 'dot', text: `A note, in pencil, shaking: "${hero.first}. This is it. ${c.name}${bapt?.date ? ', baptised ' + datePhrase(bapt.date) : ', ' + c.by}, ${c.town.name}. Nobody above ${c.him} in any record. Your brick wall. If that entry goes, every name under it goes, down to yours. He has my first Engine. Do not let him turn the page."` }],
        steps: [{ t: 'goto', at: 'church', timed: 0.95, text: `Race to ${N.church}` },
          { t: 'collect', around: 'church', radius: 16, n: 8, label: 'register pages', timed: 1.3, text: 'He has torn the register apart. Save every page' },
          { t: 'chase', from: 'church', hp: 9, fast: true, boss: true, label: 'Engine No. 1', drop: 'the last page', text: 'Silas Blank is making a run for another century. Stop Engine No. 1' }],
        outro: [
          { who: 'blank', text: `Go on, then. Read it. Read the page you were so keen to save. Not the entry. The margin.` },
          { who: 'note', text: `In the margin beside ${c.first}'s entry, in the parson's cramped hand: "Also a second infant of this house, base-born, put out to the parish this day. No name given." And beneath it, in the workhouse clerk's hand: "Entered as BLANK."` },
          { who: 'blank', text: `Blank. Because the line was blank. Four hundred years of your people in every book I open, and my whole family is a gap in a margin. I thought if nobody had a tree, I should not mind so much.` },
          { who: 'dot', text: `Oh, Silas. You silly man. That's not a gap. That's a sibling. You've spent thirty years trying to erase your own family.` },
        ],
        reward: { cash: 600, proof: proof('baptism', c, `Baptism of ${c.name}`, [bapt?.date ? cap(datePhrase(bapt.date)) : String(c.by), c.town.name, 'with a note in the margin'].filter(Boolean).join(', ')) },
      });
    }
  });
  function addLedger() {
    const f = finale;
    add({
      act: 'Interlude', id: 'blank-and-void', title: 'Blank & Void', town: home.id, year: present, giver: { who: 'dot', at: 'garage' }, hour: 23,
      brief: 'A visit to the offices of Blank & Void, Probate Genealogists. Uninvited.',
      intro: [{ who: 'dot', text: `He's ahead of us and I want to know how. Blank & Void keep an office in town. Very grey. Very shredder. Get whatever's left of his ledger, and expect company on the way out.` }],
      steps: [{ t: 'goto', at: 'office', text: 'Go to the offices of Blank & Void' },
        { t: 'collect', around: 'office', radius: 15, n: 7, label: 'ledger pages', timed: 1.35, text: 'They are throwing the ledger out of the windows. Grab every page' },
        { t: 'escape', heat: 2, text: 'The alarm has gone. Lose the police' },
        { t: 'goto', at: 'garage', text: `Take the ledger back to ${H.garage}` }],
      outro: [{ who: 'dot', text: `Page one, in his own hand: "BLANK, Silas. Foundling. Left at the door of the parish of ${f.town.name}. No name given." Oh, I see. He isn't only erasing your family, ${hero.first}. He's been looking for his own.` },
        { who: 'dot', text: `And the last entry: ${f.name}, ${f.town.name}, ${f.year}. The very top of your tree. He's going for the root.` }],
      reward: { cash: 400 },
    });
  }
  // Put the raid in if the loop above never reached "the chapter before the finale" (single-chapter trees).
  if (finale && !missions.some(m => m.id === 'blank-and-void')) {
    const at = missions.findIndex(m => m.chapter === finale.index);
    addLedger();
    const led = missions.pop();
    missions.splice(at < 0 ? missions.length : at, 0, led);
  }
  // No ancestors at all: the hero is their own brick wall.
  if (!finale) {
    add({ act: 'Finale', id: 'blank-page', title: 'The Blank Page', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
      brief: 'There is nobody above you in the file. You are your own brick wall.',
      intro: [{ who: 'dot', text: `There's nobody above you in this file, dear, which makes you the top of the tree and the whole of it. Blank only needs one page. He's at ${H.hall} now with my first Engine.` }],
      steps: [{ t: 'goto', at: 'hall', timed: 1.0, text: `Race to ${H.hall}` }, { t: 'collect', around: 'hall', radius: 16, n: 8, label: 'register pages', timed: 1.3, text: 'Save every page' },
        { t: 'chase', from: 'hall', hp: 9, fast: true, boss: true, label: 'Engine No. 1', drop: 'the last page', text: 'Stop Engine No. 1' }],
      outro: [{ who: 'blank', text: `A foundling has no tree. I thought if nobody had one, I should not mind so much.` }, { who: 'dot', text: `Then start one, you silly man. Everybody's is one name long to begin with.` }],
      reward: { cash: 600 } });
  }
  // ---- Epilogue ----
  add({
    act: 'Epilogue', id: 'case-closed', title: 'Case Closed', town: home.id, year: present, giver: { who: 'dot', at: 'garage' }, hour: 14,
    brief: 'One pedigree, proven. One extra name to write in.',
    intro: [{ who: 'dot', text: `Every link proven, ${hero.first}, from you ${finale ? 'to ' + finale.name : 'upwards'}. And one more name for the chart than we started with. Drive us to ${H.hall}, both of us. Slowly. My hip, and his nerves.` }],
    steps: [{ t: 'carry', from: 'garage', to: 'hall', n: 1, label: 'passengers', passenger: 'Dot and Silas', gentle: true, text: `Drive Dot and Silas to ${H.hall}. Gently` }],
    outro: [
      { who: 'note', text: `The pedigree of ${hero.name} is lodged and stamped. The estate of ${estateOf} is released to its rightful heirs: you, and one newly discovered cousin, many times removed, who cries all over the paperwork.` },
      { who: 'blank', text: `I have a ${finale ? 'great-' + 'great-'.repeat(Math.min(3, Math.max(0, finale.gen - 2))) + 'aunt' : 'family'}. Several, apparently. I should like to meet them. Might I borrow the car?` },
      { who: 'dot', text: `You may not. But ${hero.first} might drive you. The Heirloom is yours now, dear: every town, every year, anyone in your tree. Go and say hello. They've been waiting long enough.` },
    ],
    reward: { cash: 5000 },
  });
  missions.forEach((m, i) => { m.index = i; });

  return {
    title: 'Relative Speed', hero, villain: { name: 'Silas Blank', firm: 'Blank & Void, Probate Genealogists' }, mentor: { name: 'Dot Quill' },
    benefactor, home, now: present, towns, chapters, missions, proofs, tree, surname, foreign,
  };
}

/** Everyone in the file who could have been seen on the street in that town in that year. */
export function residentsOf(data, town, year, limit = 40) {
  const out = [];
  for (const indi of data.individuals.values()) {
    const by = birthYear(indi);
    if (by == null || by > year - 5) continue;
    const dy = deathYear(indi) ?? by + 75;
    if (dy < year) continue;
    const places = indi.events.filter(e => e.place).map(e => placeTown(e.place)?.id);
    if (!places.includes(town.id)) continue;
    out.push({ id: indi.id, name: displayName(indi), sex: indi.sex, age: year - by, life: lifespan(indi), job: (indi.events.find(e => e.tag === 'OCCU' && e.value) || {}).value || '' });
    if (out.length >= limit) break;
  }
  return out;
}

/** A repeatable odd job for cash, flavoured for the year. */
export function oddJob(town, year, seed) {
  const rnd = seededRandom(seed);
  const e = eraOf(year);
  const goods = { modern: ['parcels', 'takeaways', 'flat-pack wardrobes', 'boxes of records'], retro: ['crates of pop', 'sacks of coal', 'wireless sets', 'bundles of newspapers'], vintage: ['milk churns', 'sacks of coal', 'crates of ale', 'telegrams'],
    victorian: ['barrels of ale', 'sacks of flour', 'bolts of cloth', 'baskets of tripe'], georgian: ['barrels', 'sacks of meal', 'hogsheads', 'bundles of wool'], early: ['sacks of grain', 'barrels', 'bundles of rushes', 'baskets of eels'] }[e];
  const spots = ['market', 'pub', 'works', 'farm', 'hub', 'school', 'church', 'infirmary', 'post'];
  const from = spots[Math.floor(rnd() * spots.length)];
  let to = spots[Math.floor(rnd() * spots.length)];
  if (to === from) to = spots[(spots.indexOf(from) + 3) % spots.length];
  const label = goods[Math.floor(rnd() * goods.length)];
  const n = 1 + Math.floor(rnd() * 3);
  const person = rnd() < 0.3;
  return {
    id: 'odd-' + seed, odd: true, act: 'Odd job', title: person ? 'Fare' : 'Carrier', town: town.id, year, giver: { who: 'board' }, brief: '', intro: [], outro: [],
    steps: [person
      ? { t: 'carry', from, to, n: 1, label: 'fare', passenger: 'your fare', timed: 1.2, text: `Take your fare from ${lotName(from, town, year)} to ${lotName(to, town, year)}` }
      : { t: 'carry', from, to, n, label, timed: 1.35, text: `Carry ${n === 1 ? 'the ' + label : n + ' loads of ' + label} from ${lotName(from, town, year)} to ${lotName(to, town, year)}` }],
    reward: { cash: 0, perTile: person ? 1.4 : 1.1 * n },
  };
}

/** Notes from the file for people connected with a town: what is written on the back of the lost photographs. */
export function townNotes(data, town, limit = 12) {
  const out = [];
  let seen = 0;
  for (const indi of data.individuals.values()) {
    if (seen++ > 20000 || out.length >= limit) break;
    if (!indi.notes.length) continue;
    if (!indi.events.some(e => e.place && placeTown(e.place)?.id === town.id)) continue;
    const text = indi.notes[0].replace(/\s+/g, ' ').trim();
    if (text.length > 8) out.push({ name: displayName(indi), life: lifespan(indi), text: text.length > 230 ? text.slice(0, 227).replace(/\s+\S*$/, '') + '…' : text });
  }
  return out;
}

/** How somebody in the file is related to the hero, as far as the game works it out. */
export function kinOf(data, tree, id) {
  const p = tree.people.get(id);
  if (p) return p.gen === 0 ? 'you' : 'your ' + relationship(p.gen, p.indi.sex);
  const indi = data.individuals.get(id);
  if (!indi) return '';
  const m = indi.sex === 'M', f = indi.sex === 'F';
  const par = parentsOf(data, id);
  for (const pid of [par.father, par.mother]) {
    const a = pid && tree.people.get(pid);
    if (!a) continue;
    const g = a.gen - 1; // the generation this person shares with someone on your line
    if (g < 0) return 'your ' + (m ? 'son' : f ? 'daughter' : 'child');
    if (g === 0) return 'your ' + (m ? 'brother' : f ? 'sister' : 'sibling');
    return 'your ' + (g === 1 ? '' : g === 2 ? 'great-' : g === 3 ? 'great-great-' : (g - 1) + '× great-') + (m ? 'uncle' : f ? 'aunt' : 'uncle or aunt');
  }
  for (const fid of indi.fams) {
    const fam = data.families.get(fid), sp = fam && (fam.husb === id ? fam.wife : fam.husb), a = sp && tree.people.get(sp);
    if (a) return a.gen === 0 ? 'your ' + (m ? 'husband' : f ? 'wife' : 'spouse') : `married to your ${relationship(a.gen, a.indi.sex)}`;
  }
  for (const pid of [par.father, par.mother]) {
    if (!pid) continue;
    const pp = parentsOf(data, pid);
    if ([pp.father, pp.mother].some(x => x && tree.people.has(x))) return 'a cousin of yours';
  }
  return 'in your family file';
}

/** Who lies in the churchyard: people in the file who died or were buried in this town by this year. */
export function burialsIn(data, town, year, limit = 24) {
  const out = [];
  let seen = 0;
  for (const indi of data.individuals.values()) {
    if (seen++ > 30000) break;
    const dy = deathYear(indi);
    if (dy == null || dy > year) continue;
    const place = evPlace(indi, 'BURI', 'CREM') || evPlace(indi, 'DEAT');
    if (!place || placeTown(place)?.id !== town.id) continue;
    out.push({ id: indi.id, name: displayName(indi), life: lifespan(indi), dy });
  }
  return out.sort((a, b) => b.dy - a.dy).slice(0, limit);
}

/** What somebody would tell you about themselves in a given year: only what has happened to them so far. */
export function lifeSoFar(data, id, year) {
  const indi = data.individuals.get(id);
  if (!indi) return [];
  const by = birthYear(indi), age = by != null ? year - by : null;
  const jobs = indi.events.filter(e => e.tag === 'OCCU' && e.value && (dateYear(e.date) ?? 0) <= year).map(e => e.value.trim().toLowerCase());
  const lines = [];
  const birth = findEvent(indi, 'BIRT', 'CHR', 'BAPM');
  lines.push(`«${displayName(indi)}»${age != null && age >= 0 ? `, ${age === 0 ? 'not a year old' : age + ' years old'}` : ''}${age != null && age >= 12 && jobs.length ? `, «${jobs[0]}»` : ''}.` + (birth?.place ? ` Born${birth.date ? ' ' + datePhrase(birth.date) : ''} in «${placeTown(birth.place)?.name || birth.place}».` : ''));
  for (const fid of indi.fams) {
    const fam = data.families.get(fid);
    if (!fam) continue;
    const my = dateYear(fam.events.find(e => e.tag === 'MARR')?.date);
    const sp = data.individuals.get(fam.husb === id ? fam.wife : fam.husb);
    const kids = fam.children.map(c => data.individuals.get(c)).filter(k => k && (birthYear(k) ?? 9999) <= year);
    if (my != null && my > year && !kids.length) continue;
    if (sp) lines.push(`Married to «${displayName(sp)}»${my ? ' since «' + my + '»' : ''}.` + (kids.length ? ` ${kids.length === 1 ? 'One child' : kids.length + ' children'} so far: ${kids.slice(0, 6).map(k => '«' + firstName(k) + '»').join(', ')}${kids.length > 6 ? ' and more' : ''}.` : ''));
  }
  const par = parentsOf(data, id), fa = par.father && data.individuals.get(par.father), mo = par.mother && data.individuals.get(par.mother);
  if (fa || mo) lines.push(`My ${fa && mo ? 'father and mother are' : fa ? 'father is' : 'mother is'} ${[fa, mo].filter(Boolean).map(x => '«' + displayName(x) + '»').join(' and ')}.`);
  const ev = indi.events.filter(e => ['RESI', 'CENS', 'EMIG', 'IMMI'].includes(e.tag) && e.place && (dateYear(e.date) ?? 9999) <= year).pop();
  if (ev) lines.push(`${ev.tag === 'EMIG' ? 'I left' : ev.tag === 'IMMI' ? 'I came to' : 'Lately I have lived at'} «${ev.place.split(',')[0]}»${ev.date ? ', ' + datePhrase(ev.date) : ''}.`);
  return lines;
}
