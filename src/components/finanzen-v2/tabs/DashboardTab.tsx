import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

export function DashboardTab() {
  const { 
    accounts, 
    transactions, 
    investments, 
    totalAccountsEur, 
    totalInvestmentsEur, 
    netWorthEur,
    loading,
    snapshots 
  } = useFinanceV2();

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd && tx.transaction_type !== 'transfer';
    });
    
    const income = monthTx.filter(tx => tx.transaction_type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = monthTx.filter(tx => tx.transaction_type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    
    return { income, expenses, difference: income - expenses };
  }, [transactions]);

  // Last month comparison
  const lastMonthStats = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const monthStart = startOfMonth(lastMonth);
    const monthEnd = endOfMonth(lastMonth);
    
    const monthTx = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd && tx.transaction_type !== 'transfer';
    });
    
    const income = monthTx.filter(tx => tx.transaction_type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = monthTx.filter(tx => tx.transaction_type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    
    return { income, expenses };
  }, [transactions]);

  // Investment performance
  const investmentStats = useMemo(() => {
    const totalCost = investments.reduce((sum, inv) => sum + (inv.quantity * inv.avg_purchase_price), 0);
    const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * (inv.current_price || inv.avg_purchase_price)), 0);
    const profit = totalValue - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    
    return { totalCost, totalValue, profit, profitPercent };
  }, [investments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Monthly Cashflow */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Einnahmen</span>
            </div>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(monthlyStats.income)}</p>
            {lastMonthStats.income > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {monthlyStats.income >= lastMonthStats.income ? '+' : ''}
                {((monthlyStats.income - lastMonthStats.income) / lastMonthStats.income * 100).toFixed(0)}% vs. Vormonat
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
            <p className="text-xl font-semibold text-rose-600">{formatCurrency(monthlyStats.expenses)}</p>
            {lastMonthStats.expenses > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {monthlyStats.expenses >= lastMonthStats.expenses ? '+' : ''}
                {((monthlyStats.expenses - lastMonthStats.expenses) / lastMonthStats.expenses * 100).toFixed(0)}% vs. Vormonat
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Savings */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              <span className="text-sm">Netto-Saldo {format(new Date(), 'MMMM', { locale: de })}</span>
            </div>
            <span className={`text-lg font-semibold ${monthlyStats.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthlyStats.difference >= 0 ? '+' : ''}{formatCurrency(monthlyStats.difference)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Konten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Konten angelegt
            </p>
          ) : (
            accounts.map(account => (
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
            <CardTitle className="text-base flex items-center justify-between">
              <span>Investments</span>
              <span className={`text-sm font-normal ${investmentStats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {investmentStats.profit >= 0 ? '+' : ''}{formatCurrency(investmentStats.profit)} ({investmentStats.profitPercent.toFixed(1)}%)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {investments.slice(0, 5).map(inv => {
              const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
              const cost = inv.quantity * inv.avg_purchase_price;
              const profit = value - cost;
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} x {(inv.current_price || inv.avg_purchase_price).toLocaleString('de-DE', { style: 'currency', currency: inv.currency })}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
