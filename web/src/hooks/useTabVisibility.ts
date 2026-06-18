/**
 * useTabVisibility Hook
 * 
 * Tracks whether the current tab is visible or hidden.
 * Useful for pausing polling, animations, or expensive operations when user is not looking.
 * 
 * @returns boolean - true if tab is visible
 * 
 * @example
 * ```tsx
 * const isVisible = useTabVisibility();
 * 
 * useEffect(() => {
 *   if (!isVisible) return;
 *   
 *   // Only poll when tab is visible
 *   const interval = setInterval(fetchData, 5000);
 *   return () => clearInterval(interval);
 * }, [isVisible]);
 * ```
 */

import { useState, useEffect } from 'react';

export function useTabVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * useFocusWithin Hook
 * 
 * Tracks whether the window has focus.
 * More aggressive than tab visibility - pauses when user switches to another app.
 * 
 * @returns boolean - true if window has focus
 * 
 * @example
 * ```tsx
 * const isFocused = useFocusWithin();
 * 
 * useEffect(() => {
 *   if (!isFocused) return;
 *   
 *   // Only update UI when window is focused
 *   const interval = setInterval(updateClock, 1000);
 *   return () => clearInterval(interval);
 * }, [isFocused]);
 * ```
 */
export function useWindowFocus(): boolean {
  const [isFocused, setIsFocused] = useState(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}

export default useTabVisibility;
