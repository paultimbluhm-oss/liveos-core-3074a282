import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RecurringSection } from '../RecurringSection';
import { EditTransactionDialog } from '../EditTransactionDialog';
import { AddTransactionDialog } from '../AddTransactionDialog';
import type { Account, Investment, Transaction } from '../hooks/useFinanceData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HistoryTabProps {
  accounts: Account[];
  investments: Investment[];
  transactions: Transaction[];
  onRefresh: () => void;
  onDeleteTransaction: (id: string) => void;
}

export function HistoryTab({
  accounts,
  investments,
  transactions,
  onRefresh,
  onDeleteTransaction,
}: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery || 
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isTransfer = tx.transaction_type === 'transfer' || tx.category === 'Umschichtung';
    
    const matchesFilter = filterType === 'all' ||
      (filterType === 'income' && tx.transaction_type === 'income' && !isTransfer) ||
      (filterType === 'expense' && tx.transaction_type === 'expense' && !isTransfer) ||
      (filterType === 'transfer' && isTransfer);
    
    return matchesSearch && matchesFilter;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = format(new Date(tx.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Heute';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Gestern';
    }
    return format(date, 'EEEE, dd. MMMM', { locale: de });
  };

  return (
    <div className="space-y-4">
      {/* Add Transaction Button */}
      <div className="flex justify-end">
        <AddTransactionDialog accounts={accounts} onTransactionAdded={onRefresh} />
      </div>

      {/* Search and Filter Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="income">Einnahmen</SelectItem>
            <SelectItem value="expense">Ausgaben</SelectItem>
            <SelectItem value="transfer">Transfers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterType !== 'all' 
                ? 'Keine Transaktionen gefunden' 
                : 'Noch keine Transaktionen vorhanden'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([date, txList]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                {getDateLabel(date)}
              </p>
              <Card className="border-border/50 overflow-hidden">
                <div className="divide-y divide-border/30">
                  {txList.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.account_id);
                    const isTransfer = tx.transaction_type === 'transfer' || tx.category === 'Umschichtung';
                    const isIncome = tx.transaction_type === 'income' && !isTransfer;
                    
                    return (
                      <div 
                        key={tx.id} 
                        className="flex items-center gap-3 p-3 bg-card/30 hover:bg-card/50 transition-colors group"
                      >
                        <div className={cn(
                          "w-1 h-10 rounded-full shrink-0",
                          isTransfer ? "bg-sky-400" : isIncome ? "bg-emerald-500" : "bg-rose-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {isTransfer ? tx.description || 'Umschichtung' : tx.description || tx.category || 'Transaktion'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isTransfer ? 'Umschichtung' : account?.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "font-bold text-sm",
                            isTransfer ? "text-sky-400" : isIncome ? "text-emerald-500" : "text-rose-400"
                          )}>
                            {isTransfer ? '↔' : isIncome ? '+' : '-'}
                            {tx.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingTransaction(tx);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => onDeleteTransaction(tx.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Recurring / Subscriptions Section */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <RecurringSection 
            accounts={accounts} 
            investments={investments} 
            onTransactionExecuted={onRefresh} 
          />
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        accounts={accounts}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTransactionUpdated={onRefresh}
      />
    </div>
  );
}
