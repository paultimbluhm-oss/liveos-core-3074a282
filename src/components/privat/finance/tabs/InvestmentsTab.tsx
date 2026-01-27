import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Bitcoin, RefreshCw, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvestmentCard } from '../InvestmentCard';
import { AddInvestmentDialog } from '../AddInvestmentDialog';
import type { Investment } from '../hooks/useFinanceData';

interface InvestmentsTabProps {
  investments: Investment[];
  stockInvestments: Investment[];
  cryptoInvestments: Investment[];
  prices: Record<string, number>;
  loadingPrices: Record<string, boolean>;
  totalInvestments: number;
  etfTotalValue: number;
  etfTotalCost: number;
  etfProfit: number;
  etfProfitPercent: number;
  cryptoTotalValue: number;
  cryptoTotalCost: number;
  cryptoProfit: number;
  cryptoProfitPercent: number;
  onRefresh: () => void;
  onRefreshPrice: (investment: Investment) => void;
  onRefreshAll: () => void;
}

export function InvestmentsTab({
  investments,
  stockInvestments,
  cryptoInvestments,
  prices,
  loadingPrices,
  totalInvestments,
  etfTotalValue,
  etfProfit,
  etfProfitPercent,
  cryptoTotalValue,
  cryptoProfit,
  cryptoProfitPercent,
  onRefresh,
  onRefreshPrice,
  onRefreshAll,
}: InvestmentsTabProps) {
  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const formatCurrencyDecimal = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

  const totalProfit = etfProfit + cryptoProfit;
  const totalCost = (etfTotalValue - etfProfit) + (cryptoTotalValue - cryptoProfit);
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Portfolio Overview Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/20">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Portfolio-Wert</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvestments)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-sm font-bold",
                totalProfit >= 0 ? "text-emerald-500" : "text-rose-400"
              )}>
                {totalProfit >= 0 ? '+' : ''}{formatCurrencyDecimal(totalProfit)}
              </p>
              <p className={cn(
                "text-xs",
                totalProfit >= 0 ? "text-emerald-500" : "text-rose-400"
              )}>
                {totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Investment Button */}
      <div className="flex justify-end">
        <AddInvestmentDialog onInvestmentAdded={onRefresh} />
      </div>

      {/* ETFs & Stocks Section */}
      {stockInvestments.length > 0 && (
        <div className="space-y-2">
          <Card className="border-border/50">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm font-medium">ETFs & Aktien</CardTitle>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatCurrency(etfTotalValue)}</span>
                  <p className={cn(
                    "text-[10px]",
                    etfProfit >= 0 ? "text-emerald-500" : "text-rose-400"
                  )}>
                    {etfProfit >= 0 ? '+' : ''}{formatCurrencyDecimal(etfProfit)} ({etfProfitPercent >= 0 ? '+' : ''}{etfProfitPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 gap-2">
                {stockInvestments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    currentPrice={prices[inv.id] || null}
                    loading={loadingPrices[inv.id] || false}
                    onDeleted={onRefresh}
                    onRefresh={() => onRefreshPrice(inv)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Crypto Section */}
      {cryptoInvestments.length > 0 && (
        <div className="space-y-2">
          <Card className="border-border/50">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bitcoin className="w-4 h-4 text-orange-500" />
                  <CardTitle className="text-sm font-medium">Kryptowährungen</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefreshAll}
                    className="h-6 px-2 text-[10px]"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Alle
                  </Button>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatCurrency(cryptoTotalValue)}</span>
                  <p className={cn(
                    "text-[10px]",
                    cryptoProfit >= 0 ? "text-emerald-500" : "text-rose-400"
                  )}>
                    {cryptoProfit >= 0 ? '+' : ''}{formatCurrencyDecimal(cryptoProfit)} ({cryptoProfitPercent >= 0 ? '+' : ''}{cryptoProfitPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 gap-2">
                {cryptoInvestments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    currentPrice={prices[inv.id] || null}
                    loading={loadingPrices[inv.id] || false}
                    onDeleted={onRefresh}
                    onRefresh={() => onRefreshPrice(inv)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {investments.length === 0 && (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">Noch keine Investments vorhanden</p>
            <AddInvestmentDialog onInvestmentAdded={onRefresh} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
