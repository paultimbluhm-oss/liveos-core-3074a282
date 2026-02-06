import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil } from 'lucide-react';
import { V2Transaction, useFinanceV2 } from '../context/FinanceV2Context';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { EditTransactionDialog } from '../dialogs/EditTransactionDialog';

interface TransactionDetailSheetProps {
  transaction: V2Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const transactionTypeLabels: Record<string, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
  transfer: 'Umbuchung',
  investment_buy: 'Investment-Kauf',
  investment_sell: 'Investment-Verkauf',
};

export function TransactionDetailSheet({ transaction, open, onOpenChange }: TransactionDetailSheetProps) {
  const { refreshTransactions, refreshAccounts, accounts, categories, recalculateSnapshotsFromDate } = useFinanceV2();
  const [showEdit, setShowEdit] = useState(false);

  if (!transaction) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  const getAccountName = (id?: string) => {
    if (!id) return 'Unbekannt';
    const acc = accounts.find(a => a.id === id);
    return acc?.name || 'Unbekannt';
  };

  const getCategoryName = (id?: string) => {
    if (!id) return null;
    const cat = categories.find(c => c.id === id);
    return cat?.name || null;
  };

  const handleDelete = async () => {
    if (!confirm('Transaktion wirklich löschen?')) return;

    const supabase = getSupabase();
    
    // Reverse the account balance changes
    const account = accounts.find(a => a.id === transaction.account_id);
    if (account) {
      let newBalance = account.balance;
      if (transaction.transaction_type === 'income') {
        newBalance -= transaction.amount;
      } else if (transaction.transaction_type === 'expense') {
        newBalance += transaction.amount;
      } else if (transaction.transaction_type === 'transfer') {
        newBalance += transaction.amount;
      }
      await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', account.id);

      if (transaction.transaction_type === 'transfer' && transaction.to_account_id) {
        const toAccount = accounts.find(a => a.id === transaction.to_account_id);
        if (toAccount) {
          await supabase.from('v2_accounts').update({ balance: toAccount.balance - transaction.amount }).eq('id', toAccount.id);
        }
      }
    }

    const { error } = await supabase.from('v2_transactions').delete().eq('id', transaction.id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Transaktion gelöscht');
      await Promise.all([refreshTransactions(), refreshAccounts()]);
      // Recalculate snapshots from the transaction date
      await recalculateSnapshotsFromDate(transaction.date);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[55vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{transactionTypeLabels[transaction.transaction_type]}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Amount */}
            <div className="text-center py-4 bg-muted/30 rounded-xl">
              <p className={`text-3xl font-bold ${
                transaction.transaction_type === 'income' ? 'text-emerald-600' : 
                transaction.transaction_type === 'expense' ? 'text-rose-600' : ''
              }`}>
                {transaction.transaction_type === 'income' ? '+' : transaction.transaction_type === 'expense' ? '-' : ''}
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(transaction.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  {transaction.transaction_type === 'transfer' ? 'Von' : transaction.transaction_type === 'income' ? 'Ziel' : 'Quelle'}
                </span>
                <span className="font-medium">{getAccountName(transaction.account_id)}</span>
              </div>
              {transaction.transaction_type === 'transfer' && transaction.to_account_id && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Nach</span>
                  <span className="font-medium">{getAccountName(transaction.to_account_id)}</span>
                </div>
              )}
              {transaction.category_id && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Kategorie</span>
                  <span className="font-medium">{getCategoryName(transaction.category_id)}</span>
                </div>
              )}
              {transaction.note && (
                <div className="py-2">
                  <span className="text-muted-foreground text-sm">Notiz</span>
                  <p className="mt-1">{transaction.note}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowEdit(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Bearbeiten
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EditTransactionDialog 
        transaction={transaction}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
    </>
  );
}
