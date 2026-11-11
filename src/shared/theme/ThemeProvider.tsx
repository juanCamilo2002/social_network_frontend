import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { ThemeContext } from './theme-context';
import type { Theme } from './theme-context';

const STORAGE_KEY = 'social_network-theme';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function getSavedTheme(): Theme | null {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(
    getSavedTheme,
  );

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  const theme = selectedTheme ?? systemTheme;

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);

    function handleSystemThemeChange(event: MediaQueryListEvent) {
      setSystemTheme(event.matches ? 'dark' : 'light');
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setSelectedTheme(getSavedTheme());
      }
    }

    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    setSelectedTheme(nextTheme);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // El tema sigue funcionando en memoria si no se puede guardar.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
