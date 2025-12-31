import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Clock, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CATEGORIES, TIME_OPTIONS, TimeEntry, LifetimeGoal, formatTime } from './types';
import { LifetimeGoalsDialog } from './LifetimeGoalsDialog';
import { LifetimeStatsView } from './LifetimeStatsView';

interface LifetimeSectionProps {
  onBack: () => void;
}

export function LifetimeSection({ onBack }: LifetimeSectionProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<LifetimeGoal[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchGoals();
    }
  }, [user, selectedDate]);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', selectedDate);
    
    if (data) setEntries(data);
    setLoading(false);
  };

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('lifetime_goals')
      .select('*')
      .eq('user_id', user.id);
    if (data) setGoals(data);
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

  const getEntryMinutes = (categoryId: string) => {
    return entries.find(e => e.category === categoryId)?.minutes || 0;
  };

  const getGoalForCategory = (categoryId: string): number => {
    const selectedDayOfWeek = new Date(selectedDate).getDay();
    const dayGoal = goals.find(g => g.category === categoryId && g.day_of_week === selectedDayOfWeek);
    if (dayGoal) return dayGoal.target_minutes;
    const defaultGoal = goals.find(g => g.category === categoryId && g.day_of_week === null);
    return defaultGoal?.target_minutes || 0;
  };

  if (showStats) {
    return <LifetimeStatsView onBack={() => setShowStats(false)} />;
  }

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
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowStats(true)}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setGoalsDialogOpen(true)}
          >
            <Target className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Total & Date */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Gesamt: {formatTime(getTotalMinutes())}</span>
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

      {/* Categories List */}
      <div className="space-y-1.5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const minutes = getEntryMinutes(cat.id);
          const goalMinutes = getGoalForCategory(cat.id);
          const hasValue = minutes > 0;
          const hasGoal = goalMinutes > 0;
          const percentage = hasGoal ? Math.min(100, (minutes / goalMinutes) * 100) : 0;
          const isOverGoal = hasGoal && minutes > goalMinutes;
          
          return (
            <div 
              key={cat.id} 
              className={`flex items-center gap-3 p-2.5 rounded-xl bg-card border transition-all relative overflow-hidden ${
                isOverGoal ? 'border-destructive/50' : hasValue ? 'border-primary/30' : 'border-border/50'
              }`}
            >
              {/* Progress bar background */}
              {hasGoal && (
                <div 
                  className="absolute inset-0 opacity-10 transition-all"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: isOverGoal ? 'hsl(var(--destructive))' : cat.color,
                  }}
                />
              )}

              {/* Icon & Label */}
              <div 
                className="p-2 rounded-lg shrink-0 relative z-10"
                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0 relative z-10">
                <span className="text-sm font-medium">{cat.label}</span>
                {hasGoal && (
                  <div className="text-[10px] text-muted-foreground">
                    Ziel: {formatTime(goalMinutes)}
                  </div>
                )}
              </div>
              
              {/* Time Display */}
              <span className={`text-sm font-medium min-w-[50px] text-right relative z-10 ${
                isOverGoal ? 'text-destructive' : hasValue ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {formatTime(minutes)}
              </span>
              
              {/* Quick Adjust Buttons */}
              <div className="flex items-center gap-1 relative z-10">
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

      <LifetimeGoalsDialog
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        onGoalsChange={fetchGoals}
      />
    </div>
  );
}
