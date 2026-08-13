use wasm_bindgen::prelude::*;

#[inline]
fn clamp(value: f64) -> u8 {
    // Uint8Array assignment in the previous JS implementation truncates
    // positive fractional values; keep that observable behavior.
    value.trunc().clamp(0.0, 255.0) as u8
}

#[inline]
fn blend_channel(base: f64, overlay: f64, mode: u32) -> f64 {
    let b = base / 255.0;
    let o = overlay / 255.0;
    match mode {
        1 => b * o,
        2 => 1.0 - (1.0 - b) * (1.0 - o),
        3 => if b < 0.5 { 2.0 * b * o } else { 1.0 - 2.0 * (1.0 - b) * (1.0 - o) },
        4 => b.min(o),
        5 => b.max(o),
        6 => if o >= 1.0 { 1.0 } else { (b / (1.0 - o)).min(1.0) },
        7 => if o <= 0.0 { 0.0 } else { 1.0 - ((1.0 - b) / o).min(1.0) },
        8 => if o < 0.5 { 2.0 * b * o } else { 1.0 - 2.0 * (1.0 - b) * (1.0 - o) },
        9 => (1.0 - 2.0 * o) * b * b + 2.0 * o * b,
        10 => (b - o).abs(),
        11 => b + o - 2.0 * b * o,
        _ => o,
    }
}

#[wasm_bindgen]
pub fn wasm_blend_layers(base: &mut [u8], overlay: &[u8], width: u32, height: u32, mode: u32) {
    if width == 0 || height == 0 { return; }
    let count = (width as usize).saturating_mul(height as usize).saturating_mul(4);
    let count = count.min(base.len()).min(overlay.len());
    for i in (0..count).step_by(4) {
        let base_a = base[i + 3] as f64 / 255.0;
        let over_a = overlay[i + 3] as f64 / 255.0;
        let out_a = over_a + base_a * (1.0 - over_a);
        if out_a <= 0.0 {
            base[i..i + 4].fill(0);
            continue;
        }
        let src_weight = over_a;
        let dst_weight = base_a * (1.0 - over_a);
        let old = [base[i], base[i + 1], base[i + 2]];
        for c in 0..3 {
            let blended = blend_channel(old[c] as f64, overlay[i + c] as f64, mode);
            base[i + c] = clamp(((blended * src_weight) + (old[c] as f64 / 255.0) * dst_weight) / out_a * 255.0);
        }
        base[i + 3] = clamp(out_a * 255.0);
    }
}

#[wasm_bindgen]
pub fn wasm_apply_brightness_contrast(data: &mut [u8], brightness: f64, contrast: f64) {
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    for px in data.chunks_exact_mut(4) {
        for channel in px.iter_mut().take(3) {
            *channel = clamp(factor * (*channel as f64 + brightness - 128.0) + 128.0);
        }
    }
}

#[inline]
fn hue_to_rgb(p: f64, q: f64, mut t: f64) -> f64 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { p + (q - p) * 6.0 * t }
    else if t < 0.5 { q }
    else if t < 2.0 / 3.0 { p + (q - p) * (2.0 / 3.0 - t) * 6.0 }
    else { p }
}

#[wasm_bindgen]
pub fn wasm_apply_hsl(data: &mut [u8], hue: f64, saturation: f64, lightness: f64) {
    for px in data.chunks_exact_mut(4) {
        let (r, g, b) = (px[0] as f64 / 255.0, px[1] as f64 / 255.0, px[2] as f64 / 255.0);
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let mut h = 0.0;
        let mut s = 0.0;
        let mut l = (max + min) / 2.0;
        let d = max - min;
        if d != 0.0 {
            s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
            h = if max == r { (g - b) / d + if g < b { 6.0 } else { 0.0 } }
                else if max == g { (b - r) / d + 2.0 }
                else { (r - g) / d + 4.0 };
            h /= 6.0;
        }
        h = (h + hue / 360.0).rem_euclid(1.0);
        let sm = 1.0 + saturation / 100.0;
        s = if sm >= 1.0 { s + (1.0 - s) * (sm - 1.0) } else { s * sm }.clamp(0.0, 1.0);
        let ls = lightness / 100.0;
        l = if ls > 0.0 { l + (1.0 - l) * ls } else { l * (1.0 + ls) }.clamp(0.0, 1.0);
        let (nr, ng, nb) = if s == 0.0 { (l, l, l) } else {
            let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
            let p = 2.0 * l - q;
            (hue_to_rgb(p, q, h + 1.0 / 3.0), hue_to_rgb(p, q, h), hue_to_rgb(p, q, h - 1.0 / 3.0))
        };
        px[0] = clamp(nr * 255.0); px[1] = clamp(ng * 255.0); px[2] = clamp(nb * 255.0);
    }
}

#[wasm_bindgen]
pub fn wasm_apply_pixelation(data: &mut [u8], width: u32, height: u32, size: u32) {
    if size <= 1 || width == 0 || height == 0 { return; }
    let w = width as usize; let h = height as usize; let size = size as usize;
    for y in (0..h).step_by(size) {
        for x in (0..w).step_by(size) {
            let source = (y * w + x) * 4;
            if source + 3 >= data.len() { continue; }
            let pixel = [data[source], data[source + 1], data[source + 2], data[source + 3]];
            for py in y..(y + size).min(h) {
                for px in x..(x + size).min(w) {
                    let i = (py * w + px) * 4;
                    if i + 3 < data.len() { data[i..i + 4].copy_from_slice(&pixel); }
                }
            }
        }
    }
}

#[wasm_bindgen]
pub fn wasm_apply_blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
    let w = width as usize; let h = height as usize; let r = radius as usize;
    if r == 0 || w == 0 || h == 0 { return; }
    let mut temp = vec![0u8; data.len()];
    for y in 0..h { for x in 0..w {
        let mut sums = [0u32; 4]; let mut count = 0u32;
        for dx in x.saturating_sub(r)..=(x + r).min(w - 1) { let i = (y * w + dx) * 4; if i + 3 < data.len() { for c in 0..4 { sums[c] += data[i+c] as u32; } count += 1; } }
        let i = (y * w + x) * 4; if i + 3 < temp.len() { for c in 0..4 { temp[i+c] = (sums[c] / count) as u8; } }
    }}
    for x in 0..w { for y in 0..h {
        let mut sums = [0u32; 4]; let mut count = 0u32;
        for dy in y.saturating_sub(r)..=(y + r).min(h - 1) { let i = (dy * w + x) * 4; if i + 3 < temp.len() { for c in 0..4 { sums[c] += temp[i+c] as u32; } count += 1; } }
        let i = (y * w + x) * 4; if i + 3 < data.len() { for c in 0..4 { data[i+c] = (sums[c] / count) as u8; } }
    }}
}

#[wasm_bindgen]
pub fn wasm_apply_sharpen(data: &mut [u8], width: u32, height: u32, amount: f64) {
    let w = width as usize; let h = height as usize; let temp = data.to_vec();
    if w < 3 || h < 3 { return; }
    for y in 1..h-1 { for x in 1..w-1 { let i = (y*w+x)*4;
        for c in 0..3 { let val=temp[i+c] as f64; let up=temp[((y-1)*w+x)*4+c] as f64; let down=temp[((y+1)*w+x)*4+c] as f64; let left=temp[(y*w+x-1)*4+c] as f64; let right=temp[(y*w+x+1)*4+c] as f64; let lap=val*5.0-(up+down+left+right); data[i+c]=clamp(val+(lap-val)*amount); }
    }}
}

#[wasm_bindgen]
pub fn wasm_apply_vignette(data: &mut [u8], width: u32, height: u32, radius: f64, softness: f64) {
    let w=width as usize; let h=height as usize; let cx=width as f64/2.0; let cy=height as f64/2.0; let max_dist=(cx*cx+cy*cy).sqrt(); let limit=radius/100.0*max_dist; let soft=softness/100.0;
    for y in 0..h { for x in 0..w { let dx=x as f64-cx; let dy=y as f64-cy; let dist=(dx*dx+dy*dy).sqrt(); if dist > limit*(1.0-soft) { let factor=1.0-((dist-limit*(1.0-soft))/(limit*soft).max(1.0)).min(1.0); let i=(y*w+x)*4; if i+2<data.len() { for c in 0..3 { data[i+c]=clamp(data[i+c] as f64*factor); } } } }}
}

#[wasm_bindgen]
pub fn wasm_apply_noise(data: &mut [u8], intensity: f64, seed: f64) {
    let mut s=if seed == 0.0 { 1.0 } else { seed }; let factor=intensity/100.0*255.0;
    for px in data.chunks_exact_mut(4) { s += 1.0; let x=s.sin()*10000.0; let random=x-x.floor(); let noise=(random-0.5)*factor; for c in px.iter_mut().take(3) { *c=clamp(*c as f64+noise); } }
}

#[wasm_bindgen]
pub fn wasm_apply_curves(data: &mut [u8], curve_r: &[u8], curve_g: &[u8], curve_b: &[u8]) {
    for px in data.chunks_exact_mut(4) { if curve_r.len()>px[0] as usize { px[0]=curve_r[px[0] as usize]; } if curve_g.len()>px[1] as usize { px[1]=curve_g[px[1] as usize]; } if curve_b.len()>px[2] as usize { px[2]=curve_b[px[2] as usize]; } }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn pixelation_copies_the_block_origin() { let mut data=vec![10,20,30,255, 40,50,60,255, 70,80,90,255, 1,2,3,255]; wasm_apply_pixelation(&mut data,2,2,2); assert_eq!(&data[4..8], &[10,20,30,255]); assert_eq!(&data[8..12], &[10,20,30,255]); }
    #[test] fn curves_are_deterministic() { let mut data=vec![1,2,3,255]; let c: Vec<u8>=(0..=255).rev().collect(); wasm_apply_curves(&mut data,&c,&c,&c); assert_eq!(&data[..3], &[254,253,252]); }
}
