import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2, Clock, Euro, TrendingUp, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company, CompanyOrder, OrderChecklistItem, DEFAULT_CHECKLIST_TEMPLATE } from '../../types';

interface OrdersTabProps {
  company: Company;
}

export function OrdersTab({ company }: OrdersTabProps) {
  const { getCompanyOrders, addOrder, updateOrder, deleteOrder, getOrderChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem } = useBusinessV2();
  const orders = getCompanyOrders(company.id);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<CompanyOrder | null>(null);

  // Add order form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleAddOrder = async () => {
    if (!title.trim()) return;
    const order = await addOrder(company.id, title.trim(), description.trim() || undefined);
    if (order) {
      // Add default checklist items
      for (let i = 0; i < DEFAULT_CHECKLIST_TEMPLATE.length; i++) {
        await addChecklistItem(order.id, DEFAULT_CHECKLIST_TEMPLATE[i], i);
      }
    }
    setTitle('');
    setDescription('');
    setAddOpen(false);
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`;
  };

  const formatCurrency = (val: number) => `${val.toFixed(2)} EUR`;

  const activeOrders = orders.filter(o => o.status === 'active');
  const doneOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auftraege</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Auftrag
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Keine Auftraege</p>
      ) : (
        <div className="space-y-2">
          {activeOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedOrder === order.id}
              onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              onEdit={() => setEditOrder(order)}
              formatMinutes={formatMinutes}
              formatCurrency={formatCurrency}
            />
          ))}
          {doneOrders.length > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block pt-2">Abgeschlossen</span>
              {doneOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  onEdit={() => setEditOrder(order)}
                  formatMinutes={formatMinutes}
                  formatCurrency={formatCurrency}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Add Order Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base">Neuer Auftrag</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Titel</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Website Redesign" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Beschreibung (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={2} className="text-sm" />
            </div>
            <p className="text-[10px] text-muted-foreground">Standard-Checkliste wird automatisch hinzugefuegt</p>
            <Button className="w-full" disabled={!title.trim()} onClick={handleAddOrder}>Auftrag erstellen</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Order Sheet */}
      {editOrder && (
        <EditOrderSheet order={editOrder} onClose={() => setEditOrder(null)} formatMinutes={formatMinutes} formatCurrency={formatCurrency} />
      )}
    </div>
  );
}

function OrderCard({ order, expanded, onToggle, onEdit, formatMinutes, formatCurrency }: {
  order: CompanyOrder; expanded: boolean; onToggle: () => void; onEdit: () => void;
  formatMinutes: (m: number) => string; formatCurrency: (v: number) => string;
}) {
  const { getOrderChecklist, updateChecklistItem, addChecklistItem, deleteChecklistItem, updateOrder, deleteOrder, addTimelineEntry } = useBusinessV2();
  const checklist = getOrderChecklist(order.id);
  const completed = checklist.filter(i => i.completed).length;
  const total = checklist.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const profit = order.revenue - order.expenses;

  const [newStep, setNewStep] = useState('');

  const handleToggleItem = async (item: OrderChecklistItem) => {
    const nowCompleted = !item.completed;
    await updateChecklistItem(item.id, {
      completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : undefined,
    });
    // Timeline entry
    if (nowCompleted) {
      await addTimelineEntry(order.company_id, 'order_update', `${order.title}: "${item.title}" erledigt`);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    const maxIdx = checklist.length > 0 ? Math.max(...checklist.map(i => i.order_index)) + 1 : 0;
    await addChecklistItem(order.id, newStep.trim(), maxIdx);
    setNewStep('');
  };

  const handleComplete = async () => {
    await updateOrder(order.id, { status: 'completed' });
    await addTimelineEntry(order.company_id, 'order_update', `Auftrag "${order.title}" abgeschlossen`);
  };

  const handleReopen = async () => {
    await updateOrder(order.id, { status: 'active' });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{order.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{completed}/{total} Schritte</span>
            {order.revenue > 0 && <span className="text-[10px] text-emerald-500">{formatCurrency(order.revenue)}</span>}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-12 h-1.5 rounded-full bg-muted shrink-0 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <Euro className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-0.5" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Umsatz</p>
              <p className="text-xs font-semibold">{formatCurrency(order.revenue)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <TrendingUp className="w-3.5 h-3.5 mx-auto text-blue-500 mb-0.5" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Gewinn</p>
              <p className={`text-xs font-semibold ${profit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <Clock className="w-3.5 h-3.5 mx-auto text-amber-500 mb-0.5" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground">Zeit</p>
              <p className="text-xs font-semibold">{formatMinutes(order.time_spent_minutes)}</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-1 group">
                <Checkbox checked={item.completed} onCheckedChange={() => handleToggleItem(item)} className="h-4 w-4" />
                <span className={`text-sm flex-1 min-w-0 truncate ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                {item.completed_at && (
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {format(new Date(item.completed_at), 'dd.MM.', { locale: de })}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteChecklistItem(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add step */}
          <div className="flex gap-2">
            <Input value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Neuer Schritt..."
              className="h-7 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleAddStep()} />
            <Button size="icon" className="h-7 w-7 shrink-0" disabled={!newStep.trim()} onClick={handleAddStep}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" /> Bearbeiten
            </Button>
            {order.status === 'active' ? (
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleComplete}>
                <Check className="w-3 h-3 mr-1" /> Abschliessen
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={handleReopen}>
                Wieder oeffnen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditOrderSheet({ order, onClose, formatMinutes, formatCurrency }: {
  order: CompanyOrder; onClose: () => void;
  formatMinutes: (m: number) => string; formatCurrency: (v: number) => string;
}) {
  const { updateOrder, deleteOrder } = useBusinessV2();
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description || '');
  const [revenue, setRevenue] = useState(order.revenue.toString());
  const [expenses, setExpenses] = useState(order.expenses.toString());
  const [hours, setHours] = useState(Math.floor(order.time_spent_minutes / 60).toString());
  const [minutes, setMinutes] = useState((order.time_spent_minutes % 60).toString());

  const handleSave = async () => {
    await updateOrder(order.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      revenue: parseFloat(revenue) || 0,
      expenses: parseFloat(expenses) || 0,
      time_spent_minutes: (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0),
    });
    onClose();
  };

  const handleDelete = async () => {
    await deleteOrder(order.id);
    onClose();
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">Auftrag bearbeiten</SheetTitle>
        </SheetHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Beschreibung</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Umsatz (EUR)</Label>
              <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="h-9 text-sm" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ausgaben (EUR)</Label>
              <Input type="number" value={expenses} onChange={e => setExpenses(e.target.value)} className="h-9 text-sm" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stunden</Label>
              <Input type="number" value={hours} onChange={e => setHours(e.target.value)} className="h-9 text-sm" min="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minuten</Label>
              <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className="h-9 text-sm" min="0" max="59" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>Speichern</Button>
            <Button variant="outline" className="text-destructive border-destructive/20" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
