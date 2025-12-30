import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Clock, Moon, Utensils, Users, Home, Monitor, Sparkles, Dumbbell, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface TimeEntry {
  category: string;
  minutes: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  schlafen: { label: 'Schlafen', color: '#6366f1', icon: Moon },
  essen: { label: 'Essen', color: '#f59e0b', icon: Utensils },
  familie: { label: 'Familie', color: '#ec4899', icon: Home },
  freunde: { label: 'Freunde', color: '#8b5cf6', icon: Users },
  hygiene: { label: 'Hygiene', color: '#06b6d4', icon: Sparkles },
  youtube: { label: 'YouTube', color: '#ef4444', icon: Monitor },
  webseiten: { label: 'Webseiten', color: '#3b82f6', icon: Monitor },
  zimmer: { label: 'Zimmer', color: '#22c55e', icon: Home },
  sport: { label: 'Sport', color: '#14b8a6', icon: Dumbbell },
  lernen: { label: 'Lernen', color: '#a855f7', icon: BookOpen },
  sonstiges: { label: 'Sonstiges', color: '#64748b', icon: Clock },
};

export function TimeDistributionWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchTodayEntries();
  }, [user]);

  const fetchTodayEntries = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('time_entries')
      .select('category, minutes')
      .eq('user_id', user.id)
      .eq('entry_date', today);
    
    if (data) setEntries(data);
  };

  const getTotalMinutes = () => entries.reduce((sum, e) => sum + e.minutes, 0);

  const getChartData = () => {
    if (entries.length === 0) return [];
    return entries
      .filter(e => e.minutes > 0)
      .map(e => ({
        name: CATEGORY_CONFIG[e.category]?.label || e.category,
        value: e.minutes,
        color: CATEGORY_CONFIG[e.category]?.color || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const totalMinutes = getTotalMinutes();
  const chartData = getChartData();
  const hasData = chartData.length > 0;

  return (
    <>
      <div
        className="relative w-full aspect-square rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-3 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all"
        onClick={() => setDialogOpen(true)}
      >
        {hasData ? (
          <>
            {/* Pie Chart as border */}
            <div className="absolute inset-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="95%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center">
              <Clock className="w-5 h-5 text-primary mb-1" />
              <span className="text-lg font-bold">{formatTime(totalMinutes)}</span>
              <span className="text-[10px] text-muted-foreground">getrackt</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Clock className="w-6 h-6 text-muted-foreground/50 mb-1" />
            <span className="text-xs text-muted-foreground">Keine Zeit</span>
            <span className="text-[10px] text-muted-foreground">getrackt</span>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Heutige Zeitverteilung</DialogTitle>
          </DialogHeader>
          
          {hasData ? (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{formatTime(item.value)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t flex justify-between text-sm font-medium">
                <span>Gesamt</span>
                <span>{formatTime(totalMinutes)}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Zeit für heute getrackt</p>
            </div>
          )}
          
          <Link 
            to="/privat?section=lifetime" 
            className="block w-full text-center text-sm text-primary hover:underline mt-2"
            onClick={() => setDialogOpen(false)}
          >
            Zeit eintragen
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
