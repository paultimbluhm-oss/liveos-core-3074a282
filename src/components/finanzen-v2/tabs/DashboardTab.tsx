import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Calendar, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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

  // Previous period comparison
  const previousPeriodStats = useMemo(() => {
    const now = new Date();
    let prevStart: Date, prevEnd: Date;
    
    switch (period) {
      case 'week':
        prevStart = startOfWeek(subMonths(now, 0), { locale: de });
        prevStart.setDate(prevStart.getDate() - 7);
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 6);
        break;
      case 'month':
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'year':
        prevStart = startOfYear(subYears(now, 1));
        prevEnd = endOfYear(subYears(now, 1));
        break;
      default:
        return null;
    }
    
    const periodTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= prevStart && txDate <= prevEnd && tx.transaction_type !== 'transfer';
    });
    
    const income = periodTx.filter(tx => tx.transaction_type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = periodTx.filter(tx => tx.transaction_type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    
    return { income, expenses };
  }, [transactions, period]);

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
      etf: 'ETF', stock: 'Aktien', fund: 'Fonds', 
      crypto: 'Krypto', metal: 'Edelmetalle', other: 'Sonstige'
    };
    
    return Object.entries(byType).map(([type, value]) => ({
      name: typeLabels[type] || type,
      value,
    }));
  }, [investments, eurUsdRate]);

  // Monthly automation summary
  const automationSummary = useMemo(() => {
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

  const periodLabel = period === 'week' ? 'Woche' : period === 'month' ? 'Monat' : period === 'year' ? 'Jahr' : 'Gesamt';

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Woche</SelectItem>
            <SelectItem value="month">Monat</SelectItem>
            <SelectItem value="year">Jahr</SelectItem>
            <SelectItem value="all">Gesamt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Net Worth Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Gesamtvermögen</p>
            <p className="text-4xl font-bold">{formatCurrency(netWorthEur)}</p>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span>{formatCurrency(totalAccountsEur)}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{formatCurrency(totalInvestmentsEur)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Worth Chart */}
      {netWorthChartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vermögensentwicklung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={netWorthChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cashflow */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Einnahmen</span>
            </div>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(periodStats.income)}</p>
            {previousPeriodStats && previousPeriodStats.income > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {periodStats.income >= previousPeriodStats.income ? '+' : ''}
                {((periodStats.income - previousPeriodStats.income) / previousPeriodStats.income * 100).toFixed(0)}% vs. Vor{periodLabel}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Ausgaben</span>
            </div>
            <p className="text-xl font-semibold text-rose-600">{formatCurrency(periodStats.expenses)}</p>
            {previousPeriodStats && previousPeriodStats.expenses > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {periodStats.expenses >= previousPeriodStats.expenses ? '+' : ''}
                {((periodStats.expenses - previousPeriodStats.expenses) / previousPeriodStats.expenses * 100).toFixed(0)}% vs. Vor{periodLabel}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Savings + Savings Rate */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Netto-Saldo</span>
            </div>
            <span className={`text-lg font-semibold ${periodStats.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {periodStats.difference >= 0 ? '+' : ''}{formatCurrency(periodStats.difference)}
            </span>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sparquote</span>
            </div>
            <span className={`text-lg font-semibold ${periodStats.savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {periodStats.savingsRate.toFixed(1)}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Top Ausgaben-Kategorien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {categoryBreakdown.map((cat, index) => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate max-w-[100px]">{cat.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Konten</span>
            <span className="text-xs font-normal text-muted-foreground">{accounts.length} Konten</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Konten angelegt
            </p>
          ) : (
            accounts.slice(0, 4).map(account => (
              <div key={account.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{account.account_type}</p>
                  </div>
                </div>
                <span className="font-medium">
                  {account.balance.toLocaleString('de-DE', { style: 'currency', currency: account.currency })}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Investments Overview */}
      {investments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Investments</span>
              <span className={`text-xs font-normal ${investmentStats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {investmentStats.profit >= 0 ? '+' : ''}{formatCurrency(investmentStats.profit)} ({investmentStats.profitPercent.toFixed(1)}%)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Allocation pie */}
            {investmentAllocation.length > 1 && (
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={investmentAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        dataKey="value"
                      >
                        {investmentAllocation.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1">
                  {investmentAllocation.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Top investments */}
            <div className="space-y-2">
              {investments.slice(0, 3).map(inv => {
                const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
                const cost = inv.quantity * inv.avg_purchase_price;
                const profit = value - cost;
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{inv.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {inv.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{value.toLocaleString('de-DE', { style: 'currency', currency: inv.currency })}</p>
                      <p className={`text-[10px] ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString('de-DE', { style: 'currency', currency: inv.currency })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automations Summary */}
      {automations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monatliche Automationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Einnahmen</p>
                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(automationSummary.income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ausgaben</p>
                <p className="text-sm font-semibold text-rose-600">{formatCurrency(automationSummary.expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Netto</p>
                <p className={`text-sm font-semibold ${automationSummary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {automationSummary.net >= 0 ? '+' : ''}{formatCurrency(automationSummary.net)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
