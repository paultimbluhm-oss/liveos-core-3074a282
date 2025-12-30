import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { getSupabase } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
}

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionUpdated: () => void;
}

const categories = [
  'Gehalt', 'Taschengeld', 'Geschenk', 'Rückzahlung',
  'Snacks', 'Fast Food', 'Restaurant', 'Lebensmittel', 'Getränke',
  'Technik', 'Smart Home', 'Gaming', 'Software',
  'Unterhaltung', 'Kino', 'Streaming', 'Bücher',
  'Transport', 'Tanken', 'Kleidung', 'Schuhe',
  'Investition', 'Sparen', 'Sonstiges',
];

export function EditTransactionDialog({
  transaction,
  accounts,
  open,
  onOpenChange,
  onTransactionUpdated,
}: EditTransactionDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || '');
      setCategory(transaction.category || '');
      setDate(transaction.date);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount) return;

    setLoading(true);
    const supabase = getSupabase();
    const amountNum = parseFloat(amount);
    const oldAmount = transaction.amount;

    // Calculate balance difference
    const balanceDiff = amountNum - oldAmount;
    const balanceChange = transaction.transaction_type === 'income' ? balanceDiff : -balanceDiff;

    const { error } = await supabase
      .from('transactions')
      .update({
        amount: amountNum,
        description: description || null,
        category: category || null,
        date,
      })
      .eq('id', transaction.id);

    if (error) {
      toast.error('Fehler beim Aktualisieren');
    } else {
      // Update account balance if amount changed - fetch current balance from DB first
      if (balanceDiff !== 0) {
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single();
        
        if (currentAccount) {
          await supabase
            .from('accounts')
            .update({ balance: (currentAccount.balance || 0) + balanceChange })
            .eq('id', transaction.account_id);
        }
      }
      toast.success('Transaktion aktualisiert');
      onOpenChange(false);
      onTransactionUpdated();
    }
    setLoading(false);
  };

  const account = accounts.find(a => a.id === transaction?.account_id);
  const isIncome = transaction?.transaction_type === 'income';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Transaktion bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Konto</p>
            <p className="font-medium text-sm">{account?.name}</p>
            <p className={`text-xs ${isIncome ? 'text-success' : 'text-destructive'}`}>
              {isIncome ? 'Einnahme' : 'Ausgabe'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Betrag (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Datum</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10">
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
            <Label className="text-xs">Beschreibung</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="h-10"
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? 'Speichere...' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}