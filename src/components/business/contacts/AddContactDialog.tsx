import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact, ContactStatus, ContactConnection, STATUS_OPTIONS, POSITION_OPTIONS, RELATIONSHIP_TYPES } from './types';
import { Trash2, Link2, X, Plus } from 'lucide-react';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: Partial<Contact>) => void;
  editContact?: Contact | null;
  onDelete?: () => void;
  // New props for connections
  connections?: ContactConnection[];
  contacts?: Contact[];
  onAddConnection?: (toId: string, type: string, description: string) => void;
  onDeleteConnection?: (connectionId: string) => void;
}

export function AddContactDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  editContact, 
  onDelete,
  connections = [],
  contacts = [],
  onAddConnection,
  onDeleteConnection,
}: AddContactDialogProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ContactStatus>('idea');
  
  // New connection form state
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [newConnectionContactId, setNewConnectionContactId] = useState('');
  const [newConnectionType, setNewConnectionType] = useState('recommended');
  const [newConnectionDescription, setNewConnectionDescription] = useState('');

  // Get connections for this contact
  const contactConnections = editContact 
    ? connections.filter(c => c.from_contact_id === editContact.id || c.to_contact_id === editContact.id)
    : [];

  // Get available contacts for linking (exclude current contact)
  const availableContacts = editContact 
    ? contacts.filter(c => c.id !== editContact.id)
    : [];

  useEffect(() => {
    if (editContact) {
      setName(editContact.name);
      setCompany(editContact.company || '');
      setPosition(editContact.position || '');
      setEmail(editContact.email || '');
      setPhone(editContact.phone || '');
      setAddress(editContact.address || '');
      setNotes(editContact.notes || '');
      setStatus(editContact.status || 'idea');
    } else {
      resetForm();
    }
    setShowAddConnection(false);
  }, [editContact, open]);

  const resetForm = () => {
    setName('');
    setCompany('');
    setPosition('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNotes('');
    setStatus('idea');
    setShowAddConnection(false);
    setNewConnectionContactId('');
    setNewConnectionType('recommended');
    setNewConnectionDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: editContact?.id,
      name: name.trim(),
      company: company.trim() || null,
      position: position.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      status,
    });

    onOpenChange(false);
    resetForm();
  };

  const handleAddConnection = () => {
    if (!newConnectionContactId || !onAddConnection) return;
    onAddConnection(newConnectionContactId, newConnectionType, newConnectionDescription);
    setNewConnectionContactId('');
    setNewConnectionType('recommended');
    setNewConnectionDescription('');
    setShowAddConnection(false);
  };

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || 'Unbekannt';
  };

  const getOtherContactId = (connection: ContactConnection) => {
    if (!editContact) return '';
    return connection.from_contact_id === editContact.id 
      ? connection.to_contact_id 
      : connection.from_contact_id;
  };

  const getRelationshipLabel = (type: string) => {
    return RELATIONSHIP_TYPES.find(r => r.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Unternehmen</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Musterfirma GmbH"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select value={position || "none"} onValueChange={(v) => setPosition(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Position..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Angabe</SelectItem>
                {POSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@beispiel.de"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Musterstr. 123, 12345 Stadt"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusaetzliche Infos..."
              rows={2}
            />
          </div>

          {/* Connections Section - Only show when editing */}
          {editContact && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Verknüpfungen
                </Label>
                {onAddConnection && availableContacts.length > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAddConnection(!showAddConnection)}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Neu
                  </Button>
                )}
              </div>

              {/* Add new connection form */}
              {showAddConnection && (
                <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
                  <Select value={newConnectionContactId} onValueChange={setNewConnectionContactId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Kontakt wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.company && `(${contact.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newConnectionType} onValueChange={setNewConnectionType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newConnectionDescription}
                    onChange={(e) => setNewConnectionDescription(e.target.value)}
                    placeholder="Beschreibung (optional)"
                    className="h-9 text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAddConnection(false)}
                      className="flex-1 h-8"
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleAddConnection}
                      disabled={!newConnectionContactId}
                      className="flex-1 h-8"
                    >
                      Verknüpfen
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing connections list */}
              {contactConnections.length > 0 ? (
                <div className="space-y-2">
                  {contactConnections.map((connection) => {
                    const otherContactId = getOtherContactId(connection);
                    const otherContactName = getContactName(otherContactId);
                    const relationshipLabel = getRelationshipLabel(connection.relationship_type);
                    const isFromThis = connection.from_contact_id === editContact.id;
                    
                    return (
                      <div 
                        key={connection.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-muted-foreground text-xs">
                              {isFromThis ? relationshipLabel : `${relationshipLabel} (von)`}
                            </span>
                            <span className="font-medium truncate">{otherContactName}</span>
                          </div>
                          {connection.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {connection.description}
                            </p>
                          )}
                        </div>
                        {onDeleteConnection && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => onDeleteConnection(connection.id)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !showAddConnection && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Keine Verknüpfungen
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {editContact && onDelete && (
                <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit">
                {editContact ? 'Speichern' : 'Hinzufuegen'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
