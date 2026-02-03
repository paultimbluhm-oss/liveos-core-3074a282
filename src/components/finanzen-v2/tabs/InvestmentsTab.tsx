import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, ChevronRight, ShoppingCart, DollarSign } from 'lucide-react';
import { useFinanceV2, V2Investment } from '../context/FinanceV2Context';
import { AddInvestmentDialog } from '../dialogs/AddInvestmentDialog';
import { InvestmentDetailSheet } from '../sheets/InvestmentDetailSheet';
import { InvestmentTransactionDialog } from '../dialogs/InvestmentTransactionDialog';

const assetTypeLabels: Record<string, string> = {
  etf: 'ETF',
  stock: 'Aktie',
  fund: 'Fonds',
  crypto: 'Krypto',
  metal: 'Edelmetall',
  other: 'Sonstige',
};

export function InvestmentsTab() {
  const { investments, accounts, totalInvestmentsEur, loading, eurUsdRate } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<V2Investment | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [transactionInvestment, setTransactionInvestment] = useState<V2Investment | null>(null);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Group investments by type
  const groupedInvestments = useMemo(() => {
    return investments.reduce((acc, inv) => {
      if (!acc[inv.asset_type]) acc[inv.asset_type] = [];
      acc[inv.asset_type].push(inv);
      return acc;
    }, {} as Record<string, V2Investment[]>);
  }, [investments]);

  // Calculate totals by type
  const typeStats = useMemo(() => {
    const stats: Record<string, { value: number; cost: number; profit: number }> = {};
    
    Object.entries(groupedInvestments).forEach(([type, invs]) => {
      const value = invs.reduce((sum, inv) => {
        const v = inv.quantity * (inv.current_price || inv.avg_purchase_price);
        return sum + (inv.currency === 'USD' ? v / eurUsdRate : v);
      }, 0);
      const cost = invs.reduce((sum, inv) => {
        const c = inv.quantity * inv.avg_purchase_price;
        return sum + (inv.currency === 'USD' ? c / eurUsdRate : c);
      }, 0);
      stats[type] = { value, cost, profit: value - cost };
    });
    
    return stats;
  }, [groupedInvestments, eurUsdRate]);

  // Total performance
  const totalStats = useMemo(() => {
    const totalCost = investments.reduce((sum, inv) => {
      const c = inv.quantity * inv.avg_purchase_price;
      return sum + (inv.currency === 'USD' ? c / eurUsdRate : c);
    }, 0);
    const totalValue = totalInvestmentsEur;
    return {
      cost: totalCost,
      value: totalValue,
      profit: totalValue - totalCost,
      profitPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    };
  }, [investments, totalInvestmentsEur, eurUsdRate]);

  const handleBuy = (inv?: V2Investment) => {
    setTransactionInvestment(inv || null);
    setTransactionType('buy');
    setShowTransactionDialog(true);
  };

  const handleSell = (inv: V2Investment) => {
    setTransactionInvestment(inv);
    setTransactionType('sell');
    setShowTransactionDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
        <CardContent className="pt-6 pb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Investments gesamt</p>
            <p className="text-3xl font-bold">{formatCurrency(totalInvestmentsEur)}</p>
            <div className={`flex items-center justify-center gap-1 mt-2 ${totalStats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalStats.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">
                {totalStats.profit >= 0 ? '+' : ''}{formatCurrency(totalStats.profit)} ({totalStats.profitPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          onClick={() => setShowAddDialog(true)} 
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neue Position
        </Button>
        <Button 
          onClick={() => handleBuy()} 
          variant="outline"
          disabled={investments.length === 0 || accounts.length === 0}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Kaufen
        </Button>
      </div>

      {/* Investments by Type */}
      {Object.entries(groupedInvestments).map(([type, invs]) => {
        const stats = typeStats[type];
        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{assetTypeLabels[type]}</span>
                <span className={`text-xs font-normal ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invs.map(inv => {
                const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
                const cost = inv.quantity * inv.avg_purchase_price;
                const profit = value - cost;
                const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
                
                return (
                  <div 
                    key={inv.id} 
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors border"
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedInvestment(inv)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{inv.name}</p>
                        {inv.symbol && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {inv.symbol}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk. @ {(inv.current_price || inv.avg_purchase_price).toLocaleString('de-DE', { style: 'currency', currency: inv.currency })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(value, inv.currency)}</p>
                        <p className={`text-xs ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit, inv.currency)} ({profitPercent.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleBuy(inv); }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleSell(inv); }}
                          disabled={inv.quantity <= 0}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {investments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Noch keine Investments</p>
            <p className="text-sm text-muted-foreground mt-1">Füge deine erste Position hinzu</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs & Sheets */}
      <AddInvestmentDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
      
      <InvestmentDetailSheet
        investment={selectedInvestment}
        open={!!selectedInvestment}
        onOpenChange={(open) => !open && setSelectedInvestment(null)}
      />

      <InvestmentTransactionDialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
        investment={transactionInvestment}
        defaultType={transactionType}
      />
    </div>
  );
}
