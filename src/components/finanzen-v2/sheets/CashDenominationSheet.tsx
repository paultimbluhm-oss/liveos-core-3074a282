import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { V2Account, useFinanceV2 } from '../context/FinanceV2Context';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CashDenominationSheetProps {
  account: V2Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DENOMINATIONS = [
  { value: 0.01, label: '1 Cent' },
  { value: 0.02, label: '2 Cent' },
  { value: 0.05, label: '5 Cent' },
  { value: 0.10, label: '10 Cent' },
  { value: 0.20, label: '20 Cent' },
  { value: 0.50, label: '50 Cent' },
  { value: 1.00, label: '1 Euro' },
  { value: 2.00, label: '2 Euro' },
  { value: 5.00, label: '5 Euro' },
  { value: 10.00, label: '10 Euro' },
  { value: 20.00, label: '20 Euro' },
  { value: 50.00, label: '50 Euro' },
  { value: 100.00, label: '100 Euro' },
  { value: 200.00, label: '200 Euro' },
];

export function CashDenominationSheet({ account, open, onOpenChange }: CashDenominationSheetProps) {
  const { cashDenominations, refreshAccounts } = useFinanceV2();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account && cashDenominations[account.id]) {
      const q: Record<number, number> = {};
      cashDenominations[account.id].forEach(d => {
        q[d.denomination] = d.quantity;
      });
      setQuantities(q);
    } else {
      setQuantities({});
    }
  }, [account, cashDenominations]);

  if (!account) return null;

  const total = DENOMINATIONS.reduce((sum, d) => sum + (quantities[d.value] || 0) * d.value, 0);

  const handleChange = (denom: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] || 0) + delta),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = getSupabase();

    // Upsert all denominations
    for (const d of DENOMINATIONS) {
      const qty = quantities[d.value] || 0;
      if (qty > 0 || cashDenominations[account.id]?.some(cd => cd.denomination === d.value)) {
        await supabase.from('v2_cash_denominations').upsert({
          account_id: account.id,
          denomination: d.value,
          quantity: qty,
        }, { onConflict: 'account_id,denomination' });
      }
    }

    // Update account balance
    await supabase.from('v2_accounts').update({ balance: total }).eq('id', account.id);

    setSaving(false);
    toast.success('Bargeld aktualisiert');
    await refreshAccounts();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{account.name} - Stückelung</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Total */}
          <div className="text-center py-4 bg-muted/30 rounded-xl sticky top-0 z-10">
            <p className="text-sm text-muted-foreground mb-1">Gesamtsumme</p>
            <p className="text-3xl font-bold">{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
          </div>

          {/* Denominations */}
          <div className="grid gap-2">
            {DENOMINATIONS.map(d => (
              <div key={d.value} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <span className="font-medium">{d.label}</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleChange(d.value, -1)}
                    disabled={!quantities[d.value]}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-mono text-lg">
                    {quantities[d.value] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleChange(d.value, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="w-20 text-right text-sm text-muted-foreground">
                    {((quantities[d.value] || 0) * d.value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichere...' : 'Speichern'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
