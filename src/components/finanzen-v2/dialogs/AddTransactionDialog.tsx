import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'income' | 'expense' | 'transfer';
}

export function AddTransactionDialog({ open, onOpenChange, defaultType = 'expense' }: AddTransactionDialogProps) {
  const { user } = useAuth();
  const { accounts, categories, refreshTransactions, refreshAccounts, recalculateSnapshotsFromDate } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !accountId) return;

    setLoading(true);
    const supabase = getSupabase();
    const amountNum = parseFloat(amount);

    // Create transaction
    const { error: txError } = await supabase.from('v2_transactions').insert({
      user_id: user.id,
      transaction_type: type,
      amount: amountNum,
      currency,
      date,
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      category_id: categoryId && categoryId !== 'none' ? categoryId : null,
      note: note.trim() || null,
    });

    if (txError) {
      setLoading(false);
      toast.error('Fehler beim Erstellen');
      console.error(txError);
      return;
    }

    // Update account balances
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      let newBalance = account.balance;
      if (type === 'income') {
        newBalance += amountNum;
      } else if (type === 'expense') {
        newBalance -= amountNum;
      } else if (type === 'transfer') {
        newBalance -= amountNum;
      }

      await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', accountId);

      if (type === 'transfer' && toAccountId) {
        const toAccount = accounts.find(a => a.id === toAccountId);
        if (toAccount) {
          await supabase.from('v2_accounts').update({ balance: toAccount.balance + amountNum }).eq('id', toAccountId);
        }
      }
    }

    setLoading(false);
    toast.success('Transaktion erstellt');
    await Promise.all([refreshTransactions(), refreshAccounts()]);
    // Recalculate snapshots from the transaction date
    await recalculateSnapshotsFromDate(date);
    onOpenChange(false);
    setAmount('');
    setNote('');
    setCategoryId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Transaktion</DialogTitle>
        </DialogHeader>
        
        <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="income" className="text-xs">Einnahme</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs">Ausgabe</TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs">Umbuchung</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Betrag</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
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
            <Label>{type === 'income' ? 'Zielkonto' : type === 'transfer' ? 'Von Konto' : 'Quellkonto'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Konto wählen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div className="space-y-2">
              <Label>Zu Konto</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Zielkonto wählen" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== accountId).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== 'transfer' && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kategorie</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          <Button type="submit" className="w-full" disabled={loading || !amount || !accountId}>
            {loading ? 'Erstelle...' : 'Transaktion erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
