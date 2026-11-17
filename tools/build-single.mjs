// Bundles dev.html + js/*.js + the demo GEDCOM into self-contained HTML files, one per page:
//   index.html                  — Story mode (A Battle in Time): double-click it, or host it anywhere (GitHub Pages)
//   explore.html                — the Fluffy garden (Play) and Roots & Stars (Visualisation), same rules
//   dist/artifact.html          — index.html without <html>/<head>/<body>, for hosts that add their own skeleton
//   dist/artifact-explore.html  — the same for explore.html
// dev.html is the source page for both (dev.html is Story, dev.html?page=explore the rest); it loads js/*.js as
// separate modules and needs a local web server.
// No dependencies: modules are wrapped in closures, so `three` stays a CDN import via the import map.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const ORDER = ['gedcom', 'ancestry', 'places', 'textures', 'outfits', 'traits', 'npc', 'dialogue', 'guides', 'props', 'envs', 'world', 'weapon', 'fight', 'missions', 'fluffy', 'vizkit', 'galaxy', 'treeart', 'verses', 'growtree', 'viz', 'storyplot', 'storynet', 'storycity', 'storyart', 'storyui', 'storymap', 'storygame', 'main'];
const external = new Map();
let bundle = '';

for (const name of ORDER) {
  let src = read(`js/${name}.js`);
  const exports = [];
  // external (three) imports are hoisted once
  src = src.replace(/^import\s+(.+?)\s+from\s+'(three[^']*)';\s*$/gm, (m, what, from) => { external.set(m.trim(), true); return ''; });
  // local imports become destructuring from the module object
  src = src.replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/(\w+)\.js';\s*$/gm, (m, names, mod) => {
    if (ORDER.indexOf(mod) < 0 || ORDER.indexOf(mod) >= ORDER.indexOf(name)) throw new Error(`${name}.js imports ${mod}.js, which must come earlier in ORDER`);
    return `const {${names.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2')}} = __m_${mod};`;
  });
  src = src.replace(/^export\s+(async\s+)?function\s+(\w+)/gm, (m, a, n) => { exports.push(n); return `${a || ''}function ${n}`; });
  src = src.replace(/^export\s+(const|let|class)\s+(\w+)/gm, (m, k, n) => { exports.push(n); return `${k} ${n}`; });
  src = src.replace(/^export\s+\{([^}]+)\};?\s*$/gm, (m, names) => { exports.push(...names.split(',').map(s => s.trim()).filter(Boolean).map(n => n.replace(/^(\w+)\s+as\s+(\w+)$/, '$2: $1'))); return ''; });
  if (/^\s*(import|export)\s/m.test(src)) throw new Error(`unhandled import/export in ${name}.js`);
  bundle += `\n// ---- ${name}.js ----\nconst __m_${name} = (() => {\n${src}\nreturn { ${exports.join(', ')} };\n})();\n`;
}
bundle = [...external.keys()].join('\n') + '\n' + bundle;
const demo = read('sample/demo.ged');
const inline = `<script>window.DEMO_GEDCOM = ${JSON.stringify(demo).replace(/</g, '\\u003c')};</script>\n<script type="module">\n${bundle.replace(/<\/script/gi, '<\\/script')}\n</script>`;

const html = read('dev.html');
const PAGES = [
  { file: 'index.html', artifact: 'dist/artifact.html', page: 'story', other: 'explore.html',
    title: 'Ancestry: A Battle in Time',
    description: 'A top-down driving story through the towns and years your ancestors lived in, built from your GEDCOM family tree.' },
  { file: 'explore.html', artifact: 'dist/artifact-explore.html', page: 'explore', other: 'index.html',
    title: 'Ancestry 3D',
    description: 'Roll round a garden of your ancestors, or see your GEDCOM family tree as a galaxy of stars and a growing tree.' },
];
const attr = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// The page flag goes in just before the menu, ahead of dev.html's page script that reads it.
const flag = (page, other) => `<script>window.A3D_PAGE = ${JSON.stringify(page)}; window.A3D_OTHER = ${JSON.stringify(other)};</script>\n<div id="menu">`;
mkdirSync(new URL('dist/', root), { recursive: true });

for (const P of PAGES) {
  const base = html
    .replace(/<script>\s*\/\/ dev-only[\s\S]*?<\/script>\s*/, '')
    .replace('<script type="module" src="js/main.js"></script>', () => inline)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${attr(P.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${attr(P.description)}">`)
    .replace('<html lang="en">', '<!-- Built from dev.html by tools/build-single.mjs. Edit dev.html and js/*, then run npm run build. -->\n<html lang="en">');
  if (!base.includes('<div id="menu">')) throw new Error('dev.html has no <div id="menu">');
  const full = base.replace('<div id="menu">', () => flag(P.page, P.other));
  writeFileSync(new URL(P.file, root), full);

  // Artifact flavour: strip the document skeleton and the viewport meta (the host supplies both). An artifact
  // can't link to the other page, so it gets no link card.
  const art = base.replace('<div id="menu">', () => flag(P.page, ''));
  const head = /<head>([\s\S]*?)<\/head>/.exec(art)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
  const body = /<body>([\s\S]*?)<\/body>/.exec(art)[1];
  writeFileSync(new URL(P.artifact, root), head.trim() + '\n' + body.trim() + '\n');
  console.log('built', P.file, (full.length / 1024).toFixed(0) + 'KB');
}
