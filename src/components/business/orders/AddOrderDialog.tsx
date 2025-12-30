import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, STATUS_OPTIONS, PRIORITY_OPTIONS } from './types';
import { Tables } from '@/integrations/supabase/types';

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: Partial<Order>) => void;
  editOrder?: Order | null;
  contacts: Tables<'contacts'>[];
}

export function AddOrderDialog({ open, onOpenChange, onSave, editOrder, contacts }: AddOrderDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_id: '',
    status: 'pending',
    priority: 'medium',
    amount: '',
    revenue: '',
    expenses: '',
    location: '',
    start_date: '',
    due_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    if (editOrder) {
      setFormData({
        title: editOrder.title || '',
        description: editOrder.description || '',
        contact_id: editOrder.contact_id || '',
        status: editOrder.status || 'pending',
        priority: editOrder.priority || 'medium',
        amount: editOrder.amount?.toString() || '',
        revenue: editOrder.revenue?.toString() || '',
        expenses: editOrder.expenses?.toString() || '',
        location: editOrder.location || '',
        start_date: editOrder.start_date || '',
        due_date: editOrder.due_date || '',
        end_date: editOrder.end_date || '',
        notes: editOrder.notes || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        contact_id: '',
        status: 'pending',
        priority: 'medium',
        amount: '',
        revenue: '',
        expenses: '',
        location: '',
        start_date: '',
        due_date: '',
        end_date: '',
        notes: '',
      });
    }
  }, [editOrder, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...editOrder,
      title: formData.title,
      description: formData.description || null,
      contact_id: formData.contact_id || null,
      status: formData.status,
      priority: formData.priority,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      revenue: formData.revenue ? parseFloat(formData.revenue) : 0,
      expenses: formData.expenses ? parseFloat(formData.expenses) : 0,
      location: formData.location || null,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
      end_date: formData.end_date || null,
      notes: formData.notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editOrder ? 'Auftrag bearbeiten' : 'Neuer Auftrag'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Auftragsbezeichnung"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact">Kontakt</Label>
              <Select value={formData.contact_id || '_none'} onValueChange={(v) => setFormData({ ...formData, contact_id: v === '_none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Kontakt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Kein Kontakt</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.company && `(${contact.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Ort</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Einsatzort"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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

            <div>
              <Label htmlFor="priority">Priorität</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Auftragswert (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="revenue">Einnahmen (€)</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="expenses">Ausgaben (€)</Label>
              <Input
                id="expenses"
                type="number"
                step="0.01"
                value={formData.expenses}
                onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="start_date">Startdatum</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="due_date">Fälligkeitsdatum</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="end_date">Abschlussdatum</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Auftragsbeschreibung..."
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interne Notizen..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">{editOrder ? 'Speichern' : 'Erstellen'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
