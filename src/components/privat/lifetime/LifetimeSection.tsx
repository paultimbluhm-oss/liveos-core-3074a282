import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Clock, Utensils, Users, Home, Monitor, Sparkles, Moon, Dumbbell, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface LifetimeSectionProps {
  onBack: () => void;
}

interface TimeEntry {
  id: string;
  category: string;
  minutes: number;
  entry_date: string;
  notes: string | null;
}

const CATEGORIES = [
  { id: 'schlafen', label: 'Schlafen', icon: Moon, color: '#6366f1' },
  { id: 'essen', label: 'Essen', icon: Utensils, color: '#f59e0b' },
  { id: 'familie', label: 'Familie', icon: Home, color: '#ec4899' },
  { id: 'freunde', label: 'Freunde', icon: Users, color: '#8b5cf6' },
  { id: 'hygiene', label: 'Hygiene', icon: Sparkles, color: '#06b6d4' },
  { id: 'youtube', label: 'YouTube', icon: Monitor, color: '#ef4444' },
  { id: 'webseiten', label: 'Webseiten', icon: Monitor, color: '#3b82f6' },
  { id: 'zimmer', label: 'Zimmer', icon: Home, color: '#22c55e' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: '#14b8a6' },
  { id: 'lernen', label: 'Lernen', icon: BookOpen, color: '#a855f7' },
  { id: 'sonstiges', label: 'Sonstiges', icon: Clock, color: '#64748b' },
];

const TIME_OPTIONS = [
  { value: '0', label: '-' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '45', label: '45m' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h 30m' },
  { value: '120', label: '2h' },
  { value: '150', label: '2h 30m' },
  { value: '180', label: '3h' },
  { value: '240', label: '4h' },
  { value: '300', label: '5h' },
  { value: '360', label: '6h' },
  { value: '420', label: '7h' },
  { value: '480', label: '8h' },
  { value: '540', label: '9h' },
  { value: '600', label: '10h' },
];

export function LifetimeSection({ onBack }: LifetimeSectionProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user, selectedDate]);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', selectedDate);
    
    if (data) {
      setEntries(data);
    }
    setLoading(false);
  };

  const handleTimeChange = async (categoryId: string, minutes: number) => {
    if (!user) return;
    
    const existingEntry = entries.find(e => e.category === categoryId);
    
    if (minutes === 0 && existingEntry) {
      await supabase.from('time_entries').delete().eq('id', existingEntry.id);
    } else if (minutes > 0) {
      if (existingEntry) {
        await supabase.from('time_entries').update({ minutes }).eq('id', existingEntry.id);
      } else {
        await supabase.from('time_entries').insert({
          user_id: user.id,
          category: categoryId,
          minutes,
          entry_date: selectedDate,
        });
      }
    }
    
    fetchEntries();
  };

  const adjustTime = async (categoryId: string, delta: number) => {
    const entry = entries.find(e => e.category === categoryId);
    const currentMinutes = entry?.minutes || 0;
    const newMinutes = Math.max(0, currentMinutes + delta);
    await handleTimeChange(categoryId, newMinutes);
  };

  const getTotalMinutes = () => entries.reduce((sum, e) => sum + e.minutes, 0);

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getEntryMinutes = (categoryId: string) => {
    return entries.find(e => e.category === categoryId)?.minutes || 0;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border-2 border-indigo-500 bg-transparent">
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <h1 className="text-lg font-bold">Lifetime</h1>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {formatTime(getTotalMinutes())}
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
        {[0, 1, 2, 3, 4, 5, 6].map(daysAgo => {
          const date = subDays(new Date(), daysAgo);
          const dateStr = format(date, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={daysAgo}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <span className="text-[10px] uppercase">
                {format(date, 'EEE', { locale: de })}
              </span>
              <span className="text-sm font-medium">
                {format(date, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Categories List - Mobile optimized */}
      <div className="space-y-1.5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const minutes = getEntryMinutes(cat.id);
          const hasValue = minutes > 0;
          
          return (
            <div 
              key={cat.id} 
              className={`flex items-center gap-3 p-2.5 rounded-xl bg-card border transition-all ${
                hasValue ? 'border-primary/30' : 'border-border/50'
              }`}
            >
              {/* Icon & Label */}
              <div 
                className="p-2 rounded-lg shrink-0"
                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              
              <span className="text-sm font-medium flex-1">{cat.label}</span>
              
              {/* Time Display */}
              <span className={`text-sm font-medium min-w-[50px] text-right ${
                hasValue ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {formatTime(minutes)}
              </span>
              
              {/* Quick Adjust Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => adjustTime(cat.id, -15)}
                  disabled={minutes === 0}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                
                <Select
                  value={String(minutes)}
                  onValueChange={(val) => handleTimeChange(cat.id, parseInt(val))}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => adjustTime(cat.id, 15)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}