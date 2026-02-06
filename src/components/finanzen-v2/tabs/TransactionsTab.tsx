import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, RefreshCw, TrendingUp, Calendar, Filter, Trash2, Pencil } from 'lucide-react';
import { useFinanceV2, V2Automation, V2Transaction } from '../context/FinanceV2Context';
import { AddAutomationDialog } from '../dialogs/AddAutomationDialog';
import { AddTransactionDialog } from '../dialogs/AddTransactionDialog';
import { TransactionDetailSheet } from '../sheets/TransactionDetailSheet';
import { format, addDays, addMonths, addYears, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = 'history' | 'automations';

const automationTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  income: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  expense: { icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  transfer: { icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  investment: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  investment_buy: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  investment_sell: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

const typeLabels: Record<string, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
  transfer: 'Umbuchung',
  investment: 'Investment',
  investment_buy: 'Kauf',
  investment_sell: 'Verkauf',
};

const intervalLabels: Record<string, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
};

export function TransactionsTab() {
  const { 
    transactions, 
    automations, 
    accounts, 
    investments, 
    categories,
    loading, 
    refreshTransactions, 
    refreshAutomations 
  } = useFinanceV2();
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [showAddAutomation, setShowAddAutomation] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [deleteItem, setDeleteItem] = useState<V2Automation | V2Transaction | null>(null);
  const [deleteType, setDeleteType] = useState<'automation' | 'transaction' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [selectedTransaction, setSelectedTransaction] = useState<V2Transaction | null>(null);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Filter transactions by month
  const filteredTransactions = useMemo(() => {
    const monthStart = startOfMonth(filterMonth);
    const monthEnd = endOfMonth(filterMonth);
    
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
    });
  }, [transactions, filterMonth]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, V2Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      const dateKey = tx.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredTransactions]);

  // Monthly totals for automations
  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    
    automations.filter(a => a.is_active).forEach(auto => {
      const monthlyAmount = auto.interval_type === 'weekly' ? auto.amount * 4.33 :
        auto.interval_type === 'yearly' ? auto.amount / 12 : auto.amount;
      
      if (auto.automation_type === 'income') income += monthlyAmount;
      if (auto.automation_type === 'expense') expenses += monthlyAmount;
    });
    
    return { income, expenses, net: income - expenses };
  }, [automations]);

  // Transaction month totals
  const transactionTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    
    filteredTransactions.forEach(tx => {
      if (tx.transaction_type === 'income') income += tx.amount;
      if (tx.transaction_type === 'expense') expenses += tx.amount;
    });
    
    return { income, expenses, net: income - expenses };
  }, [filteredTransactions]);

  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '-';
  const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || null;
  const getCategoryColor = (id?: string) => categories.find(c => c.id === id)?.color || '#6366f1';

  const getNextExecution = (auto: V2Automation) => {
    if (auto.next_execution_date) {
      return format(new Date(auto.next_execution_date), 'dd.MM', { locale: de });
    }
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), auto.execution_day);
    
    if (auto.interval_type === 'weekly') {
      const dayOfWeek = auto.execution_day;
      const currentDay = today.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7;
      nextDate = addDays(today, daysUntilNext);
    } else if (auto.interval_type === 'monthly') {
      if (nextDate <= today) nextDate = addMonths(nextDate, 1);
    } else if (auto.interval_type === 'yearly') {
      if (nextDate <= today) nextDate = addYears(nextDate, 1);
    }
    
    return format(nextDate, 'dd.MM', { locale: de });
  };

  const handleDelete = async () => {
    if (!deleteItem || !deleteType || !user) return;
    
    setDeleting(true);
    const supabase = getSupabase();
    
    const table = deleteType === 'automation' ? 'v2_automations' : 'v2_transactions';
    const { error } = await supabase.from(table).delete().eq('id', deleteItem.id);
    
    setDeleting(false);
    setDeleteItem(null);
    setDeleteType(null);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success(deleteType === 'automation' ? 'Automation gelöscht' : 'Transaktion gelöscht');
      if (deleteType === 'automation') {
        await refreshAutomations();
      } else {
        await refreshTransactions();
      }
    }
  };

  const changeMonth = (delta: number) => {
    setFilterMonth(prev => addMonths(prev, delta));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
        <button
          onClick={() => setViewMode('history')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'history' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Verlauf
        </button>
        <button
          onClick={() => setViewMode('automations')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'automations' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Automationen
        </button>
      </div>

      {viewMode === 'history' ? (
        <>
          {/* Month Selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <button 
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              ←
            </button>
            <div className="text-center">
              <p className="font-semibold">{format(filterMonth, 'MMMM yyyy', { locale: de })}</p>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.length} Transaktionen
              </p>
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              →
            </button>
          </div>

          {/* Month Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-emerald-500">{formatCurrency(transactionTotals.income)}</p>
              <p className="text-[10px] text-muted-foreground">Einnahmen</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
              <ArrowDownRight className="w-4 h-4 text-rose-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-rose-500">{formatCurrency(transactionTotals.expenses)}</p>
              <p className="text-[10px] text-muted-foreground">Ausgaben</p>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className={`text-sm font-bold ${transactionTotals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(transactionTotals.net)}
              </p>
              <p className="text-[10px] text-muted-foreground">Netto</p>
            </div>
          </div>

          {/* Add Transaction Button */}
          <Button 
            onClick={() => setShowAddTransaction(true)} 
            className="w-full h-12 rounded-xl"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Transaktion
          </Button>

          {/* Transactions List */}
          <div className="space-y-3">
            {groupedTransactions.map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  {format(new Date(date), 'EEEE, d. MMMM', { locale: de })}
                </p>
                <div className="rounded-2xl overflow-hidden bg-card border border-border">
                  {txs.map((tx, index) => {
                    const config = automationTypeConfig[tx.transaction_type] || automationTypeConfig.expense;
                    const categoryName = getCategoryName(tx.category_id);
                    const categoryColor = getCategoryColor(tx.category_id);
                    
                    return (
                      <button 
                        key={tx.id}
                        onClick={() => setSelectedTransaction(tx)}
                        className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${index !== txs.length - 1 ? 'border-b border-border' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                          <span className={config.color}>{config.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {tx.note || typeLabels[tx.transaction_type]}
                            </p>
                            {categoryName && (
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: categoryColor }}
                              >
                                {categoryName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getAccountName(tx.account_id)}
                            {tx.to_account_id && ` → ${getAccountName(tx.to_account_id)}`}
                          </p>
                        </div>
                        <span className={`font-semibold ${config.color}`}>
                          {tx.transaction_type === 'income' ? '+' : tx.transaction_type === 'expense' ? '-' : ''}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {groupedTransactions.length === 0 && (
              <div className="rounded-2xl bg-card border border-border p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">Keine Transaktionen</p>
                <p className="text-sm text-muted-foreground">in diesem Monat</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Monthly Automation Summary */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 p-4">
            <p className="text-sm text-muted-foreground mb-3 text-center">Monatliche Automationen</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(monthlyTotals.income)}</p>
                <p className="text-[10px] text-muted-foreground">Einnahmen</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-rose-400">{formatCurrency(monthlyTotals.expenses)}</p>
                <p className="text-[10px] text-muted-foreground">Ausgaben</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${monthlyTotals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(monthlyTotals.net)}
                </p>
                <p className="text-[10px] text-muted-foreground">Netto</p>
              </div>
            </div>
          </div>

          {/* Add Automation Button */}
          <Button 
            onClick={() => setShowAddAutomation(true)} 
            className="w-full h-12 rounded-xl"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Automation
          </Button>

          {/* Automations List */}
          <div className="space-y-2">
            {automations.map(auto => {
              const config = automationTypeConfig[auto.automation_type] || automationTypeConfig.expense;
              
              return (
                <div 
                  key={auto.id}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-card border border-border ${!auto.is_active ? 'opacity-50' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{auto.name}</p>
                      {!auto.is_active && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Pausiert</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {intervalLabels[auto.interval_type]} · Nächste: {getNextExecution(auto)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${config.color}`}>
                      {formatCurrency(auto.amount, auto.currency)}
                    </span>
                    <button
                      onClick={() => { setDeleteItem(auto); setDeleteType('automation'); }}
                      className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center hover:bg-rose-500/20"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                    </button>
                  </div>
                </div>
              );
            })}

            {automations.length === 0 && (
              <div className="rounded-2xl bg-card border border-border p-8 text-center">
                <RefreshCw className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">Keine Automationen</p>
                <p className="text-sm text-muted-foreground">Richte wiederkehrende Buchungen ein</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialogs */}
      <AddAutomationDialog open={showAddAutomation} onOpenChange={setShowAddAutomation} />
      <AddTransactionDialog open={showAddTransaction} onOpenChange={setShowAddTransaction} />

      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'automation' ? 'Automation' : 'Transaktion'} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-rose-500 hover:bg-rose-600">
              {deleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
