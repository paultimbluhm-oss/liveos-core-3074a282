import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Repeat, Trash2, RefreshCw, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { format, addMonths, addWeeks, addYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface Investment {
  id: string;
  name: string;
  symbol: string | null;
}

interface RecurringTransaction {
  id: string;
  name: string;
  transaction_type: string;
  amount: number;
  source_account_id: string | null;
  target_account_id: string | null;
  investment_id: string | null;
  category: string | null;
  frequency: string;
  day_of_month: number | null;
  next_execution_date: string;
  is_active: boolean;
}

interface RecurringSectionProps {
  accounts: Account[];
  investments: Investment[];
  onTransactionExecuted: () => void;
}

const categories = [
  'Miete', 'Strom', 'Internet', 'Handy', 'Versicherung', 'Streaming',
  'Fitness', 'Spotify', 'Netflix', 'Cloud', 'Abo', 'Sparen', 'Sonstiges'
];

export function RecurringSection({ accounts, investments, onTransactionExecuted }: RecurringSectionProps) {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const fetchRecurring = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('next_execution_date');
    if (data) setRecurring(data);
  };

  useEffect(() => {
    fetchRecurring();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !amount || !sourceAccountId) return;

    setLoading(true);
    const supabase = getSupabase();

    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), parseInt(dayOfMonth));
    if (nextDate <= today) {
      nextDate = addMonths(nextDate, 1);
    }

    const { error } = await supabase.from('recurring_transactions').insert({
      user_id: user.id,
      name,
      transaction_type: transactionType,
      amount: parseFloat(amount),
      source_account_id: sourceAccountId,
      target_account_id: transactionType === 'transfer' ? targetAccountId : null,
      category: transactionType !== 'transfer' ? category : 'Umschichtung',
      frequency,
      day_of_month: parseInt(dayOfMonth),
      next_execution_date: format(nextDate, 'yyyy-MM-dd'),
    });

    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Abo erstellt');
      resetForm();
      setDialogOpen(false);
      fetchRecurring();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setTransactionType('expense');
    setAmount('');
    setSourceAccountId('');
    setTargetAccountId('');
    setCategory('');
    setFrequency('monthly');
    setDayOfMonth('1');
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const supabase = getSupabase();
    await supabase.from('recurring_transactions').update({ is_active: !isActive }).eq('id', id);
    fetchRecurring();
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm('Abo wirklich löschen?')) return;
    const supabase = getSupabase();
    await supabase.from('recurring_transactions').delete().eq('id', id);
    toast.success('Abo gelöscht');
    fetchRecurring();
  };

  const executeNow = async (rec: RecurringTransaction) => {
    if (!user) return;
    const supabase = getSupabase();

    const sourceAccount = accounts.find(a => a.id === rec.source_account_id);
    
    if (rec.transaction_type === 'transfer') {
      const targetAccount = accounts.find(a => a.id === rec.target_account_id);
      
      // Create transfer transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: rec.source_account_id,
        transaction_type: 'transfer',
        amount: rec.amount,
        description: `${sourceAccount?.name} → ${targetAccount?.name} (${rec.name})`,
        category: 'Umschichtung',
      });

      // Update balances
      if (sourceAccount) {
        await supabase.from('accounts').update({ balance: sourceAccount.balance - rec.amount }).eq('id', sourceAccount.id);
      }
      if (targetAccount) {
        await supabase.from('accounts').update({ balance: targetAccount.balance + rec.amount }).eq('id', targetAccount.id);
      }
    } else {
      // Regular expense/income
      await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: rec.source_account_id,
        transaction_type: rec.transaction_type,
        amount: rec.amount,
        description: rec.name,
        category: rec.category,
      });

      if (sourceAccount) {
        const change = rec.transaction_type === 'income' ? rec.amount : -rec.amount;
        await supabase.from('accounts').update({ balance: sourceAccount.balance + change }).eq('id', sourceAccount.id);
      }
    }

    // Update next execution date
    let nextDate = new Date(rec.next_execution_date);
    if (rec.frequency === 'weekly') nextDate = addWeeks(nextDate, 1);
    else if (rec.frequency === 'monthly') nextDate = addMonths(nextDate, 1);
    else if (rec.frequency === 'yearly') nextDate = addYears(nextDate, 1);

    await supabase.from('recurring_transactions').update({
      next_execution_date: format(nextDate, 'yyyy-MM-dd'),
      last_executed_at: new Date().toISOString(),
    }).eq('id', rec.id);

    toast.success('Transaktion ausgeführt');
    fetchRecurring();
    onTransactionExecuted();
  };

  const getTypeIcon = (type: string) => {
    if (type === 'transfer') return <ArrowRightLeft className="w-3.5 h-3.5" />;
    if (type === 'income') return <TrendingUp className="w-3.5 h-3.5" />;
    return <TrendingDown className="w-3.5 h-3.5" />;
  };

  const getTypeColor = (type: string) => {
    if (type === 'transfer') return 'text-sky-400';
    if (type === 'income') return 'text-emerald-500';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="font-medium text-sm">Abos & Automationen</span>
          <span className="text-xs text-muted-foreground">({recurring.filter(r => r.is_active).length})</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Abo / Automation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Netflix, Miete..." required />
              </div>

              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Ausgabe</SelectItem>
                    <SelectItem value="income">Einnahme</SelectItem>
                    <SelectItem value="transfer">Umschichtung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{transactionType === 'transfer' ? 'Von Konto' : 'Konto'}</Label>
                <Select value={sourceAccountId} onValueChange={setSourceAccountId} required>
                  <SelectTrigger><SelectValue placeholder="Konto wählen" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transactionType === 'transfer' && (
                <div className="space-y-2">
                  <Label>Zu Konto</Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId} required>
                    <SelectTrigger><SelectValue placeholder="Zielkonto wählen" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== sourceAccountId).map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>

              {transactionType !== 'transfer' && (
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Häufigkeit</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Wöchentlich</SelectItem>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="yearly">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Input type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Speichere...' : 'Erstellen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {recurring.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Keine Abos vorhanden</p>
      ) : (
        <div className="space-y-1.5">
          {recurring.map(rec => {
            const sourceAcc = accounts.find(a => a.id === rec.source_account_id);
            const targetAcc = accounts.find(a => a.id === rec.target_account_id);
            return (
              <Card key={rec.id} className={cn("border-border/50", !rec.is_active && "opacity-50")}>
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md bg-secondary/50", getTypeColor(rec.transaction_type))}>
                      {getTypeIcon(rec.transaction_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{rec.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {rec.transaction_type === 'transfer' 
                          ? `${sourceAcc?.name} → ${targetAcc?.name}`
                          : sourceAcc?.name
                        } · {rec.frequency === 'monthly' ? `${rec.day_of_month}.` : rec.frequency === 'yearly' ? 'Jährlich' : 'Wöchentlich'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn("font-semibold text-xs", getTypeColor(rec.transaction_type))}>
                        {rec.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => executeNow(rec)}>
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <Switch checked={rec.is_active} onCheckedChange={() => toggleActive(rec.id, rec.is_active)} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteRecurring(rec.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}