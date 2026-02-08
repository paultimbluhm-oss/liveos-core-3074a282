import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { RelationType, RELATION_CONFIG } from '../types';

interface AddRelationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromCompanyId: string;
}

export function AddRelationDialog({ open, onOpenChange, fromCompanyId }: AddRelationDialogProps) {
  const { addRelation, companies } = useBusinessV2();
  const [toCompanyId, setToCompanyId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('partner');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const availableCompanies = companies.filter(c => c.id !== fromCompanyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toCompanyId) return;
    
    setLoading(true);
    await addRelation(fromCompanyId, toCompanyId, relationType, description.trim() || undefined);
    setLoading(false);
    
    setToCompanyId('');
    setRelationType('partner');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verknuepfung erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Unternehmen</Label>
            <Select value={toCompanyId} onValueChange={setToCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Waehlen..." />
              </SelectTrigger>
              <SelectContent>
                {availableCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Beziehungstyp</Label>
            <Select value={relationType} onValueChange={(v) => setRelationType(v as RelationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RELATION_CONFIG).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relDesc">Beschreibung</Label>
            <Input
              id="relDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !toCompanyId}>
            {loading ? 'Erstellen...' : 'Verknuepfen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
