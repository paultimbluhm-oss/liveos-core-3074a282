import { useState, useEffect } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Contact, Order, ContactConnection, STATUS_CONFIG } from './types';
import { AddContactDialog } from './AddContactDialog';
import { LinkContactDialog } from './LinkContactDialog';

export function ContactsSection() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [connections, setConnections] = useState<ContactConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (error) toast.error('Fehler beim Loeschen');
    else { toast.success('Kontakt geloescht'); fetchData(); }
  };

  const handleLinkContacts = async (fromId: string, toId: string, type: string, description: string) => {
    if (!user) return;
    const { error } = await supabase.from('contact_connections').insert({
      user_id: user.id, from_contact_id: fromId, to_contact_id: toId,
      relationship_type: type, description: description || null,
    });

    if (error) toast.error('Fehler beim Verknuepfen');
    else { toast.success('Kontakte verknuepft'); fetchData(); }
  };

  const filteredContacts = contacts.filter((contact) => {
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOrderCount = (contactId: string) => orders.filter(o => o.contact_id === contactId).length;

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
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
        <Button size="icon" onClick={() => { setEditContact(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Keine Kontakte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => {
            const statusConfig = STATUS_CONFIG[contact.status];
            const orderCount = getOrderCount(contact.id);
            
            return (
              <button
                key={contact.id}
                onClick={() => { setEditContact(contact); setDialogOpen(true); }}
                className="w-full text-left p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{contact.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    {contact.company && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {orderCount > 0 && <span>{orderCount} Auftr.</span>}
                    {contact.phone && <span className="hidden sm:inline">{contact.phone}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AddContactDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSave={handleSaveContact} 
        editContact={editContact}
        onDelete={editContact ? () => { handleDeleteContact(editContact); setDialogOpen(false); } : undefined}
        onLink={editContact ? () => { setLinkSourceContact(editContact); setLinkDialogOpen(true); } : undefined}
      />
      <LinkContactDialog 
        open={linkDialogOpen} 
        onOpenChange={setLinkDialogOpen} 
        sourceContact={linkSourceContact} 
        contacts={contacts} 
        onSave={handleLinkContacts} 
      />
    </div>
  );
}