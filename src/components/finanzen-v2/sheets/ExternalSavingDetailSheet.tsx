import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Calendar, Trash2, Check, ArrowRight } from 'lucide-react';
import { useFinanceV2, V2ExternalSaving } from '../context/FinanceV2Context';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExternalSavingDetailSheetProps {
  saving: V2ExternalSaving | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalSavingDetailSheet({ saving, open, onOpenChange }: ExternalSavingDetailSheetProps) {
  const { accounts, refreshExternalSavings, refreshAccounts, refreshTransactions } = useFinanceV2();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!saving) return null;

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  const handleMarkReceived = async () => {
    if (!selectedAccountId) {
      toast.error('Bitte wähle ein Zielkonto');
      return;
    }

    setProcessing(true);
    try {
      const supabase = getSupabase();
      const account = accounts.find(a => a.id === selectedAccountId);
      if (!account) throw new Error('Konto nicht gefunden');

      // Update account balance
      const newBalance = account.balance + saving.amount;
      await supabase
        .from('v2_accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', account.id);

      // Create income transaction
      await supabase.from('v2_transactions').insert({
        user_id: saving.user_id,
        transaction_type: 'income',
        amount: saving.amount,
        currency: saving.currency,
        date: format(new Date(), 'yyyy-MM-dd'),
        account_id: account.id,
        note: `Externer Sparbetrag: ${saving.name} von ${saving.source_person}`,
      });

      // Mark as received
      await supabase
        .from('v2_external_savings')
        .update({ 
          is_received: true, 
          received_date: format(new Date(), 'yyyy-MM-dd'),
          received_account_id: account.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saving.id);

      await Promise.all([refreshExternalSavings(), refreshAccounts(), refreshTransactions()]);
      toast.success('Sparbetrag als erhalten markiert');
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Verarbeiten');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Diesen Sparbetrag wirklich löschen?')) return;

    setProcessing(true);
    try {
      const supabase = getSupabase();
      await supabase.from('v2_external_savings').delete().eq('id', saving.id);
      await refreshExternalSavings();
      toast.success('Sparbetrag gelöscht');
      onOpenChange(false);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {saving.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Betrag</span>
              <span className="font-semibold">{formatCurrency(saving.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Von</span>
              <span className="font-medium">{saving.source_person}</span>
            </div>
            {saving.expected_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Erwartet</span>
                <span className="font-medium">
                  {format(new Date(saving.expected_date), 'dd.MM.yyyy', { locale: de })}
                </span>
              </div>
            )}
            {saving.note && (
              <div>
                <span className="text-sm text-muted-foreground">Notiz</span>
                <p className="text-sm mt-1">{saving.note}</p>
              </div>
            )}
            {saving.is_received && (
              <div className="flex items-center gap-2 text-emerald-500 pt-2 border-t border-border">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Erhalten am {saving.received_date && format(new Date(saving.received_date), 'dd.MM.yyyy', { locale: de })}
                </span>
              </div>
            )}
          </div>

          {/* Mark as received */}
          {!saving.is_received && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <h4 className="text-sm font-medium">Als erhalten markieren</h4>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Auf welches Konto?</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Konto auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleMarkReceived} 
                disabled={!selectedAccountId || processing}
                className="w-full"
              >
                <Check className="w-4 h-4 mr-2" />
                Als erhalten markieren
              </Button>
            </div>
          )}

          {/* Delete */}
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={processing}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Löschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
