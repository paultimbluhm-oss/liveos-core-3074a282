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
  onCreated: () => void;
}

export function AddLanguageDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [sourceLang, setSourceLang] = useState('Deutsch');
  const [targetLang, setTargetLang] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !targetLang.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('v2_vocab_languages').insert({
      user_id: user.id,
      source_lang: sourceLang.trim(),
      target_lang: targetLang.trim(),
    });

    setLoading(false);
    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    toast.success('Sprachpaar erstellt');
    setTargetLang('');
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sprachpaar hinzufuegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ausgangssprache</Label>
            <Input value={sourceLang} onChange={e => setSourceLang(e.target.value)} placeholder="Deutsch" />
          </div>
          <div>
            <Label>Zielsprache</Label>
            <Input value={targetLang} onChange={e => setTargetLang(e.target.value)} placeholder="z.B. Spanisch" autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !targetLang.trim()} className="w-full">
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
