import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { CompanyCategory } from '../types';

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CompanyCategory;
}

export function EditCategoryDialog({ open, onOpenChange, category }: EditCategoryDialogProps) {
  const { updateCategory } = useBusinessV2();
  const [name, setName] = useState(category.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(category.name);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    await updateCategory(category.id, { name: name.trim() });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kategorie bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editCatName">Name</Label>
            <Input
              id="editCatName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
