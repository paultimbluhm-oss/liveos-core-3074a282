import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Banknote,
  Coins,
  Landmark,
  TrendingUp,
  Bitcoin,
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface AccountCardProps {
  account: Account;
  onUpdated: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  bank: Landmark,
  cash_bills: Banknote,
  cash_coins: Coins,
  crypto: Bitcoin,
  stocks: TrendingUp,
};

const typeLabels: Record<string, string> = {
  bank: 'Bankkonto',
  cash_bills: 'Bargeld (Scheine)',
  cash_coins: 'Bargeld (Münzen)',
  crypto: 'Krypto',
  stocks: 'Aktien/ETFs',
};

export function AccountCard({ account, onUpdated }: AccountCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [newBalance, setNewBalance] = useState(account.balance.toString());
  const [newName, setNewName] = useState(account.name);
  const [loading, setLoading] = useState(false);

  const Icon = typeIcons[account.account_type] || Landmark;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase
      .from('accounts')
      .update({ 
        balance: parseFloat(newBalance) || 0,
        name: newName.trim() || account.name,
      })
      .eq('id', account.id);

    if (error) {
      toast.error('Fehler beim Aktualisieren');
    } else {
      toast.success('Konto aktualisiert');
      setEditOpen(false);
      onUpdated();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Möchtest du "${account.name}" wirklich löschen?`)) return;

    const supabase = getSupabase();
    const { error } = await supabase.from('accounts').delete().eq('id', account.id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Konto gelöscht');
      onUpdated();
    }
  };

  return (
    <div className="bg-card/50 rounded-lg border border-border/50 p-2.5 group">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1.5 rounded-md bg-primary/20 shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight">{account.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {typeLabels[account.account_type] || account.account_type}
          </p>
        </div>
        <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
          <Dialog open={editOpen} onOpenChange={(open) => {
            setEditOpen(open);
            if (open) {
              setNewBalance(account.balance.toString());
              setNewName(account.name);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Edit className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-4">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg">Konto bearbeiten</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Kontostand (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="h-10"
                  />
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? 'Speichere...' : 'Speichern'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'text-base font-bold',
          account.balance >= 0 ? 'text-success' : 'text-destructive'
        )}
      >
        {account.balance.toLocaleString('de-DE', {
          style: 'currency',
          currency: 'EUR',
        })}
      </div>
    </div>
  );
}
