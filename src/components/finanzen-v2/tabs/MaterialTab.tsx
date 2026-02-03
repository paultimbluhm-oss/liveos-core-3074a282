import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, ChevronRight, TrendingDown } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
        <CardContent className="pt-6 pb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Materieller Besitz</p>
            <p className="text-3xl font-bold">{formatCurrency(totals.current)}</p>
            <div className="flex justify-center gap-4 mt-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Kaufpreis</p>
                <p className="font-medium">{formatCurrency(totals.purchase)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Wertänderung</p>
                <p className={`font-medium ${totals.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totals.delta >= 0 ? '+' : ''}{formatCurrency(totals.delta)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        Materieller Besitz wird separat vom Finanz-Nettovermögen geführt und nicht in die Gesamtstatistik eingerechnet.
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full"
        variant="outline"
      >
        <Plus className="w-4 h-4 mr-2" />
        Neuer Gegenstand
      </Button>

      {/* Assets by Category */}
      {Object.entries(groupedAssets).map(([category, assets]) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets.map(asset => {
              const delta = (asset.current_value || 0) - (asset.purchase_price || 0);
              return (
                <div 
                  key={asset.id} 
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{asset.name}</p>
                    {asset.purchase_date && (
                      <p className="text-xs text-muted-foreground">
                        Gekauft: {format(new Date(asset.purchase_date), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(asset.current_value || asset.purchase_price || 0)}
                    </p>
                    {asset.purchase_price && asset.current_value && delta !== 0 && (
                      <p className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {materialAssets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Noch keine Gegenstände</p>
            <p className="text-sm text-muted-foreground mt-1">Erfasse deinen materiellen Besitz</p>
          </CardContent>
        </Card>
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
