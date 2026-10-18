/**
 * Generate the placeholder artwork used by the mosaic and the case studies.
 *
 * The theme ships self-hosted artwork so the preview never depends on a
 * third-party image host, and so every media frame has a known aspect ratio
 * and a known flat background colour (the frame is painted before the file
 * arrives, which is what keeps the reveal from flashing).
 *
 * Usage: node tools/generate-media.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'assets', 'media');
mkdirSync(outDir, { recursive: true });

/** Deterministic PRNG so re-running the script reproduces the same artwork. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PALETTES = {
  sand: ['#e8e2d6', '#c9b79c', '#8a6f4e', '#241d16'],
  slate: ['#dfe3e6', '#a8b4bd', '#4c5a66', '#161b20'],
  moss: ['#dfe3d5', '#9fb08c', '#55674a', '#1a2016'],
  clay: ['#f0e0d6', '#d8a288', '#a4553a', '#2a1712'],
  ink: ['#e6e6e6', '#a9a9a9', '#4a4a4a', '#101010'],
  dusk: ['#dcd9ea', '#a79fcb', '#5a4f86', '#161326'],
  rust: ['#f1e2d3', '#d99a5b', '#9c4f1e', '#241106'],
  sea: ['#dce8e8', '#9cc2c0', '#3f7373', '#0f2323'],
};

const SHAPES = ['disc', 'arc', 'bar', 'ring', 'grid'];

function shape(rand, kind, color, opacity) {
  const x = Math.round(rand() * 1600);
  const y = Math.round(rand() * 900);
  const size = Math.round(120 + rand() * 520);
  const sw = Math.max(2, Math.round(6 + rand() * 26));
  const common = `fill="${color}" fill-opacity="${opacity}"`;
  switch (kind) {
    case 'disc':
      return `<circle cx="${x}" cy="${y}" r="${Math.round(size / 2)}" ${common} />`;
    case 'ring':
      return `<circle cx="${x}" cy="${y}" r="${Math.round(size / 2)}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${sw}" />`;
    case 'arc':
      return `<path d="M ${x - size / 2} ${y} A ${size / 2} ${size / 2} 0 0 1 ${x + size / 2} ${y}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${sw}" stroke-linecap="round" />`;
    case 'bar':
      return `<rect x="${x}" y="${y}" width="${size}" height="${Math.round(sw * 2)}" ${common} />`;
    default:
      return `<g stroke="${color}" stroke-opacity="${opacity}" stroke-width="${Math.max(1, Math.round(sw / 4))}">${Array.from(
        { length: 6 },
        (_, i) => `<line x1="${x + i * 28}" y1="${y}" x2="${x + i * 28}" y2="${y + size}" />`,
      ).join('')}</g>`;
  }
}

function makeSvg(seed, paletteName, ratio, index) {
  const rand = rng(seed);
  const palette = PALETTES[paletteName];
  const [bg, mid, accent, ink] = palette;
  const [w, h] = ratio === 'tall' ? [1000, 1250] : ratio === 'wide' ? [1680, 720] : [1440, 810];

  const layers = [];
  layers.push(
    `<rect width="${w}" height="${h}" fill="url(#g)" />`,
    `<g transform="translate(${Math.round(rand() * 200)} ${Math.round(rand() * 160)}) scale(${(
      0.7 +
      rand() * 0.8
    ).toFixed(2)})">`,
  );

  const count = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i += 1) {
    const kind = SHAPES[Math.floor(rand() * SHAPES.length)];
    const color = [mid, accent, ink][Math.floor(rand() * 3)];
    layers.push(shape(rand, kind, color, (0.5 + rand() * 0.45).toFixed(2)));
  }
  layers.push('</g>');

  const rules = Array.from({ length: 9 }, (_, i) => {
    const y = Math.round(((i + 1) / 10) * h);
    return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${ink}" stroke-opacity="0.08" stroke-width="1" />`;
  }).join('');

  const label = String(index).padStart(2, '0');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}" />
      <stop offset="1" stop-color="${mid}" stop-opacity="0.8" />
    </linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
  </defs>
  <g>${layers.join('')}</g>
  ${rules}
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.055" />
  <text x="${w - 48}" y="${h - 44}" text-anchor="end" font-family="Inter, Helvetica, Arial, sans-serif" font-size="34" letter-spacing="6" fill="${ink}" fill-opacity="0.4">${label}</text>
</svg>
`;
}

const JOBS = [
  ['sable-and-salt', 'sand', 101, ['wide', 'tall', 'square']],
  ['northern-light', 'slate', 202, ['square', 'wide', 'tall']],
  ['kite', 'moss', 303, ['tall', 'square', 'wide']],
  ['the-long-room', 'clay', 404, ['square', 'tall', 'wide']],
  ['field-notes', 'ink', 505, ['wide', 'square', 'tall']],
  ['meltwater', 'dusk', 606, ['square', 'wide', 'tall']],
  ['halcyon', 'rust', 707, ['tall', 'square', 'wide']],
  ['ordinary-objects', 'sea', 808, ['square', 'tall', 'wide']],
  ['vesper', 'sand', 909, ['wide', 'tall', 'square']],
];

let count = 0;
for (const [slug, palette, seed, ratios] of JOBS) {
  ratios.forEach((ratio, i) => {
    const name = `${slug}-${String(i + 1).padStart(2, '0')}.svg`;
    writeFileSync(resolve(outDir, name), makeSvg(seed + i * 17, palette, ratio, count + 1), 'utf8');
    count += 1;
  });
}

console.log(`generated ${count} artwork files in ${outDir}`);
