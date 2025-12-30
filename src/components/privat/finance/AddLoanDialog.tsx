import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HandCoins, Plus } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface AddLoanDialogProps {
  onLoanAdded: () => void;
  accounts?: Account[];
}

export function AddLoanDialog({ onLoanAdded, accounts: propAccounts }: AddLoanDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [loanType, setLoanType] = useState<'lent' | 'borrowed'>('lent');
  const [description, setDescription] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);

  useEffect(() => {
    if (propAccounts) {
      setAccounts(propAccounts);
    } else if (open && user) {
      fetchAccounts();
    }
  }, [open, user, propAccounts]);

  const fetchAccounts = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setAccounts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !personName || !amount) return;

    const amountNum = parseFloat(amount);
    const supabase = getSupabase();

    // Create the loan
    const { error } = await supabase.from('loans').insert([{
      user_id: user.id,
      person_name: personName.trim(),
      amount: amountNum,
      loan_type: loanType,
      description: description.trim() || null,
      loan_date: loanDate,
      due_date: dueDate || null,
      source_account_id: sourceAccountId || null,
      lender_name: personName.trim(),
      original_amount: amountNum,
      remaining_amount: amountNum,
    }]);

    if (error) {
      toast.error('Fehler beim Hinzufügen');
      return;
    }

    // If lending money and an account is selected, deduct from that account
    if (loanType === 'lent' && sourceAccountId) {
      const account = accounts.find(a => a.id === sourceAccountId);
      if (account) {
        // Update account balance
        await supabase
          .from('accounts')
          .update({ balance: (account.balance || 0) - amountNum })
          .eq('id', sourceAccountId);

        // Create a transaction record
        await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: sourceAccountId,
          transaction_type: 'expense',
          amount: amountNum,
          description: `Verliehen an ${personName.trim()}`,
          category: 'Verliehen',
          date: loanDate,
        });
      }
    }

    // If borrowing money and an account is selected, add to that account
    if (loanType === 'borrowed' && sourceAccountId) {
      const account = accounts.find(a => a.id === sourceAccountId);
      if (account) {
        // Update account balance
        await supabase
          .from('accounts')
          .update({ balance: (account.balance || 0) + amountNum })
          .eq('id', sourceAccountId);

        // Create a transaction record
        await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: sourceAccountId,
          transaction_type: 'income',
          amount: amountNum,
          description: `Geliehen von ${personName.trim()}`,
          category: 'Geliehen',
          date: loanDate,
        });
      }
    }

    toast.success(loanType === 'lent' ? 'Verliehenes Geld hinzugefügt' : 'Geliehenes Geld hinzugefügt');
    setOpen(false);
    resetForm();
    onLoanAdded();
  };

  const resetForm = () => {
    setPersonName('');
    setAmount('');
    setLoanType('lent');
    setDescription('');
    setLoanDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setSourceAccountId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HandCoins className="w-4 h-4 mr-2" />
          Verliehen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="w-5 h-5" />
            Geld verliehen/geliehen
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={loanType} onValueChange={(v) => setLoanType(v as 'lent' | 'borrowed')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lent">Ich habe verliehen</SelectItem>
                <SelectItem value="borrowed">Ich habe geliehen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personName">
              {loanType === 'lent' ? 'An wen verliehen?' : 'Von wem geliehen?'}
            </Label>
            <Input
              id="personName"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Name der Person"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              {loanType === 'lent' ? 'Von welchem Konto?' : 'Auf welches Konto?'}
            </Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Konto wählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {loanType === 'lent' 
                ? 'Das Geld wird von diesem Konto abgezogen' 
                : 'Das Geld wird diesem Konto gutgeschrieben'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanDate">Datum</Label>
              <Input
                id="loanDate"
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fällig am (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wofür?"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Hinzufügen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}