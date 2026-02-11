import { useTheme, THEMES, ThemeName } from '@/contexts/ThemeContext';
import { Check } from 'lucide-react';

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Farbdesign</h3>
        <p className="text-sm text-muted-foreground">Waehle dein bevorzugtes Theme</p>
      </div>

      <div className="space-y-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
              theme === t.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="flex gap-1.5 shrink-0">
              {t.preview.map((color, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border border-border/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            {theme === t.id && (
              <Check className="w-5 h-5 text-primary shrink-0" strokeWidth={1.5} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
