'use client';

import { useEffect, useState } from 'react';

export function usePersistedState<T extends string>(key: string, initial: T | null = null) {
  const [value, setValue] = useState<T | null>(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) setValue(stored as T);
  }, [key]);

  useEffect(() => {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
