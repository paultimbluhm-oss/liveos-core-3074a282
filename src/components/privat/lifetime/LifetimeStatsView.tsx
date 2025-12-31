import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { CATEGORIES, TimeEntry, LifetimeGoal, formatTime } from './types';

interface LifetimeStatsViewProps {
  onBack: () => void;
}

export function LifetimeStatsView({ onBack }: LifetimeStatsViewProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<LifetimeGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [entriesRes, goalsRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
      supabase.from('lifetime_goals').select('*').eq('user_id', user.id),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    setLoading(false);
  };

  const todayStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntries = entries.filter(e => e.entry_date === today);
    const dayOfWeek = new Date().getDay();

    return CATEGORIES.map(cat => {
      const entry = todayEntries.find(e => e.category === cat.id);
      const minutes = entry?.minutes || 0;

      // Get goal: first day-specific, then default
      const dayGoal = goals.find(g => g.category === cat.id && g.day_of_week === dayOfWeek);
      const defaultGoal = goals.find(g => g.category === cat.id && g.day_of_week === null);
      const targetMinutes = dayGoal?.target_minutes || defaultGoal?.target_minutes || 0;

      const percentage = targetMinutes > 0 ? Math.min(100, (minutes / targetMinutes) * 100) : 0;
      const isOverGoal = targetMinutes > 0 && minutes > targetMinutes;

      return {
        ...cat,
        minutes,
        targetMinutes,
        percentage,
        isOverGoal,
        hasGoal: targetMinutes > 0,
      };
    });
  }, [entries, goals]);

  const weeklyData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.entry_date === dateStr);
      const total = dayEntries.reduce((sum, e) => sum + e.minutes, 0);
      data.push({
        day: format(date, 'EEE', { locale: de }),
        minutes: total,
        hours: Math.round(total / 60 * 10) / 10,
      });
    }
    return data;
  }, [entries]);

  const pieData = useMemo(() => {
    return todayStats
      .filter(s => s.minutes > 0)
      .map(s => ({
        name: s.label,
        value: s.minutes,
        color: s.color,
      }));
  }, [todayStats]);

  const goalsWithProgress = todayStats.filter(s => s.hasGoal);
  const totalTrackedToday = todayStats.reduce((sum, s) => sum + s.minutes, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border-2 border-primary bg-transparent">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold">Statistiken</h1>
        </div>
      </div>

      {/* Today Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Heute</span>
          <span className="text-sm text-muted-foreground">{formatTime(totalTrackedToday)}</span>
        </div>
        
        {pieData.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Noch keine Daten fuer heute
          </p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {pieData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Goals Progress */}
      {goalsWithProgress.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Ziele heute</span>
          </div>
          <div className="space-y-3">
            {goalsWithProgress.map(goal => {
              const Icon = goal.icon;
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: goal.color }} />
                      <span className="text-xs">{goal.label}</span>
                    </div>
                    <span className={`text-xs font-medium ${goal.isOverGoal ? 'text-destructive' : ''}`}>
                      {formatTime(goal.minutes)} / {formatTime(goal.targetMinutes)}
                    </span>
                  </div>
                  <Progress 
                    value={goal.percentage} 
                    className="h-1.5"
                    style={{
                      '--progress-color': goal.isOverGoal ? 'hsl(var(--destructive))' : goal.color,
                    } as React.CSSProperties}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Weekly Overview */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Diese Woche</span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [`${value}h`, 'Stunden']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
