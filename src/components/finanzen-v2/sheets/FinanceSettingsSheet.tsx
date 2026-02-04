import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinanceV2, V2Category } from '../context/FinanceV2Context';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Check, X, Tag, Palette, Settings2 } from 'lucide-react';

interface FinanceSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const DEFAULT_CATEGORIES = [
  { name: 'Lebensmittel', icon: 'shopping-cart', color: '#22c55e' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Wohnen', icon: 'home', color: '#8b5cf6' },
  { name: 'Unterhaltung', icon: 'film', color: '#ec4899' },
  { name: 'Gesundheit', icon: 'heart', color: '#ef4444' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#f97316' },
  { name: 'Bildung', icon: 'book', color: '#06b6d4' },
  { name: 'Restaurant', icon: 'utensils', color: '#eab308' },
  { name: 'Gehalt', icon: 'wallet', color: '#22c55e' },
  { name: 'Geschenk', icon: 'gift', color: '#d946ef' },
];

export function FinanceSettingsSheet({ open, onOpenChange }: FinanceSettingsSheetProps) {
  const { user } = useAuth();
  const { categories, refreshCategories } = useFinanceV2();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[5]);
  const [editingCategory, setEditingCategory] = useState<V2Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    
    setLoading(true);
    const supabase = getSupabase();
    
    const { error } = await supabase.from('v2_categories').insert({
      user_id: user.id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
      is_default: false,
      is_active: true,
    });
    
    setLoading(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Kategorie erstellt');
      setNewCategoryName('');
      await refreshCategories();
    }
  };

  const handleAddDefaults = async () => {
    if (!user) return;
    
    setLoading(true);
    const supabase = getSupabase();
    
    const existingNames = categories.map(c => c.name.toLowerCase());
    const toAdd = DEFAULT_CATEGORIES.filter(d => !existingNames.includes(d.name.toLowerCase()));
    
    if (toAdd.length === 0) {
      toast.info('Alle Standardkategorien sind bereits vorhanden');
      setLoading(false);
      return;
    }
    
    const { error } = await supabase.from('v2_categories').insert(
      toAdd.map(cat => ({
        user_id: user.id,
        name: cat.name,
        color: cat.color,
        is_default: true,
        is_active: true,
      }))
    );
    
    setLoading(false);
    
    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success(`${toAdd.length} Kategorien hinzugefügt`);
      await refreshCategories();
    }
  };

  const handleStartEdit = (cat: V2Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.color || PRESET_COLORS[0]);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;
    
    setLoading(true);
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_categories')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editingCategory.id);
    
    setLoading(false);
    setEditingCategory(null);
    
    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Kategorie aktualisiert');
      await refreshCategories();
    }
  };

  const handleDelete = async (cat: V2Category) => {
    if (!user) return;
    
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_categories').delete().eq('id', cat.id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Kategorie gelöscht');
      await refreshCategories();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Einstellungen
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Kategorien
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddDefaults}
                disabled={loading}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Standard
              </Button>
            </div>

            {/* Add new category */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Neue Kategorie..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddCategory} 
                  disabled={loading || !newCategoryName.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-6 h-6 rounded-full transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-2">
              {categories.map(cat => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  {editingCategory?.id === cat.id ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: editColor }}
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={handleSaveEdit}
                          className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30"
                        >
                          <Check className="w-4 h-4 text-emerald-500" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: cat.color || '#6366f1' }}
                      />
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Kategorien vorhanden</p>
                  <p className="text-xs">Füge Standardkategorien hinzu</p>
                </div>
              )}
            </div>
          </div>

          {/* Color Picker for editing */}
          {editingCategory && (
            <div className="p-3 rounded-xl bg-muted/50 space-y-2">
              <Label className="text-xs text-muted-foreground">Farbe auswählen</Label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-6 h-6 rounded-full transition-all ${editColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
