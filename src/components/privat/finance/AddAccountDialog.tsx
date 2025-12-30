import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';

interface AddAccountDialogProps {
  onAccountAdded: () => void;
}

const accountTypes = [
  { value: 'bank', label: 'Bankkonto' },
  { value: 'cash_bills', label: 'Bargeld (Scheine)' },
  { value: 'cash_coins', label: 'Bargeld (Münzen)' },
  { value: 'crypto', label: 'Krypto-Wallet' },
  { value: 'stocks', label: 'Aktien/ETFs' },
];

export function AddAccountDialog({ onAccountAdded }: AddAccountDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !accountType) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      account_type: accountType,
      balance: parseFloat(balance) || 0,
    });

    if (error) {
      toast.error('Fehler beim Erstellen des Kontos');
      console.error(error);
    } else {
      toast.success('Konto erstellt');
      setOpen(false);
      setName('');
      setAccountType('');
      setBalance('');
      onAccountAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-7 px-2 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Konto</span>
          <span className="sm:hidden">Konto</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Konto erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Sparkasse Girokonto"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Kontotyp</Label>
            <Select value={accountType} onValueChange={setAccountType} required>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Anfangssaldo (€)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Erstelle...' : 'Konto erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
