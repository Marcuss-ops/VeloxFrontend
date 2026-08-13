/* @ts-self-types="./wasm_filters.d.ts" */

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
export function wasm_apply_blur(data, width, height, radius) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_blur(ptr0, len0, data, width, height, radius);
}

/**
 * @param {Uint8Array} data
 * @param {number} brightness
 * @param {number} contrast
 */
export function wasm_apply_brightness_contrast(data, brightness, contrast) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_brightness_contrast(ptr0, len0, data, brightness, contrast);
}

/**
 * @param {Uint8Array} data
 * @param {Uint8Array} curve_r
 * @param {Uint8Array} curve_g
 * @param {Uint8Array} curve_b
 */
export function wasm_apply_curves(data, curve_r, curve_g, curve_b) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(curve_r, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(curve_g, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(curve_b, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    wasm.wasm_apply_curves(ptr0, len0, data, ptr1, len1, ptr2, len2, ptr3, len3);
}

/**
 * @param {Uint8Array} data
 * @param {number} hue
 * @param {number} saturation
 * @param {number} lightness
 */
export function wasm_apply_hsl(data, hue, saturation, lightness) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_hsl(ptr0, len0, data, hue, saturation, lightness);
}

/**
 * @param {Uint8Array} data
 * @param {number} intensity
 * @param {number} seed
 */
export function wasm_apply_noise(data, intensity, seed) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_noise(ptr0, len0, data, intensity, seed);
}

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @param {number} size
 */
export function wasm_apply_pixelation(data, width, height, size) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_pixelation(ptr0, len0, data, width, height, size);
}

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @param {number} amount
 */
export function wasm_apply_sharpen(data, width, height, amount) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_sharpen(ptr0, len0, data, width, height, amount);
}

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {number} softness
 */
export function wasm_apply_vignette(data, width, height, radius, softness) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.wasm_apply_vignette(ptr0, len0, data, width, height, radius, softness);
}

/**
 * @param {Uint8Array} base
 * @param {Uint8Array} overlay
 * @param {number} width
 * @param {number} height
 * @param {number} mode
 */
export function wasm_blend_layers(base, overlay, width, height, mode) {
    var ptr0 = passArray8ToWasm0(base, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(overlay, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.wasm_blend_layers(ptr0, len0, base, ptr1, len1, width, height, mode);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_c7f28e53671b41e8: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./wasm_filters_bg.js": import0,
    };
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('wasm_filters_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
