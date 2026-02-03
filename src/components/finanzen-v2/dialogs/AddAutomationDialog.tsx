import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';

interface AddAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAutomationDialog({ open, onOpenChange }: AddAutomationDialogProps) {
  const { user } = useAuth();
  const { accounts, categories, investments, refreshAutomations } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'investment'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [intervalType, setIntervalType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [executionDay, setExecutionDay] = useState('1');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [investmentId, setInvestmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !amount || !accountId) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('v2_automations').insert({
      user_id: user.id,
      name: name.trim(),
      automation_type: type,
      amount: parseFloat(amount),
      currency,
      interval_type: intervalType,
      execution_day: parseInt(executionDay),
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      investment_id: type === 'investment' ? investmentId : null,
      category_id: type !== 'transfer' && type !== 'investment' ? categoryId || null : null,
      note: note.trim() || null,
      is_active: isActive,
    });

    setLoading(false);

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Automation erstellt');
      await refreshAutomations();
      onOpenChange(false);
      // Reset form
      setName('');
      setType('expense');
      setAmount('');
      setExecutionDay('1');
      setToAccountId('');
      setInvestmentId('');
      setCategoryId('');
      setNote('');
    }
  };

  const dayOptions = intervalType === 'weekly' 
    ? [
        { value: '0', label: 'Sonntag' },
        { value: '1', label: 'Montag' },
        { value: '2', label: 'Dienstag' },
        { value: '3', label: 'Mittwoch' },
        { value: '4', label: 'Donnerstag' },
        { value: '5', label: 'Freitag' },
        { value: '6', label: 'Samstag' },
      ]
    : Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}.` }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Automation</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="income" className="text-xs">Einnahme</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs">Ausgabe</TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs">Umbuchung</TabsTrigger>
            <TabsTrigger value="investment" className="text-xs">Invest</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'income' ? 'z.B. Gehalt' : type === 'expense' ? 'z.B. Miete' : 'Beschreibung'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Betrag</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Intervall</Label>
              <Select value={intervalType} onValueChange={(v) => { setIntervalType(v as typeof intervalType); setExecutionDay('1'); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                  <SelectItem value="yearly">Jährlich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ausführungstag</Label>
              <Select value={executionDay} onValueChange={setExecutionDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{type === 'income' ? 'Zielkonto' : type === 'transfer' ? 'Von Konto' : 'Quellkonto'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Konto wählen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div className="space-y-2">
              <Label>Zu Konto</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Zielkonto wählen" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== accountId).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'investment' && (
            <div className="space-y-2">
              <Label>Investment</Label>
              <Select value={investmentId} onValueChange={setInvestmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Investment wählen" />
                </SelectTrigger>
                <SelectContent>
                  {investments.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'income' || type === 'expense') && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Kategorie</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="active">Aktiv</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim() || !amount || !accountId}>
            {loading ? 'Erstelle...' : 'Automation erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
