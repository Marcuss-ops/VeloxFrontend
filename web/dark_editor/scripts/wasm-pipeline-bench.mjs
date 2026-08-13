#!/usr/bin/env node
// WASM image pipeline benchmark.
//
// Loads the real generated wasm-bindgen package (lib/wasm/pkg) in Node and
// measures:
//   1. the single-crossing apply_pipeline() on several image sizes, and
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

// Deterministic pseudo-random RGBA image (xorshift32).
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

const sizes = [
  { w: 1280, h: 720 },
  { w: 1920, h: 1080 },
  { w: 3840, h: 2160 },
];

console.log('WASM image pipeline benchmark (real wasm-bindgen wrappers, Node)');
console.log('='.repeat(72));

for (const { w, h } of sizes) {
  const mb = ((w * h * 4) / 1024 / 1024).toFixed(1);
  console.log(`\nimage ${w}x${h} (${mb} MB RGBA)`);

  {
    const img = makeImage(w, h);
    const ms = bench(() => apply_pipeline(img, w, h, heavyConfig(), CURVES, CURVES, CURVES));
    console.log(`  heavy (blur32+all): ${fmt(ms)}`);
  }
  {
    const img = makeImage(w, h);
    const ms = bench(() => apply_pipeline(img, w, h, lightConfig(), CURVES, CURVES, CURVES));
    console.log(`  light (hsl+bc+noise+curves): ${fmt(ms)}`);
  }
}

// per-filter profile: each filter alone, run through the same pipeline entry
// on a shared image (one crossing per run, so timings are directly
// comparable). apply_pipeline consumes the PipelineConfig, so a fresh one is
// built per call.
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
const img = makeImage(PW, PH);
const rows = singles.map(([name, apply]) => [
  name,
  bench(() => {
    const cfg = new PipelineConfig();
    apply(cfg);
    apply_pipeline(img, PW, PH, cfg, CURVES, CURVES, CURVES);
  }),
]);
const total = rows.reduce((acc, [, ms]) => acc + ms, 0);
console.log(`\nper-filter, each alone via pipeline (${PW}x${PH}, sum ${total.toFixed(1)} ms):`);
for (const [name, ms] of rows) {
  console.log(`  ${name} ${fmt(ms)}  (${((ms / total) * 100).toFixed(1).padStart(5)}%)`);
}
