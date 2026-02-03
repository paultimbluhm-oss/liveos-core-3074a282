import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Tag, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';
import { useFinanceV2, V2Category } from '../context/FinanceV2Context';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const defaultCategories = [
  'Lebensmittel',
  'Transport',
  'Wohnen',
  'Unterhaltung',
  'Gesundheit',
  'Kleidung',
  'Bildung',
  'Geschenke',
  'Gehalt',
  'Sonstiges',
];

export function CategoriesTab() {
  const { categories, refreshCategories } = useFinanceV2();
  const { user } = useAuth();
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<V2Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddCategory = async () => {
    if (!user || !newCategory.trim()) return;
    
    setAdding(true);
    const supabase = getSupabase();
    
    const { error } = await supabase.from('v2_categories').insert({
      user_id: user.id,
      name: newCategory.trim(),
      is_default: false,
      is_active: true,
    });
    
    setAdding(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Kategorie erstellt');
      setNewCategory('');
      await refreshCategories();
    }
  };

  const handleAddDefaults = async () => {
    if (!user) return;
    
    setAdding(true);
    const supabase = getSupabase();
    
    const existingNames = categories.map(c => c.name.toLowerCase());
    const toAdd = defaultCategories.filter(name => !existingNames.includes(name.toLowerCase()));
    
    if (toAdd.length === 0) {
      toast.info('Alle Standardkategorien existieren bereits');
      setAdding(false);
      return;
    }
    
    const { error } = await supabase.from('v2_categories').insert(
      toAdd.map(name => ({
        user_id: user.id,
        name,
        is_default: true,
        is_active: true,
      }))
    );
    
    setAdding(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success(`${toAdd.length} Kategorien hinzugefügt`);
      await refreshCategories();
    }
  };

  const handleEdit = async (category: V2Category) => {
    if (!editValue.trim() || editValue === category.name) {
      setEditingId(null);
      return;
    }
    
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_categories')
      .update({ name: editValue.trim() })
      .eq('id', category.id);
    
    if (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } else {
      toast.success('Kategorie aktualisiert');
      await refreshCategories();
    }
    
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;
    
    setDeleting(true);
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_categories')
      .delete()
      .eq('id', deleteCategory.id);
    
    setDeleting(false);
    setDeleteCategory(null);
    
    if (error) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    } else {
      toast.success('Kategorie gelöscht');
      await refreshCategories();
    }
  };

  const handleToggleActive = async (category: V2Category) => {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);
    
    if (error) {
      toast.error('Fehler beim Aktualisieren');
      console.error(error);
    } else {
      await refreshCategories();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Category Section */}
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Neue Kategorie</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Kategorie-Name eingeben"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary"
          />
          <Button 
            onClick={handleAddCategory} 
            disabled={adding || !newCategory.trim()}
            className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        {categories.length === 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-4 h-12 rounded-2xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 border border-violet-500/20"
            onClick={handleAddDefaults}
            disabled={adding}
          >
            <Sparkles className="w-4 h-4 mr-2 text-violet-400" />
            <span className="text-violet-300">Standardkategorien hinzufügen</span>
          </Button>
        )}
      </div>

      {/* Categories List */}
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold">Kategorien</h3>
          </div>
          <span className="text-sm text-muted-foreground">{categories.length}</span>
        </div>
        
        <div className="divide-y divide-white/5">
          {categories.map(category => (
            <div 
              key={category.id}
              className={`flex items-center justify-between p-4 transition-colors ${!category.is_active ? 'opacity-50' : ''}`}
            >
              {editingId === category.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-10 rounded-xl bg-white/5 border-white/10"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEdit(category);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button 
                    className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                    onClick={() => handleEdit(category)}
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button 
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                        category.is_active ? 'bg-primary/20' : 'bg-white/5'
                      }`}
                      onClick={() => handleToggleActive(category)}
                    >
                      <Tag className={`w-4 h-4 ${category.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <span 
                        className={`font-medium cursor-pointer ${!category.is_active ? 'line-through' : ''}`}
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.name}
                      </span>
                      {category.is_default && (
                        <span className="ml-2 text-xs text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full">
                          Standard
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      onClick={() => { setEditingId(category.id); setEditValue(category.name); }}
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button 
                      className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                      onClick={() => setDeleteCategory(category)}
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Noch keine Kategorien</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{deleteCategory?.name}" wirklich löschen? Bestehende Transaktionen behalten ihre Kategorie-Referenz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-rose-500 hover:bg-rose-600">
              {deleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
