import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Tag, Trash2, Edit2, Check, X } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Add Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Neue Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Kategorie-Name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={adding || !newCategory.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {categories.length === 0 && (
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={handleAddDefaults}
              disabled={adding}
            >
              Standardkategorien hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Kategorien ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {categories.map(category => (
            <div 
              key={category.id}
              className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${!category.is_active ? 'opacity-50' : ''}`}
            >
              {editingId === category.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEdit(category);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => handleEdit(category)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span 
                      className={`font-medium cursor-pointer ${!category.is_active ? 'line-through' : ''}`}
                      onClick={() => handleToggleActive(category)}
                    >
                      {category.name}
                    </span>
                    {category.is_default && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Standard
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => { setEditingId(category.id); setEditValue(category.name); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteCategory(category)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Kategorien</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{deleteCategory?.name}" wirklich löschen? Bestehende Transaktionen behalten ihre Kategorie-Referenz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
