import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  languageId: string | null;
  onCreated: () => void;
}

export function AddSetDialog({ open, onOpenChange, languageId, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !languageId || !name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('v2_vocab_sets').insert({
      user_id: user.id,
      language_id: languageId,
      name: name.trim(),
      set_date: date || null,
    });

    setLoading(false);
    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    toast.success('Lernset erstellt');
    setName('');
    setDate('');
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neues Lernset</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Vokabeltest Lektion 5" autoFocus />
          </div>
          <div>
            <Label>Datum (optional)</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()} className="w-full">
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
