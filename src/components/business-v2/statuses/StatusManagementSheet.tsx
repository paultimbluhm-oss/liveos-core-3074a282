import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { CompanyStatus } from '../types';

const PRESET_COLORS = [
  '#64748b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#6366f1',
];

interface StatusManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusManagementSheet({ open, onOpenChange }: StatusManagementSheetProps) {
  const { statuses, updateStatus, deleteStatus, addStatus } = useBusinessV2();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const startEdit = (s: CompanyStatus) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateStatus(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteStatus(id);
    if (editingId === id) setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addStatus(newName.trim(), newColor);
    setNewName('');
    setNewColor('#6366f1');
    setAddMode(false);
  };

  const sorted = [...statuses].sort((a, b) => a.order_index - b.order_index);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Status verwalten</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {sorted.map(s => (
            <div key={s.id}>
              {editingId === s.id ? (
                <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" />
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
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {addMode ? (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-9" placeholder="Neuer Status..." />
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
                        borderColor: newColor === c ? 'hsl(var(--foreground))' : 'transparent',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleAdd} disabled={!newName.trim()}>
                  Hinzufuegen
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddMode(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setAddMode(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Status hinzufuegen
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
