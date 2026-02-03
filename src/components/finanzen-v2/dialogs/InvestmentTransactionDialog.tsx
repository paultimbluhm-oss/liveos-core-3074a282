import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2, V2Investment } from '../context/FinanceV2Context';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InvestmentTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: V2Investment | null;
  defaultType?: 'buy' | 'sell';
}

export function InvestmentTransactionDialog({ 
  open, 
  onOpenChange, 
  investment,
  defaultType = 'buy' 
}: InvestmentTransactionDialogProps) {
  const { user } = useAuth();
  const { accounts, investments, refreshTransactions, refreshAccounts, refreshInvestments } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  
  const [type, setType] = useState<'buy' | 'sell'>(defaultType);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (investment) {
      setSelectedInvestmentId(investment.id);
      setPrice(investment.current_price?.toString() || investment.avg_purchase_price.toString());
    }
  }, [investment]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const selectedInv = investments.find(i => i.id === selectedInvestmentId);
  const totalAmount = parseFloat(quantity || '0') * parseFloat(price || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedInvestmentId || !quantity || !price || !accountId) return;

    const inv = investments.find(i => i.id === selectedInvestmentId);
    if (!inv) return;

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const amount = quantityNum * priceNum;

    // Validation for sell
    if (type === 'sell' && quantityNum > inv.quantity) {
      toast.error('Nicht genug Anteile vorhanden');
      return;
    }

    // Check account balance for buy
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (type === 'buy' && amount > account.balance) {
      toast.error('Nicht genug Guthaben auf dem Konto');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    // 1. Create transaction
    const { error: txError } = await supabase.from('v2_transactions').insert({
      user_id: user.id,
      transaction_type: type === 'buy' ? 'investment_buy' : 'investment_sell',
      amount,
      currency: inv.currency,
      date,
      account_id: accountId,
      investment_id: selectedInvestmentId,
      note: note.trim() || null,
    });

    if (txError) {
      setLoading(false);
      toast.error('Fehler beim Erstellen');
      console.error(txError);
      return;
    }

    // 2. Update account balance
    const newAccountBalance = type === 'buy' 
      ? account.balance - amount 
      : account.balance + amount;

    await supabase.from('v2_accounts').update({ 
      balance: newAccountBalance 
    }).eq('id', accountId);

    // 3. Update investment quantity and avg price
    let newQuantity: number;
    let newAvgPrice: number;

    if (type === 'buy') {
      const oldValue = inv.quantity * inv.avg_purchase_price;
      const newValue = quantityNum * priceNum;
      newQuantity = inv.quantity + quantityNum;
      newAvgPrice = (oldValue + newValue) / newQuantity;
    } else {
      newQuantity = inv.quantity - quantityNum;
      newAvgPrice = inv.avg_purchase_price; // Keep same avg price on sell
    }

    await supabase.from('v2_investments').update({ 
      quantity: newQuantity,
      avg_purchase_price: newAvgPrice,
      current_price: priceNum,
      current_price_updated_at: new Date().toISOString(),
    }).eq('id', selectedInvestmentId);

    setLoading(false);
    toast.success(type === 'buy' ? 'Kauf erfolgreich' : 'Verkauf erfolgreich');
    await Promise.all([refreshTransactions(), refreshAccounts(), refreshInvestments()]);
    onOpenChange(false);
    
    // Reset form
    setQuantity('');
    setPrice('');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Investment-Transaktion</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="buy" className="text-xs">Kaufen</TabsTrigger>
            <TabsTrigger value="sell" className="text-xs">Verkaufen</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Investment</Label>
            <Select value={selectedInvestmentId} onValueChange={setSelectedInvestmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Investment wählen" />
              </SelectTrigger>
              <SelectContent>
                {investments.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.name} {type === 'sell' && `(${inv.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preis/Stk.</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Gesamtsumme</p>
              <p className="text-xl font-bold">
                {totalAmount.toLocaleString('de-DE', { style: 'currency', currency: selectedInv?.currency || 'EUR' })}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{type === 'buy' ? 'Quellkonto' : 'Zielkonto'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Konto wählen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance.toLocaleString('de-DE', { style: 'currency', currency: acc.currency })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notiz</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional..."
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !selectedInvestmentId || !quantity || !price || !accountId}
          >
            {loading ? 'Verarbeite...' : type === 'buy' ? 'Kaufen' : 'Verkaufen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
