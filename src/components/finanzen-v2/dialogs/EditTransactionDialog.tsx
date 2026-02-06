import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabase } from '@/hooks/useAuth';
import { useFinanceV2, V2Transaction } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface EditTransactionDialogProps {
  transaction: V2Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const { accounts, categories, refreshTransactions, refreshAccounts, recalculateSnapshotsFromDate } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  // Initialize form when transaction changes
  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCurrency(transaction.currency || 'EUR');
      setDate(transaction.date);
      setAccountId(transaction.account_id || '');
      setToAccountId(transaction.to_account_id || '');
      setCategoryId(transaction.category_id || '');
      setNote(transaction.note || '');
    }
  }, [transaction]);

  if (!transaction) return null;

  const type = transaction.transaction_type;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    setLoading(true);
    const supabase = getSupabase();
    const newAmount = parseFloat(amount);
    const oldAmount = transaction.amount;
    const amountDiff = newAmount - oldAmount;

    // First, reverse the old transaction's effect on accounts
    const oldAccount = accounts.find(a => a.id === transaction.account_id);
    const newAccount = accounts.find(a => a.id === accountId);

    // Calculate balance adjustments
    if (oldAccount && transaction.account_id !== accountId) {
      // Account changed - reverse old account
      let revertedBalance = oldAccount.balance;
      if (type === 'income') {
        revertedBalance -= oldAmount;
      } else if (type === 'expense' || type === 'transfer') {
        revertedBalance += oldAmount;
      }
      await supabase.from('v2_accounts').update({ balance: revertedBalance }).eq('id', oldAccount.id);

      // Also revert to_account if it was a transfer
      if (type === 'transfer' && transaction.to_account_id) {
        const oldToAccount = accounts.find(a => a.id === transaction.to_account_id);
        if (oldToAccount) {
          await supabase.from('v2_accounts').update({ balance: oldToAccount.balance - oldAmount }).eq('id', oldToAccount.id);
        }
      }

      // Apply to new account
      if (newAccount) {
        let newBalance = newAccount.balance;
        if (type === 'income') {
          newBalance += newAmount;
        } else if (type === 'expense' || type === 'transfer') {
          newBalance -= newAmount;
        }
        await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', newAccount.id);
      }

      // Apply to new to_account if transfer
      if (type === 'transfer' && toAccountId) {
        const newToAccount = accounts.find(a => a.id === toAccountId);
        if (newToAccount) {
          await supabase.from('v2_accounts').update({ balance: newToAccount.balance + newAmount }).eq('id', newToAccount.id);
        }
      }
    } else if (amountDiff !== 0 && oldAccount) {
      // Same account, just amount changed
      let balanceChange = 0;
      if (type === 'income') {
        balanceChange = amountDiff;
      } else if (type === 'expense' || type === 'transfer') {
        balanceChange = -amountDiff;
      }
      await supabase.from('v2_accounts').update({ balance: oldAccount.balance + balanceChange }).eq('id', oldAccount.id);

      // Handle to_account for transfers
      if (type === 'transfer') {
        if (transaction.to_account_id !== toAccountId) {
          // To account changed
          if (transaction.to_account_id) {
            const oldToAccount = accounts.find(a => a.id === transaction.to_account_id);
            if (oldToAccount) {
              await supabase.from('v2_accounts').update({ balance: oldToAccount.balance - oldAmount }).eq('id', oldToAccount.id);
            }
          }
          if (toAccountId) {
            const newToAccount = accounts.find(a => a.id === toAccountId);
            if (newToAccount) {
              await supabase.from('v2_accounts').update({ balance: newToAccount.balance + newAmount }).eq('id', newToAccount.id);
            }
          }
        } else if (transaction.to_account_id) {
          // Same to_account, just amount changed
          const toAccount = accounts.find(a => a.id === transaction.to_account_id);
          if (toAccount) {
            await supabase.from('v2_accounts').update({ balance: toAccount.balance + amountDiff }).eq('id', toAccount.id);
          }
        }
      }
    }

    // Update the transaction
    const { error } = await supabase.from('v2_transactions').update({
      amount: newAmount,
      currency,
      date,
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      category_id: categoryId && categoryId !== 'none' ? categoryId : null,
      note: note.trim() || null,
    }).eq('id', transaction.id);

    if (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } else {
      toast.success('Transaktion aktualisiert');
      await Promise.all([refreshTransactions(), refreshAccounts()]);
      // Recalculate snapshots from the earlier of old and new date
      const earlierDate = transaction.date < date ? transaction.date : date;
      await recalculateSnapshotsFromDate(earlierDate);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const typeLabels: Record<string, string> = {
    income: 'Einnahme',
    expense: 'Ausgabe',
    transfer: 'Umbuchung',
    investment_buy: 'Investment-Kauf',
    investment_sell: 'Investment-Verkauf',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transaktion bearbeiten</DialogTitle>
        </DialogHeader>
        
        <div className="py-2 px-3 bg-muted/50 rounded-lg text-center">
          <span className="text-sm font-medium">{typeLabels[type]}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Betrag</Label>
              <Input
                id="edit-amount"
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
            <Label htmlFor="edit-date">Datum</Label>
            <Input
              id="edit-date"
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
              <Select value={categoryId || 'none'} onValueChange={setCategoryId}>
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
            <Label htmlFor="edit-note">Notiz</Label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !amount || !accountId}>
            {loading ? 'Speichere...' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
