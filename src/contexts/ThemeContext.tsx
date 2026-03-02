import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeName = 'pastel-mint' | 'pastel-lavender' | 'warm-beige' | 'modern-light' | 'midnight' | 'industrial' | 'custom';

export interface CustomThemeColors {
  mode: 'light' | 'dark';
  primary: string; // hex
  accent: string;  // hex
  background: string;
  card: string;
  foreground: string;
}

const DEFAULT_CUSTOM_LIGHT: CustomThemeColors = {
  mode: 'light',
  primary: '#3b82f6',
  accent: '#8b5cf6',
  background: '#fafafa',
  card: '#ffffff',
  foreground: '#1e293b',
};

const DEFAULT_CUSTOM_DARK: CustomThemeColors = {
  mode: 'dark',
  primary: '#60a5fa',
  accent: '#a78bfa',
  background: '#0f172a',
  card: '#1e293b',
  foreground: '#e2e8f0',
};

export interface LiquidGlassConfig {
  gradientColor1: string; // hex
  gradientColor2: string; // hex
}

const DEFAULT_GLASS_CONFIG: LiquidGlassConfig = {
  gradientColor1: '#e8eaf0',
  gradientColor2: '#dce4ed',
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  customColors: CustomThemeColors;
  setCustomColors: (colors: CustomThemeColors) => void;
  liquidGlass: boolean;
  setLiquidGlass: (enabled: boolean) => void;
  liquidGlassConfig: LiquidGlassConfig;
  setLiquidGlassConfig: (config: LiquidGlassConfig) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'pastel-mint',
  setTheme: () => {},
  customColors: DEFAULT_CUSTOM_LIGHT,
  setCustomColors: () => {},
  liquidGlass: false,
  setLiquidGlass: () => {},
  liquidGlassConfig: DEFAULT_GLASS_CONFIG,
  setLiquidGlassConfig: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const THEMES: { id: ThemeName; name: string; description: string; preview: string[] }[] = [
  {
    id: 'modern-light',
    name: 'Modern Light',
    description: 'Klar, neutral, zeitgemaess',
    preview: ['#fafafa', '#e2e8f0', '#3b82f6', '#8b5cf6'],
  },
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
    id: 'warm-beige',
    name: 'Warm Beige',
    description: 'Erdige, warme Sand- und Terracotta-Toene',
    preview: ['#faf6f1', '#e8d5c4', '#c4956a', '#a67c52'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Moderner Dark Mode mit blauen Akzenten',
    preview: ['#0f172a', '#1e293b', '#60a5fa', '#38bdf8'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Dunkler Warehouse-Look mit Orange',
    preview: ['#131820', '#1c2333', '#f59e0b', '#14b8a6'],
  },
  {
    id: 'custom',
    name: 'Eigenes Design',
    description: 'Farben frei anpassen',
    preview: ['#fafafa', '#e2e8f0', '#3b82f6', '#8b5cf6'],
  },
];

// Convert hex to HSL string "H S% L%"
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function adjustLightness(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  l = Math.max(0, Math.min(1, l + amount));
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyCustomColors(colors: CustomThemeColors) {
  const root = document.documentElement;
  const isDark = colors.mode === 'dark';
  
  const bgHsl = hexToHsl(colors.background);
  const fgHsl = hexToHsl(colors.foreground);
  const primaryHsl = hexToHsl(colors.primary);
  const accentHsl = hexToHsl(colors.accent);
  const cardHsl = hexToHsl(colors.card);
  
  // Derived colors
  const secondaryHsl = adjustLightness(colors.background, isDark ? 0.08 : -0.04);
  const mutedHsl = adjustLightness(colors.background, isDark ? 0.06 : -0.05);
  const mutedFgHsl = adjustLightness(colors.foreground, isDark ? -0.3 : 0.25);
  const borderHsl = adjustLightness(colors.background, isDark ? 0.1 : -0.08);
  const inputHsl = adjustLightness(colors.background, isDark ? 0.06 : -0.06);
  const secondaryFgHsl = adjustLightness(colors.foreground, isDark ? -0.1 : 0.1);
  
  const vars: Record<string, string> = {
    '--background': bgHsl,
    '--foreground': fgHsl,
    '--card': cardHsl,
    '--card-foreground': fgHsl,
    '--popover': cardHsl,
    '--popover-foreground': fgHsl,
    '--primary': primaryHsl,
    '--primary-foreground': isDark ? '220 15% 10%' : '0 0% 100%',
    '--secondary': secondaryHsl,
    '--secondary-foreground': secondaryFgHsl,
    '--muted': mutedHsl,
    '--muted-foreground': mutedFgHsl,
    '--accent': accentHsl,
    '--accent-foreground': isDark ? '220 15% 10%' : '0 0% 100%',
    '--destructive': '0 65% 52%',
    '--destructive-foreground': '0 0% 100%',
    '--success': '152 55% 42%',
    '--success-foreground': '0 0% 100%',
    '--warning': '38 90% 52%',
    '--warning-foreground': fgHsl,
    '--border': borderHsl,
    '--input': inputHsl,
    '--ring': primaryHsl,
    '--sidebar-background': adjustLightness(colors.background, isDark ? 0.02 : 0.01),
    '--sidebar-foreground': adjustLightness(colors.foreground, isDark ? -0.05 : 0.05),
    '--sidebar-primary': primaryHsl,
    '--sidebar-primary-foreground': isDark ? '220 15% 10%' : '0 0% 100%',
    '--sidebar-accent': secondaryHsl,
    '--sidebar-accent-foreground': fgHsl,
    '--sidebar-border': borderHsl,
    '--sidebar-ring': primaryHsl,
    '--xp': accentHsl,
    '--xp-foreground': '0 0% 100%',
    '--level': '38 90% 52%',
    '--streak': '12 75% 52%',
  };

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function clearCustomColors() {
  const root = document.documentElement;
  const vars = [
    '--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground',
    '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground', '--success', '--success-foreground',
    '--warning', '--warning-foreground', '--border', '--input', '--ring',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
    '--xp', '--xp-foreground', '--level', '--streak',
  ];
  vars.forEach(v => root.style.removeProperty(v));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeName) || 'pastel-mint';
  });

  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(() => {
    const saved = localStorage.getItem('app-custom-theme');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_CUSTOM_LIGHT;
  });

  const [liquidGlass, setLiquidGlassState] = useState<boolean>(() => {
    return localStorage.getItem('app-liquid-glass') === 'true';
  });

  const [liquidGlassConfig, setLiquidGlassConfigState] = useState<LiquidGlassConfig>(() => {
    const saved = localStorage.getItem('app-liquid-glass-config');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_GLASS_CONFIG;
  });

  const setLiquidGlass = useCallback((enabled: boolean) => {
    setLiquidGlassState(enabled);
    localStorage.setItem('app-liquid-glass', String(enabled));
  }, []);

  const setLiquidGlassConfig = useCallback((config: LiquidGlassConfig) => {
    setLiquidGlassConfigState(config);
    localStorage.setItem('app-liquid-glass-config', JSON.stringify(config));
  }, []);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
  };

  const setCustomColors = useCallback((colors: CustomThemeColors) => {
    setCustomColorsState(colors);
    localStorage.setItem('app-custom-theme', JSON.stringify(colors));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'custom') {
      applyCustomColors(customColors);
    } else {
      clearCustomColors();
    }
  }, [theme, customColors]);

  useEffect(() => {
    document.documentElement.setAttribute('data-liquid-glass', String(liquidGlass));
    if (liquidGlass) {
      const root = document.documentElement;
      root.style.setProperty('--liquid-gradient-1', liquidGlassConfig.gradientColor1);
      root.style.setProperty('--liquid-gradient-2', liquidGlassConfig.gradientColor2);
    } else {
      document.documentElement.style.removeProperty('--liquid-gradient-1');
      document.documentElement.style.removeProperty('--liquid-gradient-2');
    }
  }, [liquidGlass, liquidGlassConfig]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors, liquidGlass, setLiquidGlass, liquidGlassConfig, setLiquidGlassConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}
