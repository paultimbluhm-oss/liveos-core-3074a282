import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContactConnection, Contact, RELATIONSHIP_TYPES } from './types';
import { Pencil, Trash2 } from 'lucide-react';

interface EditConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ContactConnection | null;
  contacts: Contact[];
  onUpdate: (id: string, type: string, description: string) => void;
  onDelete: (id: string) => void;
}

export function EditConnectionDialog({ 
  open, onOpenChange, connection, contacts, onUpdate, onDelete 
}: EditConnectionDialogProps) {
  const [relationshipType, setRelationshipType] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (connection) {
      setRelationshipType(connection.relationship_type);
      setDescription(connection.description || '');
    }
  }, [connection]);

  const fromContact = contacts.find(c => c.id === connection?.from_contact_id);
  const toContact = contacts.find(c => c.id === connection?.to_contact_id);

  const handleUpdate = () => {
    if (!connection) return;
    onUpdate(connection.id, relationshipType, description);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!connection) return;
    if (confirm('Verbindung wirklich löschen?')) {
      onDelete(connection.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Verbindung bearbeiten
          </DialogTitle>
        </DialogHeader>

        {connection && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Von</p>
                  <p className="font-medium">{fromContact?.name || 'Unbekannt'}</p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground">Zu</p>
                  <p className="font-medium">{toContact?.name || 'Unbekannt'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Art der Beziehung</Label>
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
              <Label>Beschreibung</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. 'Hat mich auf der Messe vorgestellt'"
              />
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleUpdate}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}