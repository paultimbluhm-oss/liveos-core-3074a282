import { useState, useMemo } from 'react';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

const COLORS = ['hsl(210, 100%, 60%)', 'hsl(160, 80%, 50%)', 'hsl(280, 70%, 60%)', 'hsl(30, 90%, 55%)', 'hsl(340, 80%, 55%)'];

export function DashboardTab() {
  const { 
    accounts, 
    transactions, 
    investments,
    automations,
    categories,
    totalAccountsEur, 
    totalInvestmentsEur, 
    netWorthEur,
    loading,
    snapshots,
    eurUsdRate,
  } = useFinanceV2();

  const [period, setPeriod] = useState<TimePeriod>('month');

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Get date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { locale: de }), end: endOfWeek(now, { locale: de }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'all':
        return { start: subYears(now, 10), end: now };
    }
  }, [period]);

  // Cashflow stats for selected period
  const periodStats = useMemo(() => {
    const periodTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end && 
             tx.transaction_type !== 'transfer';
    });
    
    const income = periodTx.filter(tx => tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell')
      .reduce((sum, tx) => {
        const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
        return sum + amt;
      }, 0);
    
    const expenses = periodTx.filter(tx => tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy')
      .reduce((sum, tx) => {
        const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
        return sum + amt;
      }, 0);
    
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    return { income, expenses, difference: income - expenses, savingsRate };
  }, [transactions, dateRange, eurUsdRate]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const expenseTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end && tx.transaction_type === 'expense';
    });
    
    const byCategory: Record<string, number> = {};
    let uncategorized = 0;
    
    expenseTx.forEach(tx => {
      const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
      if (tx.category_id) {
        if (!byCategory[tx.category_id]) byCategory[tx.category_id] = 0;
        byCategory[tx.category_id] += amt;
      } else {
        uncategorized += amt;
      }
    });
    
    const result = Object.entries(byCategory).map(([catId, amount]) => ({
      id: catId,
      name: categories.find(c => c.id === catId)?.name || 'Unbekannt',
      value: amount,
    }));
    
    if (uncategorized > 0) {
      result.push({ id: 'none', name: 'Ohne Kategorie', value: uncategorized });
    }
    
    return result.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions, dateRange, categories, eurUsdRate]);

  // Net worth chart data from snapshots
  const netWorthChartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    
    return snapshots
      .filter(s => {
        const sDate = new Date(s.date);
        return sDate >= dateRange.start && sDate <= dateRange.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: format(new Date(s.date), 'dd.MM'),
        value: s.net_worth_eur,
      }));
  }, [snapshots, dateRange]);

  // Investment performance
  const investmentStats = useMemo(() => {
    const totalCost = investments.reduce((sum, inv) => {
      const cost = inv.quantity * inv.avg_purchase_price;
      return sum + (inv.currency === 'USD' ? cost / eurUsdRate : cost);
    }, 0);
    const totalValue = totalInvestmentsEur;
    const profit = totalValue - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    
    return { totalCost, totalValue, profit, profitPercent };
  }, [investments, totalInvestmentsEur, eurUsdRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const periods: { key: TimePeriod; label: string }[] = [
    { key: 'week', label: 'Woche' },
    { key: 'month', label: 'Monat' },
    { key: 'year', label: 'Jahr' },
    { key: 'all', label: 'Gesamt' },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector - iOS Pill Style */}
      <div className="flex p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`
              flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300
              ${period === p.key 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Hero Net Worth Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-sm font-medium mb-2">Gesamtvermögen</p>
          <p className="text-5xl font-bold text-white tracking-tight mb-6">{formatCurrency(netWorthEur)}</p>
          
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-300" />
              </div>
              <div className="text-left">
                <p className="text-white/60 text-xs">Konten</p>
                <p className="text-white font-semibold">{formatCurrency(totalAccountsEur)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-left">
                <p className="text-white/60 text-xs">Investments</p>
                <p className="text-white font-semibold">{formatCurrency(totalInvestmentsEur)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Net Worth Chart */}
      {netWorthChartData.length > 1 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Vermögensentwicklung</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={netWorthChartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '16px',
                  fontSize: '12px',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(270, 80%, 60%)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cashflow Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Einnahmen</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(periodStats.income)}</p>
        </div>
        
        <div className="rounded-3xl bg-gradient-to-br from-rose-500/20 to-rose-600/5 backdrop-blur-xl border border-rose-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Ausgaben</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(periodStats.expenses)}</p>
        </div>
      </div>

      {/* Savings Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Netto-Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${periodStats.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {periodStats.difference >= 0 ? '+' : ''}{formatCurrency(periodStats.difference)}
          </p>
        </div>
        
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sparquote</span>
          </div>
          <p className={`text-2xl font-bold ${periodStats.savingsRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {periodStats.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Top Ausgaben</h3>
          <div className="flex gap-6">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryBreakdown.map((cat, index) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Quick View */}
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-semibold text-muted-foreground">Konten</h3>
          <span className="text-xs text-muted-foreground">{accounts.length} Konten</span>
        </div>
        <div className="divide-y divide-white/5">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Noch keine Konten</p>
          ) : (
            accounts.slice(0, 4).map(account => (
              <div key={account.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{account.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{account.account_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {account.balance.toLocaleString('de-DE', { style: 'currency', currency: account.currency })}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Investments Quick View */}
      {investments.length > 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h3 className="text-sm font-semibold text-muted-foreground">Investments</h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${investmentStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {investmentStats.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {investmentStats.profit >= 0 ? '+' : ''}{investmentStats.profitPercent.toFixed(1)}%
            </div>
          </div>
          <div className="p-5">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gesamtwert</p>
                <p className="text-2xl font-bold">{formatCurrency(investmentStats.totalValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Gewinn/Verlust</p>
                <p className={`text-lg font-semibold ${investmentStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {investmentStats.profit >= 0 ? '+' : ''}{formatCurrency(investmentStats.profit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
