'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './Button';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const defaultContext: ThemeContextType = {
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

const THEME_KEY = 'dark-editor-theme';
const DEFAULT_THEME: Theme = 'light';

function readTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const initialTheme = readTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // Theme still works for the current tab when storage is unavailable.
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
    return <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Cambia tema"><Sun className="h-4 w-4" /></Button>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={theme === 'dark'
        ? 'h-9 w-9 rounded-full border border-white/15 bg-white/10 p-0 text-white hover:bg-white/15'
        : 'h-9 w-9 rounded-full border border-black/10 bg-white p-0 text-[#111111] hover:bg-[#f2f2ef]'}
      title={theme === 'dark' ? 'Passa al tema giorno' : 'Passa al tema notte'}
      aria-label={theme === 'dark' ? 'Passa al tema giorno' : 'Passa al tema notte'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
