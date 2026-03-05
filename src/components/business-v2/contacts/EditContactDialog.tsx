import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { CompanyContact } from '../types';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: CompanyContact;
}

export function EditContactDialog({ open, onOpenChange, contact }: EditContactDialogProps) {
  const { updateContact } = useBusinessV2();
  const [name, setName] = useState(contact.name);
  const [position, setPosition] = useState(contact.position || '');
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [notes, setNotes] = useState(contact.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(contact.name);
    setPosition(contact.position || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setNotes(contact.notes || '');
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    await updateContact(contact.id, {
      name: name.trim(),
      position: position.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontakt bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editContactName">Name *</Label>
            <Input
              id="editContactName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editPosition">Position</Label>
            <Input
              id="editPosition"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="z.B. CEO, Sales Manager..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editEmail">E-Mail</Label>
              <Input
                id="editEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefon</Label>
              <Input
                id="editPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editContactNotes">Notizen</Label>
            <Textarea
              id="editContactNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
