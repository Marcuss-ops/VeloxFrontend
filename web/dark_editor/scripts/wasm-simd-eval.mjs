#!/usr/bin/env node
// SIMD (simd128) evaluation: compare each SIMD filter against its scalar
// reference byte-for-byte and time both in the real WASM runtime.
//
// Run: node scripts/wasm-simd-eval.mjs
import { readFileSync } from 'node:fs';
import initWasm, {
  wasm_apply_blur,
  wasm_blur_simd,
  wasm_apply_sharpen,
  wasm_sharpen_simd,
  wasm_apply_noise,
  wasm_noise_simd,
} from '../lib/wasm/pkg/wasm_filters.js';

const wasmBytes = readFileSync(new URL('../lib/wasm/pkg/wasm_filters_bg.wasm', import.meta.url));
await initWasm({ module_or_path: wasmBytes });

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

function diffStats(a, b) {
  let max = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > 0) count++;
    if (d > max) max = d;
  }
  return { max, count, total: a.length };
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

const W = 1920;
const H = 1080;

const cases = [
  {
    name: 'blur r=32   ',
    scalar: (d) => wasm_apply_blur(d, W, H, 32),
    simd: (d) => wasm_blur_simd(d, W, H, 32),
    fresh: () => makeImage(W, H, 11),
  },
  {
    name: 'sharpen 0.5 ',
    scalar: (d) => wasm_apply_sharpen(d, W, H, 0.5),
    simd: (d) => wasm_sharpen_simd(d, W, H, 0.5),
    fresh: () => makeImage(W, H, 22),
  },
  {
    name: 'sharpen 0.37',
    scalar: (d) => wasm_apply_sharpen(d, W, H, 0.37),
    simd: (d) => wasm_sharpen_simd(d, W, H, 0.37),
    fresh: () => makeImage(W, H, 23),
  },
  {
    name: 'noise 10    ',
    scalar: (d) => wasm_apply_noise(d, 10, 42),
    simd: (d) => wasm_noise_simd(d, 10, 42),
    fresh: () => makeImage(W, H, 33),
  },
];

console.log('SIMD (simd128) evaluation — real WASM runtime, 1920x1080');
console.log('='.repeat(72));

for (const c of cases) {
  // correctness: identical fresh inputs through both paths
  const sImg = c.fresh();
  const vImg = c.fresh();
  c.scalar(sImg);
  c.simd(vImg);
  const diff = diffStats(sImg, vImg);
  const identical = diff.count === 0;

  // benchmark on a reusable buffer
  const sBuf = c.fresh();
  const vBuf = c.fresh();
  const tScalar = bench(() => c.scalar(sBuf));
  const tSimd = bench(() => c.simd(vBuf));

  const dev = identical
    ? 'byte-identical'
    : `max +${diff.max} LSB on ${diff.count}/${diff.total} bytes (${((diff.count / diff.total) * 100).toFixed(3)}%)`;
  console.log(
    `${c.name}  scalar ${tScalar.toFixed(1).padStart(7)} ms   simd ${tSimd.toFixed(1).padStart(7)} ms   ${(tScalar / tSimd).toFixed(2)}x   ${dev}`
  );
}
