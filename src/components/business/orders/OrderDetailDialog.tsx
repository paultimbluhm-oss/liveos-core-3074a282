import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, MapPin, Calendar, Euro, Clock, Building2, User } from 'lucide-react';
import { Order, OrderExpense, OrderTimeEntry, STATUS_CONFIG, OrderStatus, EXPENSE_CATEGORIES } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onUpdate: () => void;
  onEdit?: (order: Order) => void;
  onDelete?: (id: string) => void;
}

export function OrderDetailDialog({ open, onOpenChange, order, onUpdate, onEdit, onDelete }: OrderDetailDialogProps) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [timeEntries, setTimeEntries] = useState<OrderTimeEntry[]>([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '', date: '' });
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', hours: '', date: '' });

  useEffect(() => {
    if (order && open) {
      fetchExpenses();
      fetchTimeEntries();
    }
  }, [order, open]);

  const fetchExpenses = async () => {
    if (!order) return;
    const { data } = await supabase
      .from('order_expenses')
      .select('*')
      .eq('order_id', order.id)
      .order('date', { ascending: false });
    if (data) setExpenses(data);
  };

  const fetchTimeEntries = async () => {
    if (!order) return;
    const { data } = await supabase
      .from('order_time_entries')
      .select('*')
      .eq('order_id', order.id)
      .order('date', { ascending: false });
    if (data) setTimeEntries(data);
  };

  const addExpense = async () => {
    if (!order || !user || !newExpense.description || !newExpense.amount) return;
    const { error } = await supabase.from('order_expenses').insert({
      order_id: order.id,
      user_id: user.id,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category || null,
      date: newExpense.date || new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success('Ausgabe hinzugefügt');
      setNewExpense({ description: '', amount: '', category: '', date: '' });
      fetchExpenses();
      updateOrderTotals();
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('order_expenses').delete().eq('id', id);
    if (!error) {
      toast.success('Ausgabe gelöscht');
      fetchExpenses();
      updateOrderTotals();
    }
  };

  const addTimeEntry = async () => {
    if (!order || !user || !newTimeEntry.hours) return;
    const { error } = await supabase.from('order_time_entries').insert({
      order_id: order.id,
      user_id: user.id,
      description: newTimeEntry.description || null,
      hours: parseFloat(newTimeEntry.hours),
      date: newTimeEntry.date || new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success('Zeiteintrag hinzugefügt');
      setNewTimeEntry({ description: '', hours: '', date: '' });
      fetchTimeEntries();
      updateOrderTotals();
    }
  };

  const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase.from('order_time_entries').delete().eq('id', id);
    if (!error) {
      toast.success('Zeiteintrag gelöscht');
      fetchTimeEntries();
      updateOrderTotals();
    }
  };

  const updateOrderTotals = async () => {
    if (!order) return;
    
    // Calculate total expenses
    const { data: expenseData } = await supabase
      .from('order_expenses')
      .select('amount')
      .eq('order_id', order.id);
    const totalExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Calculate total hours
    const { data: timeData } = await supabase
      .from('order_time_entries')
      .select('hours')
      .eq('order_id', order.id);
    const totalHours = timeData?.reduce((sum, t) => sum + Number(t.hours), 0) || 0;

    await supabase
      .from('orders')
      .update({ expenses: totalExpenses, time_spent_hours: totalHours })
      .eq('id', order.id);
    
    onUpdate();
  };

  if (!order) return null;

  const status = (order.status as OrderStatus) || 'pending';
  const statusConfig = STATUS_CONFIG[status];
  const profit = (order.revenue || 0) - (order.expenses || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <DialogTitle className="text-xl">{order.title}</DialogTitle>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
                  Bearbeiten
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(order.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <Euro className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
            <p className="text-xs text-muted-foreground">Einnahmen</p>
            <p className="text-lg font-bold text-emerald-400">
              {(order.revenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <Euro className="w-5 h-5 mx-auto mb-2 text-red-400" />
            <p className="text-xs text-muted-foreground">Ausgaben</p>
            <p className="text-lg font-bold text-red-400">
              {(order.expenses || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <Euro className="w-5 h-5 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Gewinn</p>
            <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <p className="text-xs text-muted-foreground">Zeit</p>
            <p className="text-lg font-bold text-blue-400">{order.time_spent_hours || 0}h</p>
          </div>
        </div>

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {order.contact && (
            <div className="flex items-center gap-2 text-sm">
              {order.contact.company ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
              <span>
                {order.contact.name}
                {order.contact.company && ` • ${order.contact.company}`}
              </span>
            </div>
          )}
          {order.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{order.location}</span>
            </div>
          )}
          {order.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Fällig: {format(new Date(order.due_date), 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
          )}
        </div>

        {order.description && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Beschreibung</h4>
            <p className="text-sm text-muted-foreground">{order.description}</p>
          </div>
        )}

        <Tabs defaultValue="expenses">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="expenses">Ausgaben ({expenses.length})</TabsTrigger>
            <TabsTrigger value="time">Zeiterfassung ({timeEntries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  placeholder="Beschreibung"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Kategorie</Label>
                <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addExpense} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Hinzufügen
              </Button>
            </div>

            {expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date!), 'dd.MM.yy', { locale: de })}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.category || '-'}</TableCell>
                      <TableCell className="text-right text-red-400">
                        {Number(expense.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Keine Ausgaben erfasst</p>
            )}
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  placeholder="Was wurde gemacht?"
                  value={newTimeEntry.description}
                  onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Stunden</Label>
                <Input
                  type="number"
                  step="0.25"
                  placeholder="0"
                  value={newTimeEntry.hours}
                  onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Datum</Label>
                <Input
                  type="date"
                  value={newTimeEntry.date}
                  onChange={(e) => setNewTimeEntry({ ...newTimeEntry, date: e.target.value })}
                />
              </div>
              <Button onClick={addTimeEntry} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Hinzufügen
              </Button>
            </div>

            {timeEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date!), 'dd.MM.yy', { locale: de })}</TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell className="text-right text-blue-400">{entry.hours}h</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTimeEntry(entry.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Keine Zeiteinträge erfasst</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
