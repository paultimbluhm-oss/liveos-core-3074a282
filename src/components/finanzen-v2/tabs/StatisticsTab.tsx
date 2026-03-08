import { useState, useMemo } from 'react';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, eachMonthOfInterval, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, Percent, Activity } from 'lucide-react';

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
    eurUsdRate, 
    totalAccountsEur,
    totalInvestmentsEur,
    netWorthEur,
    loading 
  } = useFinanceV2();

  const [period, setPeriod] = useState<TimePeriod>('year');

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week': return { start: subWeeks(now, 1), end: now };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter': return { start: subMonths(now, 3), end: now };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'all': return { start: subYears(now, 5), end: now };
    }
  }, [period]);

  const dailySpending = useMemo(() => {
    if (period !== 'week') return [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map(day => {
      const dayTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return format(txDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && tx.transaction_type === 'expense';
      });
      const total = dayTx.reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      return { name: format(day, 'EEE', { locale: de }), date: format(day, 'dd.MM'), value: total };
    });
  }, [transactions, dateRange, period, eurUsdRate]);

  const monthlyCashflow = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd && tx.transaction_type !== 'transfer';
      });
      const income = monthTx.filter(tx => tx.transaction_type === 'income')
        .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      const expenses = monthTx.filter(tx => tx.transaction_type === 'expense')
        .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
      return {
        name: format(month, 'MMM', { locale: de }), income, expenses,
        net: income - expenses, savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      };
    });
  }, [transactions, dateRange, eurUsdRate]);

  const categoryData = useMemo(() => {
    const expenseTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end && tx.transaction_type === 'expense';
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
    return Object.entries(byCategory).map(([catId, value]) => {
      const category = categories.find(c => c.id === catId);
      return {
        id: catId, name: catId === 'none' ? 'Ohne Kategorie' : (category?.name || 'Unbekannt'),
        value, percent: total > 0 ? (value / total) * 100 : 0, color: category?.color || '#6366f1',
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, dateRange, categories, eurUsdRate]);

  const netWorthHistory = useMemo(() => {
    return snapshots
      .filter(s => { const sDate = new Date(s.date); return sDate >= dateRange.start && sDate <= dateRange.end; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: format(new Date(s.date), period === 'week' ? 'EEE' : 'dd.MM', { locale: de }),
        value: s.net_worth_eur, accounts: s.total_accounts_eur, investments: s.total_investments_eur,
      }));
  }, [snapshots, dateRange, period]);

  const investmentAllocation = useMemo(() => {
    const byType: Record<string, number> = {};
    investments.forEach(inv => {
      const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      const valueEur = inv.currency === 'USD' ? value / eurUsdRate : value;
      if (!byType[inv.asset_type]) byType[inv.asset_type] = 0;
      byType[inv.asset_type] += valueEur;
    });
    const typeLabels: Record<string, string> = { etf: 'ETF', stock: 'Aktien', fund: 'Fonds', crypto: 'Krypto', metal: 'Metalle', other: 'Andere' };
    return Object.entries(byType).map(([type, value]) => ({ name: typeLabels[type] || type, value }));
  }, [investments, eurUsdRate]);

  const periodTotals = useMemo(() => {
    const periodTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
    const income = periodTx.filter(tx => tx.transaction_type === 'income')
      .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
    const expenses = periodTx.filter(tx => tx.transaction_type === 'expense')
      .reduce((sum, tx) => sum + (tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount), 0);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    return { income, expenses, net: income - expenses, savingsRate };
  }, [transactions, dateRange, eurUsdRate]);

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
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
              period === p.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
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
          <h3 className="text-sm font-semibold mb-3">Taegliche Ausgaben</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dailySpending}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Net Worth Chart */}
      {netWorthHistory.length > 1 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Vermoegensentwicklung</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={netWorthHistory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
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
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis 
                domain={[0, 'auto']}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                width={40}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="accounts" stackId="1" stroke="hsl(210, 80%, 55%)" fill="url(#colorAccounts)" name="Konten" />
              <Area type="monotone" dataKey="investments" stackId="1" stroke="hsl(142, 70%, 45%)" fill="url(#colorInvestments)" name="Investments" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Cashflow */}
      {monthlyCashflow.length > 0 && period !== 'week' && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Monatlicher Cashflow</h3>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={monthlyCashflow}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" hide />
              <Tooltip 
                formatter={(value: number, name: string) => name === 'savingsRate' ? `${(value as number).toFixed(0)}%` : formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
              />
              <Bar yAxisId="left" dataKey="income" fill="hsl(142, 70%, 45%)" radius={[3, 3, 0, 0]} name="Einnahmen" />
              <Bar yAxisId="left" dataKey="expenses" fill="hsl(0, 70%, 55%)" radius={[3, 3, 0, 0]} name="Ausgaben" />
              <Line yAxisId="left" type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Netto" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      {topExpenseCategories.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Ausgaben nach Kategorie</h3>
          <div className="flex gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topExpenseCategories} dataKey="value" innerRadius={25} outerRadius={40} paddingAngle={2}>
                    {topExpenseCategories.map((entry, index) => (
                      <Cell key={entry.id} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {topExpenseCategories.map((cat, index) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || COLORS[index % COLORS.length] }} />
                    <span className="text-xs">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold">{formatCurrency(cat.value)}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{cat.percent.toFixed(0)}%</span>
                  </div>
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
          <div className="flex gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={investmentAllocation} dataKey="value" innerRadius={25} outerRadius={40} paddingAngle={2}>
                    {investmentAllocation.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {investmentAllocation.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
