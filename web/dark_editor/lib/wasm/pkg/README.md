# Velox editor filters

Rust implementation of the pixel filters used directly by the editor worker
and layer compositor. There is no JavaScript fallback: the generated
`wasm-bindgen` package is the runtime implementation.

The crate exposes two kinds of entry points:

- `wasm_apply_pipeline` (plus the individual `wasm_apply_*` filters): the
  single-image filter chain used by the editor worker.
- `wasm_blend_layers`: the two-image compositing primitive (blend modes +
  source-over alpha). It is kept outside the filter pipeline and is
  intentionally not wired into normal rendering — Konva/browser Canvas
  already composites layers. It becomes part of the rendering path only
  when custom raster compositing arrives (custom blend modes, alpha masks,
  LUTs, chroma key, ...).

From `web/dark_editor`:

```bash
npm run wasm:build
```

The generated package in `lib/wasm/pkg` is runtime input for the frontend and
is intentionally tracked. Rust build directories remain ignored.
