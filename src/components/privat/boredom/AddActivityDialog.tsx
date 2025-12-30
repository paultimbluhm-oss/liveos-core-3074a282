import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Lightbulb, Gamepad2, Music, Palette, Book, Dumbbell, 
  Code, Camera, ChefHat, Wrench, Languages, Brain 
} from 'lucide-react';

const icons = [
  { value: 'Lightbulb', label: 'Idee', icon: Lightbulb },
  { value: 'Gamepad2', label: 'Spiel', icon: Gamepad2 },
  { value: 'Music', label: 'Musik', icon: Music },
  { value: 'Palette', label: 'Kunst', icon: Palette },
  { value: 'Book', label: 'Lesen', icon: Book },
  { value: 'Dumbbell', label: 'Sport', icon: Dumbbell },
  { value: 'Code', label: 'Programmieren', icon: Code },
  { value: 'Camera', label: 'Fotografie', icon: Camera },
  { value: 'ChefHat', label: 'Kochen', icon: ChefHat },
  { value: 'Wrench', label: 'Handwerk', icon: Wrench },
  { value: 'Languages', label: 'Sprachen', icon: Languages },
  { value: 'Brain', label: 'Lernen', icon: Brain },
];

const categories = [
  'Hobby', 'Sport', 'Kreativ', 'Lernen', 'Handwerk', 'Technik', 'Sonstiges'
];

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddActivityDialog({ open, onOpenChange, onSuccess }: AddActivityDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState('Lightbulb');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('boredom_activities').insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      category: category || null,
      icon,
      is_productive: true,
    });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projekt erstellt!' });
      setName('');
      setDescription('');
      setCategory('');
      setIcon('Lightbulb');
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Projekt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Zauberwürfel lernen"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Beschreibung (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Worum geht es bei diesem Projekt?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {icons.map(i => (
                    <SelectItem key={i.value} value={i.value}>
                      <div className="flex items-center gap-2">
                        <i.icon className="w-4 h-4" />
                        {i.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Erstellen...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
