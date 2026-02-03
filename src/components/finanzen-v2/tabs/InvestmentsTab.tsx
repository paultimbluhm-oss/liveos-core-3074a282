import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, ShoppingCart, DollarSign, ChevronRight } from 'lucide-react';
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

const assetTypeColors: Record<string, { gradient: string; text: string }> = {
  etf: { gradient: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-400' },
  stock: { gradient: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400' },
  fund: { gradient: 'from-violet-500/20 to-violet-600/10', text: 'text-violet-400' },
  crypto: { gradient: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-400' },
  metal: { gradient: 'from-slate-500/20 to-slate-600/10', text: 'text-slate-400' },
  other: { gradient: 'from-pink-500/20 to-pink-600/10', text: 'text-pink-400' },
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
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-sm font-medium mb-2">Portfolio-Wert</p>
          <p className="text-4xl font-bold text-white tracking-tight mb-3">{formatCurrency(totalInvestmentsEur)}</p>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${totalStats.profit >= 0 ? 'bg-white/20' : 'bg-rose-500/30'}`}>
            {totalStats.profit >= 0 ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
            <span className="font-semibold text-white">
              {totalStats.profit >= 0 ? '+' : ''}{formatCurrency(totalStats.profit)} ({totalStats.profitPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => setShowAddDialog(true)} 
          className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-foreground"
          variant="ghost"
        >
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center mr-3">
            <Plus className="w-5 h-5 text-violet-400" />
          </div>
          Neue Position
        </Button>
        <Button 
          onClick={() => handleBuy()} 
          className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-foreground"
          variant="ghost"
          disabled={investments.length === 0 || accounts.length === 0}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
          </div>
          Kaufen
        </Button>
      </div>

      {/* Investments by Type */}
      {Object.entries(groupedInvestments).map(([type, invs]) => {
        const stats = typeStats[type];
        const colors = assetTypeColors[type] || assetTypeColors.other;
        
        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {assetTypeLabels[type]}
              </h3>
              <span className={`text-sm font-semibold ${stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
              </span>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              {invs.map((inv, index) => {
                const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
                const cost = inv.quantity * inv.avg_purchase_price;
                const profit = value - cost;
                const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
                
                return (
                  <div 
                    key={inv.id} 
                    className={`
                      flex items-center gap-4 p-4
                      transition-all duration-200 
                      hover:bg-white/5
                      ${index !== invs.length - 1 ? 'border-b border-white/5' : ''}
                    `}
                  >
                    {/* Icon */}
                    <div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} cursor-pointer`}
                      onClick={() => setSelectedInvestment(inv)}
                    >
                      <TrendingUp className={`w-6 h-6 ${colors.text}`} />
                    </div>

                    {/* Info */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedInvestment(inv)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{inv.name}</p>
                        {inv.symbol && (
                          <span className="text-xs text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full">
                            {inv.symbol}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                      </p>
                    </div>

                    {/* Value & Actions */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(value, inv.currency)}</p>
                        <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {profit >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <button 
                          className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleBuy(inv); }}
                        >
                          <ShoppingCart className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button 
                          className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center hover:bg-rose-500/30 transition-colors disabled:opacity-30"
                          onClick={(e) => { e.stopPropagation(); handleSell(inv); }}
                          disabled={inv.quantity <= 0}
                        >
                          <DollarSign className="w-4 h-4 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {investments.length === 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Noch keine Investments</p>
          <p className="text-sm text-muted-foreground">Füge deine erste Position hinzu</p>
        </div>
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
