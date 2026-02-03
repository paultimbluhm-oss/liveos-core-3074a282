import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, Filter, X } from 'lucide-react';
import { useFinanceV2, V2Transaction } from '../context/FinanceV2Context';
import { AddTransactionDialog } from '../dialogs/AddTransactionDialog';
import { TransactionDetailSheet } from '../sheets/TransactionDetailSheet';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const transactionTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  income: { 
    icon: <ArrowUpRight className="w-5 h-5" />, 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20'
  },
  expense: { 
    icon: <ArrowDownRight className="w-5 h-5" />, 
    color: 'text-rose-400',
    bg: 'bg-rose-500/20'
  },
  transfer: { 
    icon: <ArrowLeftRight className="w-5 h-5" />, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  investment_buy: { 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: 'text-violet-400',
    bg: 'bg-violet-500/20'
  },
  investment_sell: { 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: 'text-amber-400',
    bg: 'bg-amber-500/20'
  },
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

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.transaction_type !== filterType) return false;
      return true;
    });
  }, [transactions, filterType]);

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

  const hasFilters = filterType !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filterOptions = [
    { key: 'all', label: 'Alle' },
    { key: 'income', label: 'Einnahmen' },
    { key: 'expense', label: 'Ausgaben' },
    { key: 'transfer', label: 'Umbuchungen' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button 
          className="h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20 border border-emerald-500/20 flex-col gap-1"
          variant="ghost"
          onClick={() => { setAddDialogType('income'); setShowAddDialog(true); }}
        >
          <ArrowUpRight className="w-6 h-6 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Einnahme</span>
        </Button>
        <Button 
          className="h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 hover:from-rose-500/30 hover:to-rose-600/20 border border-rose-500/20 flex-col gap-1"
          variant="ghost"
          onClick={() => { setAddDialogType('expense'); setShowAddDialog(true); }}
        >
          <ArrowDownRight className="w-6 h-6 text-rose-400" />
          <span className="text-xs font-medium text-rose-400">Ausgabe</span>
        </Button>
        <Button 
          className="h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/20 flex-col gap-1"
          variant="ghost"
          onClick={() => { setAddDialogType('transfer'); setShowAddDialog(true); }}
        >
          <ArrowLeftRight className="w-6 h-6 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">Umbuchung</span>
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterOptions.map(option => (
          <button
            key={option.key}
            onClick={() => setFilterType(option.key)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200
              ${filterType === option.key 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10'
              }
            `}
          >
            {option.label}
          </button>
        ))}
        {hasFilters && (
          <button
            onClick={() => setFilterType('all')}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Transactions grouped by date */}
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">
            {format(new Date(date), 'EEEE, dd. MMMM', { locale: de })}
          </h3>
          
          <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
            {txs.map((tx, index) => {
              const config = transactionTypeConfig[tx.transaction_type];
              const category = getCategoryName(tx.category_id);
              
              return (
                <div 
                  key={tx.id} 
                  className={`
                    flex items-center gap-4 p-4 cursor-pointer
                    transition-all duration-200 active:scale-[0.98]
                    hover:bg-white/5
                    ${index !== txs.length - 1 ? 'border-b border-white/5' : ''}
                  `}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-2xl ${config.bg} flex items-center justify-center`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {tx.transaction_type === 'transfer' 
                        ? `${getAccountName(tx.account_id)} → ${getAccountName(tx.to_account_id)}`
                        : tx.note || transactionTypeLabels[tx.transaction_type]
                      }
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {tx.transaction_type !== 'transfer' && getAccountName(tx.account_id)}
                      {category && ` · ${category}`}
                    </p>
                  </div>

                  {/* Amount */}
                  <span className={`font-bold text-base ${
                    tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell' 
                      ? 'text-emerald-400' 
                      : tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy'
                        ? 'text-rose-400'
                        : 'text-blue-400'
                  }`}>
                    {tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell' ? '+' : 
                     tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {filteredTransactions.length === 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center mx-auto mb-6">
            <Filter className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">
            {hasFilters ? 'Keine Ergebnisse' : 'Noch keine Transaktionen'}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasFilters ? 'Keine Transaktionen mit diesem Filter' : 'Erstelle deine erste Buchung'}
          </p>
        </div>
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
