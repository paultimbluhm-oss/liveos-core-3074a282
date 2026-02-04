import { useState, useMemo } from 'react';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, ChevronRight, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

export function DashboardTab() {
  const { 
    accounts, 
    transactions, 
    investments,
    externalSavings,
    totalAccountsEur, 
    totalInvestmentsEur, 
    netWorthEur,
    totalExternalSavingsEur,
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
    { key: 'week', label: 'W' },
    { key: 'month', label: 'M' },
    { key: 'year', label: 'J' },
    { key: 'all', label: 'Alle' },
  ];

  return (
    <div className="space-y-4">
      {/* Period Selector - Compact Pills */}
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

      {/* Net Worth - Clean Minimal Header */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground font-medium mb-1">Gesamtvermögen</p>
        <p className="text-4xl font-bold text-foreground tracking-tight">{formatCurrency(netWorthEur)}</p>
      </div>

      {/* Accounts / Investments Split - Minimal Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Konten</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalAccountsEur)}</p>
        </div>
        
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">Investments</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalInvestmentsEur)}</p>
        </div>
      </div>

      {/* Net Worth Chart */}
      {netWorthChartData.length > 1 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Vermögensentwicklung</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={netWorthChartData}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorNetWorth)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cashflow Cards - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Einnahmen</span>
          </div>
          <p className="text-xl font-bold text-emerald-500">{formatCurrency(periodStats.income)}</p>
        </div>
        
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Ausgaben</span>
          </div>
          <p className="text-xl font-bold text-destructive">{formatCurrency(periodStats.expenses)}</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Netto</span>
          </div>
          <p className={`text-xl font-bold ${periodStats.difference >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {periodStats.difference >= 0 ? '+' : ''}{formatCurrency(periodStats.difference)}
          </p>
        </div>
        
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Sparquote</span>
          </div>
          <p className={`text-xl font-bold ${periodStats.savingsRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {periodStats.savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Accounts Quick View */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Konten</h3>
          <span className="text-xs text-muted-foreground">{accounts.length}</span>
        </div>
        <div className="divide-y divide-border">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Noch keine Konten</p>
          ) : (
            accounts.slice(0, 3).map(account => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="font-medium text-sm">{account.name}</span>
                </div>
                <span className="font-semibold text-sm">
                  {account.balance.toLocaleString('de-DE', { style: 'currency', currency: account.currency })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* External Savings Card */}
      {externalSavings.length > 0 && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Externe Sparbeträge</h3>
            </div>
            <span className="font-semibold text-sm text-primary">{formatCurrency(totalExternalSavingsEur)}</span>
          </div>
          <div className="divide-y divide-border">
            {externalSavings.filter(s => !s.is_received).slice(0, 2).map(saving => (
              <div key={saving.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{saving.name}</p>
                  <p className="text-xs text-muted-foreground">{saving.source_person}</p>
                </div>
                <span className="font-semibold text-sm">
                  {saving.amount.toLocaleString('de-DE', { style: 'currency', currency: saving.currency })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investments Quick View */}
      {investments.length > 0 && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Investments</h3>
            <div className={`flex items-center gap-1 text-sm font-semibold ${investmentStats.profit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {investmentStats.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {investmentStats.profit >= 0 ? '+' : ''}{investmentStats.profitPercent.toFixed(1)}%
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-muted-foreground">Wert</p>
                <p className="text-xl font-bold">{formatCurrency(investmentStats.totalValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">G/V</p>
                <p className={`font-semibold ${investmentStats.profit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
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
