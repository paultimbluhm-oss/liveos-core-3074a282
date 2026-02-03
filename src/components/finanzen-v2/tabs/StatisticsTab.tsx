import { useState, useMemo } from 'react';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart as PieIcon, BarChart3, Activity } from 'lucide-react';

type TimePeriod = 'month' | 'quarter' | 'year' | 'all';

const COLORS = ['hsl(var(--primary))', 'hsl(210, 80%, 55%)', 'hsl(280, 70%, 55%)', 'hsl(160, 70%, 45%)', 'hsl(45, 90%, 50%)', 'hsl(340, 80%, 55%)'];

export function StatisticsTab() {
  const { 
    transactions, 
    investments, 
    snapshots, 
    categories,
    accounts,
    eurUsdRate, 
    loading 
  } = useFinanceV2();

  const [period, setPeriod] = useState<TimePeriod>('year');

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Get date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
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

  // Monthly cashflow data
  const monthlyCashflow = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd && tx.transaction_type !== 'transfer';
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
      };
    });
  }, [transactions, dateRange, eurUsdRate]);

  // Category breakdown
  const categoryData = useMemo(() => {
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
    
    const result = Object.entries(byCategory).map(([catId, value]) => ({
      id: catId,
      name: categories.find(c => c.id === catId)?.name || 'Unbekannt',
      value,
    }));
    
    if (uncategorized > 0) {
      result.push({ id: 'none', name: 'Ohne Kategorie', value: uncategorized });
    }
    
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
        date: format(new Date(s.date), 'dd.MM'),
        value: s.net_worth_eur,
        accounts: s.total_accounts_eur,
        investments: s.total_investments_eur,
      }));
  }, [snapshots, dateRange]);

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

  // Account distribution
  const accountDistribution = useMemo(() => {
    return accounts.map(acc => ({
      name: acc.name,
      value: acc.currency === 'USD' ? acc.balance / eurUsdRate : acc.balance,
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
    
    return { income, expenses, net: income - expenses };
  }, [transactions, dateRange, eurUsdRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const periods: { key: TimePeriod; label: string }[] = [
    { key: 'month', label: 'Monat' },
    { key: 'quarter', label: 'Quartal' },
    { key: 'year', label: 'Jahr' },
    { key: 'all', label: 'Gesamt' },
  ];

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
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

      {/* Period Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{formatCurrency(periodTotals.income)}</p>
          <p className="text-[10px] text-muted-foreground">Einnahmen</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <ArrowDownRight className="w-4 h-4 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{formatCurrency(periodTotals.expenses)}</p>
          <p className="text-[10px] text-muted-foreground">Ausgaben</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className={`text-lg font-bold ${periodTotals.net >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {formatCurrency(periodTotals.net)}
          </p>
          <p className="text-[10px] text-muted-foreground">Netto</p>
        </div>
      </div>

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
                  <stop offset="5%" stopColor="hsl(160, 70%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(160, 70%, 45%)" stopOpacity={0}/>
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
              <Area type="monotone" dataKey="accounts" stackId="1" stroke="hsl(210, 80%, 55%)" fill="url(#colorAccounts)" />
              <Area type="monotone" dataKey="investments" stackId="1" stroke="hsl(160, 70%, 45%)" fill="url(#colorInvestments)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Konten</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Investments</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cashflow */}
      {monthlyCashflow.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Monatlicher Cashflow</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyCashflow}>
              <XAxis 
                dataKey="name" 
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
              <Bar dataKey="income" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(0, 70%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Ausgaben nach Kategorie</h3>
          <div className="flex gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryData.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {categoryData.slice(0, 5).map((cat, index) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-xs truncate">{cat.name}</span>
                  </div>
                  <span className="text-xs font-semibold ml-2">{formatCurrency(cat.value)}</span>
                </div>
              ))}
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
              const total = accountDistribution.reduce((sum, a) => sum + a.value, 0);
              const percent = total > 0 ? (acc.value / total) * 100 : 0;
              
              return (
                <div key={acc.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{acc.name}</span>
                    <span className="font-semibold">{formatCurrency(acc.value)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
