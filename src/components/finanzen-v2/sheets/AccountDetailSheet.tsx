import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { V2Account, useFinanceV2 } from '../context/FinanceV2Context';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AccountDetailSheetProps {
  account: V2Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accountTypeLabels: Record<string, string> = {
  giro: 'Girokonto',
  tagesgeld: 'Tagesgeld',
  cash: 'Bargeld',
  sonstiges: 'Sonstiges',
};

export function AccountDetailSheet({ account, open, onOpenChange }: AccountDetailSheetProps) {
  const { refreshAccounts, transactions } = useFinanceV2();
  const { user } = useAuth();
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!account) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  const accountTransactions = transactions
    .filter(tx => tx.account_id === account.id || tx.to_account_id === account.id)
    .slice(0, 10);

  const startEdit = () => {
    setBalanceInput(account.balance.toString());
    setEditingBalance(true);
  };

  const saveBalance = async () => {
    setSaving(true);
    const amount = parseFloat(balanceInput.replace(',', '.'));
    if (isNaN(amount)) {
      toast.error('Ungueltiger Betrag');
      setSaving(false);
      return;
    }
    const supabase = getSupabase();
    const { error } = await supabase
      .from('v2_accounts')
      .update({ balance: amount, updated_at: new Date().toISOString() })
      .eq('id', account.id);

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Kontostand aktualisiert');
      await refreshAccounts();
      setEditingBalance(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Konto wirklich loeschen?')) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_accounts').delete().eq('id', account.id);
    if (error) {
      toast.error('Fehler beim Loeschen');
    } else {
      toast.success('Konto geloescht');
      await refreshAccounts();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setEditingBalance(false); onOpenChange(o); }}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{account.name}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Balance */}
          <div className="text-center py-4 bg-muted/30 rounded-xl relative">
            <p className="text-sm text-muted-foreground mb-1">Aktueller Stand</p>
            {editingBalance ? (
              <div className="flex items-center justify-center gap-2 px-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                  className="h-10 text-center text-xl font-bold max-w-[200px] bg-background"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBalance(false); }}
                />
                <button onClick={saveBalance} disabled={saving} className="p-2 rounded-lg hover:bg-success/20 transition-colors">
                  <Check className="w-5 h-5 text-success" />
                </button>
                <button onClick={() => setEditingBalance(false)} className="p-2 rounded-lg hover:bg-destructive/20 transition-colors">
                  <X className="w-5 h-5 text-destructive" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
                <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{accountTypeLabels[account.account_type]} · {account.currency}</p>
          </div>

          {/* Recent transactions */}
          {accountTransactions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Letzte Transaktionen</h3>
              <div className="space-y-2">
                {accountTransactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{tx.note || tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <span className={`font-medium ${tx.transaction_type === 'income' ? 'text-emerald-600' : tx.transaction_type === 'expense' ? 'text-rose-600' : ''}`}>
                      {tx.transaction_type === 'income' ? '+' : tx.transaction_type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete button */}
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Konto loeschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
