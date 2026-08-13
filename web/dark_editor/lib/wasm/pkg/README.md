# Velox editor filters

Rust implementation of the pixel filters used by the editor worker and layer
compositor. The JavaScript facade in `lib/wasm/wasm_filters.js` is kept stable
so callers do not depend on the generated `wasm-bindgen` module.

From `web/dark_editor`:

```bash
npm run wasm:build
```

The generated package in `lib/wasm/pkg` is runtime input for the frontend and
is intentionally tracked. Rust build directories remain ignored.
