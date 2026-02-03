import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface AddInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInvestmentDialog({ open, onOpenChange }: AddInvestmentDialogProps) {
  const { user } = useAuth();
  const { refreshInvestments } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<string>('etf');
  const [currency, setCurrency] = useState<string>('EUR');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('v2_investments').insert({
      user_id: user.id,
      name: name.trim(),
      symbol: symbol.trim() || null,
      asset_type: assetType,
      currency,
      quantity: parseFloat(quantity) || 0,
      avg_purchase_price: parseFloat(avgPrice) || 0,
      current_price: parseFloat(avgPrice) || null,
    });

    setLoading(false);

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Investment erstellt');
      await refreshInvestments();
      onOpenChange(false);
      setName('');
      setSymbol('');
      setAssetType('etf');
      setCurrency('EUR');
      setQuantity('');
      setAvgPrice('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Position</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. MSCI World ETF"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol (optional)</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="z.B. IWDA.AS"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="stock">Aktie</SelectItem>
                  <SelectItem value="fund">Fonds</SelectItem>
                  <SelectItem value="crypto">Krypto</SelectItem>
                  <SelectItem value="metal">Edelmetall</SelectItem>
                  <SelectItem value="other">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Währung</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Anzahl</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgPrice">Ø Kaufpreis</Label>
              <Input
                id="avgPrice"
                type="number"
                step="0.01"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Erstelle...' : 'Position erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
