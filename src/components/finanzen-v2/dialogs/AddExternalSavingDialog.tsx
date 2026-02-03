import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface AddExternalSavingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExternalSavingDialog({ open, onOpenChange }: AddExternalSavingDialogProps) {
  const { user } = useAuth();
  const { refreshExternalSavings } = useFinanceV2();
  
  const [name, setName] = useState('');
  const [sourcePerson, setSourcePerson] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !name || !sourcePerson || !amount) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum)) {
      toast.error('Ungültiger Betrag');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      
      const { error } = await supabase.from('v2_external_savings').insert({
        user_id: user.id,
        name,
        source_person: sourcePerson,
        amount: amountNum,
        currency: 'EUR',
        expected_date: expectedDate || null,
        note: note || null,
      });

      if (error) throw error;

      await refreshExternalSavings();
      toast.success('Sparbetrag hinzugefügt');
      
      // Reset form
      setName('');
      setSourcePerson('');
      setAmount('');
      setExpectedDate('');
      setNote('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding external saving:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Externen Sparbetrag hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bezeichnung *</Label>
            <Input
              placeholder="z.B. Sparbuch von Oma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Von wem? *</Label>
            <Input
              placeholder="z.B. Eltern, Großeltern"
              value={sourcePerson}
              onChange={(e) => setSourcePerson(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Betrag *</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Erwartetes Datum</Label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">z.B. 18. Geburtstag</p>
          </div>

          <div className="space-y-2">
            <Label>Notiz</Label>
            <Textarea
              placeholder="Weitere Infos..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
