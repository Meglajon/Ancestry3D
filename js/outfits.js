// Period wardrobe. Decides what each ancestor wears from the decade of their adult life, their sex,
// their class (from their job), the job itself, and a few regional traditions. The figure builders
// in npc.js turn this description into geometry for each look.
import * as THREE from 'three';
import { hashString, seededRandom, birthYear } from './ancestry.js';

const shade = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

// Palettes by class. Ordinary people wore drab, durable, dyed-once cloth; colour cost money.
const PAL = {
  labour: { m: ['#4a4034', '#3a3428', '#2e2a26', '#4a4a44', '#3a3a40', '#5a4a36', '#2a2e38'], f: ['#4a3a30', '#3a3a44', '#5a4434', '#4a4040', '#3e4a3e', '#5a4a4a', '#2a2a30'] },
  skilled: { m: ['#2e2e34', '#3a3428', '#2a3040', '#3a2e26', '#44403a'], f: ['#3a2e3a', '#2a3a4a', '#4a3a2e', '#3a4a3a', '#5a3a3a', '#2a2a34'] },
  trade: { m: ['#1e1e24', '#262a34', '#2a2420', '#30302e'], f: ['#3a2a40', '#2a3a5a', '#4a2a2a', '#2a4a40', '#5a4a6a', '#1e1e26'] },
  gentry: { m: ['#1a1a20', '#2a2440', '#3a1a1a', '#1a2a3a', '#4a3a1a'], f: ['#6a1a2a', '#2a2a6a', '#1a4a3a', '#5a3a6a', '#7a5a1a', '#3a1a4a'] },
};
const EARLY_GENTRY = { m: ['#5a1a1a', '#1a2a5a', '#3a1a4a', '#1a4a2a', '#6a4a1a', '#2a2a2a'], f: ['#7a1a2a', '#2a3a7a', '#5a2a6a', '#2a5a3a', '#8a6a2a', '#6a2a1a'] };
const MODERN = ['#c83a3a', '#3a6ac8', '#2a2a2a', '#e8e8e8', '#3a9a5a', '#e0a020', '#7a3ac8', '#d86a8a', '#4ab0c8', '#8a5a3a'];
const SIXTIES = ['#e05a2a', '#e8b020', '#3aa05a', '#8a3ab0', '#d83a6a', '#2a8ab0', '#c8682a', '#6a8a2a'];
const DENIM = ['#2a4a7a', '#3a5a8a', '#24385a', '#4a6a9a'];
const WHITE = '#f0ece0', LINEN = '#e2d8c0', BLACK = '#18181c', STRAW = '#d8b870', KHAKI = '#7a7448', TARTANS = ['#2a4a2a', '#3a2a5a', '#6a1a1a', '#1a3a5a'];

const NORTH_MILL = new Set(['lancashire', 'manchester', 'yorkshire', 'sheffield', 'northeast', 'potteries', 'blackcountry', 'cumbria', 'southwales', 'lowlands', 'glasgow']);
const WELSH = new Set(['wales', 'southwales']);

/** Returns the outfit/appearance description for a tree person (person.traits must be computed). */
export function lookFor(person, fallbackYear) {
  const indi = person.indi;
  const t = person.traits || { tier: 'skilled', place: { key: 'england' }, dressYear: (birthYear(indi) ?? fallbackYear ?? 1900) + 30, skin: '#e6bf9e', hair: '#3a2414' };
  const rnd = seededRandom(hashString(person.id + (indi.given || '') + 'look'));
  const p = a => a[Math.floor(rnd() * a.length)];
  const chance = x => rnd() < x;
  const female = indi.sex === 'F', male = !female;
  const Y = t.dressYear ?? (fallbackYear ?? 1900) + 30;
  const tier = t.tier || 'skilled';
  const job = t.job?.cat || (t.tierInferred ? null : null);
  const region = t.place?.key || 'england';
  const posh = tier === 'gentry', trade = tier === 'trade', labour = tier === 'labour';
  const pal = Y < 1790 && posh ? EARLY_GENTRY : PAL[tier];
  const cloth = () => p(female ? pal.f : pal.m);
  const by = t.estBirthYear ?? Y - 30;

  const L = {
    female, male, year: Y, birthYear: by, tier, job, region, sex: indi.sex,
    skin: t.skin || '#e6bf9e', hair: t.hair || '#3a2414',
    height: female ? 0.93 + (rnd() - 0.5) * 0.04 : 1.0 + (rnd() - 0.5) * 0.06,
    hairStyle: female ? 'bun' : 'short', facial: null,
    top: cloth(), coat: null, waistcoat: null, collar: null,
    legs: null, skirt: null, apron: null, shawl: null, shoes: 'shoes', hat: null,
  };
  // People were usually smaller before the 20th century.
  if (Y < 1900) L.height *= 0.97;
  L.skinShade = shade(L.skin, 0.8);
  if (t.oldAge && Y - by > 45) L.hair = p(['#b8b8b0', '#d0d0c8', '#9a9a94']);

  const north = NORTH_MILL.has(region);
  const welsh = WELSH.has(region);
  const highland = region === 'highlands';
  const rural = ['farmlab', 'farmer'].includes(job);

  if (male) {
    const trousers = (color) => ({ kind: 'trousers', color: color || shade(L.top, 0.9) });
    const breeches = (color, stockings = WHITE) => ({ kind: 'breeches', color: color || shade(L.top, 0.85), stockings });
    if (Y < 1560) {
      L.coat = { kind: posh ? 'gown' : 'doublet', color: posh ? cloth() : L.top, length: posh ? 0.9 : 0.25 };
      L.legs = { kind: posh ? 'trunkhose' : 'hose', color: p(['#5a2a1a', '#2a3a2a', '#3a3a3a', '#4a3a2a']), stockings: null };
      L.hat = { kind: 'tudor', color: posh ? BLACK : p(['#3a2a1c', '#2a2a2a', '#5a1e14']) };
      L.hairStyle = 'short'; L.facial = chance(0.4) ? 'beard' : null;
      if (posh) L.collar = { kind: 'ruff', color: WHITE };
      L.shoes = 'shoes';
    } else if (Y < 1620) {
      L.coat = { kind: labour ? 'jerkin' : 'doublet', color: L.top, length: 0.2 };
      L.legs = posh || trade ? { kind: 'trunkhose', color: shade(L.top, 0.9), stockings: p([WHITE, '#3a3a3a', '#6a1a1a']) } : breeches(p(['#4a3a2a', '#3a3a34']), '#4a4a40');
      L.collar = posh || trade ? { kind: 'ruff', color: WHITE } : null;
      L.hat = posh || trade ? { kind: 'capotain', color: BLACK } : { kind: 'cap', color: p(['#3a2a1c', '#4a3a2a', '#2a3a2a']) };
      L.facial = chance(0.6) ? 'goatee' : null;
    } else if (Y < 1665) {
      L.coat = { kind: 'doublet', color: L.top, length: 0.2 };
      L.legs = breeches(shade(L.top, 0.9), labour ? '#4a4a40' : WHITE);
      L.collar = { kind: 'falling', color: WHITE };
      L.hat = { kind: posh ? 'cavalier' : 'capotain', color: posh ? '#2a2a2a' : BLACK };
      L.hairStyle = posh || chance(0.4) ? 'long' : 'short';
      L.facial = chance(0.5) ? 'goatee' : null;
      L.shoes = 'boots';
    } else if (Y < 1720) {
      L.coat = { kind: 'long', color: L.top, length: labour ? 0.6 : 0.9 };
      L.waistcoat = shade(L.top, 1.3);
      L.legs = breeches(shade(L.top, 0.85), labour ? '#5a5a50' : WHITE);
      L.collar = { kind: 'cravat', color: WHITE };
      L.hat = { kind: Y > 1690 ? 'tricorn' : 'wide', color: BLACK };
      L.hairStyle = posh || trade ? 'wig' : 'long';
      L.shoes = 'buckle';
    } else if (Y < 1790) {
      if (labour && (rural || !north) && chance(0.6)) {
        L.coat = { kind: 'smock', color: LINEN, length: 0.75 };
        L.collar = { kind: 'neckerchief', color: p(['#6a1a1a', '#1a2a5a', '#3a3a1a']) };
        L.hat = { kind: 'round', color: p(['#2a2420', '#3a3028']) };
        L.legs = breeches(p(['#4a3a2a', '#5a4a36']), '#5a5a50');
        L.shoes = 'boots';
      } else {
        L.coat = { kind: 'frock', color: L.top, length: labour ? 0.55 : 0.85 };
        L.waistcoat = posh ? p(['#d8c070', '#e8e0c8', '#8a2a2a']) : shade(L.top, 1.35);
        L.legs = breeches(shade(L.top, 0.85), labour ? '#6a6a60' : WHITE);
        L.collar = { kind: labour ? 'neckerchief' : 'stock', color: labour ? '#6a1a1a' : WHITE };
        L.hat = { kind: 'tricorn', color: BLACK };
        L.shoes = 'buckle';
      }
      L.hairStyle = posh ? 'wig' : 'queue';
    } else if (Y < 1830) {
      if (labour && rural) {
        L.coat = { kind: 'smock', color: LINEN, length: 0.75 };
        L.hat = { kind: 'round', color: '#3a3028' };
        L.legs = breeches('#5a4a36', '#5a5a50');
        L.collar = { kind: 'neckerchief', color: p(['#6a1a1a', '#1a2a5a']) };
      } else {
        L.coat = { kind: labour ? 'jacket' : 'tail', color: labour ? cloth() : p(['#1a2a4a', '#1a1a1e', '#2a3a2a', '#3a2a1a']), length: 0.75 };
        L.waistcoat = labour ? shade(L.top, 1.3) : p(['#e8e0c8', '#d8c070', '#f0ece0']);
        L.legs = Y > 1810 && !labour ? trousers(p(['#d8d0b8', '#c8b890', '#5a5040'])) : breeches(p(['#d8d0b8', '#4a3a2a']), WHITE);
        L.collar = { kind: labour ? 'neckerchief' : 'high', color: labour ? '#2a2a5a' : WHITE };
        L.hat = labour ? { kind: 'round', color: '#2a2420' } : { kind: 'top', color: BLACK };
        L.shoes = 'boots';
      }
    } else if (Y < 1860) {
      if (labour && rural && !north) {
        L.coat = { kind: 'smock', color: LINEN, length: 0.75 };
        L.hat = { kind: 'round', color: '#3a3028' };
        L.legs = trousers('#5a4a36');
      } else {
        L.coat = { kind: labour ? 'jacket' : 'frock', color: labour ? p(['#5a4a36', '#4a4034', '#3a3428']) : BLACK, length: labour ? 0.3 : 0.85 };
        L.waistcoat = labour ? shade(L.top, 1.2) : p(['#2a2a2a', '#4a3a2a', '#d8c8a0']);
        L.legs = trousers(labour ? p(['#4a4034', '#3a3428']) : p(['#3a3a40', '#5a5048', '#2a2a2a']));
        L.collar = { kind: labour ? 'neckerchief' : 'stock', color: labour ? p(['#6a1a1a', '#2a2a5a']) : BLACK };
        L.hat = posh || trade ? { kind: 'top', color: BLACK } : { kind: Y > 1850 ? 'bowler' : 'round', color: '#2a2420' };
      }
      L.facial = chance(0.35) ? 'mutton' : chance(0.3) ? 'beard' : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1890) {
      L.coat = { kind: posh ? 'frock' : labour ? 'jacket' : 'lounge', color: posh ? BLACK : cloth(), length: posh ? 0.85 : 0.3 };
      L.waistcoat = shade(L.coat.color, 1.15);
      L.legs = trousers(labour ? cloth() : p(['#3a3a40', '#2a2a2a', '#4a4440']));
      L.collar = labour ? { kind: 'neckerchief', color: p(['#6a1a1a', '#2a2a5a', '#e8e0c8']) } : { kind: 'tie', color: p([BLACK, '#3a1a1a']) };
      L.hat = posh ? { kind: 'top', color: BLACK } : labour && Y > 1880 ? { kind: 'flat', color: cloth() } : { kind: 'bowler', color: p([BLACK, '#3a2a1a']) };
      L.facial = chance(0.4) ? 'beard' : chance(0.3) ? 'moustache' : chance(0.2) ? 'mutton' : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1915) {
      L.coat = { kind: labour ? 'jacket' : 'lounge', color: cloth(), length: 0.3 };
      L.waistcoat = shade(L.coat.color, 1.1);
      L.legs = trousers(shade(L.coat.color, 0.95));
      L.collar = labour ? { kind: 'neckerchief', color: p(['#6a1a1a', '#e8e0c8', '#2a2a5a']) } : { kind: 'high', color: WHITE, tie: p(['#3a1a1a', BLACK, '#1a2a4a']) };
      L.hat = labour ? { kind: 'flat', color: cloth() } : posh ? { kind: p(['bowler', 'top', 'boater']), color: BLACK } : { kind: p(['bowler', 'boater', 'flat']), color: BLACK };
      if (L.hat.kind === 'boater') L.hat.color = STRAW;
      L.facial = chance(0.55) ? 'moustache' : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1950) {
      L.coat = { kind: 'lounge', color: cloth(), length: 0.32 };
      L.waistcoat = Y < 1935 && chance(0.6) ? shade(L.coat.color, 1.1) : null;
      L.legs = trousers(shade(L.coat.color, 0.95));
      L.collar = { kind: 'tie', color: p(['#6a1a1a', '#1a2a5a', '#3a3a1a', '#5a2a4a']) };
      L.hat = labour ? { kind: 'flat', color: cloth() } : { kind: p(['trilby', 'trilby', 'bowler']), color: p(['#3a3028', '#2a2a2a', '#4a4038']) };
      L.facial = Y < 1930 && chance(0.35) ? 'moustache' : null;
      L.shoes = north && labour && Y < 1930 ? 'clogs' : 'boots';
    } else if (Y < 1965) {
      const casual = chance(0.4);
      L.top = casual ? p(['#e8e4dc', '#c8d0d8', '#d8c8a0']) : '#e8e4dc';
      L.coat = casual ? { kind: 'cardigan', color: p(['#6a5a3a', '#4a5a6a', '#7a4a3a']), length: 0.3 } : { kind: 'lounge', color: p(['#3a3a40', '#4a4034', '#2a2e3a', '#5a5048']), length: 0.32 };
      L.legs = trousers(p(['#3a3a40', '#4a4034', '#2a2a30']));
      L.collar = { kind: 'tie', color: p(['#8a1a1a', '#1a3a6a', '#3a5a2a']) };
      L.hat = chance(0.3) ? { kind: labour ? 'flat' : 'trilby', color: '#3a3028' } : null;
    } else if (Y < 1982) {
      L.top = p(SIXTIES);
      L.coat = chance(0.3) ? { kind: 'lounge', color: p(['#6a4a2a', '#4a3a2a', '#3a4a3a']), length: 0.32 } : null;
      L.legs = { kind: 'flares', color: p([...DENIM, '#6a4a2a', '#4a3a2a']) };
      L.collar = { kind: 'widecollar', color: shade(L.top, 1.2) };
      L.hairStyle = chance(0.5) ? 'long' : 'short';
      L.facial = chance(0.25) ? 'moustache' : chance(0.15) ? 'beard' : null;
    } else {
      L.top = p(MODERN);
      L.coat = chance(0.35) ? { kind: 'jacket', color: p(['#2a2a2a', '#3a3a40', '#4a3a2a', '#2a3a5a']), length: 0.3 } : null;
      L.legs = { kind: chance(0.7) ? 'jeans' : 'trousers', color: chance(0.7) ? p(DENIM) : p(['#3a3a40', '#c8b890', '#2a2a2a']) };
      L.shoes = 'trainers';
      L.facial = chance(0.2) ? 'beard' : null;
      L.sleeves = chance(0.5) ? 'short' : 'long';
    }
    // Jobs that came with a look
    if (job === 'clergy') { L.coat = { kind: 'frock', color: BLACK, length: 0.9 }; L.top = BLACK; L.waistcoat = BLACK; L.collar = { kind: Y < 1860 ? 'bands' : 'dogcollar', color: WHITE }; L.hat = Y < 1800 ? { kind: 'wide', color: BLACK } : { kind: 'top', color: BLACK }; L.legs = { kind: Y < 1820 ? 'breeches' : 'trousers', color: BLACK, stockings: BLACK }; }
    if (job === 'military' || job === 'officer') {
      if ((Y >= 1914 && Y <= 1922) || (Y >= 1939 && Y <= 1950)) {
        L.coat = { kind: 'uniform', color: KHAKI, length: 0.32 }; L.top = KHAKI; L.legs = { kind: 'trousers', color: KHAKI }; L.waistcoat = null;
        L.collar = { kind: 'tie', color: '#5a5438' }; L.hat = { kind: job === 'officer' ? 'peaked' : (Y < 1920 ? 'helmet' : 'peaked'), color: '#5a5438' }; L.shoes = 'boots'; L.facial = Y < 1920 ? 'moustache' : null;
      } else if (Y >= 1660 && Y < 1900) {
        L.coat = { kind: 'uniform', color: '#b0201a', length: Y < 1830 ? 0.7 : 0.32 }; L.top = '#b0201a'; L.waistcoat = Y < 1830 ? WHITE : null;
        L.legs = Y < 1820 ? { kind: 'breeches', color: WHITE, stockings: BLACK } : { kind: 'trousers', color: '#1a1a2a' };
        L.hat = Y < 1800 ? { kind: 'tricorn', color: BLACK } : { kind: 'shako', color: BLACK }; L.collar = { kind: 'stock', color: BLACK };
      }
    }
    if (job === 'miner' && Y >= 1840 && Y < 1960 && chance(0.6)) { L.coat = { kind: 'jacket', color: '#2a2622', length: 0.3 }; L.legs = { kind: 'trousers', color: '#2a2622' }; L.hat = { kind: 'flat', color: '#1e1c1a' }; L.collar = { kind: 'neckerchief', color: '#e8e0c8' }; L.shoes = north ? 'clogs' : 'boots'; }
    if ((job === 'fishing' || job === 'sea') && Y >= 1800) { L.coat = { kind: 'gansey', color: '#1e2a44', length: 0.3 }; L.legs = { kind: 'trousers', color: '#2a2a30' }; L.hat = { kind: 'cap', color: '#1e2a44' }; L.collar = null; L.waistcoat = null; }
    if (job === 'rail' && Y >= 1850 && Y < 1970) { L.coat = { kind: 'uniform', color: '#1e2638', length: 0.32 }; L.hat = { kind: 'peaked', color: '#1e2638' }; L.legs = { kind: 'trousers', color: '#1e2638' }; }
    if (job === 'craft' && Y < 1950 && chance(0.5)) L.apron = job === 'craft' ? '#5a4030' : null;
    if (job === 'metal' && Y < 1950 && chance(0.5)) L.apron = '#3a2a20';
    if (highland && labour && Y < 1880) { L.legs = { kind: 'kilt', color: p(TARTANS), stockings: '#5a5048' }; L.coat = { kind: 'jacket', color: shade(L.top, 0.9), length: 0.3 }; L.hat = { kind: 'bonnetcap', color: '#1e2a44' }; L.shawl = { color: L.legs.color, overHead: false, plaid: true }; }
  } else {
    const sk = (kind, color, len = 1) => ({ kind, color: color || shade(L.top, 0.92), length: len });
    if (Y < 1560) {
      L.skirt = sk('full', L.top);
      L.collar = posh ? { kind: 'square', color: WHITE } : null;
      L.hat = { kind: posh ? 'frenchhood' : 'coif', color: posh ? BLACK : WHITE };
      L.hairStyle = 'hidden';
      L.apron = labour ? LINEN : null;
    } else if (Y < 1620) {
      L.skirt = sk(posh ? 'farthingale' : 'full');
      L.collar = posh || trade ? { kind: 'ruff', color: WHITE } : { kind: 'partlet', color: WHITE };
      L.hat = { kind: 'coif', color: WHITE }; L.hairStyle = 'hidden';
      L.apron = labour ? LINEN : null;
    } else if (Y < 1665) {
      L.skirt = sk('full');
      L.collar = { kind: 'falling', color: WHITE };
      L.hat = posh ? null : chance(0.4) ? { kind: 'capotain', color: BLACK } : { kind: 'coif', color: WHITE };
      L.hairStyle = posh ? 'curls' : 'hidden';
      L.apron = !posh ? WHITE : null;
    } else if (Y < 1720) {
      L.skirt = sk('full');
      L.collar = { kind: 'fichu', color: WHITE };
      L.hat = posh ? { kind: 'fontange', color: WHITE } : { kind: 'coif', color: WHITE };
      L.hairStyle = posh ? 'updo' : 'hidden';
      L.apron = !posh ? WHITE : null;
    } else if (Y < 1795) {
      L.skirt = sk(posh ? 'panniers' : 'full');
      L.collar = { kind: 'fichu', color: WHITE };
      L.hat = posh ? (chance(0.5) ? { kind: 'straw', color: STRAW } : null) : { kind: 'mob', color: WHITE };
      L.hairStyle = posh ? 'updo' : 'hidden';
      L.apron = !posh ? p([WHITE, LINEN, '#d8c8a8']) : null;
      if (labour && chance(0.5)) L.shawl = { color: p(['#6a1a1a', '#3a3a5a', '#5a4a30']), overHead: false };
    } else if (Y < 1828) {
      L.top = posh || trade ? p([WHITE, '#e8e0f0', '#e0ecf0', '#f0e0d8']) : p(['#d8d0c0', '#c8b8a0', '#a8a8b0', '#b0a090']);
      L.skirt = sk('empire', L.top);
      L.hat = { kind: 'poke', color: p([STRAW, '#e8e0c8', '#5a3a2a']) };
      L.hairStyle = 'curls';
      L.shawl = chance(0.6) ? { color: p(['#8a1a1a', '#2a3a6a', '#d8c070', '#5a2a5a']), overHead: false } : null;
      L.apron = labour ? WHITE : null;
    } else if (Y < 1868) {
      L.skirt = sk(Y > 1854 && !labour ? 'crinoline' : 'bell');
      L.collar = { kind: 'smallcollar', color: WHITE };
      L.hat = posh || trade ? { kind: 'poke', color: p(['#3a2a2a', '#5a4a3a', STRAW, '#2a2a3a']) } : null;
      L.hairStyle = 'parted';
      L.apron = labour ? p([WHITE, LINEN, '#5a5a6a']) : null;
      L.shawl = labour ? { color: p(['#4a3a3a', '#3a3a4a', '#5a4a3a', '#3a4a3a']), overHead: north } : chance(0.4) ? { color: p(['#6a1a2a', '#2a2a5a']), overHead: false } : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1892) {
      L.skirt = sk(Y >= 1869 && Y < 1890 && !labour ? 'bustle' : 'full');
      L.collar = { kind: 'highneck', color: L.top };
      L.hat = posh || trade ? { kind: 'smallhat', color: p([BLACK, '#3a2a2a', '#5a2a3a']) } : null;
      L.hairStyle = 'bun';
      L.apron = labour ? p([WHITE, LINEN, '#5a5a6a']) : null;
      L.shawl = labour ? { color: p(['#4a3a3a', '#3a3a4a', '#5a4a3a', '#2a2a2a']), overHead: north } : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1915) {
      L.top = posh || trade || chance(0.5) ? p([WHITE, '#f0ece0', '#e8e0d0']) : L.top;
      L.skirt = sk('aline', p(['#1e1e26', '#2a2a3a', '#3a2e26', '#2a3a4a', '#4a2a2a']));
      L.collar = { kind: 'highneck', color: L.top };
      L.hat = posh || trade ? { kind: 'bighat', color: p([BLACK, '#3a2a3a', STRAW, '#2a3a4a']) } : null;
      L.hairStyle = 'updo';
      L.apron = labour ? p([WHITE, LINEN]) : null;
      L.shawl = labour ? { color: p(['#2a2a2a', '#3a3a4a', '#4a3a3a']), overHead: north } : null;
      L.shoes = north && labour ? 'clogs' : 'boots';
    } else if (Y < 1931) {
      L.top = p(posh ? ['#2a3a6a', '#6a2a3a', '#3a5a4a', '#5a4a6a'] : ['#5a4a5a', '#3a4a5a', '#6a5a3a', '#4a5a4a', '#7a3a3a']);
      L.skirt = sk(Y > 1920 ? 'knee' : 'calf', L.top, Y > 1920 ? 0.55 : 0.75);
      L.hat = chance(0.7) ? { kind: 'cloche', color: p(['#4a2a3a', '#2a3a4a', '#6a5a4a', BLACK]) } : null;
      L.hairStyle = Y > 1920 ? 'bob' : 'bun';
      L.apron = labour && chance(0.5) ? WHITE : null;
      L.shawl = labour && north && Y < 1925 && chance(0.5) ? { color: '#2a2a2a', overHead: true } : null;
      L.shoes = north && labour && Y < 1925 ? 'clogs' : 'heels';
    } else if (Y < 1950) {
      L.top = p(['#3a5a8a', '#8a3a4a', '#4a7a5a', '#7a6a3a', '#5a4a7a', '#2a4a6a']);
      L.skirt = sk('calf', L.top, 0.72);
      L.hat = chance(0.4) ? { kind: p(['tilthat', 'headscarf']), color: p(['#6a2a2a', '#2a3a5a', '#d8c070']) } : null;
      L.hairStyle = 'curls';
      L.apron = labour && chance(0.4) ? p(['#e8d8c0', '#d8e0e8']) : null;
      L.shoes = 'heels';
    } else if (Y < 1965) {
      L.top = p(['#d85a6a', '#5a8ad8', '#e8c050', '#6ab08a', '#e88a5a', '#a86ad8']);
      L.skirt = sk('fifties', L.top, 0.72);
      L.coat = chance(0.3) ? { kind: 'cardigan', color: p(['#e8e0d0', '#6a5a7a', '#4a6a8a']), length: 0.3 } : null;
      L.hat = chance(0.25) ? { kind: 'headscarf', color: p(['#c83a3a', '#3a6ac8', '#e8c040']) } : null;
      L.hairStyle = 'curls';
      L.shoes = 'heels';
    } else if (Y < 1982) {
      L.top = p(SIXTIES);
      if (chance(0.55)) L.skirt = sk(chance(0.5) ? 'mini' : 'maxi', L.top, 0.4);
      else L.legs = { kind: 'flares', color: p(DENIM) };
      L.hairStyle = chance(0.6) ? 'long' : 'bob';
      L.shoes = 'shoes';
    } else {
      L.top = p(MODERN);
      if (chance(0.3)) L.skirt = sk('knee', p(['#2a2a2a', '#3a3a5a', '#6a2a3a', '#4a6a8a']), 0.55);
      else L.legs = { kind: 'jeans', color: p(DENIM) };
      L.coat = chance(0.3) ? { kind: 'jacket', color: p(['#2a2a2a', '#4a3a2a', '#c8b890']), length: 0.3 } : null;
      L.hairStyle = p(['long', 'long', 'bob', 'short', 'updo']);
      L.shoes = 'trainers';
      L.sleeves = chance(0.5) ? 'short' : 'long';
    }
    // Job and region
    if (job === 'servant' && Y >= 1840 && Y < 1945) { L.top = BLACK; L.skirt = sk(Y < 1915 ? 'full' : 'calf', BLACK, Y < 1915 ? 1 : 0.75); L.apron = WHITE; L.hat = { kind: 'maidcap', color: WHITE }; L.collar = { kind: 'smallcollar', color: WHITE }; L.shawl = null; }
    if (job === 'nurse' && Y >= 1870 && Y < 1975) { L.top = p(['#3a5a8a', '#4a6a9a']); L.skirt = sk('calf', L.top, Y < 1920 ? 1 : 0.75); L.apron = WHITE; L.hat = { kind: 'maidcap', color: WHITE }; L.collar = { kind: 'smallcollar', color: WHITE }; L.shawl = null; }
    if (job === 'textile' && Y >= 1830 && Y < 1930 && north) { L.shawl = { color: p(['#2a2a2a', '#3a3a4a', '#4a3a3a']), overHead: true }; L.shoes = 'clogs'; L.apron = L.apron || p([WHITE, LINEN]); L.hat = null; }
    if (job === 'fishing' && Y >= 1800 && Y < 1950) { L.skirt = sk('full', p(['#2a3a6a', '#3a2a2a'])); L.apron = '#d8c8a8'; L.shawl = { color: '#3a3a5a', overHead: false }; L.striped = true; }
    if (welsh && (labour || tier === 'skilled') && Y >= 1810 && Y < 1880) { L.hat = { kind: 'welsh', color: BLACK }; L.shawl = { color: p(['#8a1a1a', '#5a3a2a', '#3a3a5a']), overHead: false }; L.skirt = sk('full', '#7a1a1a'); L.apron = p([WHITE, '#3a3a3a']); L.hairStyle = 'hidden'; }
    if (highland && labour && Y < 1880) { L.shawl = { color: p(TARTANS), overHead: false, plaid: true }; L.hat = { kind: 'coif', color: WHITE }; L.hairStyle = 'hidden'; }
    if ((region === 'ireland' || region === 'ulster') && labour && Y >= 1800 && Y < 1930) { L.shawl = { color: p(['#2a2a2a', '#3a2a2a', '#3a3a4a']), overHead: chance(0.6) }; L.shoes = chance(0.4) ? 'bare' : 'boots'; }
  }
  if (!L.legs && !L.skirt) L.legs = { kind: 'trousers', color: shade(L.top, 0.9) };
  L.sleeves ||= 'long';
  // Summary for the island and fluffy builders
  L.dress = !!L.skirt;
  L.longHair = ['long', 'curls', 'bun', 'updo', 'parted', 'hidden'].includes(L.hairStyle) && female || L.hairStyle === 'long' || L.hairStyle === 'wig';
  L.beard = L.facial === 'beard';
  return L;
}
