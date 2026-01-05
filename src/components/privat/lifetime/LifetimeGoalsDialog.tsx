import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES, WEEKDAYS, TIME_OPTIONS, POINTS_OPTIONS, LifetimeGoal, formatTime } from './types';

interface LifetimeGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalsChange: () => void;
}

export function LifetimeGoalsDialog({ open, onOpenChange, onGoalsChange }: LifetimeGoalsDialogProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<LifetimeGoal[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchGoals();
    }
  }, [open, user]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('lifetime_goals')
      .select('*')
      .eq('user_id', user.id);
    if (data) {
      setGoals(data.map(g => ({
        ...g,
        points_per_minute: g.points_per_minute || 0
      })));
    }
    setLoading(false);
  };

  const getGoalForCategory = (categoryId: string): { minutes: number; points: number } => {
    if (selectedDay !== null) {
      const dayGoal = goals.find(g => g.category === categoryId && g.day_of_week === selectedDay);
      if (dayGoal) return { minutes: dayGoal.target_minutes, points: dayGoal.points_per_minute };
    }
    const defaultGoal = goals.find(g => g.category === categoryId && g.day_of_week === null);
    return { 
      minutes: defaultGoal?.target_minutes || 0, 
      points: defaultGoal?.points_per_minute || 0 
    };
  };

  const handleGoalChange = async (categoryId: string, targetMinutes: number, pointsPerMinute: number) => {
    if (!user) return;

    const existingGoal = goals.find(
      g => g.category === categoryId && g.day_of_week === selectedDay
    );

    if (targetMinutes === 0 && pointsPerMinute === 0 && existingGoal) {
      await supabase.from('lifetime_goals').delete().eq('id', existingGoal.id);
    } else if (targetMinutes > 0 || pointsPerMinute !== 0) {
      if (existingGoal) {
        await supabase
          .from('lifetime_goals')
          .update({ target_minutes: targetMinutes, points_per_minute: pointsPerMinute })
          .eq('id', existingGoal.id);
      } else {
        await supabase.from('lifetime_goals').insert({
          user_id: user.id,
          category: categoryId,
          target_minutes: targetMinutes,
          points_per_minute: pointsPerMinute,
          day_of_week: selectedDay,
        });
      }
    }

    await fetchGoals();
    onGoalsChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tagesziele & Punkte</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="default" className="w-full">
          <TabsList className="w-full grid grid-cols-8 h-auto">
            <TabsTrigger
              value="default"
              onClick={() => setSelectedDay(null)}
              className="text-xs px-1 py-1.5"
            >
              Std
            </TabsTrigger>
            {WEEKDAYS.map(day => (
              <TabsTrigger
                key={day.value}
                value={String(day.value)}
                onClick={() => setSelectedDay(day.value)}
                className="text-xs px-1 py-1.5"
              >
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedDay === null ? 'default' : String(selectedDay)} className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              {selectedDay === null
                ? 'Standard-Einstellungen'
                : `Einstellungen für ${WEEKDAYS.find(d => d.value === selectedDay)?.label}`}
            </p>

            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const { minutes, points } = getGoalForCategory(cat.id);
                
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                  >
                    <div
                      className="p-1.5 rounded-md shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs flex-1 truncate">{cat.label}</span>
                    
                    {/* Time Goal */}
                    <Select
                      value={String(minutes)}
                      onValueChange={(val) => handleGoalChange(cat.id, parseInt(val), points)}
                    >
                      <SelectTrigger className="w-[65px] h-7 text-[10px]">
                        <SelectValue>{formatTime(minutes)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Points per minute */}
                    <Select
                      value={String(points)}
                      onValueChange={(val) => handleGoalChange(cat.id, minutes, parseFloat(val))}
                    >
                      <SelectTrigger className="w-[55px] h-7 text-[10px]">
                        <SelectValue>{points === 0 ? '-' : `${points}P`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {POINTS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-3">
              Punkte pro Minute: positiv = gut, negativ = schlecht
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
