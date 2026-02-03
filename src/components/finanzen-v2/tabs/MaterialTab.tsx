import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Package, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinanceV2, V2MaterialAsset } from '../context/FinanceV2Context';
import { AddMaterialAssetDialog } from '../dialogs/AddMaterialAssetDialog';
import { MaterialAssetDetailSheet } from '../sheets/MaterialAssetDetailSheet';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function MaterialTab() {
  const { materialAssets, loading } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<V2MaterialAsset | null>(null);

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Calculate totals
  const totals = useMemo(() => {
    const purchaseTotal = materialAssets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    const currentTotal = materialAssets.reduce((sum, a) => sum + (a.current_value || a.purchase_price || 0), 0);
    return {
      purchase: purchaseTotal,
      current: currentTotal,
      delta: currentTotal - purchaseTotal,
    };
  }, [materialAssets]);

  // Group by category
  const groupedAssets = useMemo(() => {
    return materialAssets.reduce((acc, asset) => {
      const cat = asset.category || 'Ohne Kategorie';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(asset);
      return acc;
    }, {} as Record<string, V2MaterialAsset[]>);
  }, [materialAssets]);

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-sm font-medium mb-2">Materieller Besitz</p>
          <p className="text-4xl font-bold text-white tracking-tight mb-4">{formatCurrency(totals.current)}</p>
          
          <div className="flex justify-center gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2">
              <p className="text-white/60 text-xs">Kaufpreis</p>
              <p className="text-white font-semibold">{formatCurrency(totals.purchase)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2">
              <p className="text-white/60 text-xs">Wertänderung</p>
              <p className={`font-semibold ${totals.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {totals.delta >= 0 ? '+' : ''}{formatCurrency(totals.delta)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
        <p className="text-sm text-amber-300/80">
          Materieller Besitz wird separat geführt und nicht in die Nettovermögensberechnung einbezogen.
        </p>
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-foreground"
        variant="ghost"
      >
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
          <Plus className="w-5 h-5 text-amber-400" />
        </div>
        Neuer Gegenstand
      </Button>

      {/* Assets by Category */}
      {Object.entries(groupedAssets).map(([category, assets]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {category}
          </h3>
          
          <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
            {assets.map((asset, index) => {
              const delta = (asset.current_value || 0) - (asset.purchase_price || 0);
              
              return (
                <div 
                  key={asset.id} 
                  className={`
                    flex items-center gap-4 p-4 cursor-pointer
                    transition-all duration-200 active:scale-[0.98]
                    hover:bg-white/5
                    ${index !== assets.length - 1 ? 'border-b border-white/5' : ''}
                  `}
                  onClick={() => setSelectedAsset(asset)}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-amber-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{asset.name}</p>
                    {asset.purchase_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(asset.purchase_date), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatCurrency(asset.current_value || asset.purchase_price || 0)}
                      </p>
                      {asset.purchase_price && asset.current_value && delta !== 0 && (
                        <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {materialAssets.length === 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Noch keine Gegenstände</p>
          <p className="text-sm text-muted-foreground">Erfasse deinen materiellen Besitz</p>
        </div>
      )}

      {/* Dialogs & Sheets */}
      <AddMaterialAssetDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
      
      <MaterialAssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
      />
    </div>
  );
}
