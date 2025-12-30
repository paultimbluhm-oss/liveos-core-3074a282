import { useState, useEffect } from 'react';
import { Plus, Search, ClipboardList, Euro, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Order, STATUS_OPTIONS, OrderStatus } from './types';
import { OrderCard } from './OrderCard';
import { AddOrderDialog } from './AddOrderDialog';
import { OrderDetailDialog } from './OrderDetailDialog';
import { Tables } from '@/integrations/supabase/types';

export function OrdersSection() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Tables<'contacts'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      toast.error('Fehler beim Laden der Aufträge');
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
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Auftrag gelöscht');
      fetchOrders();
    }
  };

  const handleEdit = (order: Order) => {
    setEditOrder(order);
    setDialogOpen(true);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.revenue || 0), 0);
  const totalExpenses = orders.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const totalHours = orders.reduce((sum, o) => sum + (o.time_spent_hours || 0), 0);
  const activeOrders = orders.filter((o) => o.status === 'in_progress').length;

  const groupedOrders = statusFilter === 'all'
    ? STATUS_OPTIONS.reduce((acc, status) => {
        acc[status.value] = filteredOrders.filter((o) => o.status === status.value);
        return acc;
      }, {} as Record<string, Order[]>)
    : null;

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gesamt Aufträge</p>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-blue-400">{activeOrders} aktiv</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <ClipboardList className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Einnahmen</p>
              <p className="text-2xl font-bold text-emerald-400">
                {totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Euro className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gewinn</p>
              <p className={`text-2xl font-bold ${totalRevenue - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(totalRevenue - totalExpenses).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Zeitaufwand</p>
              <p className="text-2xl font-bold">{totalHours}h</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Aufträge durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditOrder(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Neuer Auftrag
        </Button>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-5 bg-muted rounded w-2/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-muted-foreground mb-2">Keine Aufträge gefunden</h3>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Versuche andere Suchbegriffe oder Filter'
              : 'Erstelle deinen ersten Auftrag'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ersten Auftrag erstellen
            </Button>
          )}
        </div>
      ) : groupedOrders ? (
        <div className="space-y-8">
          {STATUS_OPTIONS.map((status) => {
            const statusOrders = groupedOrders[status.value];
            if (statusOrders.length === 0) return null;
            return (
              <div key={status.value}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {status.label}
                  <span className="text-sm font-normal text-muted-foreground">({statusOrders.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statusOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
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
      />
    </div>
  );
}
