import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { V2MaterialAsset, useFinanceV2 } from '../context/FinanceV2Context';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MaterialAssetDetailSheetProps {
  asset: V2MaterialAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialAssetDetailSheet({ asset, open, onOpenChange }: MaterialAssetDetailSheetProps) {
  const { refreshMaterialAssets } = useFinanceV2();

  if (!asset) return null;

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const delta = (asset.current_value || 0) - (asset.purchase_price || 0);

  const handleDelete = async () => {
    if (!confirm('Gegenstand wirklich löschen?')) return;

    const supabase = getSupabase();
    const { error } = await supabase.from('v2_material_assets').delete().eq('id', asset.id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Gegenstand gelöscht');
      await refreshMaterialAssets();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{asset.name}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Value */}
          <div className="text-center py-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Aktueller Wert</p>
            <p className="text-3xl font-bold">{formatCurrency(asset.current_value || asset.purchase_price || 0)}</p>
            {asset.purchase_price && asset.current_value && (
              <p className={`text-sm mt-1 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {delta >= 0 ? '+' : ''}{formatCurrency(delta)} seit Kauf
              </p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            {asset.category && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Kategorie</span>
                <span className="font-medium">{asset.category}</span>
              </div>
            )}
            {asset.purchase_price && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Kaufpreis</span>
                <span className="font-medium">{formatCurrency(asset.purchase_price)}</span>
              </div>
            )}
            {asset.purchase_date && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Kaufdatum</span>
                <span className="font-medium">{format(new Date(asset.purchase_date), 'dd. MMMM yyyy', { locale: de })}</span>
              </div>
            )}
            {asset.note && (
              <div className="py-2">
                <span className="text-muted-foreground text-sm">Notiz</span>
                <p className="mt-1">{asset.note}</p>
              </div>
            )}
          </div>

          {/* Delete button */}
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Gegenstand löschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
