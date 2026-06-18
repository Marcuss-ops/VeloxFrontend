let initialized = false;

export default async function initWasm() {
  initialized = true;
  return { initialized: true };
}

const clamp = (value) => Math.max(0, Math.min(255, value));

function blendChannel(base, overlay, mode) {
  const b = base / 255;
  const o = overlay / 255;

  switch (mode) {
    case 1: // multiply
      return b * o;
    case 2: // screen
      return 1 - (1 - b) * (1 - o);
    case 3: // overlay
      return b < 0.5 ? 2 * b * o : 1 - 2 * (1 - b) * (1 - o);
    case 4: // darken
      return Math.min(b, o);
    case 5: // lighten
      return Math.max(b, o);
    case 6: // color-dodge
      return o >= 1 ? 1 : Math.min(1, b / (1 - o));
    case 7: // color-burn
      return o <= 0 ? 0 : 1 - Math.min(1, (1 - b) / o);
    case 8: // hard-light
      return o < 0.5 ? 2 * b * o : 1 - 2 * (1 - b) * (1 - o);
    case 9: // soft-light
      return (1 - 2 * o) * b * b + 2 * o * b;
    case 10: // difference
      return Math.abs(b - o);
    case 11: // exclusion
      return b + o - 2 * b * o;
    case 0: // normal
    default:
      return o;
  }
}

export function wasm_blend_layers(baseBuffer, overlayBuffer, width, height, blendModeIndex = 0) {
  if (!baseBuffer || !overlayBuffer || width <= 0 || height <= 0) {
    return;
  }

  for (let i = 0; i < width * height * 4; i += 4) {
    const baseA = baseBuffer[i + 3] / 255;
    const overA = overlayBuffer[i + 3] / 255;
    const outA = overA + baseA * (1 - overA);

    if (outA <= 0) {
      baseBuffer[i] = 0;
      baseBuffer[i + 1] = 0;
      baseBuffer[i + 2] = 0;
      baseBuffer[i + 3] = 0;
      continue;
    }

    const r = blendChannel(baseBuffer[i], overlayBuffer[i], blendModeIndex);
    const g = blendChannel(baseBuffer[i + 1], overlayBuffer[i + 1], blendModeIndex);
    const b = blendChannel(baseBuffer[i + 2], overlayBuffer[i + 2], blendModeIndex);

    const srcWeight = overA;
    const dstWeight = baseA * (1 - overA);
    const denom = outA || 1;

    baseBuffer[i] = clamp(((r * srcWeight) + (baseBuffer[i] / 255) * dstWeight) / denom * 255);
    baseBuffer[i + 1] = clamp(((g * srcWeight) + (baseBuffer[i + 1] / 255) * dstWeight) / denom * 255);
    baseBuffer[i + 2] = clamp(((b * srcWeight) + (baseBuffer[i + 2] / 255) * dstWeight) / denom * 255);
    baseBuffer[i + 3] = clamp(outA * 255);
  }
}

export function wasm_apply_brightness_contrast(data, brightness, contrast) {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c] + brightness;
      val = factor * (val - 128) + 128;
      data[i + c] = clamp(val);
    }
  }
}

export function wasm_apply_hsl(data, h, s, l) {
  const hShift = h / 360;
  const sMult = 1 + s / 100;
  const lShift = l / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i+1] / 255;
    let b = data[i+2] / 255;
    
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hVal = 0, sVal = 0, lVal = (max + min) / 2;

    if (max !== min) {
      let d = max - min;
      sVal = lVal > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hVal = (g - b) / d + (g < b ? 6 : 0); break;
        case g: hVal = (b - r) / d + 2; break;
        case b: hVal = (r - g) / d + 4; break;
      }
      hVal /= 6;
    }

    hVal = (hVal + hShift) % 1.0;
    if (hVal < 0) hVal += 1.0;
    
    if (sMult >= 1) {
      sVal = sVal + (1 - sVal) * (sMult - 1);
    } else {
      sVal = sVal * sMult;
    }
    sVal = Math.max(0, Math.min(1, sVal));
    
    if (lShift > 0) {
      lVal = lVal + (1 - lVal) * lShift;
    } else {
      lVal = lVal * (1 + lShift);
    }
    lVal = Math.max(0, Math.min(1, lVal));

    let rOut, gOut, bOut;
    if (sVal === 0) {
      rOut = gOut = bOut = lVal;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      let q = lVal < 0.5 ? lVal * (1 + sVal) : lVal + sVal - lVal * sVal;
      let p = 2 * lVal - q;
      rOut = hue2rgb(p, q, hVal + 1/3);
      gOut = hue2rgb(p, q, hVal);
      bOut = hue2rgb(p, q, hVal - 1/3);
    }

    data[i] = clamp(rOut * 255);
    data[i+1] = clamp(gOut * 255);
    data[i+2] = clamp(bOut * 255);
  }
}

export function wasm_apply_pixelation(data, width, height, size) {
  if (size <= 1) return;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const rIdx = (y * width + x) * 4;
      if (rIdx >= data.length) continue;
      const r = data[rIdx];
      const g = data[rIdx + 1];
      const b = data[rIdx + 2];
      const a = data[rIdx + 3];
      
      for (let py = 0; py < size && y + py < height; py++) {
        for (let px = 0; px < size && x + px < width; px++) {
          const idx = ((y + py) * width + (x + px)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }
  }
}

export function wasm_apply_blur(data, width, height, radius) {
  const temp = new Uint8Array(data.length);
  const r = Math.floor(radius);
  if (r <= 0) return;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const px = x + dx;
        if (px >= 0 && px < width) {
          const idx = (y * width + px) * 4;
          rSum += data[idx];
          gSum += data[idx+1];
          bSum += data[idx+2];
          aSum += data[idx+3];
          count++;
        }
      }
      const outIdx = (y * width + x) * 4;
      temp[outIdx] = rSum / count;
      temp[outIdx+1] = gSum / count;
      temp[outIdx+2] = bSum / count;
      temp[outIdx+3] = aSum / count;
    }
  }
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const py = y + dy;
        if (py >= 0 && py < height) {
          const idx = (py * width + x) * 4;
          rSum += temp[idx];
          gSum += temp[idx+1];
          bSum += temp[idx+2];
          aSum += temp[idx+3];
          count++;
        }
      }
      const outIdx = (y * width + x) * 4;
      data[outIdx] = rSum / count;
      data[outIdx+1] = gSum / count;
      data[outIdx+2] = bSum / count;
      data[outIdx+3] = aSum / count;
    }
  }
}

export function wasm_apply_sharpen(data, width, height, amount) {
  const temp = new Uint8Array(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val = temp[idx + c];
        const up = temp[((y - 1) * width + x) * 4 + c];
        const down = temp[((y + 1) * width + x) * 4 + c];
        const left = temp[(y * width + x - 1) * 4 + c];
        const right = temp[(y * width + x + 1) * 4 + c];
        const lap = val * 5 - (up + down + left + right);
        data[idx + c] = clamp(val + (lap - val) * amount);
      }
    }
  }
}

export function wasm_apply_vignette(data, width, height, radius, softness) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const rLimit = (radius / 100) * maxDist;
  const softFactor = (softness / 100);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > rLimit * (1 - softFactor)) {
        const factor = 1 - Math.min(1, (dist - rLimit * (1 - softFactor)) / (rLimit * softFactor || 1));
        const idx = (y * width + x) * 4;
        data[idx] = clamp(data[idx] * factor);
        data[idx+1] = clamp(data[idx+1] * factor);
        data[idx+2] = clamp(data[idx+2] * factor);
      }
    }
  }
}

export function wasm_apply_noise(data, intensity, seed) {
  let s = seed || 1;
  const random = () => {
    let x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
  
  const factor = intensity / 100 * 255;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * factor;
    data[i] = clamp(data[i] + noise);
    data[i+1] = clamp(data[i+1] + noise);
    data[i+2] = clamp(data[i+2] + noise);
  }
}

export function wasm_apply_curves(data, curveR, curveG, curveB) {
  for (let i = 0; i < data.length; i += 4) {
    if (curveR) data[i] = curveR[data[i]];
    if (curveG) data[i+1] = curveG[data[i+1]];
    if (curveB) data[i+2] = curveB[data[i+2]];
  }
}

export class GpuFilterContext {
  static async create() {
    throw new Error("WebGPU fallback to CPU");
  }
}

export const __wasmFiltersInitialized = () => initialized;
