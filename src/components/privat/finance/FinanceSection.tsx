import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Wallet, TrendingUp, ArrowUpDown, RefreshCw, ChevronDown, Banknote, Coins, Bitcoin, BarChart3, Edit2, History, Plus } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { AccountCard } from './AccountCard';
import { AddAccountDialog } from './AddAccountDialog';
import { AddInvestmentDialog } from './AddInvestmentDialog';
import { AddTransactionDialog } from './AddTransactionDialog';
import { EditTransactionDialog } from './EditTransactionDialog';
import { InvestmentCard } from './InvestmentCard';
import { LoansSection } from './LoansSection';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface Investment {
  id: string;
  name: string;
  symbol: string | null;
  investment_type: string;
  quantity: number;
  purchase_price: number;
  currency: string;
}

interface Transaction {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
}

interface BalanceHistory {
  date: string;
  total_balance: number;
  accounts_balance: number;
  investments_balance: number;
}

interface FinanceSectionProps {
  onBack: () => void;
}

export function FinanceSection({ onBack }: FinanceSectionProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  
  // Section states
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [investmentsOpen, setInvestmentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Edit transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const [accountsRes, investmentsRes, transactionsRes, historyRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
      supabase.from('investments').select('*').eq('user_id', user.id).order('name'),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50),
      supabase
        .from('balance_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (investmentsRes.data) {
      setInvestments(investmentsRes.data);
      fetchPrices(investmentsRes.data);
    }
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (historyRes.data) setBalanceHistory(historyRes.data);
  };

  const saveBalanceHistory = async (accountsBalance: number, investmentsBalance: number) => {
    if (!user) return;
    const supabase = getSupabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    const totalBalance = accountsBalance + investmentsBalance;

    await supabase
      .from('balance_history')
      .upsert({
        user_id: user.id,
        date: today,
        total_balance: totalBalance,
        accounts_balance: accountsBalance,
        investments_balance: investmentsBalance,
      }, { onConflict: 'user_id,date' });
  };

  const fetchPrices = async (invs: Investment[]) => {
    const cryptoInvs = invs.filter((i) => i.investment_type === 'crypto' && i.symbol);
    const cryptoByEur = cryptoInvs.filter(i => i.currency === 'EUR' || !i.currency);
    const cryptoByUsd = cryptoInvs.filter(i => i.currency === 'USD');
    
    const fetchCryptoPrices = async (invList: Investment[], vsCurrency: string) => {
      if (invList.length === 0) return;
      const ids = invList.map((i) => i.symbol?.toLowerCase()).join(',');
      setLoadingPrices((prev) => {
        const newState = { ...prev };
        invList.forEach((i) => (newState[i.id] = true));
        return newState;
      });

      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}`
        );
        const data = await res.json();

        const newPrices: Record<string, number> = {};
        invList.forEach((inv) => {
          const symbol = inv.symbol?.toLowerCase();
          if (symbol && data[symbol]?.[vsCurrency]) {
            newPrices[inv.id] = data[symbol][vsCurrency];
          }
        });
        setPrices((prev) => ({ ...prev, ...newPrices }));
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }

      setLoadingPrices((prev) => {
        const newState = { ...prev };
        invList.forEach((i) => (newState[i.id] = false));
        return newState;
      });
    };

    await Promise.all([
      fetchCryptoPrices(cryptoByEur, 'eur'),
      fetchCryptoPrices(cryptoByUsd, 'usd'),
    ]);

    const stockInvs = invs.filter(
      (i) => (i.investment_type === 'etf' || i.investment_type === 'stock') && i.symbol
    );
    
    for (const inv of stockInvs) {
      if (!inv.symbol) continue;
      setLoadingPrices((prev) => ({ ...prev, [inv.id]: true }));
      try {
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
          body: { symbol: inv.symbol, targetCurrency: inv.currency || 'EUR' },
        });
        if (!error && data?.price) {
          setPrices((prev) => ({ ...prev, [inv.id]: data.price }));
        }
      } catch (error) {
        console.error('Error fetching stock price:', error);
      }
      setLoadingPrices((prev) => ({ ...prev, [inv.id]: false }));
    }
  };

  const refreshPrice = async (investment: Investment) => {
    if (!investment.symbol) return;
    const currency = investment.currency || 'EUR';
    const vsCurrency = currency.toLowerCase();
    
    setLoadingPrices((prev) => ({ ...prev, [investment.id]: true }));
    
    try {
      if (investment.investment_type === 'crypto') {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${investment.symbol.toLowerCase()}&vs_currencies=${vsCurrency}`
        );
        const data = await res.json();
        const price = data[investment.symbol.toLowerCase()]?.[vsCurrency];
        if (price) {
          setPrices((prev) => ({ ...prev, [investment.id]: price }));
        }
      } else {
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
          body: { symbol: investment.symbol, targetCurrency: currency },
        });
        if (!error && data?.price) {
          setPrices((prev) => ({ ...prev, [investment.id]: data.price }));
        }
      }
    } catch (error) {
      console.error('Error refreshing price:', error);
    }
    
    setLoadingPrices((prev) => ({ ...prev, [investment.id]: false }));
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    
    const supabaseClient = getSupabase();
    const tx = transactions.find(t => t.id === id);
    
    if (tx) {
      // Reverse the balance change
      const account = accounts.find(a => a.id === tx.account_id);
      if (account) {
        const balanceChange = tx.transaction_type === 'income' ? -tx.amount : tx.amount;
        await supabaseClient
          .from('accounts')
          .update({ balance: account.balance + balanceChange })
          .eq('id', account.id);
      }
    }
    
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Transaktion gelöscht');
      fetchData();
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalInvestments = investments.reduce((sum, inv) => {
    if (prices[inv.id]) {
      return sum + inv.quantity * prices[inv.id];
    }
    return sum + inv.purchase_price;
  }, 0);

  useEffect(() => {
    if (accounts.length > 0 || investments.length > 0) {
      saveBalanceHistory(totalBalance, totalInvestments);
    }
  }, [totalBalance, totalInvestments]);

  const bankAccounts = accounts.filter((a) => a.account_type === 'bank');
  const cashBills = accounts.filter((a) => a.account_type === 'cash_bills');
  const cashCoins = accounts.filter((a) => a.account_type === 'cash_coins');
  const cryptoInvestments = investments.filter((i) => i.investment_type === 'crypto');
  const stockInvestments = investments.filter(
    (i) => i.investment_type === 'etf' || i.investment_type === 'stock'
  );

  const last90Days = balanceHistory.slice(-90);
  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-2 shadow-xl">
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(label), 'dd. MMM', { locale: de })}
          </p>
          <p className="text-xs font-bold text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <p className="text-xl font-bold">{formatCurrency(totalBalance + totalInvestments)}</p>
          <p className="text-[10px] text-muted-foreground">Gesamtvermögen</p>
        </div>
        <div className="flex gap-1">
          <AddTransactionDialog accounts={accounts} onTransactionAdded={fetchData} />
          <AddInvestmentDialog onInvestmentAdded={fetchData} />
          <AddAccountDialog onAccountAdded={fetchData} />
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground">Konten</p>
          <p className="text-sm font-bold">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
          <p className="text-[10px] text-muted-foreground">Investments</p>
          <p className="text-sm font-bold">{formatCurrency(totalInvestments)}</p>
        </div>
      </div>

      {/* Chart - Compact with Y-Axis labels */}
      {balanceHistory.length > 1 && (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-2">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last90Days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient90" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => format(new Date(value), 'dd.MM', { locale: de })}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value/1000).toFixed(1)}k`}
                    width={32}
                    domain={['dataMin - 100', 'dataMax + 100']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total_balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={1.5}
                    fill="url(#gradient90)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Section */}
      <Collapsible open={accountsOpen} onOpenChange={setAccountsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/50 cursor-pointer hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Konten</span>
              <span className="text-xs text-muted-foreground">({accounts.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{formatCurrency(totalBalance)}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", accountsOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {/* Bank Accounts - 2 column grid */}
          {bankAccounts.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {bankAccounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onUpdated={fetchData} />
              ))}
            </div>
          )}
          
          {/* Cash - 2 column grid */}
          {(cashBills.length > 0 || cashCoins.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {cashBills.map((acc) => (
                <AccountCard key={acc.id} account={acc} onUpdated={fetchData} />
              ))}
              {cashCoins.map((acc) => (
                <AccountCard key={acc.id} account={acc} onUpdated={fetchData} />
              ))}
            </div>
          )}
          
          <LoansSection onRefresh={fetchData} accounts={accounts} />
        </CollapsibleContent>
      </Collapsible>

      {/* Investments Section */}
      <Collapsible open={investmentsOpen} onOpenChange={setInvestmentsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/50 cursor-pointer hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">Investments</span>
              <span className="text-xs text-muted-foreground">({investments.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{formatCurrency(totalInvestments)}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", investmentsOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {/* Stocks & ETFs */}
          {stockInvestments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Aktien & ETFs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {stockInvestments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    currentPrice={prices[inv.id] || null}
                    loading={loadingPrices[inv.id] || false}
                    onDeleted={fetchData}
                    onRefresh={() => refreshPrice(inv)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Crypto */}
          {cryptoInvestments.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">Kryptowährungen</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPrices(cryptoInvestments)}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Aktualisieren
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cryptoInvestments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    currentPrice={prices[inv.id] || null}
                    loading={loadingPrices[inv.id] || false}
                    onDeleted={fetchData}
                    onRefresh={() => refreshPrice(inv)}
                  />
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Transaction History Section */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/50 cursor-pointer hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Verlauf</span>
              <span className="text-xs text-muted-foreground">({transactions.length})</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", historyOpen && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {transactions.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-xs">
              Keine Transaktionen
            </div>
          ) : (
            <div className="divide-y divide-border/30 rounded-lg border border-border/50 overflow-hidden">
              {transactions.map((tx) => {
                const account = accounts.find((a) => a.id === tx.account_id);
                const isIncome = tx.transaction_type === 'income';
                return (
                  <div 
                    key={tx.id} 
                    className="flex items-center gap-2 p-2 bg-card/30 hover:bg-card/50 transition-colors group"
                  >
                    <div className={cn(
                      "w-1 h-8 rounded-full shrink-0",
                      isIncome ? "bg-emerald-500" : "bg-rose-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        {tx.description || tx.category || 'Transaktion'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {account?.name} • {format(new Date(tx.date), 'dd.MM.yy', { locale: de })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn(
                        "font-semibold text-xs",
                        isIncome ? "text-emerald-500" : "text-rose-400"
                      )}>
                        {isIncome ? '+' : '-'}{tx.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransaction(tx);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        accounts={accounts}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTransactionUpdated={fetchData}
      />
    </div>
  );
}