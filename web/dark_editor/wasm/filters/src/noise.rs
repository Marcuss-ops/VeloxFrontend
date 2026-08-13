// Deterministic grain noise using a cheap xorshift32 PRNG seeded through a
// splitmix32 finalizer (far cheaper than sin() per pixel, and reproducible
// per seed).

/// Deterministic hash of the f64 seed into a nonzero u32 PRNG state. The
/// splitmix32 finalizer decorrelates seeds that differ by small amounts (e.g.
/// Date.now() values one millisecond apart) so nearby seeds still produce
/// unrelated noise streams.
#[inline]
pub(crate) fn noise_seed_state(seed: f64) -> u32 {
    let bits = seed.to_bits();
    let mut z = (bits ^ (bits >> 32)) as u32;
    z = z.wrapping_mul(0x9E37_79B9);
    z ^= z >> 16;
    z = z.wrapping_mul(0x85EB_CA6B);
    z ^= z >> 13;
    z = z.wrapping_mul(0xC2B2_AE35);
    z ^= z >> 16;
    if z == 0 { 0x9E37_79B9 } else { z }
}

pub(crate) struct Xorshift32 { state: u32 }

impl Xorshift32 {
    #[inline]
    pub(crate) fn new(seed: u32) -> Self { Xorshift32 { state: seed } }

    #[inline]
    pub(crate) fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    /// Uniform in [0, 1) using the top 24 bits.
    #[inline]
    pub(crate) fn next_unit(&mut self) -> f64 {
        (self.next_u32() >> 8) as f64 / 16_777_216.0
    }
}

pub(crate) fn apply(data: &mut [u8], intensity: f64, seed: f64) {
    let factor = intensity / 100.0 * 255.0;
    if factor == 0.0 { return; }
    let mut rng = Xorshift32::new(noise_seed_state(seed));
    for px in data.chunks_exact_mut(4) {
        let noise = (rng.next_unit() - 0.5) * factor;
        for c in px.iter_mut().take(3) { *c = crate::clamp(*c as f64 + noise); }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn noise_is_deterministic_per_seed() {
        let mut a = vec![10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255];
        let mut b = a.clone();
        apply(&mut a, 10.0, 42.0);
        apply(&mut b, 10.0, 42.0);
        assert_eq!(a, b);
        let mut c = vec![10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255];
        apply(&mut c, 10.0, 43.0);
        assert_ne!(a, c);
    }

    #[test]
    fn noise_changes_pixels() {
        let mut data = vec![100u8; 8 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        apply(&mut data, 40.0, 7.0);
        assert_ne!(data, original);
    }
}
