import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface AddMaterialAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMaterialAssetDialog({ open, onOpenChange }: AddMaterialAssetDialogProps) {
  const { user } = useAuth();
  const { refreshMaterialAssets } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('v2_material_assets').insert({
      user_id: user.id,
      name: name.trim(),
      category: category.trim() || null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      current_value: currentValue ? parseFloat(currentValue) : null,
      note: note.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Gegenstand erstellt');
      await refreshMaterialAssets();
      onOpenChange(false);
      setName('');
      setCategory('');
      setPurchasePrice('');
      setPurchaseDate('');
      setCurrentValue('');
      setNote('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neuer Gegenstand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. MacBook Pro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="z.B. Elektronik"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Kaufpreis</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Aktueller Wert</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Kaufdatum</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notiz</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionale Notiz..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Erstelle...' : 'Gegenstand erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
