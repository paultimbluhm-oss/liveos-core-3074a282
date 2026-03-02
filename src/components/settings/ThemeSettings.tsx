import { useState } from 'react';
import { useTheme, THEMES, ThemeName, CustomThemeColors } from '@/contexts/ThemeContext';
import { Check, Palette, Sun, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="w-10 h-10 rounded-xl border-2 border-border shrink-0 relative overflow-hidden"
        style={{ backgroundColor: value }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = value;
          input.addEventListener('input', (e) => onChange((e.target as HTMLInputElement).value));
          input.click();
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{value}</p>
      </div>
    </div>
  );
}

export function ThemeSettings() {
  const { theme, setTheme, customColors, setCustomColors, liquidGlass, setLiquidGlass } = useTheme();
  const [localCustom, setLocalCustom] = useState<CustomThemeColors>(customColors);
  const [showCustomEditor, setShowCustomEditor] = useState(theme === 'custom');

  const presetThemes = THEMES.filter(t => t.id !== 'custom');
  const customTheme = THEMES.find(t => t.id === 'custom')!;

  const handleSelectTheme = (id: ThemeName) => {
    if (id === 'custom') {
      setShowCustomEditor(true);
      setTheme('custom');
      setCustomColors(localCustom);
    } else {
      setShowCustomEditor(false);
      setTheme(id);
    }
  };

  const updateCustomColor = (key: keyof CustomThemeColors, value: string) => {
    const updated = { ...localCustom, [key]: value };
    setLocalCustom(updated);
    if (theme === 'custom') {
      setCustomColors(updated);
    }
  };

  const toggleCustomMode = () => {
    const newMode = localCustom.mode === 'light' ? 'dark' : 'light';
    const defaults: CustomThemeColors = newMode === 'dark' 
      ? { mode: 'dark', primary: localCustom.primary, accent: localCustom.accent, background: '#0f172a', card: '#1e293b', foreground: '#e2e8f0' }
      : { mode: 'light', primary: localCustom.primary, accent: localCustom.accent, background: '#fafafa', card: '#ffffff', foreground: '#1e293b' };
    setLocalCustom(defaults);
    if (theme === 'custom') setCustomColors(defaults);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Farbdesign</h3>
        <p className="text-sm text-muted-foreground">Waehle ein Theme oder erstelle dein eigenes</p>
      </div>

      {/* Liquid Glass Toggle */}
      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border bg-card">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 backdrop-blur-sm border border-border/50">
          <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Liquid Glass</p>
          <p className="text-[11px] text-muted-foreground">iOS 26 Glassmorphism-Effekt</p>
        </div>
        <Switch checked={liquidGlass} onCheckedChange={setLiquidGlass} />
      </div>

      {/* Preset themes */}
      <div className="space-y-2">
        {presetThemes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelectTheme(t.id)}
            className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
              theme === t.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="flex gap-1.5 shrink-0">
              {t.preview.map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-border/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">{t.description}</p>
            </div>
            {theme === t.id && (
              <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>

      {/* Custom theme option */}
      <div>
        <button
          onClick={() => handleSelectTheme('custom')}
          className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
            theme === 'custom'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border bg-card hover:border-primary/40'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">{customTheme.name}</p>
            <p className="text-[11px] text-muted-foreground">{customTheme.description}</p>
          </div>
          {theme === 'custom' && (
            <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Custom editor */}
      {showCustomEditor && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Eigene Farben</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCustomMode}
              className="h-8 gap-1.5 text-xs"
            >
              {localCustom.mode === 'light' ? (
                <><Sun className="w-3.5 h-3.5" /> Hell</>
              ) : (
                <><Moon className="w-3.5 h-3.5" /> Dunkel</>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <ColorInput label="Primaerfarbe" value={localCustom.primary} onChange={(v) => updateCustomColor('primary', v)} />
            <ColorInput label="Akzentfarbe" value={localCustom.accent} onChange={(v) => updateCustomColor('accent', v)} />
            <ColorInput label="Hintergrund" value={localCustom.background} onChange={(v) => updateCustomColor('background', v)} />
            <ColorInput label="Karten" value={localCustom.card} onChange={(v) => updateCustomColor('card', v)} />
            <ColorInput label="Textfarbe" value={localCustom.foreground} onChange={(v) => updateCustomColor('foreground', v)} />
          </div>

          {/* Live preview */}
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Vorschau</Label>
            <div 
              className="rounded-xl p-4 border space-y-2"
              style={{ backgroundColor: localCustom.background, color: localCustom.foreground, borderColor: localCustom.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              <div 
                className="rounded-lg p-3 flex items-center gap-3"
                style={{ backgroundColor: localCustom.card }}
              >
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: localCustom.primary }} />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: localCustom.foreground }}>Widget-Titel</div>
                  <div className="text-xs" style={{ color: localCustom.foreground, opacity: 0.5 }}>Beschreibung</div>
                </div>
                <div className="w-6 h-6 rounded-md" style={{ backgroundColor: localCustom.accent }} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ backgroundColor: localCustom.primary, color: localCustom.mode === 'dark' ? localCustom.background : '#ffffff' }}>Button</div>
                <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ backgroundColor: localCustom.accent, color: localCustom.mode === 'dark' ? localCustom.background : '#ffffff' }}>Akzent</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
