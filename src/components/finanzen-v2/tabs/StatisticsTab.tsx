import { useState, useMemo } from 'react';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, eachMonthOfInterval, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart as PieIcon, BarChart3, Activity, Wallet, Target, CalendarDays, Percent } from 'lucide-react';

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(142, 70%, 45%)', 
  'hsl(210, 80%, 55%)', 
  'hsl(280, 70%, 55%)', 
  'hsl(45, 90%, 50%)', 
  'hsl(340, 80%, 55%)',
  'hsl(180, 70%, 45%)',
  'hsl(20, 80%, 55%)',
];

export function StatisticsTab() {
  const { 
    transactions, 
    investments, 
    snapshots, 
    categories,
    accounts,
    automations,
    externalSavings,
    eurUsdRate, 
    totalAccountsEur,
    totalInvestmentsEur,
    netWorthEur,
    loading 
  } = useFinanceV2();

  const [period, setPeriod] = useState<TimePeriod>('year');

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const formatPercent = (value: number) => 
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  // Get date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subWeeks(now, 1), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'all':
        return { start: subYears(now, 5), end: now };
    }
  }, [period]);

  // Daily spending for week view
  const dailySpending = useMemo(() => {
    if (period !== 'week') return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return format(txDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && 
               tx.transaction_type === 'expense';
      });
      
      const total = dayTx.reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      
      return {
        name: format(day, 'EEE', { locale: de }),
        date: format(day, 'dd.MM'),
        value: total,
      };
    });
  }, [transactions, dateRange, period, eurUsdRate]);

  // Monthly cashflow data
  const monthlyCashflow = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd && 
               tx.transaction_type !== 'transfer';
      });
      
      const income = monthTx
        .filter(tx => tx.transaction_type === 'income')
        .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      
      const expenses = monthTx
        .filter(tx => tx.transaction_type === 'expense')
        .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      
      return {
        name: format(month, 'MMM', { locale: de }),
        income,
        expenses,
        net: income - expenses,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      };
    });
  }, [transactions, dateRange, eurUsdRate]);

  // Category breakdown with percentages
  const categoryData = useMemo(() => {
    const expenseTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end && 
             tx.transaction_type === 'expense';
    });
    
    const byCategory: Record<string, number> = {};
    let total = 0;
    
    expenseTx.forEach(tx => {
      const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
      total += amt;
      const catId = tx.category_id || 'none';
      if (!byCategory[catId]) byCategory[catId] = 0;
      byCategory[catId] += amt;
    });
    
    const result = Object.entries(byCategory).map(([catId, value]) => {
      const category = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: catId === 'none' ? 'Ohne Kategorie' : (category?.name || 'Unbekannt'),
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
        color: category?.color || '#6366f1',
      };
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [transactions, dateRange, categories, eurUsdRate]);

  // Net worth over time
  const netWorthHistory = useMemo(() => {
    return snapshots
      .filter(s => {
        const sDate = new Date(s.date);
        return sDate >= dateRange.start && sDate <= dateRange.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: format(new Date(s.date), period === 'week' ? 'EEE' : 'dd.MM', { locale: de }),
        value: s.net_worth_eur,
        accounts: s.total_accounts_eur,
        investments: s.total_investments_eur,
      }));
  }, [snapshots, dateRange, period]);

  // Investment allocation
  const investmentAllocation = useMemo(() => {
    const byType: Record<string, number> = {};
    
    investments.forEach(inv => {
      const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      const valueEur = inv.currency === 'USD' ? value / eurUsdRate : value;
      
      if (!byType[inv.asset_type]) byType[inv.asset_type] = 0;
      byType[inv.asset_type] += valueEur;
    });
    
    const typeLabels: Record<string, string> = {
      etf: 'ETF',
      stock: 'Aktien',
      fund: 'Fonds',
      crypto: 'Krypto',
      metal: 'Metalle',
      other: 'Andere',
    };
    
    return Object.entries(byType).map(([type, value]) => ({
      name: typeLabels[type] || type,
      value,
    }));
  }, [investments, eurUsdRate]);

  // Investment performance
  const investmentPerformance = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    
    investments.forEach(inv => {
      const invested = inv.quantity * inv.avg_purchase_price;
      const current = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      
      if (inv.currency === 'USD') {
        totalInvested += invested / eurUsdRate;
        totalCurrent += current / eurUsdRate;
      } else {
        totalInvested += invested;
        totalCurrent += current;
      }
    });
    
    const absoluteGain = totalCurrent - totalInvested;
    const percentGain = totalInvested > 0 ? (absoluteGain / totalInvested) * 100 : 0;
    
    return { invested: totalInvested, current: totalCurrent, gain: absoluteGain, percent: percentGain };
  }, [investments, eurUsdRate]);

  // Account distribution
  const accountDistribution = useMemo(() => {
    return accounts.map(acc => ({
      name: acc.name,
      value: acc.currency === 'USD' ? acc.balance / eurUsdRate : acc.balance,
      type: acc.account_type,
    })).sort((a, b) => b.value - a.value);
  }, [accounts, eurUsdRate]);

  // Period totals
  const periodTotals = useMemo(() => {
    const periodTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
    
    const income = periodTx
      .filter(tx => tx.transaction_type === 'income')
      .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
    
    const expenses = periodTx
      .filter(tx => tx.transaction_type === 'expense')
      .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
    
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    return { income, expenses, net: income - expenses, savingsRate };
  }, [transactions, dateRange, eurUsdRate]);

  // Automation projections
  const monthlyAutomations = useMemo(() => {
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

  // Top expense categories
  const topExpenseCategories = categoryData.slice(0, 5);

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
    { key: 'quarter', label: 'Quartal' },
    { key: 'year', label: 'Jahr' },
    { key: 'all', label: 'Gesamt' },
  ];

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl overflow-x-auto">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
              ${period === p.key 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Net Worth</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(netWorthEur)}</p>
        </div>
        
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Percent className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs text-muted-foreground">Sparquote</span>
          </div>
          <p className={`text-xl font-bold ${periodTotals.savingsRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {periodTotals.savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-base font-bold text-emerald-500">{formatCurrency(periodTotals.income)}</p>
          <p className="text-[10px] text-muted-foreground">Einnahmen</p>
        </div>
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
          <ArrowDownRight className="w-4 h-4 text-rose-500 mx-auto mb-1" />
          <p className="text-base font-bold text-rose-500">{formatCurrency(periodTotals.expenses)}</p>
          <p className="text-[10px] text-muted-foreground">Ausgaben</p>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
          <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className={`text-base font-bold ${periodTotals.net >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {formatCurrency(periodTotals.net)}
          </p>
          <p className="text-[10px] text-muted-foreground">Netto</p>
        </div>
      </div>

      {/* Daily Spending (Week view) */}
      {period === 'week' && dailySpending.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Tägliche Ausgaben</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dailySpending}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(_, payload) => payload[0]?.payload?.date || ''}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Net Worth Chart */}
      {netWorthHistory.length > 1 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Vermögensentwicklung</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={netWorthHistory}>
              <defs>
                <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Area type="monotone" dataKey="accounts" stackId="1" stroke="hsl(210, 80%, 55%)" fill="url(#colorAccounts)" name="Konten" />
              <Area type="monotone" dataKey="investments" stackId="1" stroke="hsl(142, 70%, 45%)" fill="url(#colorInvestments)" name="Investments" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(210, 80%, 55%)' }} />
              <span className="text-[10px] text-muted-foreground">Konten</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(142, 70%, 45%)' }} />
              <span className="text-[10px] text-muted-foreground">Investments</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cashflow with Savings Rate */}
      {monthlyCashflow.length > 0 && period !== 'week' && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Monatlicher Cashflow</h3>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={monthlyCashflow}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" hide orientation="right" />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'savingsRate') return `${value.toFixed(0)}%`;
                  return formatCurrency(value);
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar yAxisId="left" dataKey="income" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} name="Einnahmen" />
              <Bar yAxisId="left" dataKey="expenses" fill="hsl(0, 70%, 50%)" radius={[4, 4, 0, 0]} name="Ausgaben" />
              <Line yAxisId="right" type="monotone" dataKey="savingsRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Sparquote" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(142, 70%, 45%)' }} />
              <span className="text-[10px] text-muted-foreground">Einnahmen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }} />
              <span className="text-[10px] text-muted-foreground">Ausgaben</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">Sparquote</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown - Large Pie Chart */}
      {categoryData.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-4">Ausgaben nach Kategorie</h3>
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2">
              {topExpenseCategories.map((cat, index) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color || COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{cat.percent.toFixed(0)}%</span>
                    <span className="text-sm font-semibold">{formatCurrency(cat.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Investment Performance */}
      {investments.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Investment Performance</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Investiert</p>
              <p className="text-lg font-bold">{formatCurrency(investmentPerformance.invested)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Aktuell</p>
              <p className="text-lg font-bold">{formatCurrency(investmentPerformance.current)}</p>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${investmentPerformance.gain >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gewinn/Verlust</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${investmentPerformance.gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {investmentPerformance.gain >= 0 ? '+' : ''}{formatCurrency(investmentPerformance.gain)}
                </p>
                <p className={`text-xs ${investmentPerformance.gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatPercent(investmentPerformance.percent)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Allocation */}
      {investmentAllocation.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Investment-Allokation</h3>
          <div className="space-y-2">
            {investmentAllocation.map((item, index) => {
              const total = investmentAllocation.reduce((sum, i) => sum + i.value, 0);
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{item.name}</span>
                    <span className="font-semibold">{formatCurrency(item.value)} ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percent}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Distribution */}
      {accountDistribution.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Kontenverteilung</h3>
          <div className="space-y-2">
            {accountDistribution.map((acc, index) => {
              const total = accountDistribution.reduce((sum, a) => sum + Math.max(0, a.value), 0);
              const percent = total > 0 ? (Math.max(0, acc.value) / total) * 100 : 0;
              
              return (
                <div key={acc.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{acc.name}</span>
                    <span className="font-semibold">{formatCurrency(acc.value)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%`, backgroundColor: 'hsl(210, 80%, 55%)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Automation Projection */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Monatliche Prognose (Automationen)
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(monthlyAutomations.income)}</p>
            <p className="text-[10px] text-muted-foreground">Einnahmen</p>
          </div>
          <div>
            <p className="text-lg font-bold text-rose-500">{formatCurrency(monthlyAutomations.expenses)}</p>
            <p className="text-[10px] text-muted-foreground">Ausgaben</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${monthlyAutomations.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(monthlyAutomations.net)}
            </p>
            <p className="text-[10px] text-muted-foreground">Überschuss</p>
          </div>
        </div>
      </div>
    </div>
  );
}
