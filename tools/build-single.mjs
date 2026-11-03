// Bundles index.html + js/*.js + the demo GEDCOM into self-contained HTML files:
//   index.html          — self-contained: double-click it, or host it anywhere (GitHub Pages)
//   dist/artifact.html  — the same page without <html>/<head>/<body>, for hosts that add their own skeleton
// dev.html is the source page that loads js/*.js as separate modules (needs a local web server).
// No dependencies: modules are wrapped in closures, so `three` stays a CDN import via the import map.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const ORDER = ['gedcom', 'ancestry', 'places', 'textures', 'outfits', 'traits', 'npc', 'dialogue', 'guides', 'props', 'envs', 'world', 'weapon', 'fluffy', 'vizkit', 'galaxy', 'treeart', 'verses', 'growtree', 'viz', 'main'];
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
const full = html
  .replace(/<script>\s*\/\/ dev-only[\s\S]*?<\/script>\s*/, '')
  .replace('<script type="module" src="js/main.js"></script>', () => inline)
  .replace('<html lang="en">', '<!-- Built from dev.html by tools/build-single.mjs. Edit dev.html and js/*, then run npm run build. -->\n<html lang="en">');
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('index.html', root), full);

// Artifact flavour: strip the document skeleton and the viewport meta (the host supplies both).
const head = /<head>([\s\S]*?)<\/head>/.exec(full)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = /<body>([\s\S]*?)<\/body>/.exec(full)[1];
writeFileSync(new URL('dist/artifact.html', root), head.trim() + '\n' + body.trim() + '\n');
console.log('built index.html', (full.length / 1024).toFixed(0) + 'KB');
