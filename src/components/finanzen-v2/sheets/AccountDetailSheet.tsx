import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

  if (!account) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Get recent transactions for this account
  const accountTransactions = transactions
    .filter(tx => tx.account_id === account.id || tx.to_account_id === account.id)
    .slice(0, 10);

  const handleDelete = async () => {
    if (!confirm('Konto wirklich löschen?')) return;

    const supabase = getSupabase();
    const { error } = await supabase.from('v2_accounts').delete().eq('id', account.id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Konto gelöscht');
      await refreshAccounts();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{account.name}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Balance */}
          <div className="text-center py-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Aktueller Stand</p>
            <p className="text-3xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
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
            Konto löschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
