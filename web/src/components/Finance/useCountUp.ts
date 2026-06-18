import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Returns the current animated value.
 */
export function useCountUp(target: number, duration: number = 800, decimals: number = 0): number {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (target === 0) return;
        const start = performance.now();

        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = parseFloat((eased * target).toFixed(decimals));
            setValue(current);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, decimals]);

    return value;
}
