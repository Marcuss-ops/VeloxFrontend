# Velox editor image core

Rust implementation of the pixel filters used directly by the editor worker
and layer compositor. There is no JavaScript fallback: the generated
`wasm-bindgen` package is the runtime implementation.

The crate exposes exactly three public WASM entry points (everything else is
internal):

- `apply_pipeline(data, width, height, config, curve_r, curve_g, curve_b)`:
  the single-image filter chain (pixelation, blur, sharpen, HSL,
  brightness/contrast, vignette, noise, curves). The worker sends the image
  into WASM once and every enabled filter runs in one crossing.
- `blend_layers(base, overlay, width, height, mode)`: the two-image
  compositing primitive (blend modes + source-over alpha). It is kept outside
  the filter pipeline and is intentionally not wired into normal rendering —
  Konva/browser Canvas already composites layers. It becomes part of the
  rendering path only when custom raster compositing arrives (custom blend
  modes, alpha masks, LUTs, chroma key, ...).
- `process_mask(data, mask, width, height, feather)`: apply an (optionally
  feathered) alpha mask to an image.

Layout:

```text
src/
├── lib.rs       # the 3 public entry points, PipelineConfig, scratch buffers
├── pipeline.rs  # apply_pipeline orchestration
├── blur.rs      # sliding-window box blur (O(w*h), radius-independent)
├── sharpen.rs   # 3x3 Laplacian unsharp mask
├── color.rs     # HSL, brightness/contrast, vignette
├── curves.rs    # per-channel LUT remap
├── noise.rs     # xorshift32 grain (splitmix32-seeded)
├── pixelate.rs  # block pixelation
├── blend.rs     # blend modes + source-over alpha
├── mask.rs      # alpha mask + feathering
└── simd.rs      # simd128 blur/sharpen/noise (pipeline) + hsl (not yet wired)
```

## Profiling notes

Measured with the real wasm-bindgen package in Node (`npm run bench:wasm`),
1920×1080 RGBA.

**Content-independence.** Every filter in the heavy path (pixelation, blur,
sharpen, brightness/contrast, vignette, noise, curves) is content-independent:
it runs integer/linear arithmetic with no data-dependent branches, so its cost
is the same on full-entropy white noise and on smooth photo-like content. The
single exception is HSL.

**HSL is branch-heavy.** HSL has data-dependent branches — `max == r/g/b`,
`d != 0`, and the four-way `hue_to_rgb` switch. On white noise those branches
mispredict, so the HSL-dominated "light" workload runs ~30% slower on noise
than on photo-like content, and the hsl stage alone is ~50% slower on noise.
The SIMD evaluation (4 pixels per f32x4 lane, branchless mask-select) removes
that misprediction: its speedup over the scalar reference is ~2.3–2.8x on
noise but only ~1.6x on photos, where the scalar branch predictor already
does well and the remaining cost is dominated by f32 divisions.

From `web/dark_editor`:

```bash
npm run wasm:build
```

The generated package in `lib/wasm/pkg` is runtime input for the frontend and
is intentionally tracked. Rust build directories remain ignored.
