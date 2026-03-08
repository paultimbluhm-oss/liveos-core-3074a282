import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BusinessCost {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  cost_type: string;
  frequency: string;
  category: string | null;
  notes: string | null;
  date: string | null;
  created_at: string;
}

const COST_CATEGORIES = [
  'Software & Tools',
  'Hardware',
  'Marketing',
  'Bueromaterial',
  'Versicherung',
  'Steuern & Abgaben',
  'Sonstiges',
];

export function BusinessCostsTab() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<BusinessCost[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCosts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('v2_business_costs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setCosts((data || []) as BusinessCost[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCosts(); }, [loadCosts]);

  const oneTimeCosts = costs.filter(c => c.cost_type === 'one_time');
  const recurringCosts = costs.filter(c => c.cost_type === 'recurring');

  const totalOneTime = oneTimeCosts.reduce((s, c) => s + Number(c.amount), 0);
  const totalMonthly = recurringCosts.reduce((s, c) => s + Number(c.amount), 0);

  const handleDelete = async (id: string) => {
    await supabase.from('v2_business_costs').delete().eq('id', id);
    setCosts(prev => prev.filter(c => c.id !== id));
    toast.success('Geloescht');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geschaeftskosten</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Kosten
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-3 text-center">
          <Receipt className="w-4 h-4 mx-auto text-muted-foreground mb-1" strokeWidth={1.5} />
          <p className="text-[10px] text-muted-foreground">Einmalig</p>
          <p className="text-sm font-bold">{totalOneTime.toFixed(2)} EUR</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3 text-center">
          <RefreshCw className="w-4 h-4 mx-auto text-muted-foreground mb-1" strokeWidth={1.5} />
          <p className="text-[10px] text-muted-foreground">Monatlich</p>
          <p className="text-sm font-bold">{totalMonthly.toFixed(2)} EUR</p>
        </div>
      </div>

      {costs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Keine Kosten erfasst</p>
      ) : (
        <div className="space-y-3">
          {recurringCosts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Laufende Kosten</span>
              {recurringCosts.map(cost => (
                <CostRow key={cost.id} cost={cost} onDelete={handleDelete} />
              ))}
            </div>
          )}
          {oneTimeCosts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Anschaffungen</span>
              {oneTimeCosts.map(cost => (
                <CostRow key={cost.id} cost={cost} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      <AddCostSheet open={addOpen} onOpenChange={setAddOpen} onAdded={loadCosts} />
    </div>
  );
}

function CostRow({ cost, onDelete }: { cost: BusinessCost; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cost.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {cost.category && <span className="text-[10px] text-muted-foreground">{cost.category}</span>}
          {cost.cost_type === 'recurring' && <span className="text-[10px] text-muted-foreground">{cost.frequency}</span>}
          {cost.date && <span className="text-[10px] text-muted-foreground">{format(new Date(cost.date), 'dd.MM.yy')}</span>}
        </div>
      </div>
      <span className="text-sm font-semibold shrink-0">{Number(cost.amount).toFixed(2)} EUR</span>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(cost.id)}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function AddCostSheet({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [costType, setCostType] = useState('one_time');
  const [frequency, setFrequency] = useState('monthly');
  const [category, setCategory] = useState('');

  const handleAdd = async () => {
    if (!user || !title.trim() || !amount) return;
    await supabase.from('v2_business_costs').insert({
      user_id: user.id,
      title: title.trim(),
      amount: parseFloat(amount) || 0,
      cost_type: costType,
      frequency: costType === 'recurring' ? frequency : null,
      category: category || null,
    });
    setTitle(''); setAmount(''); setCostType('one_time'); setCategory('');
    onOpenChange(false);
    onAdded();
    toast.success('Kosten hinzugefuegt');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">Kosten hinzufuegen</SheetTitle>
        </SheetHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Bezeichnung</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Adobe Creative Cloud" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Betrag (EUR)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-sm" step="0.01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Art</Label>
              <Select value={costType} onValueChange={setCostType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Einmalig</SelectItem>
                  <SelectItem value="recurring">Laufend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {costType === 'recurring' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequenz</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="yearly">Jaehrlich</SelectItem>
                    <SelectItem value="quarterly">Quartalsweise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!title.trim() || !amount} onClick={handleAdd}>Hinzufuegen</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
