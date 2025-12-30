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

interface Account {
  id: string;
  name: string;
  account_type: string;
}

interface AddTransactionDialogProps {
  accounts: Account[];
  onTransactionAdded: () => void;
}

const transactionTypes = [
  { value: 'income', label: 'Einnahme' },
  { value: 'expense', label: 'Ausgabe' },
  { value: 'transfer', label: 'Umschichtung' },
];

const categories = [
  // Einnahmen
  'Gehalt',
  'Taschengeld',
  'Geschenk',
  'Rückzahlung',
  // Ausgaben - Essen
  'Snacks',
  'Fast Food',
  'Restaurant',
  'Lebensmittel',
  'Getränke',
  // Ausgaben - Technik
  'Technik',
  'Smart Home',
  'Gaming',
  'Software',
  // Ausgaben - Freizeit
  'Unterhaltung',
  'Kino',
  'Streaming',
  'Bücher',
  // Ausgaben - Transport
  'Transport',
  'Tanken',
  // Ausgaben - Kleidung
  'Kleidung',
  'Schuhe',
  // Sonstiges
  'Investition',
  'Sparen',
  'Sonstiges',
];

export function AddTransactionDialog({
  accounts,
  onTransactionAdded,
}: AddTransactionDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !transactionType || !accountId || !amount) return;

    setLoading(true);
    const supabase = getSupabase();
    const amountNum = parseFloat(amount);

    if (transactionType === 'transfer') {
      if (!targetAccountId) {
        toast.error('Bitte Zielkonto auswählen');
        setLoading(false);
        return;
      }

      // Create two transactions for transfer
      const { error: error1 } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: accountId,
        transaction_type: 'expense',
        amount: amountNum,
        description: `Umschichtung zu ${accounts.find((a) => a.id === targetAccountId)?.name}`,
        category: 'Umschichtung',
      });

      const { error: error2 } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: targetAccountId,
        transaction_type: 'income',
        amount: amountNum,
        description: `Umschichtung von ${accounts.find((a) => a.id === accountId)?.name}`,
        category: 'Umschichtung',
      });

      // Update balances
      const sourceAccount = accounts.find((a) => a.id === accountId);
      const targetAccount = accounts.find((a) => a.id === targetAccountId);

      if (sourceAccount && targetAccount) {
        await supabase
          .from('accounts')
          .update({ balance: (sourceAccount as any).balance - amountNum })
          .eq('id', accountId);

        await supabase
          .from('accounts')
          .update({ balance: (targetAccount as any).balance + amountNum })
          .eq('id', targetAccountId);
      }

      if (error1 || error2) {
        toast.error('Fehler bei der Umschichtung');
      } else {
        toast.success('Umschichtung erfolgreich');
      }
    } else {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: accountId,
        transaction_type: transactionType,
        amount: amountNum,
        description,
        category,
      });

      // Update account balance
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        const balanceChange = transactionType === 'income' ? amountNum : -amountNum;
        await supabase
          .from('accounts')
          .update({ balance: (account as any).balance + balanceChange })
          .eq('id', accountId);
      }

      if (error) {
        toast.error('Fehler beim Erstellen');
      } else {
        toast.success(transactionType === 'income' ? 'Einnahme hinzugefügt' : 'Ausgabe hinzugefügt');
      }
    }

    setOpen(false);
    setTransactionType('');
    setAccountId('');
    setTargetAccountId('');
    setAmount('');
    setDescription('');
    setCategory('');
    onTransactionAdded();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 px-2 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Transaktion</span>
          <span className="sm:hidden">+€</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Transaktion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={transactionType} onValueChange={setTransactionType} required>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{transactionType === 'transfer' ? 'Von Konto' : 'Konto'}</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="Konto auswählen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {transactionType === 'transfer' && (
            <div className="space-y-2">
              <Label>Zu Konto</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Zielkonto auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Betrag (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {transactionType !== 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Speichere...' : 'Hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
