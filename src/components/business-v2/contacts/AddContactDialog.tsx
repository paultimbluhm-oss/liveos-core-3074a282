import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessV2 } from '../context/BusinessV2Context';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function AddContactDialog({ open, onOpenChange, companyId }: AddContactDialogProps) {
  const { addContact } = useBusinessV2();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    await addContact({
      company_id: companyId,
      name: name.trim(),
      position: position.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setLoading(false);
    
    setName('');
    setPosition('');
    setEmail('');
    setPhone('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontakt hinzufuegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactName">Name *</Label>
            <Input
              id="contactName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="z.B. CEO, Sales Manager..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNotes">Notizen</Label>
            <Textarea
              id="contactNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionale Notizen..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Speichern...' : 'Hinzufuegen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
