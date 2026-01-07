import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Wallet, TrendingUp, ChevronDown, RefreshCw, History, BarChart3, Edit2, TrendingDown, Minus } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { AccountCard } from './AccountCard';
import { AddAccountDialog } from './AddAccountDialog';
import { AddInvestmentDialog } from './AddInvestmentDialog';
import { AddTransactionDialog } from './AddTransactionDialog';
import { EditTransactionDialog } from './EditTransactionDialog';
import { InvestmentCard } from './InvestmentCard';
import { LoansSection } from './LoansSection';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [statsOpen, setStatsOpen] = useState(false);
  
  // Chart filter states
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [showEtfs, setShowEtfs] = useState(true);
  const [showCrypto, setShowCrypto] = useState(true);
  
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

    if (accountsRes.data) {
      setAccounts(accountsRes.data);
      // Select all accounts by default for chart
      if (selectedAccountIds.length === 0) {
        setSelectedAccountIds(accountsRes.data.map(a => a.id));
      }
    }
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

    // Check if entry already exists for today
    const { data: existing } = await supabase
      .from('balance_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('balance_history')
        .update({
          total_balance: totalBalance,
          accounts_balance: accountsBalance,
          investments_balance: investmentsBalance,
          balance: totalBalance,
        })
        .eq('id', existing.id);
    } else {
      // Insert new
      await supabase
        .from('balance_history')
        .insert({
          user_id: user.id,
          date: today,
          balance: totalBalance,
          total_balance: totalBalance,
          accounts_balance: accountsBalance,
          investments_balance: investmentsBalance,
        });
    }
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

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  const stockInvestments = investments.filter(i => i.investment_type === 'etf' || i.investment_type === 'stock');
  const cryptoInvestments = investments.filter(i => i.investment_type === 'crypto');
  
  const etfTotalValue = stockInvestments.reduce((sum, inv) => {
    const price = prices[inv.id] || inv.purchase_price / inv.quantity;
    return sum + inv.quantity * price;
  }, 0);
  
  const etfTotalCost = stockInvestments.reduce((sum, inv) => sum + inv.purchase_price, 0);
  const etfProfit = etfTotalValue - etfTotalCost;
  const etfProfitPercent = etfTotalCost > 0 ? (etfProfit / etfTotalCost) * 100 : 0;
  
  const cryptoTotalValue = cryptoInvestments.reduce((sum, inv) => {
    const price = prices[inv.id] || inv.purchase_price / inv.quantity;
    return sum + inv.quantity * price;
  }, 0);
  
  const cryptoTotalCost = cryptoInvestments.reduce((sum, inv) => sum + inv.purchase_price, 0);
  const cryptoProfit = cryptoTotalValue - cryptoTotalCost;
  const cryptoProfitPercent = cryptoTotalCost > 0 ? (cryptoProfit / cryptoTotalCost) * 100 : 0;
  
  const totalInvestments = etfTotalValue + cryptoTotalValue;

  useEffect(() => {
    if (accounts.length > 0 || investments.length > 0) {
      saveBalanceHistory(totalBalance, totalInvestments);
    }
  }, [totalBalance, totalInvestments]);

  // Monthly overview calculations (excluding transfers/Umschichtungen)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });
    
    // Exclude transfers from income/expense calculations
    const income = monthTransactions
      .filter(tx => tx.transaction_type === 'income' && tx.category !== 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const expenses = monthTransactions
      .filter(tx => tx.transaction_type === 'expense' && tx.category !== 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    return { income, expenses, difference: income - expenses };
  }, [transactions]);

  const bankAccounts = accounts.filter((a) => a.account_type === 'bank');
  const cashAccounts = accounts.filter((a) => a.account_type === 'cash_bills' || a.account_type === 'cash_coins');

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const formatCurrencyDecimal = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

  // Build chart data with selectable lines
  const detailChartData = useMemo(() => {
    return balanceHistory.map(day => {
      const data: Record<string, any> = { date: day.date };
      
      // Add selected accounts
      accounts.forEach(acc => {
        if (selectedAccountIds.includes(acc.id)) {
          // Estimate based on ratio - in real scenario we'd need per-account history
          const ratio = acc.balance / Math.max(totalBalance, 1);
          data[`account_${acc.id}`] = Math.round((day.accounts_balance || 0) * ratio);
        }
      });
      
      // Add ETFs/Stocks
      if (showEtfs && stockInvestments.length > 0) {
        const ratio = etfTotalValue / Math.max(totalInvestments, 1);
        data['etfs'] = Math.round((day.investments_balance || 0) * ratio);
      }
      
      // Add Crypto
      if (showCrypto && cryptoInvestments.length > 0) {
        const ratio = cryptoTotalValue / Math.max(totalInvestments, 1);
        data['crypto'] = Math.round((day.investments_balance || 0) * ratio);
      }
      
      return data;
    });
  }, [balanceHistory, accounts, selectedAccountIds, showEtfs, showCrypto, totalBalance, totalInvestments, etfTotalValue, cryptoTotalValue]);

  const chartColors = [
    'hsl(221, 83%, 53%)', // Blue
    'hsl(142, 71%, 45%)', // Green
    'hsl(262, 83%, 58%)', // Purple
    'hsl(38, 92%, 50%)',  // Orange
    'hsl(0, 84%, 60%)',   // Red
    'hsl(180, 70%, 45%)', // Cyan
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-2 shadow-xl">
          <p className="text-[10px] text-muted-foreground mb-1">
            {format(new Date(label), 'dd. MMM yyyy', { locale: de })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
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

      {/* Monthly Overview */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground mb-2">
            {format(new Date(), 'MMMM yyyy', { locale: de })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Einnahmen</p>
              <p className="text-sm font-bold text-emerald-500">+{formatCurrencyDecimal(monthlyStats.income)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Ausgaben</p>
              <p className="text-sm font-bold text-rose-400">-{formatCurrencyDecimal(monthlyStats.expenses)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Differenz</p>
              <div className="flex items-center gap-1">
                {monthlyStats.difference > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : monthlyStats.difference < 0 ? (
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                ) : (
                  <Minus className="w-3 h-3 text-muted-foreground" />
                )}
                <p className={cn(
                  "text-sm font-bold",
                  monthlyStats.difference > 0 ? "text-emerald-500" : 
                  monthlyStats.difference < 0 ? "text-rose-400" : "text-muted-foreground"
                )}>
                  {monthlyStats.difference >= 0 ? '+' : ''}{formatCurrencyDecimal(monthlyStats.difference)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {bankAccounts.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {bankAccounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onUpdated={fetchData} />
              ))}
            </div>
          )}
          {cashAccounts.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {cashAccounts.map((acc) => (
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
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">Aktien & ETFs</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{formatCurrency(etfTotalValue)}</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    etfProfit >= 0 ? "text-emerald-500" : "text-rose-400"
                  )}>
                    {etfProfit >= 0 ? '+' : ''}{formatCurrencyDecimal(etfProfit)} ({etfProfitPercent >= 0 ? '+' : ''}{etfProfitPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
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
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Kryptowährungen</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchPrices(cryptoInvestments)}
                    className="h-5 px-1.5 text-[10px]"
                  >
                    <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                    Aktualisieren
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{formatCurrency(cryptoTotalValue)}</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    cryptoProfit >= 0 ? "text-emerald-500" : "text-rose-400"
                  )}>
                    {cryptoProfit >= 0 ? '+' : ''}{formatCurrencyDecimal(cryptoProfit)} ({cryptoProfitPercent >= 0 ? '+' : ''}{cryptoProfitPercent.toFixed(1)}%)
                  </span>
                </div>
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
                        {account?.name} - {format(new Date(tx.date), 'dd.MM.yy', { locale: de })}
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

      {/* Statistics Section */}
      <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/50 cursor-pointer hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Statistiken</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", statsOpen && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          {balanceHistory.length > 0 ? (
            <>
              {/* Chart 1: Total Wealth */}
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="p-2 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Gesamtvermögen</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={balanceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM', { locale: de })}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                          width={35}
                          domain={['dataMin - 100', 'dataMax + 100']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="total_balance" 
                          name="Gesamt"
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fill="url(#gradientTotal)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2: Detail with filters */}
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="p-2 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Aufschlüsselung</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {accounts.map((acc, idx) => (
                      <label key={acc.id} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={selectedAccountIds.includes(acc.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAccountIds(prev => [...prev, acc.id]);
                            } else {
                              setSelectedAccountIds(prev => prev.filter(id => id !== acc.id));
                            }
                          }}
                          className="h-3 w-3"
                        />
                        <span style={{ color: chartColors[idx % chartColors.length] }}>{acc.name}</span>
                      </label>
                    ))}
                    {stockInvestments.length > 0 && (
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={showEtfs}
                          onCheckedChange={(checked) => setShowEtfs(!!checked)}
                          className="h-3 w-3"
                        />
                        <span style={{ color: 'hsl(262, 83%, 58%)' }}>ETFs/Aktien</span>
                      </label>
                    )}
                    {cryptoInvestments.length > 0 && (
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={showCrypto}
                          onCheckedChange={(checked) => setShowCrypto(!!checked)}
                          className="h-3 w-3"
                        />
                        <span style={{ color: 'hsl(38, 92%, 50%)' }}>Krypto</span>
                      </label>
                    )}
                  </div>
                  
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM', { locale: de })}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                          width={35}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px' }}
                          iconType="circle"
                          iconSize={6}
                        />
                        {accounts.map((acc, idx) => (
                          selectedAccountIds.includes(acc.id) && (
                            <Line 
                              key={acc.id}
                              type="monotone" 
                              dataKey={`account_${acc.id}`}
                              name={acc.name}
                              stroke={chartColors[idx % chartColors.length]}
                              strokeWidth={1.5}
                              dot={false}
                            />
                          )
                        ))}
                        {showEtfs && stockInvestments.length > 0 && (
                          <Line 
                            type="monotone" 
                            dataKey="etfs"
                            name="ETFs/Aktien"
                            stroke="hsl(262, 83%, 58%)"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        )}
                        {showCrypto && cryptoInvestments.length > 0 && (
                          <Line 
                            type="monotone" 
                            dataKey="crypto"
                            name="Krypto"
                            stroke="hsl(38, 92%, 50%)"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-6 text-center text-muted-foreground text-xs">
              Noch nicht genügend Daten für Statistiken
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
