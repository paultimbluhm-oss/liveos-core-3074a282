import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBusinessV2 } from '../context/BusinessV2Context';

interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function AddTagDialog({ open, onOpenChange }: AddTagDialogProps) {
  const { addTag } = useBusinessV2();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addTag(name.trim(), color);
    setName('');
    setColor('#6366f1');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neues Tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tag-Name..." className="h-9 text-sm"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{ backgroundColor: c, borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent' }} />
            ))}
          </div>
          <Button className="w-full" disabled={!name.trim()} onClick={handleAdd}>Erstellen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
