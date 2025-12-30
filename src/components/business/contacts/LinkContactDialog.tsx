import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact, RELATIONSHIP_TYPES } from './types';
import { Link2, X } from 'lucide-react';

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceContact: Contact | null;
  contacts: Contact[];
  onSave: (fromId: string, toId: string, type: string, description: string) => void;
}

export function LinkContactDialog({ open, onOpenChange, sourceContact, contacts, onSave }: LinkContactDialogProps) {
  const [selectedContactId, setSelectedContactId] = useState('');
  const [relationshipType, setRelationshipType] = useState('recommended');
  const [description, setDescription] = useState('');

  const availableContacts = contacts.filter(c => c.id !== sourceContact?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceContact || !selectedContactId) return;

    onSave(sourceContact.id, selectedContactId, relationshipType, description);
    
    // Reset form
    setSelectedContactId('');
    setRelationshipType('recommended');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Kontakt verknüpfen
          </DialogTitle>
        </DialogHeader>

        {sourceContact && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Verknüpfung von:</p>
              <p className="font-medium">{sourceContact.name}</p>
              {sourceContact.company && (
                <p className="text-sm text-muted-foreground">{sourceContact.company}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetContact">Mit Kontakt verknüpfen</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kontakt auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.company && `(${contact.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationshipType">Art der Beziehung</Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. 'Hat mich auf der Messe vorgestellt'"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!selectedContactId}>
                <Link2 className="w-4 h-4 mr-2" />
                Verknüpfen
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
