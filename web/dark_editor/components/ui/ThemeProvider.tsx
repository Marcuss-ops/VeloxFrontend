'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Sun } from 'lucide-react';
import { Button } from './Button';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const defaultContext: ThemeContextType = {
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

const THEME_KEY = 'dark-editor-theme';
const FORCED_THEME: Theme = 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(FORCED_THEME);

  // Keep the editor locked in dark mode so the cover workspace never flips back to light.
  useEffect(() => {
    localStorage.setItem(THEME_KEY, FORCED_THEME);
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    setThemeState(FORCED_THEME);
  }, []);

  const setTheme = (newTheme: Theme) => {
    const nextTheme = FORCED_THEME;
    setThemeState(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  };

  const toggleTheme = () => {
    setTheme(FORCED_THEME);
  };

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // Prevent hydration mismatch by rendering nothing until mounted
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="rounded-full"><Sun className="w-5 h-5" /></Button>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      disabled={theme === 'dark'}
      className="rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 opacity-100 hover:bg-white/5 disabled:opacity-100 disabled:cursor-default"
      title="Dark mode attivo"
    >
      <Sun className="mr-2 h-4 w-4" />
      Dark
    </Button>
  );
}
