import { useState } from 'react';
import { Pencil, Trash2, Palette } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { CompanyCategory } from '../types';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b',
];

interface CategoryManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementSheet({ open, onOpenChange }: CategoryManagementSheetProps) {
  const { categories, updateCategory, deleteCategory } = useBusinessV2();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const startEdit = (cat: CompanyCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || '#6366f1');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory(editingId, { name: editName.trim(), color: editColor || undefined });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Kategorien verwalten</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Kategorien vorhanden</p>
          )}
          {categories.map(cat => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Farbe</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          className="w-7 h-7 rounded-full border-2 transition-transform"
                          style={{
                            backgroundColor: c,
                            borderColor: editColor === c ? 'hsl(var(--foreground))' : 'transparent',
                            transform: editColor === c ? 'scale(1.15)' : 'scale(1)',
                          }}
                          onClick={() => setEditColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={saveEdit} disabled={!editName.trim()}>
                      Speichern
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#64748b' }}
                    />
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
