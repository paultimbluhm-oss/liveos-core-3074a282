import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const { user } = useAuth();
  const { refreshAccounts } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('giro');
  const [currency, setCurrency] = useState<string>('EUR');
  const [startBalance, setStartBalance] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('v2_accounts').insert({
      user_id: user.id,
      name: name.trim(),
      account_type: accountType,
      currency,
      balance: parseFloat(startBalance) || 0,
    });

    setLoading(false);

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Konto erstellt');
      await refreshAccounts();
      onOpenChange(false);
      setName('');
      setAccountType('giro');
      setCurrency('EUR');
      setStartBalance('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neues Konto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Girokonto DKB"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Kontotyp</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="giro">Girokonto</SelectItem>
                <SelectItem value="tagesgeld">Tagesgeld</SelectItem>
                <SelectItem value="cash">Bargeld</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Währung</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Startbetrag</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={startBalance}
              onChange={(e) => setStartBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Erstelle...' : 'Konto erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
