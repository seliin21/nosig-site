// Builds the published pages from src/:
//   src/index.html   -> index.html          (hero chart SVG inlined)
//   src/privacy.html -> privacy/index.html
//   src/support.html -> support/index.html
//   src/delete-data.html -> delete-data/index.html (data deletion steps, linked from Google Play)
//   src/r.html       -> r/index.html          (shared routes from the app)
// If analytics.html exists (e.g. the Cloudflare Web Analytics snippet), it is added to every page.
//   node tools/build.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const analytics = existsSync(new URL('analytics.html', root)) ? read('analytics.html').trim() : '';
const chart = read('assets/hero-chart.svg').trim();

const pages = [
  ['src/index.html', 'index.html'],
  ['src/privacy.html', 'privacy/index.html'],
  ['src/support.html', 'support/index.html'],
  ['src/delete-data.html', 'delete-data/index.html'],
  ['src/r.html', 'r/index.html'],
  ['src/404.html', '404.html'],
];
for (const [from, to] of pages) {
  let html = read(from).replace('<!-- ANALYTICS -->', analytics).replace('<!-- HERO_CHART -->', chart);
  const dir = to.includes('/') ? to.slice(0, to.lastIndexOf('/')) : null;
  if (dir) mkdirSync(new URL(dir, root), { recursive: true });
  writeFileSync(new URL(to, root), html);
  console.log(to, (html.length / 1024).toFixed(0), 'KB');
}
