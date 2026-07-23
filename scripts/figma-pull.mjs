// Pulls furniture sprites from a Figma file into sprites/.
// Usage: FIGMA_TOKEN=... FIGMA_FILE_KEY=... node scripts/figma-pull.mjs
// Finds components/frames whose names match sprite keys (e.g. "sofa-r0", "tv-back")
// and exports each as SVG over the matching sprites/<name>.svg file.
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;
if (!TOKEN || !FILE_KEY) { console.error('Set FIGMA_TOKEN and FIGMA_FILE_KEY'); process.exit(1); }

const manifest = JSON.parse(readFileSync('sprites/manifest.json', 'utf8'));
const wanted = new Set(Object.keys(manifest)); // sprite keys like "sofa-r0"

const api = (path) => fetch(`https://api.figma.com${path}`, { headers: { 'X-Figma-Token': TOKEN } }).then(r => {
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
});

// 1. walk the file tree, collect node ids whose name matches a sprite key
const file = await api(`/v1/files/${FILE_KEY}`);
const found = {};
(function walk(node) {
  if (wanted.has(node.name) && !found[node.name]) found[node.name] = node.id;
  (node.children || []).forEach(walk);
})(file.document);

const names = Object.keys(found);
if (!names.length) { console.log('No nodes matching sprite names found — nothing to sync.'); process.exit(0); }
console.log(`Found ${names.length} sprite nodes in Figma.`);

// 2. request SVG exports (batched)
let changed = 0;
for (let i = 0; i < names.length; i += 20) {
  const batch = names.slice(i, i + 20);
  const ids = batch.map(n => found[n]).join(',');
  const res = await api(`/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg&svg_include_id=true`);
  for (const name of batch) {
    const url = res.images[found[name]];
    if (!url) { console.warn(`No export URL for ${name}`); continue; }
    const svg = await fetch(url).then(r => r.text());
    const path = `sprites/${name}.svg`;
    const old = (() => { try { return readFileSync(path, 'utf8'); } catch { return ''; } })();
    if (svg.trim() && svg !== old) { writeFileSync(path, svg); changed++; console.log(`updated ${path}`); }
  }
}
console.log(`Done — ${changed} sprite(s) updated.`);
