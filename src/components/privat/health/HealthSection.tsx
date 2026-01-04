import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface HealthItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_active: boolean;
  order_index: number;
}

interface HealthCompletion {
  health_item_id: string;
}

interface HealthSectionProps {
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'daily_routine', label: 'Tägliche Routine', color: '#22c55e' },
  { id: 'weekly_meals', label: 'Wöchentliche Gerichte', color: '#f59e0b' },
  { id: 'breakfast', label: 'Gesundes Frühstück', color: '#06b6d4' },
  { id: 'general', label: 'Allgemeine Tipps', color: '#8b5cf6' },
];

export function HealthSection({ onBack }: HealthSectionProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<HealthItem[]>([]);
  const [completions, setCompletions] = useState<HealthCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HealthItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('daily_routine');
  
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('daily_routine');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [itemsRes, completionsRes] = await Promise.all([
      supabase
        .from('health_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('order_index'),
      supabase
        .from('health_completions')
        .select('health_item_id')
        .eq('user_id', user.id)
        .eq('completed_date', today),
    ]);

    if (itemsRes.data) setItems(itemsRes.data);
    if (completionsRes.data) setCompletions(completionsRes.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !formTitle.trim()) return;

    if (editingItem) {
      await supabase
        .from('health_items')
        .update({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
        })
        .eq('id', editingItem.id);
    } else {
      await supabase.from('health_items').insert({
        user_id: user.id,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        order_index: items.length,
      });
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('health_items').delete().eq('id', id);
    fetchData();
  };

  const handleToggleCompletion = async (itemId: string) => {
    if (!user) return;

    const isCompleted = completions.some(c => c.health_item_id === itemId);

    if (isCompleted) {
      await supabase
        .from('health_completions')
        .delete()
        .eq('health_item_id', itemId)
        .eq('completed_date', today);
    } else {
      await supabase.from('health_completions').insert({
        user_id: user.id,
        health_item_id: itemId,
        completed_date: today,
      });
    }

    fetchData();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('daily_routine');
    setEditingItem(null);
    setDialogOpen(false);
  };

  const openEditDialog = (item: HealthItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormCategory(item.category);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setFormCategory(activeCategory);
    setDialogOpen(true);
  };

  const filteredItems = items.filter(item => item.category === activeCategory);
  
  // Progress only counts daily_routine items
  const dailyItems = items.filter(item => item.category === 'daily_routine');
  const dailyCompletedCount = dailyItems.filter(item => 
    completions.some(c => c.health_item_id === item.id)
  ).length;
  const dailyTotalCount = dailyItems.length;
  const progressPercent = dailyTotalCount > 0 ? Math.round((dailyCompletedCount / dailyTotalCount) * 100) : 0;

  const getCategoryColor = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId)?.color || '#64748b';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border-2 border-rose-500 bg-transparent">
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <h1 className="text-lg font-bold">Gesundheit</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={openAddDialog}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Täglicher Fortschritt</span>
          <span className="text-lg font-bold text-rose-500">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {dailyCompletedCount} von {dailyTotalCount} tägliche Aufgaben erledigt
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            style={{
              backgroundColor: activeCategory === cat.id ? cat.color : undefined,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Keine Items in dieser Kategorie</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Hinzufügen
            </Button>
          </div>
        ) : (
          filteredItems.map(item => {
            const isCompleted = completions.some(c => c.health_item_id === item.id);
            
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCompleted 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : 'bg-card border-border/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleCompletion(item.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      isCompleted
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-muted-foreground/30 hover:border-rose-500'
                    }`}
                  >
                    {isCompleted && <Check className="w-3 h-3" />}
                  </button>
                  
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openEditDialog(item)}
                  >
                    <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Bearbeiten' : 'Neues Item'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Titel"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div>
              <Textarea
                placeholder="Beschreibung (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>
                Abbrechen
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={!formTitle.trim()}
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}