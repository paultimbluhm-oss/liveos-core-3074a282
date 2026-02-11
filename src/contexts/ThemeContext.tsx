import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'industrial' | 'pastel-mint' | 'pastel-lavender';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'pastel-mint',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const THEMES: { id: ThemeName; name: string; description: string; preview: string[] }[] = [
  {
    id: 'pastel-mint',
    name: 'Pastell Mint',
    description: 'Hell, modern, Blau- und Mint-Toene',
    preview: ['#f0fdf9', '#99f6e4', '#5eead4', '#2dd4bf'],
  },
  {
    id: 'pastel-lavender',
    name: 'Pastell Lavendel',
    description: 'Weiche Lila- und Rosatoene',
    preview: ['#faf5ff', '#d8b4fe', '#c084fc', '#a855f7'],
  },
  {
    id: 'industrial',
    name: 'Industrial Dark',
    description: 'Dunkler Warehouse-Look mit Orange',
    preview: ['#131820', '#1c2333', '#f59e0b', '#14b8a6'],
  },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeName) || 'pastel-mint';
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
