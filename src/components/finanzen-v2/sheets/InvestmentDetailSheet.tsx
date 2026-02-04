import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, TrendingUp, TrendingDown, Pencil, Check, X } from 'lucide-react';
import { V2Investment, useFinanceV2 } from '../context/FinanceV2Context';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface InvestmentDetailSheetProps {
  investment: V2Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assetTypeLabels: Record<string, string> = {
  etf: 'ETF',
  stock: 'Aktie',
  fund: 'Fonds',
  crypto: 'Krypto',
  metal: 'Edelmetall',
  other: 'Sonstige',
};

export function InvestmentDetailSheet({ investment, open, onOpenChange }: InvestmentDetailSheetProps) {
  const { refreshInvestments, transactions } = useFinanceV2();
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!investment) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  const currentPrice = investment.current_price || investment.avg_purchase_price;
  const currentValue = investment.quantity * currentPrice;
  const totalCost = investment.quantity * investment.avg_purchase_price;
  const profit = currentValue - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // Get transactions for this investment
  const investmentTransactions = transactions
    .filter(tx => tx.investment_id === investment.id)
    .slice(0, 10);

  const startEditing = () => {
    setEditQuantity(investment.quantity.toString());
    setEditAvgPrice(investment.avg_purchase_price.toString());
    setEditName(investment.name);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    const newQuantity = parseFloat(editQuantity.replace(',', '.'));
    const newAvgPrice = parseFloat(editAvgPrice.replace(',', '.'));

    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error('Ungültige Anzahl');
      return;
    }
    if (isNaN(newAvgPrice) || newAvgPrice < 0) {
      toast.error('Ungültiger Durchschnittspreis');
      return;
    }
    if (!editName.trim()) {
      toast.error('Name darf nicht leer sein');
      return;
    }

    setSaving(true);
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_investments')
      .update({
        quantity: newQuantity,
        avg_purchase_price: newAvgPrice,
        name: editName.trim(),
      })
      .eq('id', investment.id);

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Investment aktualisiert');
      await refreshInvestments();
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Investment wirklich löschen?')) return;

    const supabase = getSupabase();
    const { error } = await supabase.from('v2_investments').delete().eq('id', investment.id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Investment gelöscht');
      await refreshInvestments();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold h-8 w-48"
                />
              ) : (
                <>
                  {investment.name}
                  {investment.symbol && (
                    <span className="text-sm text-muted-foreground font-normal">({investment.symbol})</span>
                  )}
                </>
              )}
            </SheetTitle>
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={startEditing}>
                <Pencil className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={saving}>
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving}>
                  <Check className="w-4 h-4 text-emerald-500" />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Value */}
          <div className="text-center py-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Aktueller Wert</p>
            <p className="text-3xl font-bold">{formatCurrency(currentValue, investment.currency)}</p>
            <div className={`flex items-center justify-center gap-1 mt-2 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">
                {profit >= 0 ? '+' : ''}{formatCurrency(profit, investment.currency)} ({profitPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Anzahl</p>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="h-8 text-sm font-semibold"
                />
              ) : (
                <p className="font-semibold">{investment.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}</p>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Ø Kaufpreis</p>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editAvgPrice}
                  onChange={(e) => setEditAvgPrice(e.target.value)}
                  className="h-8 text-sm font-semibold"
                />
              ) : (
                <p className="font-semibold">{formatCurrency(investment.avg_purchase_price, investment.currency)}</p>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Aktueller Kurs</p>
              <p className="font-semibold">{formatCurrency(currentPrice, investment.currency)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Typ</p>
              <p className="font-semibold">{assetTypeLabels[investment.asset_type]}</p>
            </div>
          </div>

          {/* Transactions */}
          {investmentTransactions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Transaktionshistorie</h3>
              <div className="space-y-2">
                {investmentTransactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{tx.transaction_type === 'investment_buy' ? 'Kauf' : 'Verkauf'}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <span className="font-medium">{formatCurrency(tx.amount, tx.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete button */}
          {!isEditing && (
            <Button variant="destructive" className="w-full" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Investment löschen
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}