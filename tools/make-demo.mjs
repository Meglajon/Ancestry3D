// Generates sample/demo.ged — an entirely fictional family used for the demo mode.
// Run: node tools/make-demo.mjs
import { writeFileSync } from 'node:fs';

let seed = 1883;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rnd() * a.length)];

const MALE = ['William', 'John', 'Thomas', 'James', 'George', 'Henry', 'Joseph', 'Robert', 'Edward', 'Samuel', 'Arthur', 'Walter', 'Albert', 'Frederick', 'Patrick', 'Owen', 'Hugh', 'Daniel', 'Isaac', 'Matthew'];
const FEMALE = ['Mary', 'Elizabeth', 'Sarah', 'Ann', 'Margaret', 'Jane', 'Ellen', 'Martha', 'Hannah', 'Catherine', 'Alice', 'Emily', 'Florence', 'Bridget', 'Agnes', 'Esther', 'Harriet', 'Eliza', 'Gwen', 'Isabella'];
const SURN = ['Ashworth', 'Brennan', 'Calloway', 'Dunmore', 'Ellery', 'Fairclough', 'Garside', 'Holroyd', 'Iveson', 'Jagger', 'Kershaw', 'Lumb', 'Marsden', 'Nuttall', 'Ormerod', 'Pickles', 'Quarmby', 'Rhodes', 'Sutcliffe', 'Thwaite', 'Uttley', 'Vickers', 'Whiteley', 'Yeadon', 'Morgan', 'Pryce', 'Flanagan', 'Doherty', 'McKellar', 'Lindsay'];
const PLACES = ['Halifax, Yorkshire, England', 'Huddersfield, Yorkshire, England', 'Bradford, Yorkshire, England', 'Leeds, Yorkshire, England', 'Rochdale, Lancashire, England', 'Burnley, Lancashire, England', 'Liverpool, Lancashire, England', 'Manchester, Lancashire, England', 'Cork, County Cork, Ireland', 'Westport, County Mayo, Ireland', 'Merthyr Tydfil, Glamorgan, Wales', 'Paisley, Renfrewshire, Scotland', 'Glasgow, Lanarkshire, Scotland', 'Whitby, Yorkshire, England', 'Hebden Bridge, Yorkshire, England', 'Pemberton, Wigan, Lancashire, England', 'Bolton, Lancashire, England', 'Stroud, Gloucestershire, England', 'Chipping Campden, Gloucestershire, England', 'Bethnal Green, London, England', 'Cradley Heath, Staffordshire, England', 'Gateshead, Durham, England', 'Portree, Isle of Skye, Scotland'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const OCC = (y, sex) => sex === 'F'
  ? (y < 1780 ? ['Spinner', 'Dairymaid', 'Lacemaker', 'Domestic servant', 'Seamstress']
    : y < 1850 ? ['Cotton spinner', 'Power-loom weaver', 'Domestic servant', 'Dressmaker', 'Laundress', 'Fish wife']
    : y < 1910 ? ['Power-loom weaver', 'Dressmaker', 'Domestic servant', 'Schoolmistress', 'Milliner', 'Chain maker']
    : y < 1950 ? ['Typist', 'Nurse', 'Shop assistant', 'Telephonist', 'Weaver', 'Shopkeeper']
    : ['Teacher', 'Nurse', 'Pharmacist', 'Civil servant', 'Software developer'])
  : (y < 1780 ? ['Husbandman', 'Hand-loom weaver', 'Yeoman farmer', 'Wheelwright', 'Clothier', 'Shepherd', 'Gentleman', 'Clerk in holy orders']
    : y < 1850 ? ['Cotton spinner', 'Wool comber', 'Coal miner', 'Blacksmith', 'Agricultural labourer', 'Stonemason', 'Mill hand', 'Surgeon', 'Solicitor', 'Fisherman']
    : y < 1910 ? ['Railway porter', 'Power-loom weaver', 'Coal miner', 'Grocer', 'Iron moulder', 'Dock labourer', 'Clerk']
    : y < 1950 ? ['Bus conductor', 'Engineer', 'Coal miner', 'Shopkeeper', 'Electrician', 'Bricklayer']
    : ['Software developer', 'Teacher', 'Electrician', 'Pharmacist', 'Civil servant']);
const NOTES = [
  'Signed the marriage register with an X.',
  'Family story says he walked from the coast to find mill work.',
  'Listed in the census as "scholar" aged eleven.',
  'Kept a small shop on the ground floor of the family home for over thirty years.',
  'Survived the cholera outbreak that took two of her siblings.',
  'Served as a churchwarden; his name is on a plaque in the parish church.',
  'Emigrated briefly to Pennsylvania but returned within five years.',
  'Remembered for her singing in the chapel choir.',
];

const lines = ['0 HEAD', '1 SOUR ANCESTRY3D_DEMO', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8', '1 NOTE Entirely fictional family generated for the Ancestry 3D demo.'];
const indis = [];
const fams = [];
let nextI = 1, nextF = 1;
const famByAhnen = new Map();

function date(y) { return `${1 + Math.floor(rnd() * 28)} ${pick(MONTHS)} ${y}`; }

function person(sex, surname, birthY, place) {
  const id = `@I${nextI++}@`;
  const given = sex === 'M' ? pick(MALE) + (rnd() < 0.25 ? ' ' + pick(MALE) : '') : pick(FEMALE) + (rnd() < 0.2 ? ' ' + pick(FEMALE) : '');
  const p = { id, sex, given, surname, birthY, place, famc: null, fams: [] };
  indis.push(p);
  return p;
}

const MAX_GEN = 8;
const root = person('F', 'Ashworth', 1991, 'Leeds, Yorkshire, England');
root.given = 'Jess';
root.living = true;

function makeParents(child, ahnen, gen) {
  if (gen >= MAX_GEN) return;
  if (ahnen === 24 || ahnen === 25) return; // the Jamaican-born line starts here
  const known = gen < 3 ? 1 : gen < 5 ? 0.88 : gen < 7 ? 0.7 : 0.45;
  if (rnd() > known) return;
  // Pedigree collapse: Ahnentafel 26 (a maternal great-great-grandfather) is a brother of Ahnentafel 18,
  // so a pair of 3x-great-grandparents appears on two lines of descent.
  if (ahnen === 26 && famByAhnen.has(18)) {
    const fam = famByAhnen.get(18);
    child.famc = fam.id;
    fam.children.push(child.id);
    return;
  }
  const fatherSurname = child.sex === 'F' && gen === 0 ? child.surname : child.surname;
  const place = rnd() < 0.7 ? child.place : pick(PLACES);
  const fBirth = child.birthY - (24 + Math.floor(rnd() * 12));
  const mBirth = child.birthY - (20 + Math.floor(rnd() * 10));
  const father = person('M', fatherSurname, fBirth, place);
  const mother = person('F', pick(SURN), mBirth, rnd() < 0.6 ? place : pick(PLACES));
  const fam = { id: `@F${nextF++}@`, husb: father.id, wife: mother.id, children: [child.id], marrY: Math.max(fBirth, mBirth) + 20 + Math.floor(rnd() * 4), place };
  fams.push(fam);
  famByAhnen.set(ahnen, fam);
  child.famc = fam.id;
  father.fams.push(fam.id); mother.fams.push(fam.id);
  // A few siblings so the "my children were..." dialogue has something to say.
  const sibs = Math.floor(rnd() * 5);
  for (let s = 0; s < sibs; s++) {
    const sib = person(rnd() < 0.5 ? 'M' : 'F', father.surname, child.birthY + Math.floor(rnd() * 14) - 6, place);
    sib.famc = fam.id; sib.sibling = true;
    fam.children.push(sib.id);
  }
  return { father, mother };
}

// Breadth-first so the collapse source (18) exists before 26.
const byAhnen = new Map();
let frontier = [{ p: root, ahnen: 1, gen: 0 }];
while (frontier.length) {
  const next = [];
  for (const { p, ahnen, gen } of frontier) {
    byAhnen.set(ahnen, p);
    const parents = makeParents(p, ahnen, gen);
    if (parents) {
      next.push({ p: parents.father, ahnen: ahnen * 2, gen: gen + 1 });
      next.push({ p: parents.mother, ahnen: ahnen * 2 + 1, gen: gen + 1 });
    }
  }
  frontier = next.sort((a, b) => a.ahnen - b.ahnen);
}

// A Jamaican-born great-grandfather (and his parents), and a great-grandfather born in Calcutta to
// Yorkshire parents: shows colouring coming from birthplace for founders and from parents otherwise.
for (const [a, place] of [[12, 'Kingston, Jamaica'], [24, 'Spanish Town, Jamaica'], [25, 'Kingston, Jamaica'], [10, 'Calcutta, Bengal, India'], [20, 'Bradford, Yorkshire, England'], [21, 'Halifax, Yorkshire, England']]) {
  const q = byAhnen.get(a); if (q) q.place = place;
}
if (byAhnen.get(12)) byAhnen.get(12).job = 'Bus conductor';
for (const p of indis) {
  lines.push(`0 ${p.id} INDI`, `1 NAME ${p.given} /${p.surname}/`, `2 GIVN ${p.given}`, `2 SURN ${p.surname}`, `1 SEX ${p.sex}`);
  const known = p === root || rnd() < 0.9;
  if (known) {
    lines.push('1 BIRT', `2 DATE ${rnd() < 0.25 && p.birthY < 1840 ? 'ABT ' + p.birthY : date(p.birthY)}`, `2 PLAC ${p.place}`);
  }
  if (!known && p.birthY < 1837) lines.push('1 CHR', `2 DATE ${date(p.birthY)}`, `2 PLAC ${p.place.replace(/^[^,]+/, m => 'St Mary, ' + m)}`);
  if (!p.living && !p.sibling || (p.sibling && rnd() < 0.6)) {
    const age = p.sibling && rnd() < 0.2 ? Math.floor(rnd() * 6) : 45 + Math.floor(rnd() * 45);
    const dy = p.birthY + age;
    if (dy < 2024) {
      lines.push('1 DEAT', `2 DATE ${date(dy)}`, `2 PLAC ${rnd() < 0.8 ? p.place : pick(PLACES)}`);
      if (rnd() < 0.3) lines.push(`2 CAUS ${pick(dy < 1930 ? ['Consumption', 'Bronchitis', 'Old age', 'Pneumonia', 'Mining accident', 'Typhoid'] : ['Heart failure', 'Old age', 'Stroke', 'Pneumonia'])}`);
      if (rnd() < 0.5) lines.push('1 BURI', `2 DATE ${date(dy)}`, `2 PLAC ${p.place.replace(/^[^,]+/, m => m + ' General Cemetery')}`);
    }
  }
  if (!p.sibling) {
    lines.push(`1 OCCU ${p.job || pick(OCC(p.birthY, p.sex))}`);
    if (p.birthY > 1820 && p.birthY < 1920 && rnd() < 0.6) {
      const cy = Math.ceil((p.birthY + 12) / 10) * 10 + 1;
      lines.push('1 RESI', `2 DATE ${cy}`, `2 PLAC ${Math.floor(rnd() * 90) + 1} ${pick(['Mill Lane', 'Back Street', 'Union Road', 'Chapel Row', 'Moor End', 'Victoria Terrace'])}, ${p.place}`);
    }
    if (p === root) lines.push('1 NOTE Started this family tree in 2019 after finding a box of old photographs in the loft.');
    else if (p.birthY < 1910 && rnd() < 0.4) lines.push(`1 NOTE ${pick(NOTES)}`);
    if (p.birthY > 1880 && p.birthY < 1905 && p.sex === 'M' && rnd() < 0.6) lines.push('1 EVEN', '2 TYPE Military service', `2 DATE FROM 1914 TO 1918`, '2 PLAC Western Front, France');
  }
  if (p.famc) lines.push(`1 FAMC ${p.famc}`);
  for (const f of p.fams) lines.push(`1 FAMS ${f}`);
}
for (const f of fams) {
  lines.push(`0 ${f.id} FAM`, `1 HUSB ${f.husb}`, `1 WIFE ${f.wife}`);
  for (const c of f.children) lines.push(`1 CHIL ${c}`);
  if (rnd() < 0.85) lines.push('1 MARR', `2 DATE ${date(f.marrY)}`, `2 PLAC ${f.place.replace(/^[^,]+/, m => 'Parish Church, ' + m)}`);
}
lines.push('0 TRLR');
writeFileSync(new URL('../sample/demo.ged', import.meta.url), lines.join('\n') + '\n');
console.log(`wrote ${indis.length} individuals, ${fams.length} families`);
