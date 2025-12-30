import { useState, useEffect } from 'react';
import { Plus, Users, Search, Building2, Network, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Contact, Order, ContactStatus, ContactConnection, STATUS_CONFIG } from './types';
import { ContactCard } from './ContactCard';
import { AddContactDialog } from './AddContactDialog';
import { LinkContactDialog } from './LinkContactDialog';
import { ContactTreeView } from './ContactTreeView';
import { CompanyGroupView } from './CompanyGroupView';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'companies' | 'grid' | 'network';

export function ContactsSection() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [connections, setConnections] = useState<ContactConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('companies');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [linkSourceContact, setLinkSourceContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [contactsRes, ordersRes, connectionsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', user.id).order('name'),
      supabase.from('orders').select('*').eq('user_id', user.id),
      supabase.from('contact_connections').select('*').eq('user_id', user.id),
    ]);

    if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
    if (ordersRes.data) setOrders(ordersRes.data as Order[]);
    if (connectionsRes.data) setConnections(connectionsRes.data as ContactConnection[]);
    setLoading(false);
  };

  const handleSaveContact = async (contactData: Partial<Contact>) => {
    if (!user) return;

    if (contactData.id) {
      const { error } = await supabase.from('contacts').update({
        name: contactData.name, company: contactData.company, position: contactData.position,
        email: contactData.email, phone: contactData.phone, address: contactData.address,
        notes: contactData.notes, status: contactData.status,
      }).eq('id', contactData.id);

      if (error) toast.error('Fehler beim Aktualisieren');
      else { toast.success('Kontakt aktualisiert'); fetchData(); }
    } else {
      const { error } = await supabase.from('contacts').insert({
        user_id: user.id, name: contactData.name!, company: contactData.company,
        position: contactData.position, email: contactData.email, phone: contactData.phone,
        address: contactData.address, notes: contactData.notes, status: contactData.status || 'idea',
      });

      if (error) toast.error('Fehler beim Erstellen');
      else { toast.success('Kontakt erstellt'); fetchData(); }
    }
    setEditContact(null);
  };

  const handleDeleteContact = async (contact: Contact) => {
    const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
    if (error) toast.error('Fehler beim Löschen');
    else { toast.success('Kontakt gelöscht'); fetchData(); }
  };

  const handleLinkContacts = async (fromId: string, toId: string, type: string, description: string) => {
    if (!user) return;
    const { error } = await supabase.from('contact_connections').insert({
      user_id: user.id, from_contact_id: fromId, to_contact_id: toId,
      relationship_type: type, description: description || null,
    });

    if (error) toast.error('Fehler beim Verknüpfen');
    else { toast.success('Kontakte verknüpft'); fetchData(); }
  };

  const handleUpdateConnection = async (id: string, type: string, description: string) => {
    const { error } = await supabase.from('contact_connections')
      .update({ relationship_type: type, description: description || null })
      .eq('id', id);

    if (error) toast.error('Fehler beim Aktualisieren');
    else { toast.success('Verbindung aktualisiert'); fetchData(); }
  };

  const handleDeleteConnection = async (id: string) => {
    const { error } = await supabase.from('contact_connections').delete().eq('id', id);

    if (error) toast.error('Fehler beim Löschen');
    else { toast.success('Verbindung gelöscht'); fetchData(); }
  };

  const getConnectionCount = (contactId: string) => {
    return connections.filter(c => c.from_contact_id === contactId || c.to_contact_id === contactId).length;
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = { total: contacts.length, companies: new Set(contacts.filter(c => c.company).map(c => c.company)).size, connections: connections.length };

  if (loading) {
    return <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 text-center">
          <div className="flex justify-center mb-2"><div className="p-2 rounded-lg bg-primary/20"><Users className="w-5 h-5 text-primary" /></div></div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Kontakte</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 text-center">
          <div className="flex justify-center mb-2"><div className="p-2 rounded-lg bg-info/20"><Building2 className="w-5 h-5 text-info" /></div></div>
          <p className="text-2xl font-bold">{stats.companies}</p>
          <p className="text-xs text-muted-foreground">Unternehmen</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 text-center">
          <div className="flex justify-center mb-2"><div className="p-2 rounded-lg bg-success/20"><Network className="w-5 h-5 text-success" /></div></div>
          <p className="text-2xl font-bold">{stats.connections}</p>
          <p className="text-xs text-muted-foreground">Verknüpfungen</p>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kontakte durchsuchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'companies' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('companies')} title="Nach Unternehmen">
            <Building2 className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')} title="Rasteransicht">
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'network' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('network')} title="Baumdiagramm">
            <Network className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={() => { setEditContact(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Kontakt</Button>
      </div>

      {viewMode === 'network' ? (
        <ContactTreeView 
          contacts={filteredContacts} 
          connections={connections} 
          onContactClick={(c) => { setEditContact(c); setDialogOpen(true); }}
          onUpdateConnection={handleUpdateConnection}
          onDeleteConnection={handleDeleteConnection}
        />
      ) : viewMode === 'companies' ? (
        <>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactStatus | 'all')}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">Alle</TabsTrigger>
              <TabsTrigger value="need_to_reply" className="text-xs">Antworten</TabsTrigger>
              <TabsTrigger value="waiting_for_reply" className="text-xs">Wartend</TabsTrigger>
              <TabsTrigger value="idea" className="text-xs">Idee</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Abgeschlossen</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <CompanyGroupView
            contacts={filteredContacts}
            orders={orders}
            onEdit={(c) => { setEditContact(c); setDialogOpen(true); }}
            onDelete={handleDeleteContact}
            onLinkContacts={(c) => { setLinkSourceContact(c); setLinkDialogOpen(true); }}
            connectionCount={getConnectionCount}
          />
        </>
      ) : (
        <>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactStatus | 'all')}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">Alle</TabsTrigger>
              <TabsTrigger value="need_to_reply" className="text-xs">Antworten</TabsTrigger>
              <TabsTrigger value="waiting_for_reply" className="text-xs">Wartend</TabsTrigger>
              <TabsTrigger value="idea" className="text-xs">Idee</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Abgeschlossen</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">Keine Kontakte gefunden</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredContacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} orders={orders} onEdit={(c) => { setEditContact(c); setDialogOpen(true); }}
                    onDelete={handleDeleteContact} onViewOrders={() => toast.info(`Aufträge für ${contact.name}`)}
                    onLinkContacts={(c) => { setLinkSourceContact(c); setLinkDialogOpen(true); }} connectionCount={getConnectionCount(contact.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <AddContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSaveContact} editContact={editContact} />
      <LinkContactDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} sourceContact={linkSourceContact} contacts={contacts} onSave={handleLinkContacts} />
    </div>
  );
}
