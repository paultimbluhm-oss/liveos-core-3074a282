import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Wallet, BarChart3, HandCoins, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Account, Investment, Transaction, BalanceHistory } from '../hooks/useFinanceData';

interface OverviewTabProps {
  accounts: Account[];
  investments: Investment[];
  transactions: Transaction[];
  balanceHistory: BalanceHistory[];
  totalBalance: number;
  totalInvestments: number;
  monthlyStats: {
    income: number;
    expenses: number;
    difference: number;
  };
}

export function OverviewTab({
  accounts,
  investments,
  balanceHistory,
  totalBalance,
  totalInvestments,
  monthlyStats,
}: OverviewTabProps) {
  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const formatCurrencyDecimal = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

  // Calculate loans net balance
  const loanNetBalance = 0; // Placeholder - would need loans data

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
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Gesamtvermögen</p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(totalBalance + totalInvestments)}
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Konten</span>
            </div>
            <p className="text-sm font-bold">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] text-muted-foreground">Investments</span>
            </div>
            <p className="text-sm font-bold">{formatCurrency(totalInvestments)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <HandCoins className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] text-muted-foreground">Kredite</span>
            </div>
            <p className={cn(
              "text-sm font-bold",
              loanNetBalance > 0 ? "text-success" : loanNetBalance < 0 ? "text-destructive" : ""
            )}>
              {loanNetBalance >= 0 ? '+' : ''}{formatCurrency(loanNetBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              {format(new Date(), 'MMMM yyyy', { locale: de })}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Einnahmen</p>
              <p className="text-base font-bold text-emerald-500">
                +{formatCurrencyDecimal(monthlyStats.income)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Ausgaben</p>
              <p className="text-base font-bold text-rose-400">
                -{formatCurrencyDecimal(monthlyStats.expenses)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Differenz</p>
              <div className="flex items-center gap-1">
                {monthlyStats.difference > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : monthlyStats.difference < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <p className={cn(
                  "text-base font-bold",
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

      {/* Wealth Chart */}
      {balanceHistory.length > 1 && (
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Vermögensentwicklung
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-40">
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
      )}
    </div>
  );
}
