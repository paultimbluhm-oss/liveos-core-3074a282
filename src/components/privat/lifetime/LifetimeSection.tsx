import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Clock, Utensils, Users, Home, Monitor, Sparkles, Moon, Heart, Dumbbell, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

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

export function LifetimeSection({ onBack }: LifetimeSectionProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
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
      // Pre-fill input values
      const values: Record<string, string> = {};
      data.forEach(e => {
        values[e.category] = formatMinutesToInput(e.minutes);
      });
      setInputValues(values);
    }
    setLoading(false);
  };

  const formatMinutesToInput = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}`;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const parseInputToMinutes = (input: string): number => {
    if (!input.trim()) return 0;
    if (input.includes(':')) {
      const [h, m] = input.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    return parseInt(input) || 0;
  };

  const handleSave = async (categoryId: string) => {
    if (!user) return;
    
    const minutes = parseInputToMinutes(inputValues[categoryId] || '');
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
    
    toast.success('Gespeichert');
    fetchEntries();
  };

  const getTotalMinutes = () => entries.reduce((sum, e) => sum + e.minutes, 0);

  const getChartData = () => {
    return entries
      .filter(e => e.minutes > 0)
      .map(e => {
        const cat = CATEGORIES.find(c => c.id === e.category);
        return {
          name: cat?.label || e.category,
          value: e.minutes,
          color: cat?.color || '#64748b',
        };
      })
      .sort((a, b) => b.value - a.value);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} Min`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Lifetime Tracking</h1>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {[0, 1, 2, 3, 4, 5, 6].map(daysAgo => {
          const date = subDays(new Date(), daysAgo);
          const dateStr = format(date, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={daysAgo}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all shrink-0 ${
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

      {/* Chart */}
      {entries.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Zeitverteilung</span>
            <span className="text-xs text-muted-foreground">
              Gesamt: {formatTime(getTotalMinutes())}
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getChartData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {getChartData().map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-xs">{value} ({formatTime(entry.payload.value)})</span>
                  )}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const entry = entries.find(e => e.category === cat.id);
          const hasValue = entry && entry.minutes > 0;
          
          return (
            <Card 
              key={cat.id} 
              className={`p-3 ${hasValue ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium flex-1">{cat.label}</span>
                {hasValue && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(entry.minutes)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="0:00"
                  value={inputValues[cat.id] || ''}
                  onChange={(e) => setInputValues(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  onBlur={() => handleSave(cat.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(cat.id)}
                  className="h-8 text-sm"
                />
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Format: Minuten (z.B. 45) oder Stunden:Minuten (z.B. 1:30)
      </p>
    </div>
  );
}
