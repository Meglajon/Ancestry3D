// What each ancestor says. Facts come from the GEDCOM record; the voice comes from where they were born, when they lived, and how much schooling
// their work suggests. Names, places and dates are never run through the dialect rules.
import { datePhrase, dateYear } from './gedcom.js';
import { displayName, firstName, findEvent, relationship, pathPhrase, parentsOf, familiesAsSpouse, lifespan, hashString, seededRandom } from './ancestry.js';
import { resolvePlace } from './places.js';

// ---------------- protected templates ----------------
// T`I was born ${date} in ${place}.` keeps the values out of the dialect rules.
const MARK = '\u0001';
function T(strings, ...vals) {
  let text = strings[0];
  vals.forEach((v, i) => { text += MARK + i + MARK + strings[i + 1]; });
  return { text, vals: vals.map(v => (v == null ? '' : String(v))) };
}
const plain = s => ({ text: s, vals: [] });
const fill = (text, vals) => text.replace(/\u0001(\d+)\u0001/g, (m, i) => vals[+i]);

function keepCase(src, rep) {
  if (src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase()) return rep.charAt(0).toUpperCase() + rep.slice(1);
  return rep;
}
function applyRules(text, rules, strength) {
  for (const [re, rep, min = 0.5] of rules) {
    if (strength < min) continue;
    text = text.replace(re, m => keepCase(m, typeof rep === 'function' ? rep(m) : rep));
  }
  return text;
}

// ---------------- voices ----------------
// rules: [regex, replacement, minimum strength 0..1]
const NORTH_CORE = [
  [/\bnothing\b/gi, 'nowt', 0.3], [/\banything\b/gi, 'owt', 0.3], [/\bsomething\b/gi, 'summat', 0.3],
  [/\byes\b/gi, 'aye', 0.2], [/\bI was\b/g, 'I were', 0.55], [/\bwe was\b/gi, 'we were', 0.5], [/\bmy (?=[a-z])/g, 'me ', 0.65],
  [/\bthe (?=(mill|pit|morning|afternoon|day|town|street|house|church|chapel|works|war|end|other|farm|shop|parish|valley))/gi, "t' ", 0.7],
  [/\bvery\b/gi, 'right', 0.6], [/\buntil\b/gi, 'while', 0.75], [/\blittle\b/gi, 'little', 1.1],
];
const VOICES = {
  lancs: { greet: ['Eeh, look who it is!', 'Ey up, love!', 'Well, I\'ll go to the foot of our stairs, a visitor!', 'Hiya, love. Come in, come in.'], bye: ['Ta-ra, love. Mind how you go.', 'Go on then, ta-ra.', 'Ta-ra, chuck.'], address: ['love', 'chuck', 'our kid'],
    rules: [...NORTH_CORE, [/\bchildren\b/gi, 'childer', 0.85], [/\bthank you\b/gi, 'ta', 0.4], [/\bbothering\b/gi, 'mithering', 0.5]] },
  manc: { greet: ['Alright, our kid?', 'Ey up! Where\'ve you sprung from?', 'Hiya, love!'], bye: ['Ta-ra, our kid.', 'See you, love.'], address: ['our kid', 'love'],
    rules: [...NORTH_CORE, [/\bbothering\b/gi, 'mithering', 0.4], [/\bthank you\b/gi, 'ta', 0.4]] },
  yorks: { greet: ['Now then!', 'Ey up, lad!', 'Ey up! Come in and sit thee down.', 'Now then, what\'s all this?'], bye: ['See thee, then.', 'Tha mun come back soon.', 'Go on wi\' thee.'], address: ['lad', 'lass', 'love'],
    rules: [...NORTH_CORE, [/\byou'll\b/gi, "tha'll", 0.9], [/\byou're\b/gi, "tha'rt", 0.9], [/\byou've\b/gi, "tha's", 0.9], [/\byou are\b/gi, 'tha art', 0.9], [/\byou\b/gi, 'thee', 0.95], [/\byour\b/gi, 'thy', 0.95], [/\bsit down\b/gi, 'sit thee down', 0.6]] },
  geordie: { greet: ['Howay! Look at ye!', 'Wey aye, a visitor!', 'Alreet, pet?'], bye: ['Ta-ra, pet.', 'Gan canny, hinny.', 'Howay then, see ye.'], address: ['pet', 'hinny', 'bonny lad'],
    rules: [[/\bchildren\b/gi, 'bairns', 0.3], [/\bchild\b/gi, 'bairn', 0.3], [/\byes\b/gi, 'aye', 0.2], [/\bdon't\b/gi, 'divvent', 0.6], [/\bgoing\b/gi, 'gannin\'', 0.7], [/\bgo\b/gi, 'gan', 0.75],
      [/\bvery\b/gi, 'canny', 0.6], [/\bmy (?=[a-z])/g, 'me ', 0.6], [/\byou\b/gi, 'ye', 0.6], [/\bnothing\b/gi, 'nowt', 0.4], [/\bsomething\b/gi, 'summat', 0.4], [/\bdown\b/gi, 'doon', 0.85], [/\bout\b/gi, 'oot', 0.85]] },
  cumbria: { greet: ['Now then, how ista?', 'Ey up! Grand day for it.'], bye: ['Tek care, now.', 'Ta-ra, lad.'], address: ['lad', 'lass'],
    rules: [...NORTH_CORE, [/\blittle\b/gi, 'lile', 0.6], [/\bchildren\b/gi, 'bairns', 0.6]] },
  northwest: { greet: ['Hello there, love.', 'Ey up!'], bye: ['Ta-ra, love.'], address: ['love'], rules: [...NORTH_CORE.slice(0, 4)] },
  scouse: { greet: ['Alright, la!', 'Eh, look at you!', 'Ey, come here, I\'m made up to see you!'], bye: ['Ta-ra, la.', 'See yer, our kid.'], address: ['la', 'our kid', 'love'],
    rules: [[/\bmy (?=[a-z])/g, 'me ', 0.5], [/\byou\b/gi, 'yer', 0.6], [/\bvery pleased\b/gi, 'made up', 0.4], [/\bnothing\b/gi, 'nothin\'', 0.7], [/\byes\b/gi, 'yeah', 0.5]] },
  potteries: { greet: ['Ay up, me duck!', 'Ow at, duck?'], bye: ['Tara, duck.', 'See thee, duck.'], address: ['duck', 'me duck'], rules: [[/\byes\b/gi, 'ah', 0.5], [/\bmy (?=[a-z])/g, 'me ', 0.6], [/\bnothing\b/gi, 'nowt', 0.4]] },
  brummie: { greet: ['Ow bist, bab?', 'Ay up, bab!', 'Alright, bab?'], bye: ['Tara-a-bit, bab.', 'Tara, then.'], address: ['bab'],
    rules: [[/\byes\b/gi, 'ar', 0.3], [/\byou\b/gi, 'yow', 0.7], [/\bmy (?=[a-z])/g, 'me ', 0.55], [/\bI am\b/g, 'I bin', 0.9], [/\bnothing\b/gi, 'nuthin\'', 0.6]] },
  midlands: { greet: ['Hello, me duck!', 'Ay up!'], bye: ['Tara, duck.'], address: ['duck'], rules: [[/\bmy (?=[a-z])/g, 'me ', 0.6], [/\byes\b/gi, 'ah', 0.6]] },
  eastmids: { greet: ['Ay up, me duck!', 'Ey up, duck, come in.'], bye: ['See you, me duck.', 'Tara, duck.'], address: ['me duck', 'duck'], rules: [[/\bmy (?=[a-z])/g, 'me ', 0.6], [/\bnothing\b/gi, 'nowt', 0.5], [/\bsulky\b/gi, 'mardy', 0.3]] },
  glos: { greet: ['Ow bist, then?', 'Arr, there you be!', 'Well now, ow bist?'], bye: ['Go on then, mind how thee goes.', 'Thee come back now.'], address: ['my lover', 'my dear'],
    rules: [[/\bI am\b/g, 'I be', 0.5], [/\byou are\b/gi, 'thee bist', 0.75], [/\bare you\b/gi, 'bist thee', 0.75], [/\bwe are\b/gi, 'we be', 0.5], [/\byes\b/gi, 'arr', 0.4], [/\bI was\b/g, 'I were', 0.7], [/\bthey are\b/gi, 'they be', 0.5]] },
  west: { greet: ['Arr, hello my lover!', 'Alright, my lover?', 'Well, where\'s you to, then?'], bye: ['Cheers, my lover.', 'Mind how you go, my lover.'], address: ['my lover'],
    rules: [[/\bI am\b/g, 'I be', 0.45], [/\bwe are\b/gi, 'we be', 0.5], [/\bthey are\b/gi, 'they be', 0.5], [/\byes\b/gi, 'arr', 0.4], [/\bvery\b/gi, 'proper', 0.6], [/\bbig\b/gi, 'gurt', 0.6]] },
  cornish: { greet: ['Alright, my \'ansum?', 'Dreckly! Oh, you\'re here now.'], bye: ['See you dreckly, my \'ansum.'], address: ['my \'ansum', 'my bird'],
    rules: [[/\bI am\b/g, 'I be', 0.5], [/\bvery\b/gi, 'proper', 0.5], [/\blater\b/gi, 'dreckly', 0.4], [/\byes\b/gi, 'ess', 0.8]] },
  cockney: { greet: ['Blimey, look what the cat dragged in!', 'Wotcher!', 'Gawd bless you, come \'ere!', 'Cor, \'ello!'], bye: ['Mind \'ow you go.', 'Ta-ta for now.', 'Toodle-oo, me old china.'], address: ['me old china', 'love', 'ducks'],
    rules: [[/\bhouse\b/gi, '\'ouse', 0.6], [/\bhave\b/gi, '\'ave', 0.6], [/\bhad\b/gi, '\'ad', 0.6], [/\bhim\b/gi, '\'im', 0.6], [/\bher\b/gi, '\'er', 0.6], [/\bhere\b/gi, '\'ere', 0.6], [/\bhusband\b/gi, 'old man', 0.7], [/\bwife\b/gi, 'missus', 0.7],
      [/\bmy (?=[a-z])/g, 'me ', 0.6], [/\bnothing\b/gi, 'nuffink', 0.8], [/\bstairs\b/gi, 'apples and pears', 0.95], [/\bisn't\b/gi, 'ain\'t', 0.6]] },
  south: { greet: ['Hello there!', 'Well, good day to you.'], bye: ['Goodbye, then.', 'Off you go.'], address: ['my dear'], rules: [[/\bisn't\b/gi, 'ain\'t', 0.8]] },
  norfolk: { greet: ['Hold you hard, who\'s this then, bor?', 'Hello, bor!', 'Well, blast, a visitor!'], bye: ['Mind how you go, bor.', 'Fare you well, bor.'], address: ['bor', 'together'],
    rules: [[/\byes\b/gi, 'ah', 0.4], [/\bnonsense\b/gi, 'squit', 0.3], [/\bgirl\b/gi, 'mawther', 0.6], [/\bcrooked\b/gi, 'on the huh', 0.4]] },
  english: { greet: ['Hello there!', 'Well, hello!'], bye: ['Goodbye, then.'], address: ['my dear'], rules: [] },
  welsh: { greet: ['Shwmae! Come here, bach.', 'Bore da! Duw, look at you now.', 'Well, there\'s lovely to see you.'], bye: ['Hwyl fawr now. Tidy.', 'Ta-ra, bach. Come back now in a minute.', 'Duw, off you go then.'], address: ['bach', 'cariad'],
    rules: [[/\bmother\b/gi, 'Mam', 0.3], [/\bvery good\b/gi, 'tidy', 0.4], [/\bgood\b/gi, 'tidy', 0.8], [/\bchurch\b/gi, 'chapel', 0.6]] },
  scots: { greet: ['Och, come awa\' in!', 'Aye, it\'s yersel\'!', 'Well, would ye look at that!'], bye: ['Haste ye back.', 'Cheerio the noo.', 'Mind how ye go, now.'], address: ['lass', 'laddie', 'hen'],
    rules: [[/\bdon't know\b/gi, 'dinnae ken', 0.35], [/\bdon't\b/gi, 'dinnae', 0.45], [/\bcan't\b/gi, 'cannae', 0.45], [/\bwon't\b/gi, 'willnae', 0.5], [/\bdidn't\b/gi, 'didnae', 0.5], [/\bknow\b/gi, 'ken', 0.55],
      [/\blittle\b/gi, 'wee', 0.25], [/\bsmall\b/gi, 'wee', 0.3], [/\bchildren\b/gi, 'bairns', 0.3], [/\bchild\b/gi, 'bairn', 0.3], [/\bchurch\b/gi, 'kirk', 0.4], [/\byes\b/gi, 'aye', 0.2], [/\bno\b/gi, 'naw', 0.85],
      [/\bhome\b/gi, 'hame', 0.6], [/\bold\b/gi, 'auld', 0.55], [/\babout\b/gi, 'aboot', 0.7], [/\bdown\b/gi, 'doon', 0.7], [/\bout\b/gi, 'oot', 0.75], [/\bfrom\b/gi, 'frae', 0.7], [/\byou\b/gi, 'ye', 0.55], [/\bmy (?=[a-z])/g, 'ma ', 0.75], [/\bgirl\b/gi, 'lassie', 0.4], [/\bboy\b/gi, 'laddie', 0.4]] },
  glaswegian: { greet: ['Awright, pal?', 'Och, hiya, hen!', 'Haw, come here you!'], bye: ['Mind how ye go, pal.', 'See ye efter.', 'Cheerio, hen.'], address: ['pal', 'hen'],
    rules: [[/\bdon't\b/gi, 'dinnae', 0.45], [/\bcan't\b/gi, 'cannae', 0.45], [/\bchildren\b/gi, 'weans', 0.35], [/\bchild\b/gi, 'wean', 0.35], [/\blittle\b/gi, 'wee', 0.25], [/\byes\b/gi, 'aye', 0.2], [/\bno\b/gi, 'naw', 0.6],
      [/\bknow\b/gi, 'ken', 0.8], [/\byou\b/gi, 'ye', 0.55], [/\bmy (?=[a-z])/g, 'ma ', 0.6], [/\bout\b/gi, 'oot', 0.7], [/\babout\b/gi, 'aboot', 0.7]] },
  highland: { greet: ['Ciamar a tha thu? Come in, come in.', 'Well now, it is yourself!', 'Fàilte! Welcome, mo chridhe.'], bye: ['Beannachd leat. Blessings go with you.', 'Haste ye back, now.'], address: ['mo chridhe', 'a ghràidh'],
    rules: [[/\blittle\b/gi, 'wee', 0.3], [/\bchildren\b/gi, 'bairns', 0.5], [/\byes\b/gi, 'aye', 0.3]] },
  irish: { greet: ['God bless all here! Come in, come in.', 'Arrah, would you look who it is!', 'Ah, you\'re very welcome, so you are.'], bye: ['God bless now. Safe home.', 'Mind yourself, now.', 'Slán, so.'], address: ['a stór', 'pet'],
    rules: [[/\bmother\b/gi, 'Mammy', 0.6], [/\bfine\b/gi, 'grand', 0.3], [/\byou all\b/gi, 'ye', 0.3], [/\bvery\b/gi, 'awful', 0.75], [/\bI have just\b/gi, 'I\'m after', 0.5]], tag: [', so it is', ', so I did', ', God rest them'] },
  ulster: { greet: ['Och, come in, come in!', 'Bout ye!', 'Well, would you look at that!'], bye: ['Cheerio now.', 'Mind how you go, so.'], address: ['wee pet', 'love'],
    rules: [[/\blittle\b/gi, 'wee', 0.25], [/\bsmall\b/gi, 'wee', 0.3], [/\byes\b/gi, 'aye', 0.2], [/\bchildren\b/gi, 'weans', 0.5], [/\bchild\b/gi, 'wean', 0.5]], tag: [', so it is', ', so I was'] },
  dublin: { greet: ['Ah, howaya!', 'Well, look who it is!', 'Story? Come in!'], bye: ['Mind yourself now.', 'See ya, so.'], address: ['love', 'pet'], rules: [[/\bmother\b/gi, 'Ma', 0.6], [/\bfunny\b/gi, 'gas', 0.4], [/\bvery\b/gi, 'awful', 0.7]] },
  american: { greet: ['Well, howdy!', 'Well, I\'ll be! Come on in.', 'Hello there, friend!'], bye: ['You take care now.', 'So long, now.'], address: ['friend', 'kid'], rules: [] },
  canadian: { greet: ['Well, hello there!', 'Good to see ya, eh?'], bye: ['Take care, eh.'], address: ['friend'], rules: [] },
  aussie: { greet: ['G\'day!', 'Well, g\'day, mate!', 'Crikey, look who it is!'], bye: ['Hooroo, mate.', 'See ya later, mate.'], address: ['mate'], rules: [[/\bfriend\b/gi, 'mate', 0.3], [/\bgenuine\b/gi, 'fair dinkum', 0.4]] },
  german: { greet: ['Guten Tag! Come in, come in.', 'Ach, a visitor! Willkommen.'], bye: ['Auf Wiedersehen, mein Kind.', 'Tschüss!'], address: ['mein Kind'], rules: [[/\byes\b/gi, 'ja', 0.5]] },
  dutch: { greet: ['Goedendag! Come in.', 'Hallo, hallo!'], bye: ['Tot ziens!'], address: ['kind'], rules: [[/\byes\b/gi, 'ja', 0.5]] },
  french: { greet: ['Bonjour! Entrez, entrez.', 'Mon Dieu, a visitor!'], bye: ['Au revoir, mon petit.', 'Adieu, et bonne route.'], address: ['mon petit', 'ma chère'], rules: [[/\byes\b/gi, 'oui', 0.5]] },
  nordic: { greet: ['God dag! Come in from the cold.', 'Hej, hej!'], bye: ['Farväl! Go well.', 'Hej då!'], address: ['my child'], rules: [] },
  italian: { greet: ['Buongiorno! Vieni, vieni!', 'Mamma mia, look at you!'], bye: ['Ciao, caro. Arrivederci.', 'Arrivederci!'], address: ['caro', 'cara'], rules: [[/\byes\b/gi, 'sì', 0.5]] },
  spanish: { greet: ['¡Buenos días! Come in, come in.', '¡Ay, Dios mío, a visitor!'], bye: ['Adiós, mi niño.', 'Hasta luego.'], address: ['mijo', 'mija'], rules: [[/\byes\b/gi, 'sí', 0.5]] },
  greek: { greet: ['Yiá sou! Come, sit.', 'Panagía mou, a visitor!'], bye: ['Kaló dromo. Go well.'], address: ['paidí mou'], rules: [] },
  easteu: { greet: ['Good day! Come in, warm yourself.', 'A visitor! Come, sit by the stove.'], bye: ['Go with God.', 'Farewell, my child.'], address: ['my child'], rules: [] },
  mena: { greet: ['Salaam! Come in, you are welcome.', 'Ahlan wa sahlan! Welcome, welcome.'], bye: ['Ma\'a salama. Go in peace.'], address: ['habibi', 'my child'], rules: [] },
  southasia: { greet: ['Arre, look who has come! Come, sit, sit.', 'Welcome, beta! Have you eaten?'], bye: ['Go well, beta. Come back soon.', 'Achha, off you go then.'], address: ['beta'], rules: [] },
  eastasia: { greet: ['Ah, welcome, welcome! Please, come in.', 'Hello! Have you eaten?'], bye: ['Go safely.', 'Take care of yourself.'], address: ['child'], rules: [] },
  africa: { greet: ['Welcome, my child! You are welcome here.', 'Ah! You have come. Welcome.'], bye: ['Go well, my child.', 'Stay well.'], address: ['my child'], rules: [] },
  caribbean: { greet: ['Lawd, look who reach!', 'Come in, come in, mi dear!'], bye: ['Walk good, now.', 'Mind how you go, mi dear.'], address: ['mi dear', 'pickney'], rules: [[/\bchildren\b/gi, 'pickney', 0.5], [/\bchild\b/gi, 'pickney', 0.5]] },
};

// Period layer, applied on top of everyone's English.
function periodRules(year) {
  if (year < 1700) return [[/\bhas\b/gi, 'hath', 0], [/\bdoes\b/gi, 'doth', 0], [/\byou are\b/gi, 'thou art', 0.3], [/\bmy (?=[aeiou])/gi, 'mine ', 0], [/\bOK\b/g, 'well', 0]];
  if (year < 1830) return [[/\bOK\b/g, 'very well', 0], [/\bdon't\b/g, 'do not', 0.9]];
  return [];
}
function periodGreeting(year, edu, seed) {
  const pick = a => a[seed % a.length];
  if (year < 1700) return pick(['God give you good morrow!', 'Marry, a visitor!', 'Well met, and God keep you.']);
  if (year < 1830) return edu >= 2 ? pick(['Your servant!', 'Upon my word, a visitor.', 'Good day to you, and welcome.']) : pick(['Good day to you!', 'Bless me, a visitor!']);
  if (year < 1900) return edu >= 3 ? pick(['Good day. How very kind of you to call.', 'My word, a visitor.', 'Do come in.']) : null;
  if (year < 1950) return edu >= 3 ? pick(['How do you do?', 'Good heavens, a visitor! How splendid.']) : null;
  return null;
}

function makeVoice(person) {
  const t = person.traits || { place: resolvePlace(''), edu: 1, birthYear: 1900 };
  const year = t.dressYear || (t.estBirthYear || 1900) + 30;
  let key = (t.voicePlace || t.place)?.dialect || 'english';
  if (!VOICES[key]) key = 'english';
  // Gentry, clergy and the like spoke the standard English of their day whatever the county.
  let strength = [1, 0.8, 0.35, 0][t.edu ?? 1];
  if (year >= 1950) strength *= 0.7;
  if (year < 1700) strength *= 0.85;
  const v = VOICES[key];
  const seed = hashString(person.id + 'voice');
  return { key, v, strength, year, edu: t.edu ?? 1, seed, rnd: seededRandom(seed), place: t.voicePlace || t.place, traits: t };
}

function say(voice, tpl) {
  const t = typeof tpl === 'string' ? plain(tpl) : tpl;
  let text = applyRules(t.text, voice.v.rules || [], voice.strength);
  text = applyRules(text, periodRules(voice.year), 0.4);
  return fill(text, t.vals);
}
const pickR = (voice, arr) => arr[Math.floor(voice.rnd() * arr.length)];

// ---------------- jobs and history ----------------

const isNorthMill = k => ['lancashire', 'manchester', 'yorkshire', 'sheffield'].includes(k);

function jobLines(voice, person) {
  const t = voice.traits, job = t.job, cat = job?.cat, by = t.estBirthYear || 1900, Y = voice.year;
  const region = t.place?.key || '';
  const female = person.indi.sex === 'F';
  const out = [];
  // Childhood and schooling
  if (voice.edu === 0 && by < 1880) out.push(t.illiterate ? 'I never learned my letters. When I wed, I made my mark with an X.' : 'I never had much schooling. There was work to be done and mouths to feed.');
  else if (voice.edu === 3 && by < 1900) out.push(pickR(voice, ['My father saw to it I had a proper education.', 'I was fortunate in my schooling; Latin, Greek and a good deal of scripture.', 'I had a governess as a girl, and books enough to last a lifetime.'].filter((x, i) => female ? i !== 1 : i !== 2)));
  else if (by >= 1870 && by < 1920 && voice.edu <= 1) out.push('I went to the board school, then out to work at fourteen.'.replace('fourteen', by < 1900 ? 'twelve' : 'fourteen'));
  if (!cat) return out;
  const pit = region === 'northeast' ? 'went doon the pit' : 'went down the pit';
  const lines = {
    miner: by < 1832 ? [`I ${pit} when I was eight. Children did, then.`] : by < 1900 ? [`I ${pit} at twelve, same as my father.`, 'Dark, wet and dangerous. You never knew if you\'d come back up.'] : [`I ${pit} at fourteen. Hard graft, but we looked after each other.`],
    textile: isNorthMill(region) && by >= 1835 && by < 1910 ? ['I were a half-timer: the mill in the morning, school in the afternoon.', 'The weaving shed was that loud we talked by lip-reading. We called it mee-mawing.', 'We kissed the shuttle to draw the thread through. Many a weaver lost her teeth that way.']
      : by < 1830 ? ['I worked the loom at home, in the room upstairs with the long windows.', 'When the power looms came, a handloom weaver could hardly earn a crust.'] : ['I worked in the mill from a girl. Long hours, and the noise never stopped.'],
    farmlab: by < 1914 ? ['I stood at the hiring fair each year, hoping for a good place.', 'Up before dawn, out in all weathers. Harvest was the best and the worst of it.'] : ['Farm work, all my life. Up before the birds.'],
    farmer: ['The land was everything to us. Market day was the high point of the week.', 'You watch the weather, you watch the stock, and you pray.'],
    servant: female ? ['I was in service at the big house. Up at five to black-lead the range.', 'Below stairs, we knew everything that went on above.'] : ['I was in service. You learned to be invisible.'],
    fishing: female && by > 1840 && by < 1920 && ['lowlands', 'highlands', 'northeast', 'eastanglia'].includes(region) ? ['I was a herring girl. We followed the fleet down the coast, gutting fish from dawn.'] : ['The sea gave us a living, and sometimes it took it back.'],
    dock: ['Every morning I stood at the dock gates hoping to be picked for a day\'s work.', 'Some days you\'d get taken on, some days you\'d walk home with nothing.'],
    sea: ['I went to sea young. Saw more of the world than anyone in my street.'],
    rail: by < 1850 ? ['I saw the first railways come. Folk said we\'d suffocate going that fast!'] : ['Worked on the railway. A steady job, and a uniform to be proud of.'],
    craft: ['I served a seven-year apprenticeship before I could call myself a tradesman.', 'Good work outlasts the man who made it.'],
    metal: female && region === 'blackcountry' ? ['I made chain at the forge behind the house, like most women round Cradley Heath.'] : ['Hot, heavy work at the forge. My arms were like iron by the end.'],
    pottery: ['I worked on a potbank, in the shadow of the bottle ovens.'],
    trade: ['I had my trade and I was good at it. Folk came back to me.'],
    shop: ['I kept a shop. Half the street was on the slate, and I knew every one of their names.'],
    clerk: ['I kept the ledgers in my best copperplate hand.'],
    teacher: ['I taught the three Rs, and a good few manners besides.'],
    nurse: by > 1840 ? ['I trained as a nurse. Clean hands and clean wards, Miss Nightingale said.'] : ['I nursed the sick and saw many into the world and out of it.'],
    military: ['I took the King\'s shilling and saw more of the world than I bargained for.'.replace('King', by > 1819 && by < 1880 ? 'Queen' : 'King')],
    officer: ['I held a commission. Duty first, always.'],
    clergy: ['I preached every Sunday and buried half the parish.', 'I baptised, married and buried them all, in that order.'],
    medical: ['I tended the sick, rich and poor. Fevers did not ask which you were.'],
    law: ['I practised the law. Most quarrels are about land, money or wills.'],
    gentleman: ['I lived on my own means, as they say. A comfortable life, I confess.'],
    owner: ['I built up my own business from nothing. Or so I like to tell people.'],
    modern: ['I worked in an office most of my life. You wouldn\'t believe the paperwork.'],
  }[cat];
  if (lines) out.push(...lines.slice(0, 2));
  return out;
}

// [from, to, regions (null = everywhere in the British Isles), text, minimum age]
const HISTORY = [
  [1665, 1665, ['london'], 'The plague came to London. Whole streets were shut up with red crosses on the doors.', 5],
  [1666, 1666, ['london'], 'I saw London burn in sixty-six. The sky was red for days.', 5],
  [1745, 1746, ['highlands', 'lowlands', 'edinburgh', 'glasgow', 'lancashire', 'manchester'], 'In forty-five the Jacobite army came through. Folk didn\'t know whether to cheer or hide.', 8],
  [1746, 1746, ['highlands'], 'After Culloden, the old Highland ways were broken. Even the tartan was banned.', 8],
  [1760, 1850, ['highlands'], 'The landlords cleared the glens for sheep. Whole townships were burned out and sent to the coast or across the sea.', 10],
  [1760, 1830, ['cotswolds', 'midlands', 'eastmidlands', 'eastanglia', 'southeast', 'westcountry', 'lincolnshire'], 'They enclosed the common where we grazed our cow. After that we had only our wages.', 12],
  [1811, 1816, ['yorkshire', 'lancashire', 'manchester', 'eastmidlands'], 'The Luddites were smashing the new machines. Times were that desperate.', 12],
  [1815, 1815, null, 'We heard of Wellington\'s victory at Waterloo. There were bonfires in the street.', 6],
  [1819, 1819, ['manchester', 'lancashire'], 'I was at St Peter\'s Field, or knew folk who were. The yeomanry rode into the crowd. Peterloo, they called it.', 10],
  [1830, 1830, ['southeast', 'eastanglia', 'westcountry', 'cotswolds'], 'The Swing riots: labourers burning ricks and breaking threshing machines.', 12],
  [1830, 1830, ['liverpool', 'manchester', 'lancashire'], 'They opened the railway between Liverpool and Manchester. Fastest thing any of us had ever seen.', 8],
  [1832, 1832, null, 'The cholera came in thirty-two. Folk were buried the same day they died.', 6],
  [1834, 1840, null, 'The new workhouses were built after thirty-four. Everybody dreaded ending up inside.', 10],
  [1838, 1838, null, 'Young Queen Victoria was crowned. Nobody thought she\'d reign so long.', 6],
  [1839, 1843, ['wales', 'southwales'], 'There were the Rebecca riots, men dressed as women smashing the tollgates.', 12],
  [1842, 1842, ['lancashire', 'manchester', 'yorkshire', 'potteries'], 'In forty-two the strikers went round pulling the plugs out of the mill boilers.', 12],
  [1845, 1852, ['ireland', 'ulster', 'dublin'], 'The potatoes rotted in the ground, year after year. So many died, and so many went to Liverpool and America.', 6],
  [1849, 1849, null, 'Cholera came back in forty-nine, worse than before.', 6],
  [1851, 1851, null, 'Everyone talked about the Great Exhibition in the Crystal Palace.', 8],
  [1854, 1856, null, 'Our lads went to fight the Russians in the Crimea.', 10],
  [1861, 1865, ['lancashire', 'manchester'], 'During the American war the cotton stopped coming. The mills stood idle and we queued at the soup kitchens.', 8],
  [1880, 1880, null, 'They made school compulsory, so my younger ones all got their schooling.', 25],
  [1889, 1889, ['london'], 'The dockers came out on strike in eighty-nine for their tanner an hour, and they won it.', 12],
  [1897, 1897, null, 'For the Old Queen\'s Diamond Jubilee there were street parties everywhere.', 6],
  [1901, 1901, null, 'When the Old Queen died it felt like the end of the world.', 8],
  [1904, 1905, ['wales', 'southwales'], 'The great Revival swept the chapels. Pubs emptied and men sang hymns underground.', 10],
  [1910, 1910, ['blackcountry'], 'The women chainmakers of Cradley Heath went on strike for a minimum wage, and won.', 10],
  [1912, 1912, ['ulster', 'southeast'], 'The Titanic went down. She was built in Belfast and crewed from Southampton.', 8],
  [1914, 1918, null, 'Then came the Great War. So many lads from our street never came home.', 8],
  [1916, 1916, ['dublin', 'ireland'], 'Easter Week, 1916. The Rising in Dublin changed everything.', 8],
  [1918, 1919, null, 'After the war the influenza took more of us than the guns did.', 6],
  [1926, 1926, ['northeast', 'southwales', 'yorkshire', 'lancashire', 'eastmidlands', 'lowlands', 'glasgow', 'midlands', 'blackcountry', 'cumbria'], 'In twenty-six there was the General Strike. The miners stayed out for months.', 14],
  [1936, 1936, ['northeast'], 'The men marched from Jarrow to London asking for work.', 12],
  [1939, 1945, null, 'Then the war again, with rationing, blackouts and the wireless every night.', 6],
  [1940, 1941, ['london', 'liverpool', 'hull', 'glasgow', 'sheffield', 'manchester', 'midlands', 'blackcountry', 'bristol', 'southwales', 'ulster', 'westcountry'], 'In the Blitz we spent our nights in the shelters, wondering what would be left in the morning.', 5],
  [1947, 1947, ['southasia'], 'In forty-seven came Independence, and Partition. So much joy and so much grief at once.', 8],
  [1948, 1948, null, 'When the National Health came in, we could see a doctor without worrying about the cost.', 18],
  [1953, 1953, null, 'We crowded round a neighbour\'s little television to watch the Coronation.', 6],
  [1969, 1969, null, 'I watched men walk on the moon. My grandmother had never seen a motor car.', 10],
  [1984, 1985, ['northeast', 'southwales', 'yorkshire', 'eastmidlands', 'lowlands'], 'The miners\' strike tore communities apart.', 14],
  [1845, 1910, ['ireland', 'ulster'], 'Half the family went to America, England or Australia. Letters came home, and sometimes money.', 15],
  [1861, 1865, ['usa'], 'The country tore itself apart in the war between the states.', 8],
  [1929, 1939, ['usa', 'canada'], 'After the crash in twenty-nine there was no work to be had.', 12],
  [1851, 1860, ['australia'], 'Gold was found and the whole colony went mad for it.', 10],
  [1789, 1799, ['france'], 'The Revolution turned the world upside down.', 10],
];

function memories(voice, person) {
  const t = voice.traits, by = t.birthYear, dy = t.deathYear;
  if (!by) return [];
  const home = t.voicePlace || t.place;
  const region = home?.key || 'unknown';
  const british = ['England', 'Wales', 'Scotland', 'Ireland', 'Isle of Man', 'Channel Islands'].includes(home?.country) || region === 'unknown';
  const end = dy || Math.min(by + 85, new Date().getFullYear());
  const hits = HISTORY.filter(([from, to, regions, , minAge]) => {
    const when = Math.max(from, by + minAge);
    if (when > to || when > end) return false;
    // after independence, UK-wide events didn't touch the Irish Free State
    if (!regions && to > 1922 && ['ireland', 'dublin'].includes(region)) return false;
    return regions ? regions.includes(region) : british;
  });
  // Prefer the local, specific memories
  hits.sort((a, b) => (b[2] ? 1 : 0) - (a[2] ? 1 : 0));
  return hits.slice(0, 2).map(h => h[3]);
}

// ---------------- events from the record ----------------

const where = place => place ? T` in ${place}` : plain('');
function cat(...parts) {
  let text = '', vals = [];
  for (const p of parts) {
    const t = typeof p === 'string' ? plain(p) : p;
    const off = vals.length;
    text += t.text.replace(/\u0001(\d+)\u0001/g, (m, i) => MARK + (+i + off) + MARK);
    vals = vals.concat(t.vals);
  }
  return { text, vals };
}
const when = date => date ? T` ${datePhrase(date)}` : plain('');

function eventLine(ev) {
  const d = when(ev.date), p = where(ev.place);
  switch (ev.tag) {
    case 'CHR': case 'BAPM': case 'CHRA': return cat('I was christened', d, p, '.');
    case 'RESI': return ev.place ? cat('I was living', p, d, '.') : null;
    case 'CENS': return cat('The census man found me', p, d, '.');
    case 'OCCU': return ev.value ? cat(T`I worked as ${/^[aeiou]/i.test(ev.value) ? 'an' : 'a'} ${ev.value.toLowerCase()}`, d, p, '.') : null;
    case 'EDUC': return ev.value ? cat(T`My schooling: ${ev.value}`, d, p, '.') : null;
    case 'GRAD': return cat('I graduated', ev.value ? T`: ${ev.value}` : '', d, p, '.');
    case 'EMIG': return cat('I emigrated', d, ev.place ? T`, leaving ${ev.place}` : '', '.');
    case 'IMMI': return cat('I arrived as an immigrant', d, p, '.');
    case 'NATU': return cat('I was naturalised', d, p, '.');
    case 'RELI': return ev.value ? T`In matters of faith I was ${ev.value}.` : null;
    case 'NATI': return ev.value ? T`I was ${ev.value} by nationality.` : null;
    case 'TITL': return ev.value ? T`I held the title ${ev.value}.` : null;
    case 'DSCR': return ev.value ? T`Folk described me as ${ev.value}.` : null;
    case 'RETI': return cat('I retired', d, p, '.');
    case 'PROB': return cat('My will went to probate', d, p, '.');
    case 'WILL': return cat('I made my will', d, '.');
    case '_MILT': case '_MILI': case 'MILI': return cat('I served in the military', ev.value ? T`: ${ev.value}` : '', d, p, '.');
    case 'EVEN': case 'FACT': return cat(T`${ev.type || ev.value || 'Something happened'}`, ev.type && ev.value ? T`: ${ev.value}` : '', d, p, '.');
    case 'CONF': return cat('I was confirmed', d, p, '.');
    case 'ADOP': return cat('I was adopted', d, p, '.');
    case 'ORDN': return cat('I was ordained', d, p, '.');
    default: return null;
  }
}

function list(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

/**
 * Returns { pages: [string], links: [{label, id}], name }.
 * ctx = { data, tree }
 */
export function buildDialogue(person, ctx) {
  const { data, tree } = ctx;
  const indi = person.indi;
  const name = displayName(indi);
  const voice = makeVoice(person);
  const S = tpl => say(voice, tpl);
  const birth = findEvent(indi, 'BIRT');
  const bapt = findEvent(indi, 'CHR', 'BAPM');
  const death = findEvent(indi, 'DEAT');
  const burial = findEvent(indi, 'BURI', 'CREM');
  const by = dateYear(birth?.date) ?? dateYear(bapt?.date);
  const female = indi.sex === 'F';
  const pages = [];
  const links = [];
  const rel = relationship(person.gen, indi.sex);
  const v = voice.v;

  // 1. Greeting and who I am
  const posh = periodGreeting(voice.year, voice.edu, voice.seed);
  const greet = voice.strength > 0.2 || !posh ? pickR(voice, v.greet) : posh;
  const via = person.gen >= 2 && person.gen <= 5 ? T` Your ${pathPhrase(person.ahnen)}, to be exact.` : plain('');
  pages.push(greet + ' ' + S(cat(T`I'm ${name}, your ${rel}.`, via)));

  // 2. Birth
  const town = voice.traits.place?.town;
  if (birth && (birth.date || birth.place)) {
    let line = S(cat('I was born', when(birth.date), where(birth.place), '.'));
    if (voice.place?.label && voice.strength > 0.3 && town) line += ' ' + S(T`${town} born and bred.`);
    pages.push(line);
  } else if (bapt && (bapt.date || bapt.place)) {
    pages.push(S(cat('Nobody wrote my birth down, but I was christened', when(bapt.date), where(bapt.place), '.')));
  } else {
    pages.push(S('Truth be told, the records never caught when or where I was born. Maybe you\'ll find it one day.'));
  }

  // 3. Schooling and work, in their own words
  const jl = jobLines(voice, person).map(S);
  // 4. Life events from the record
  const life = [];
  for (const ev of indi.events) {
    if (['BIRT', 'DEAT', 'BURI', 'CREM'].includes(ev.tag)) continue;
    if (ev === bapt && pages[1].includes('christened')) continue;
    const l = eventLine(ev);
    if (l) life.push(S(l));
  }
  const both = [...life, ...jl];
  for (let i = 0; i < both.length; i += 2) pages.push(both.slice(i, i + 2).join(' '));

  // 5. Things they lived through
  const mem = memories(voice, person).map(S);
  if (mem.length) pages.push(mem.join(' '));

  // 6. Parents
  const par = parentsOf(data, person.id);
  if (par.father || par.mother) {
    const f = par.father ? data.individuals.get(par.father) : null;
    const m = par.mother ? data.individuals.get(par.mother) : null;
    const bits = [];
    if (f) bits.push(cat('my father was ', T`${displayName(f)}${lifespan(f) ? ' (' + lifespan(f) + ')' : ''}`));
    if (m) bits.push(cat('my mother was ', T`${displayName(m)}${lifespan(m) ? ' (' + lifespan(m) + ')' : ''}`));
    let line = S(bits.length === 2 ? cat(bits[0], ', and ', bits[1], '.') : cat(bits[0], '.'));
    line = line.charAt(0).toUpperCase() + line.slice(1);
    if (person.father && par.father) links.push({ label: `Find my father, ${firstName(f)}`, id: par.father });
    if (person.mother && par.mother) links.push({ label: `Find my mother, ${firstName(m)}`, id: par.mother });
    if ((par.father && !person.father) || (par.mother && !person.mother)) line += ' ' + S('They stand beyond the generations you chose to load.');
    else line += ' ' + S('Walk outward from here and you\'ll find them.');
    pages.push(line);
  } else {
    pages.push(S('My own parents? Lost to time, I\'m afraid. Find them and you can add a new ring to this place.'));
  }

  // 7. Marriages and children
  for (const fam of familiesAsSpouse(data, person.id)) {
    const spouseId = fam.husb === person.id ? fam.wife : fam.husb;
    const spouse = spouseId ? data.individuals.get(spouseId) : null;
    const marr = fam.events.find(e => e.tag === 'MARR');
    let parts = [spouse ? T`I married ${displayName(spouse)}` : 'I had a family'];
    if (marr && (marr.date || marr.place)) parts.push(when(marr.date), where(marr.place));
    parts.push('.');
    const kids = fam.children.map(id => data.individuals.get(id)).filter(Boolean);
    if (kids.length) {
      const named = kids.map(k => `${firstName(k)}${lifespan(k) ? ' (' + lifespan(k) + ')' : ''}${person.childrenInTree?.includes(k.id) ? '*' : ''}`);
      parts.push(kids.length === 1 ? ' We had one child: ' : ` We had ${kids.length} children: `, T`${list(named)}`, '.');
      if (named.some(n => n.endsWith('*'))) parts.push(T`${' (* is the one you descend from.)'}`);
      const died = kids.filter(k => { const b = dateYear(findEvent(k, 'BIRT', 'CHR')?.date), d = dateYear(findEvent(k, 'DEAT', 'BURI')?.date); return b && d && d - b < 5; });
      if (died.length && voice.year < 1950) parts.push(' ', died.length === 1 ? 'We lost one little one, as so many did then.' : 'We lost little ones, as so many did then.');
    }
    pages.push(S(cat(...parts)));
  }
  for (const cid of person.childrenInTree || []) {
    const c = data.individuals.get(cid);
    if (c && tree.people.has(cid) && cid !== tree.rootId) links.push({ label: `Back toward ${firstName(c)}`, id: cid });
  }

  // 8. Death and burial
  if (death && (death.date || death.place)) {
    const dy = dateYear(death.date);
    const age = by && dy ? dy - by : null;
    const parts = ['I died', when(death.date), where(death.place)];
    if (age != null && age >= 0 && age < 120) parts.push(T`, aged about ${age}`);
    parts.push('.');
    if (death.cause) parts.push(T` The cause was given as ${death.cause.toLowerCase()}.`);
    if (burial && burial.place) parts.push(burial.tag === 'CREM' ? ' I was cremated' : ' I was laid to rest', where(burial.place), '.');
    let line = S(cat(...parts));
    if (voice.edu === 3 && voice.year < 1950 && ['clergy', 'law', 'medical'].includes(voice.traits.job?.cat)) line += ' Sic transit gloria mundi.';
    pages.push(line);
  } else if (burial && (burial.date || burial.place)) {
    pages.push(S(cat(burial.tag === 'CREM' ? 'I was cremated' : 'I was buried', when(burial.date), where(burial.place), '.')));
  } else if (by && by < 1920) pages.push(S('When and where I died... that\'s another mystery in the records.'));
  else if (by) pages.push(S('As far as this tree knows, I\'m still around. Give me a call sometime!'));

  // 9. Notes, as written in the file
  for (const note of indi.notes) {
    const clean = note.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    const chunks = clean.match(/.{1,260}(\s|$)/g) || [clean];
    chunks.slice(0, 4).forEach((c, i) => pages.push((i === 0 ? S('Something you should know: ') : '') + c.trim()));
  }
  if (indi.altNames.length) pages.push(S(T`You might also find me written down as ${list(indi.altNames)}.`));

  // 10. Pedigree collapse ("lines of descent")
  if (person.lines > 1) pages.push(S(T`Here's a puzzle for you: I'm on ${person.lines} different lines of your descent. Our family married back into itself somewhere. Follow the glowing lines and you'll see.`));

  // 11. Goodbye
  let bye = voice.strength > 0.2 ? pickR(voice, v.bye) : voice.year < 1830 ? 'Go with God.' : voice.edu >= 3 ? 'It was a pleasure. Good day to you.' : 'Off you go, then. Remember us.';
  if (v.tag && voice.strength > 0.5 && voice.rnd() < 0.5) pages[pages.length - 1] = pages[pages.length - 1].replace(/\.$/, pickR(voice, v.tag) + '.');
  pages.push(bye);
  return { pages, links, name, voice: voice.key };
}

// What an ancestor shouts when a stray round pings off their hat. Nobody gets hurt.
export function shotQuip(person, n = 0) {
  const voice = makeVoice(person);
  const rel = relationship(person.gen, person.indi.sex);
  const by = voice.traits.estBirthYear || 1900;
  const addr = pickR(voice, voice.v.address || ['you']);
  const lines = [
    T`OI! I'm your ${rel}!`,
    'Is that how you greet family?',
    'Put that thing down before you lose an eye!',
    by < 1900 ? 'I survived the workhouse, you know. I can survive you.' : 'I\'ve survived worse than you.',
    'Wait till I tell your mother about this.',
    T`Mind where you point that, ${addr}!`,
    'Manners! Were you raised by wolves?',
    voice.year < 1700 ? 'Fie! Hast thou no shame?' : 'Have you no shame?',
  ];
  return say(voice, lines[(hashString(person.id) + n) % lines.length]);
}

// What an ancestor says when you land on their head in the Platform look.
export function stompQuip(person, n = 0) {
  const voice = makeVoice(person);
  const addr = pickR(voice, voice.v.address || ['you']);
  const lines = [
    'Oof! Get off my head!', T`Mind my hat, ${addr}!`, 'I\'m not a stepping stone, you know!', 'Ow! Who taught you to jump on folk?',
    voice.year < 1700 ? 'Zounds! Off, I say!' : 'Well, I never!', 'My poor back!',
  ];
  return say(voice, lines[(hashString(person.id) + n) % lines.length]);
}
