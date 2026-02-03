import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, Filter, X } from 'lucide-react';
import { useFinanceV2, V2Transaction } from '../context/FinanceV2Context';
import { AddTransactionDialog } from '../dialogs/AddTransactionDialog';
import { TransactionDetailSheet } from '../sheets/TransactionDetailSheet';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const transactionTypeIcons: Record<string, React.ReactNode> = {
  income: <ArrowUpRight className="w-4 h-4 text-emerald-500" />,
  expense: <ArrowDownRight className="w-4 h-4 text-rose-500" />,
  transfer: <ArrowLeftRight className="w-4 h-4 text-blue-500" />,
  investment_buy: <TrendingUp className="w-4 h-4 text-purple-500" />,
  investment_sell: <TrendingUp className="w-4 h-4 text-amber-500" />,
};

const transactionTypeLabels: Record<string, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
  transfer: 'Umbuchung',
  investment_buy: 'Kauf',
  investment_sell: 'Verkauf',
};

export function HistoryTab() {
  const { transactions, accounts, categories, loading } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<V2Transaction | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.transaction_type !== filterType) return false;
      if (filterAccount !== 'all' && tx.account_id !== filterAccount && tx.to_account_id !== filterAccount) return false;
      return true;
    });
  }, [transactions, filterType, filterAccount]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, V2Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

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

  const hasFilters = filterType !== 'all' || filterAccount !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button 
          variant="outline" 
          className="flex-col h-auto py-3"
          onClick={() => { setAddDialogType('income'); setShowAddDialog(true); }}
        >
          <ArrowUpRight className="w-5 h-5 text-emerald-500 mb-1" />
          <span className="text-xs">Einnahme</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex-col h-auto py-3"
          onClick={() => { setAddDialogType('expense'); setShowAddDialog(true); }}
        >
          <ArrowDownRight className="w-5 h-5 text-rose-500 mb-1" />
          <span className="text-xs">Ausgabe</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex-col h-auto py-3"
          onClick={() => { setAddDialogType('transfer'); setShowAddDialog(true); }}
        >
          <ArrowLeftRight className="w-5 h-5 text-blue-500 mb-1" />
          <span className="text-xs">Umbuchung</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="income">Einnahmen</SelectItem>
            <SelectItem value="expense">Ausgaben</SelectItem>
            <SelectItem value="transfer">Umbuchungen</SelectItem>
            <SelectItem value="investment_buy">Käufe</SelectItem>
            <SelectItem value="investment_sell">Verkäufe</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Konto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Konten</SelectItem>
            {accounts.map(acc => (
              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => { setFilterType('all'); setFilterAccount('all'); }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Transactions grouped by date */}
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <Card key={date}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {format(new Date(date), 'EEEE, dd. MMMM yyyy', { locale: de })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {txs.map(tx => {
              const category = getCategoryName(tx.category_id);
              return (
                <div 
                  key={tx.id} 
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {transactionTypeIcons[tx.transaction_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {tx.transaction_type === 'transfer' 
                        ? `${getAccountName(tx.account_id)} → ${getAccountName(tx.to_account_id)}`
                        : tx.note || transactionTypeLabels[tx.transaction_type]
                      }
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.transaction_type !== 'transfer' && getAccountName(tx.account_id)}
                      {category && ` • ${category}`}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${
                    tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell' 
                      ? 'text-emerald-600' 
                      : tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy'
                        ? 'text-rose-600'
                        : 'text-blue-600'
                  }`}>
                    {tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell' ? '+' : 
                     tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {filteredTransactions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {hasFilters ? 'Keine Transaktionen mit diesem Filter' : 'Noch keine Transaktionen'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs & Sheets */}
      <AddTransactionDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        defaultType={addDialogType}
      />
      
      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </div>
  );
}
