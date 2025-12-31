import { useState, useEffect } from 'react';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Order, STATUS_CONFIG, OrderStatus } from './types';
import { AddOrderDialog } from './AddOrderDialog';
import { OrderDetailDialog } from './OrderDetailDialog';
import { Tables } from '@/integrations/supabase/types';

export function OrdersSection() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Tables<'contacts'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchContacts();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, contact:contacts(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Fehler beim Laden');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setContacts(data);
  };

  const handleSave = async (orderData: Partial<Order>) => {
    if (!user) return;

    if (editOrder) {
      const { error } = await supabase
        .from('orders')
        .update({
          title: orderData.title,
          description: orderData.description,
          contact_id: orderData.contact_id,
          status: orderData.status,
          priority: orderData.priority,
          amount: orderData.amount,
          revenue: orderData.revenue,
          expenses: orderData.expenses,
          location: orderData.location,
          start_date: orderData.start_date,
          due_date: orderData.due_date,
          end_date: orderData.end_date,
          notes: orderData.notes,
        })
        .eq('id', editOrder.id);
      if (error) {
        toast.error('Fehler beim Aktualisieren');
      } else {
        toast.success('Auftrag aktualisiert');
        fetchOrders();
      }
    } else {
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        title: orderData.title!,
        description: orderData.description,
        contact_id: orderData.contact_id,
        status: orderData.status,
        priority: orderData.priority,
        amount: orderData.amount,
        revenue: orderData.revenue,
        expenses: orderData.expenses,
        location: orderData.location,
        start_date: orderData.start_date,
        due_date: orderData.due_date,
        end_date: orderData.end_date,
        notes: orderData.notes,
      });
      if (error) {
        toast.error('Fehler beim Erstellen');
      } else {
        toast.success('Auftrag erstellt');
        fetchOrders();
      }
    }
    setEditOrder(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Loeschen');
    } else {
      toast.success('Auftrag geloescht');
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter((order) => {
    return order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Simple stats
  const activeCount = orders.filter(o => o.status === 'in_progress').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.revenue || 0), 0);
  const totalExpenses = orders.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const profit = totalRevenue - totalExpenses;

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Compact Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="text-muted-foreground">{orders.length} Auftraege</span>
          <span className="text-primary">{activeCount} aktiv</span>
        </div>
        <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {profit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </span>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Suchen..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 h-10" 
          />
        </div>
        <Button size="icon" onClick={() => { setEditOrder(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Keine Auftraege</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const status = (order.status as OrderStatus) || 'pending';
            const statusConfig = STATUS_CONFIG[status];
            const orderProfit = (order.revenue || 0) - (order.expenses || 0);
            
            return (
              <button
                key={order.id}
                onClick={() => { setSelectedOrder(order); setDetailDialogOpen(true); }}
                className="w-full text-left p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{order.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    {order.contact && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{order.contact.name}</p>
                    )}
                  </div>
                  <span className={`text-sm font-medium shrink-0 ${orderProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {orderProfit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AddOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editOrder={editOrder}
        contacts={contacts}
      />

      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrder}
        onUpdate={fetchOrders}
        onEdit={(order) => { setEditOrder(order); setDialogOpen(true); setDetailDialogOpen(false); }}
        onDelete={(id) => { handleDelete(id); setDetailDialogOpen(false); }}
      />
    </div>
  );
}