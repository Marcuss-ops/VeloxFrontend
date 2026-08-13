#!/usr/bin/env node
// WASM image pipeline benchmark.
//
// Loads the real generated wasm-bindgen package (lib/wasm/pkg) in Node and
// measures:
//   1. the single-crossing apply_pipeline() on several image sizes, on two
//      kinds of content — a white-noise pattern and a photo-like image — to
//      confirm the pipeline cost is content-independent, and
//   2. a per-filter cost breakdown (each filter alone through the same
//      pipeline entry), to know where CPU goes before deciding whether SIMD
//      or a geometry engine is worth it.
//
// Run: npm run bench:wasm
import { readFileSync } from 'node:fs';
import initWasm, {
  PipelineConfig,
  apply_pipeline,
} from '../lib/wasm/pkg/wasm_filters.js';

const wasmBytes = readFileSync(new URL('../lib/wasm/pkg/wasm_filters_bg.wasm', import.meta.url));
await initWasm({ module_or_path: wasmBytes });

// Deterministic pseudo-random RGBA image (xorshift32): full-entropy white
// noise — the worst case for any content-dependent path, and the baseline
// used by earlier measurements.
function makeImage(w, h, seed = 0x5eedeed) {
  const data = new Uint8Array(w * h * 4);
  let s = seed >>> 0;
  for (let i = 0; i < data.length; i++) {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    data[i] = (s >>> 8) & 0xff;
  }
  return data;
}

const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;

// Photo-like image: smooth, low-frequency content (sky-to-ground gradient +
// sinusoidal color bands + a few soft radial features + light texture).
// Adjacent pixels are strongly correlated — unlike the white-noise pattern
// above — so it approximates the spectral profile of a real photograph
// (energy concentrated at low frequencies) for a content-sensitivity check.
function makePhotoLikeImage(w, h, seed = 0x1a2b3c4d) {
  const data = new Uint8Array(w * h * 4);
  let s = seed >>> 0;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 8) / 256;
  };
  const minDim = Math.min(w, h);
  const spots = [];
  for (let i = 0; i < 5; i++) {
    spots.push({
      cx: rand() * w,
      cy: rand() * h,
      r: (0.12 + rand() * 0.3) * minDim,
      cr: rand() * 2 - 1,
      cg: rand() * 2 - 1,
      cb: rand() * 2 - 1,
    });
  }
  const TAU = Math.PI * 2;
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const i = (y * w + x) * 4;
      let r = 45 + 175 * ny;
      let g = 70 + 150 * ny;
      let b = 120 + 90 * ny;
      r += 28 * Math.sin(nx * TAU + 0.5);
      g += 26 * Math.sin(ny * TAU + 1.2);
      b += 24 * Math.sin((nx + ny) * TAU + 2.0);
      for (const sp of spots) {
        const dx = (x - sp.cx) / sp.r;
        const dy = (y - sp.cy) / sp.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          const f = (1 - d2) * 130;
          r += f * sp.cr;
          g += f * sp.cg;
          b += f * sp.cb;
        }
      }
      const tex = (Math.sin(x * 0.6) + Math.sin(y * 0.8)) * 3;
      data[i] = clampByte(r + tex);
      data[i + 1] = clampByte(g + tex);
      data[i + 2] = clampByte(b + tex);
      data[i + 3] = 255;
    }
  }
  return data;
}

function identityPlus(delta) {
  const c = new Uint8Array(256);
  for (let i = 0; i < 256; i++) c[i] = Math.min(255, i + delta);
  return c;
}

function median(samples) {
  const a = [...samples].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

function bench(fn, runs = 7) {
  fn(); // warmup
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  return median(samples);
}

function fmt(ms) {
  return `${ms.toFixed(1).padStart(8)} ms`;
}

const CURVES = identityPlus(10);

// Realistic "heavy edit" filter set.
function heavyConfig() {
  const c = new PipelineConfig();
  c.pixelation = 2;
  c.blur = 32;
  c.sharpen = 50;
  c.hue = 10;
  c.saturation = 5;
  c.lightness = -5;
  c.brightness = 8;
  c.contrast = 10;
  c.vignette_radius = 40;
  c.vignette_softness = 50;
  c.noise_intensity = 10;
  c.noise_seed = 42;
  return c;
}

function lightConfig() {
  const c = new PipelineConfig();
  c.hue = 10;
  c.saturation = 5;
  c.lightness = -5;
  c.brightness = 8;
  c.contrast = 10;
  c.noise_intensity = 10;
  c.noise_seed = 42;
  return c;
}

// Run the same workload on both kinds of content so the two numbers sit
// side-by-side. apply_pipeline mutates the buffer in place, so each run gets
// a fresh copy of the pristine image.
function benchBoth(baseNoise, basePhoto, w, h, label, configFn) {
  const tNoise = bench(() => apply_pipeline(baseNoise, w, h, configFn(), CURVES, CURVES, CURVES));
  const tPhoto = bench(() => apply_pipeline(basePhoto, w, h, configFn(), CURVES, CURVES, CURVES));
  console.log(`  ${label}: noise ${fmt(tNoise)}   |   photo ${fmt(tPhoto)}`);
  return { tNoise, tPhoto };
}

const sizes = [
  { w: 1280, h: 720 },
  { w: 1920, h: 1080 },
  { w: 3840, h: 2160 },
];

console.log('WASM image pipeline benchmark (real wasm-bindgen wrappers, Node)');
console.log('='.repeat(76));

for (const { w, h } of sizes) {
  const mb = ((w * h * 4) / 1024 / 1024).toFixed(1);
  const noiseBase = makeImage(w, h);
  const photoBase = makePhotoLikeImage(w, h);
  console.log(`\nimage ${w}x${h} (${mb} MB RGBA)`);

  benchBoth(noiseBase.slice(), photoBase.slice(), w, h, 'heavy (blur32+all)          ', heavyConfig);
  benchBoth(noiseBase.slice(), photoBase.slice(), w, h, 'light (hsl+bc+noise+curves)', lightConfig);
}

// per-filter profile: each filter alone, run through the same pipeline entry
// on a fresh copy of the pristine image (one crossing per run, so timings are
// directly comparable). apply_pipeline consumes the PipelineConfig, so a fresh
// one is built per call.
const PW = 1920;
const PH = 1080;
const singles = [
  ['pixelation 2 ', (c) => { c.pixelation = 2; }],
  ['blur 32      ', (c) => { c.blur = 32; }],
  ['sharpen 50   ', (c) => { c.sharpen = 50; }],
  ['hsl          ', (c) => { c.hue = 10; c.saturation = 5; c.lightness = -5; }],
  ['bright/contr ', (c) => { c.brightness = 8; c.contrast = 10; }],
  ['vignette     ', (c) => { c.vignette_radius = 40; c.vignette_softness = 50; }],
  ['noise        ', (c) => { c.noise_intensity = 10; c.noise_seed = 42; }],
  ['curves       ', (c) => {}],
];
const noiseBase = makeImage(PW, PH);
const photoBase = makePhotoLikeImage(PW, PH);
const rows = singles.map(([name, apply]) => [
  name,
  bench(() => {
    const cfg = new PipelineConfig();
    apply(cfg);
    apply_pipeline(noiseBase.slice(), PW, PH, cfg, CURVES, CURVES, CURVES);
  }),
  bench(() => {
    const cfg = new PipelineConfig();
    apply(cfg);
    apply_pipeline(photoBase.slice(), PW, PH, cfg, CURVES, CURVES, CURVES);
  }),
]);
const totalNoise = rows.reduce((acc, [, ms]) => acc + ms, 0);
const totalPhoto = rows.reduce((acc, [, , ms]) => acc + ms, 0);
console.log(`\nper-filter, each alone via pipeline (${PW}x${PH}, pristine image per run):`);
console.log(`  filter            noise        |   photo`);
for (const [name, tNoise, tPhoto] of rows) {
  console.log(`  ${name}   ${fmt(tNoise)}   |   ${fmt(tPhoto)}`);
}
console.log(`  sum               ${fmt(totalNoise)}   |   ${fmt(totalPhoto)}`);
