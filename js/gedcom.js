// GEDCOM 5.5 / 5.5.1 / 7 parser.
// Accepts any line ending, joins CONC/CONT, resolves shared NOTE records,
// and keeps every life event (baptism, census, residence, emigration, burial ...) for the NPC dialogue.

const LINE_RE = /^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?(\S+)(?:\s(.*))?$/;

// Decode raw file bytes into text, honouring BOMs and the header CHAR tag.
export function decodeGedcomBytes(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const head = utf8.slice(0, 4000);
  const charTag = (head.match(/\n\s*1\s+CHAR\s+(\S+)/) || [])[1] || '';
  const looksBroken = utf8.includes('\uFFFD');
  if (looksBroken || /^(ANSI|ASCII|IBMPC|WINDOWS|CP1252|ISO-8859-1|LATIN1)$/i.test(charTag)) {
    try { return new TextDecoder('windows-1252').decode(bytes); } catch (e) { return utf8; }
  }
  return utf8;
}

// Build a generic node tree, then interpret it. Much more forgiving than a level-by-level state machine.
function buildTree(text) {
  const roots = [];
  const stack = [];
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const m = LINE_RE.exec(raw);
    if (!m) continue;
    const level = parseInt(m[1], 10);
    const node = { level, xref: m[2] || null, tag: m[3].toUpperCase(), value: (m[4] || '').replace(/@@/g, '@'), children: [] };
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const parent = stack[stack.length - 1];
    if (node.tag === 'CONC' && parent) { parent.value += node.value; continue; }
    if (node.tag === 'CONT' && parent) { parent.value += '\n' + node.value; continue; }
    if (parent) parent.children.push(node); else roots.push(node);
    stack.push(node);
  }
  return roots;
}

const child = (node, tag) => node.children.find(c => c.tag === tag);
const childVal = (node, tag) => { const c = child(node, tag); return c ? c.value.trim() : ''; };
const children = (node, tag) => node.children.filter(c => c.tag === tag);

// Tags we treat as life events on an individual (value may hold a description, e.g. OCCU "Coal miner").
const INDI_EVENTS = new Set(['BIRT', 'CHR', 'BAPM', 'CHRA', 'BLES', 'CONF', 'BARM', 'BASM', 'FCOM', 'ADOP',
  'DEAT', 'BURI', 'CREM', 'PROB', 'WILL', 'RESI', 'CENS', 'OCCU', 'EDUC', 'GRAD', 'RETI', 'EMIG', 'IMMI',
  'NATU', 'ORDN', 'RELI', 'NATI', 'DSCR', 'TITL', 'PROP', 'CAST', 'NCHI', 'NMR', 'SSN', 'IDNO', 'EVEN', 'FACT', '_MILT', '_MILI', 'MILI']);

function parseEvent(node, notes) {
  return {
    tag: node.tag,
    type: childVal(node, 'TYPE'),
    value: node.value.trim(),
    date: childVal(node, 'DATE'),
    place: childVal(node, 'PLAC'),
    age: childVal(node, 'AGE'),
    cause: childVal(node, 'CAUS'),
    note: children(node, 'NOTE').map(n => resolveNote(n, notes)).filter(Boolean).join('\n'),
  };
}

function resolveNote(node, notes) {
  const v = node.value.trim();
  if (/^@[^@]+@$/.test(v)) return notes[v] || '';
  return v;
}

// "John Paul /Smith/ Jr." -> { given, surname, suffix }
export function splitName(raw) {
  const m = /^(.*?)\/(.*?)\/(.*)$/.exec(raw || '');
  if (!m) return { given: (raw || '').trim(), surname: '', suffix: '' };
  return { given: m[1].trim(), surname: m[2].trim(), suffix: m[3].trim().replace(/^,\s*/, '') };
}

export function parseGedcom(text) {
  const roots = buildTree(text);
  const notes = {};
  const sources = {};
  const individuals = new Map();
  const families = new Map();
  const header = {};

  // Shared notes and sources first so references can be resolved.
  for (const r of roots) {
    if (r.tag === 'NOTE' && r.xref) notes[r.xref] = r.value.trim();
    if ((r.tag === 'SOUR' || r.tag === 'SNOTE') && r.xref) sources[r.xref] = childVal(r, 'TITL') || r.value.trim();
    if (r.tag === 'HEAD') {
      header.source = childVal(r, 'SOUR');
      header.charset = childVal(r, 'CHAR');
      const gedc = child(r, 'GEDC');
      header.version = gedc ? childVal(gedc, 'VERS') : '';
    }
  }

  for (const r of roots) {
    if (r.tag === 'INDI' && r.xref) {
      const nameNode = child(r, 'NAME');
      const name = splitName(nameNode ? nameNode.value : '');
      if (nameNode) {
        if (!name.given) name.given = childVal(nameNode, 'GIVN');
        if (!name.surname) name.surname = childVal(nameNode, 'SURN');
        if (!name.suffix) name.suffix = childVal(nameNode, 'NSFX');
      }
      const indi = {
        id: r.xref,
        given: name.given,
        surname: name.surname,
        suffix: name.suffix,
        prefix: nameNode ? childVal(nameNode, 'NPFX') : '',
        nickname: nameNode ? childVal(nameNode, 'NICK') : '',
        altNames: children(r, 'NAME').slice(1).map(n => { const s = splitName(n.value); return [s.given, s.surname].filter(Boolean).join(' '); }).filter(Boolean),
        sex: (childVal(r, 'SEX') || 'U').charAt(0).toUpperCase(),
        events: [],
        notes: children(r, 'NOTE').map(n => resolveNote(n, notes)).filter(Boolean),
        famc: null,
        fams: children(r, 'FAMS').map(n => n.value.trim()),
      };
      // Prefer the birth family when several FAMC exist.
      const famcs = children(r, 'FAMC');
      const birthFamc = famcs.find(f => { const p = childVal(f, 'PEDI').toLowerCase(); return !p || p === 'birth'; });
      indi.famc = (birthFamc || famcs[0] || { value: '' }).value.trim() || null;
      for (const c of r.children) if (INDI_EVENTS.has(c.tag)) indi.events.push(parseEvent(c, notes));
      individuals.set(indi.id, indi);
    } else if (r.tag === 'FAM' && r.xref) {
      const fam = {
        id: r.xref,
        husb: childVal(r, 'HUSB') || null,
        wife: childVal(r, 'WIFE') || null,
        children: children(r, 'CHIL').map(n => n.value.trim()),
        events: r.children.filter(c => ['MARR', 'DIV', 'ENGA', 'MARB', 'MARL', 'ANUL', 'EVEN'].includes(c.tag)).map(c => parseEvent(c, notes)),
      };
      families.set(fam.id, fam);
    }
  }

  // Repair links that only one side recorded (common in hand-edited files).
  for (const fam of families.values()) {
    for (const cid of fam.children) {
      const c = individuals.get(cid);
      if (c && !c.famc) c.famc = fam.id;
    }
    for (const pid of [fam.husb, fam.wife]) {
      const p = pid && individuals.get(pid);
      if (p && !p.fams.includes(fam.id)) p.fams.push(fam.id);
    }
  }
  for (const indi of individuals.values()) {
    if (indi.famc && families.has(indi.famc)) {
      const fam = families.get(indi.famc);
      if (!fam.children.includes(indi.id)) fam.children.push(indi.id);
    }
  }

  return { header, individuals, families, notes, sources };
}

// ---------- Dates ----------

const MONTHS = { JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December' };

export function dateYear(date) {
  if (!date) return null;
  const clean = date.replace(/@#D[A-Z ]+@/g, '').replace(/\(.*?\)/g, ' ');
  const years = clean.match(/\b(\d{3,4})(?:\/\d{1,2})?\b/g);
  if (!years) return null;
  return parseInt(years[0], 10);
}

function prettySimple(d) {
  const parts = d.trim().split(/\s+/);
  return parts.map(p => MONTHS[p.toUpperCase()] || p).join(' ');
}

// Returns a phrase that reads naturally after a verb: "on 3 March 1872", "in 1850", "about 1850".
export function datePhrase(date) {
  if (!date) return '';
  let d = date.replace(/@#D[A-Z ]+@/g, '').trim();
  const paren = /^\((.*)\)$/.exec(d);
  if (paren) return paren[1];
  d = d.replace(/^INT\s+/i, '').replace(/\s*\(.*\)\s*$/, '');
  let m;
  if ((m = /^(?:BET|BETWEEN)\s+(.+?)\s+AND\s+(.+)$/i.exec(d))) return `between ${prettySimple(m[1])} and ${prettySimple(m[2])}`;
  if ((m = /^FROM\s+(.+?)\s+TO\s+(.+)$/i.exec(d))) return `from ${prettySimple(m[1])} to ${prettySimple(m[2])}`;
  if ((m = /^(ABT|ABOUT|CIRCA|CA|C)\.?\s+(.+)$/i.exec(d))) return `around ${prettySimple(m[2])}`;
  if ((m = /^(EST|CAL)\s+(.+)$/i.exec(d))) return `around ${prettySimple(m[2])}`;
  if ((m = /^(BEF|BEFORE)\s+(.+)$/i.exec(d))) return `before ${prettySimple(m[2])}`;
  if ((m = /^(AFT|AFTER)\s+(.+)$/i.exec(d))) return `after ${prettySimple(m[2])}`;
  if ((m = /^FROM\s+(.+)$/i.exec(d))) return `from ${prettySimple(m[1])}`;
  if ((m = /^TO\s+(.+)$/i.exec(d))) return `until ${prettySimple(m[1])}`;
  const pretty = prettySimple(d);
  return /^\d{1,2}\s/.test(pretty) ? `on ${pretty}` : `in ${pretty}`;
}

export function shortDate(date) {
  if (!date) return '?';
  const y = dateYear(date);
  if (y == null) return '?';
  if (/^\s*(ABT|ABOUT|EST|CAL|CA|C)\b/i.test(date)) return 'c.' + y;
  if (/^\s*BEF/i.test(date)) return '<' + y;
  if (/^\s*AFT/i.test(date)) return '>' + y;
  return String(y);
}
