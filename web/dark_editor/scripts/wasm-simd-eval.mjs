#!/usr/bin/env node
// Scalar (f64) vs SIMD (f32/simd128) HSL evaluation.
//
// Loads the real wasm-bindgen package and, for each HSL parameter set, runs
// the scalar reference and the SIMD variant on identical pristine images,
// then reports:
//   - byte-identity: how many of the ~8.3M bytes differ and by how much, and
//   - timing: median of N runs, plus the speedup.
//
// Run: node scripts/wasm-simd-eval.mjs
import { readFileSync } from 'node:fs';
import initWasm, {
  wasm_hsl_scalar,
  wasm_hsl_simd,
} from '../lib/wasm/pkg/wasm_filters.js';

const wasmBytes = readFileSync(new URL('../lib/wasm/pkg/wasm_filters_bg.wasm', import.meta.url));
await initWasm({ module_or_path: wasmBytes });

// Deterministic pseudo-random RGBA image (xorshift32): full-entropy white
// noise — worst case for the content-dependent HSL branches.
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

// Photo-like image (same generator as the pipeline benchmark): low-frequency,
// strongly correlated content — the realistic case for branch prediction.
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

function median(samples) {
  const a = [...samples].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

function bench(fn, runs = 9) {
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

// Count and characterize the byte differences between two RGBA buffers.
function diffBytes(a, b) {
  let count = 0;
  let maxDiff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      count++;
      maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]));
    }
  }
  return { count, maxDiff, total: a.length };
}

const W = 1920;
const H = 1080;
const noiseBase = makeImage(W, H);
const photoBase = makePhotoLikeImage(W, H);

const configs = [
  ['hue10 sat5 light-5   ', 10, 5, -5],   // the "light" pipeline HSL
  ['hue90 sat50 light20  ', 90, 50, 20],  // large hue rotation + strong sat/light
  ['hue-30 sat-40 light-20', -30, -40, -20], // negative path (sm<1, ls<0)
  ['hue360 sat0 light0   ', 360, 0, 0],   // full-circle hue, sat/light off
];

console.log('HSL scalar (f64) vs SIMD (f32/simd128) — real wasm-bindgen wrappers, Node');
console.log('='.repeat(88));

for (const [label, hue, sat, light] of configs) {
  for (const [content, base] of [['noise ', noiseBase], ['photo ', photoBase]]) {
    // identity
    const a = base.slice();
    const b = base.slice();
    wasm_hsl_scalar(a, hue, sat, light);
    wasm_hsl_simd(b, hue, sat, light);
    const d = diffBytes(a, b);
    const pct = ((d.count / d.total) * 100).toFixed(4);
    // timing
    const tScalar = bench(() => wasm_hsl_scalar(base.slice(), hue, sat, light));
    const tSimd = bench(() => wasm_hsl_simd(base.slice(), hue, sat, light));
    const speedup = (tScalar / tSimd).toFixed(2);
    console.log(
      `${label} ${content}: scalar ${fmt(tScalar)}  simd ${fmt(tSimd)}  ${speedup}x  |  ` +
      `diff ${d.count} bytes (${pct}%), max ${d.maxDiff} LSB`
    );
  }
  console.log('');
}
