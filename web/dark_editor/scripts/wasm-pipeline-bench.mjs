#!/usr/bin/env node
// WASM image pipeline benchmark.
//
// Loads the real generated wasm-bindgen package (lib/wasm/pkg) in Node and
// measures:
//   1. the single-crossing wasm_apply_pipeline() vs the old 8 separate
//      wasm_apply_* calls (each one copies the image into WASM memory and
//      copies the result back), and
//   2. a per-filter cost breakdown, to know where CPU goes before deciding
//      whether SIMD or a geometry engine is worth it.
//
// Run: npm run bench:wasm
import { readFileSync } from 'node:fs';
import initWasm, {
  PipelineConfig,
  wasm_apply_pipeline,
  wasm_apply_blur,
  wasm_apply_sharpen,
  wasm_apply_pixelation,
  wasm_apply_hsl,
  wasm_apply_brightness_contrast,
  wasm_apply_vignette,
  wasm_apply_noise,
  wasm_apply_curves,
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
const NO_CURVES = new Uint8Array(0);

// Realistic "heavy edit" filter set, shared by both paths.
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

// Replicates the old worker: same filter order, one WASM crossing each.
function applySequential(data, w, h) {
  wasm_apply_pixelation(data, w, h, 2);
  wasm_apply_blur(data, w, h, 32);
  wasm_apply_sharpen(data, w, h, 50);
  wasm_apply_hsl(data, 10, 5, -5);
  wasm_apply_brightness_contrast(data, 8, 10);
  wasm_apply_vignette(data, w, h, 40, 50);
  wasm_apply_noise(data, 10, 42);
  wasm_apply_curves(data, CURVES, CURVES, CURVES);
}

function applyPipeline(data, w, h) {
  wasm_apply_pipeline(data, w, h, heavyConfig(), CURVES, CURVES, CURVES);
}

// Light set: only cheap filters, so the crossing cost is visible.
function applySequentialLight(data, w, h) {
  wasm_apply_hsl(data, 10, 5, -5);
  wasm_apply_brightness_contrast(data, 8, 10);
  wasm_apply_noise(data, 10, 42);
  wasm_apply_curves(data, CURVES, CURVES, CURVES);
}

function applyPipelineLight(data, w, h) {
  const c = new PipelineConfig();
  c.hue = 10;
  c.saturation = 5;
  c.lightness = -5;
  c.brightness = 8;
  c.contrast = 10;
  c.noise_intensity = 10;
  c.noise_seed = 42;
  wasm_apply_pipeline(data, w, h, c, CURVES, CURVES, CURVES);
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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

  // heavy set: pipeline vs 8 separate crossings
  {
    const pImg = makeImage(w, h);
    const sImg = makeImage(w, h);
    const pipelineMs = bench(() => applyPipeline(pImg, w, h));
    const sequentialMs = bench(() => applySequential(sImg, w, h));
    const same = sameBytes(pImg, sImg);
    console.log(`  heavy (blur32+all): pipeline ${fmt(pipelineMs)}  vs  8 calls ${fmt(sequentialMs)}  ->  ${(sequentialMs / pipelineMs).toFixed(2)}x  ${same ? 'identical output' : 'OUTPUT MISMATCH!'}`);
  }

  // light set: crossing cost dominates
  {
    const pImg = makeImage(w, h);
    const sImg = makeImage(w, h);
    const pipelineMs = bench(() => applyPipelineLight(pImg, w, h));
    const sequentialMs = bench(() => applySequentialLight(sImg, w, h));
    const same = sameBytes(pImg, sImg);
    console.log(`  light (hsl+bc+noise+curves): pipeline ${fmt(pipelineMs)}  vs  4 calls ${fmt(sequentialMs)}  ->  ${(sequentialMs / pipelineMs).toFixed(2)}x  ${same ? 'identical output' : 'OUTPUT MISMATCH!'}`);
  }

  // per-filter profile: each filter alone, run through the same pipeline
  // entry on a shared image (one crossing per run, so timings are directly
  // comparable). wasm_apply_pipeline consumes the PipelineConfig, so a fresh
  // one is built per call.
  if (w === 1920) {
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
    const img = makeImage(w, h);
    const rows = singles.map(([name, apply]) => [
      name,
      bench(() => {
        const cfg = new PipelineConfig();
        apply(cfg);
        wasm_apply_pipeline(img, w, h, cfg, CURVES, CURVES, CURVES);
      }),
    ]);
    const total = rows.reduce((acc, [, ms]) => acc + ms, 0);
    console.log(`  per-filter, each alone via pipeline (${w}x${h}, sum ${total.toFixed(1)} ms):`);
    for (const [name, ms] of rows) {
      console.log(`    ${name} ${fmt(ms)}  (${((ms / total) * 100).toFixed(1).padStart(5)}%)`);
    }
  }
}
