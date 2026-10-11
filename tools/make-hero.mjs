// Builds assets/hero-chart.svg: a real aviation-chart style drawing of the LTAC → EDDM route
// (land, FIR boundaries, corridor, enroute airports) from the NOSIG app's bundled map data.
//   node tools/make-hero.mjs /path/to/nosig/assets/map
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const mapDir = process.argv[2];
const land = JSON.parse(readFileSync(join(mapDir, 'land.json'), 'utf8'));
const firs = JSON.parse(readFileSync(join(mapDir, 'firs.json'), 'utf8'));

// Wide frame with the route in its right half (the headline box sits on the left on desktop).
// True Mercator: the vertical scale follows the horizontal one.
const W = 1400, H = 760;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const unmerc = (y) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
const lonW = -27, lonE = 40;
const sx = W / (lonE - lonW);
const sy = (sx * 180) / Math.PI;
const midY = (merc(40.13) + merc(48.35)) / 2;
const yN = midY + H / sy / 2, yS = midY - H / sy / 2;
const box = { w: lonW, e: lonE, s: unmerc(yS), n: unmerc(yN) };
const P = (lon, lat) => [(lon - box.w) * sx, (yN - merc(lat)) * sy];
const f = (n) => Math.round(n * 10) / 10;

// Points outside the frame are clamped to a margin around it: the clamped edges run off-screen,
// and long stretches of far-away coastline collapse into a few points.
function ringPath(ring) {
  let d = '';
  let last = null;
  for (const [lon0, lat0] of ring) {
    const lon = Math.max(box.w - 2, Math.min(box.e + 2, lon0));
    const lat = Math.max(box.s - 2, Math.min(box.n + 2, lat0));
    const [x, y] = P(lon, lat);
    if (last && Math.hypot(x - last[0], y - last[1]) < 2.2) continue;
    d += (d ? 'L' : 'M') + `${Math.round(x)},${Math.round(y)}`;
    last = [x, y];
  }
  return d + 'Z';
}
const inBox = (ring) => ring.some(([lon, lat]) => lon > box.w - 5 && lon < box.e + 5 && lat > box.s - 5 && lat < box.n + 5);

let landD = '';
for (const ft of land.features) {
  const g = ft.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) if (inBox(ring)) landD += ringPath(ring);
}

let firD = '';
for (const ft of firs.features) {
  if (ft.properties.o) continue;
  const g = ft.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) if (inBox(ring)) firD += ringPath(ring).replace(/Z$/, '');
}

// Great circle LTAC → EDDM
const R = Math.PI / 180;
const A = { lat: 40.128, lon: 32.995 }, B = { lat: 48.354, lon: 11.786 };
function inter(a, b, t) {
  const φ1 = a.lat * R, λ1 = a.lon * R, φ2 = b.lat * R, λ2 = b.lon * R;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  const k1 = Math.sin((1 - t) * d) / Math.sin(d), k2 = Math.sin(t * d) / Math.sin(d);
  const x = k1 * Math.cos(φ1) * Math.cos(λ1) + k2 * Math.cos(φ2) * Math.cos(λ2);
  const y = k1 * Math.cos(φ1) * Math.sin(λ1) + k2 * Math.cos(φ2) * Math.sin(λ2);
  const z = k1 * Math.sin(φ1) + k2 * Math.sin(φ2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) / R, lon: Math.atan2(y, x) / R };
}
const route = Array.from({ length: 65 }, (_, i) => inter(A, B, i / 64));
const routeD = route.map((p, i) => (i ? 'L' : 'M') + P(p.lon, p.lat).map(f).join(',')).join('');

// Corridor ±140 NM: offset each route point perpendicular in screen space (good enough for an illustration)
// Corridor ±140 NM, offset along the local normal of the route (screen space; fine for an illustration).
const pts = route.map((p) => P(p.lon, p.lat));
const pxPerNm = (lat) => (P(0, lat)[1] - P(0, lat + 1 / 60)[1]);
const edge = (side) =>
  pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const d = 140 * pxPerNm(route[i].lat) * side;
    return [x + (-(by - ay) / len) * d, y + ((bx - ax) / len) * d];
  });
const left = edge(1);
const right = edge(-1);
const bandD = 'M' + [...left, ...right.reverse()].map((q) => q.map(f).join(',')).join('L') + 'Z';

const airports = [
  ['LTAC', 40.128, 32.995, 'v', 'end'], ['EDDM', 48.354, 11.786, 'm', 'end'],
  ['LTFM', 41.262, 28.742, 'v'], ['LBBG', 42.57, 27.515, 'v'], ['LBWN', 43.232, 27.825, 'v'],
  ['LBSF', 42.695, 23.406, 'v'], ['LBPD', 42.068, 24.851, 'v'], ['LROP', 44.571, 26.085, 'v'],
  ['LRCL', 46.785, 23.686, 'm'], ['LRSB', 45.786, 24.091, 'v'], ['LRTR', 45.81, 21.338, 'v'],
  ['LYBE', 44.818, 20.309, 'v'], ['LYNI', 43.337, 21.854, 'v'], ['LHBP', 47.439, 19.262, 'v'],
  ['LDZA', 45.743, 16.069, 'v'], ['LJLJ', 46.224, 14.458, 'i'], ['LOWG', 46.991, 15.44, 'v'],
  ['LOWW', 48.11, 16.57, 'v'], ['LOWL', 48.233, 14.188, 'm'], ['LOWS', 47.793, 13.004, 'v'],
  ['LQSA', 43.825, 18.331, 'v'], ['LTBJ', 38.289, 27.157, 'v'], ['LKPR', 50.101, 14.26, 'v'],
  ['LZIB', 48.17, 17.213, 'v'], ['LIPZ', 45.505, 12.352, 'v'], ['EDDF', 50.033, 8.571, 'v'],
  ['LGAV', 37.936, 23.944, 'v'], ['LIRF', 41.804, 12.251, 'v'], ['UKBB', 50.345, 30.895, 'v'],
  ['LUKK', 46.928, 28.931, 'v'], ['EPKK', 50.078, 19.785, 'v'],
];
const crossNm = (p) => {
  // distance to the route polyline in NM (flat approximation)
  let best = Infinity;
  for (const r of route) best = Math.min(best, Math.hypot((p.lat - r.lat) * 60, (p.lon - r.lon) * 60 * Math.cos(r.lat * R)));
  return best;
};
const apts = airports.map(([icao, lat, lon, cat, role]) => {
  const [x, y] = P(lon, lat);
  const inCorridor = role === 'end' || crossNm({ lat, lon }) <= 140;
  return { icao, x: f(x), y: f(y), cat, role: role ?? (inCorridor ? 'enr' : 'other') };
});

const labelAt = (lon, lat) => P(lon, lat).map(f);
const firLabels = [
  ['ANKARA', 'LTAA', 32.5, 39.2], ['ATHINAI', 'LGGG', 22.6, 38.6], ['WARSZAWA', 'EPWW', 21.0, 52.4], ['PRAHA', 'LKAA', 15.0, 50.0],
  ['MARSEILLE', 'LFMM', 5.0, 43.6], ['ROMA', 'LIRR', 12.8, 41.0], ['MADRID', 'LECM', -3.7, 40.3],
  ['REIMS', 'LFEE', 4.8, 48.6], ['SHANNON', 'EISN', -10.0, 52.6],
  ['LONDON', 'EGTT', -1.3, 52.0], ['LISBOA', 'LPPC', -11.0, 39.5], ['BREST', 'LFRR', -6.0, 47.0],
];

let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chart of the route from Ankara (LTAC) to Munich (EDDM) with the airports in a 140 NM corridor coloured by their weather">
<rect class="sea" width="${W}" height="${H}"/>
<path class="land" d="${landD}"/>
<path class="fir" d="${firD}"/>
`;
for (const [name, id, lon, lat] of firLabels) {
  const [x, y] = labelAt(lon, lat);
  svg += `<text class="fir-label" x="${x}" y="${y}">${name}<tspan x="${x}" dy="1.15em">${id}</tspan></text>\n`;
}
svg += `<path class="band" d="${bandD}"/>
<path class="route" d="${routeD}" pathLength="1"/>
`;
for (const a of apts) {
  if (a.role === 'end') {
    svg += `<circle class="ring" cx="${a.x}" cy="${a.y}" r="15"/><circle class="apt ${a.cat}" cx="${a.x}" cy="${a.y}" r="7"/>`;
    // Destination label above its ring (nearby airports crowd the right side); departure label to the right.
    svg += a.icao === 'EDDM'
      ? `<text class="apt-label end" x="${a.x}" y="${a.y - 24}" text-anchor="middle">${a.icao}</text>\n`
      : `<text class="apt-label end" x="${a.x + 22}" y="${a.y + 7}">${a.icao}</text>\n`;
  } else {
    svg += `<circle class="apt ${a.cat}${a.role === 'other' ? ' faint' : ''}" cx="${a.x}" cy="${a.y}" r="${a.role === 'enr' ? 6 : 4}"/>`;
    if (a.role === 'enr') svg += `<text class="apt-label" x="${a.x + 10}" y="${a.y + 5}">${a.icao}</text>`;
    svg += '\n';
  }
}
svg += '</svg>\n';
writeFileSync(new URL('../assets/hero-chart.svg', import.meta.url), svg);
console.log('hero-chart.svg', (svg.length / 1024).toFixed(0), 'KB');
