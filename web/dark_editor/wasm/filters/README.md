# Velox editor filters

Rust implementation of the pixel filters used directly by the editor worker
and layer compositor. There is no JavaScript fallback: the generated
`wasm-bindgen` package is the runtime implementation.

From `web/dark_editor`:

```bash
npm run wasm:build
```

The generated package in `lib/wasm/pkg` is runtime input for the frontend and
is intentionally tracked. Rust build directories remain ignored.
