import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { CATEGORIES, TimeEntry, formatTime } from './types';
import { LifetimeGoalsDialog } from './LifetimeGoalsDialog';
import { LifetimeStatsView } from './LifetimeStatsView';

interface ActiveTracker {
  id: string;
  category_id: string;
  start_time: string;
}

interface LifetimeSectionProps {
  onBack: () => void;
}

export function LifetimeSection({ onBack }: LifetimeSectionProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch active tracker from Supabase
  const fetchActiveTracker = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('active_time_tracker')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setActiveTracker({
        id: data.id,
        category_id: data.category_id,
        start_time: data.start_time,
      });
    } else {
      setActiveTracker(null);
    }
  };

  // Subscribe to realtime updates for cross-device sync
  useEffect(() => {
    if (!user) return;

    fetchActiveTracker();

    const channel = supabase
      .channel('active-tracker-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_time_tracker',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveTracker(null);
          } else if (payload.new) {
            const data = payload.new as any;
            setActiveTracker({
              id: data.id,
              category_id: data.category_id,
              start_time: data.start_time,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update elapsed time every second
  useEffect(() => {
    if (activeTracker) {
      const updateElapsed = () => {
        const startTime = new Date(activeTracker.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTracker]);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(false);
    
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', today);
    
    if (data) setEntries(data);
  };

  const saveTimeForCategory = async (categoryId: string, additionalMinutes: number) => {
    if (!user || additionalMinutes <= 0) return;
    
    const existingEntry = entries.find(e => e.category === categoryId);
    
    if (existingEntry) {
      const newMinutes = existingEntry.minutes + additionalMinutes;
      await supabase
        .from('time_entries')
        .update({ minutes: newMinutes })
        .eq('id', existingEntry.id);
    } else {
      await supabase.from('time_entries').insert({
        user_id: user.id,
        category: categoryId,
        minutes: additionalMinutes,
        entry_date: today,
      });
    }
    
    await fetchEntries();
  };

  const handleCategoryClick = async (categoryId: string) => {
    if (!user) return;

    // If clicking the same category that's already active, do nothing
    if (activeTracker?.category_id === categoryId) return;

    // Stop current tracker and save time
    if (activeTracker) {
      const startTime = new Date(activeTracker.start_time).getTime();
      const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
      await saveTimeForCategory(activeTracker.category_id, elapsedMinutes);
    }

    // Start new tracker (upsert to ensure only one per user)
    await supabase
      .from('active_time_tracker')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        start_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  };

  const getTotalMinutes = () => entries.reduce((sum, e) => sum + e.minutes, 0);

  const getEntryMinutes = (categoryId: string) => {
    const saved = entries.find(e => e.category === categoryId)?.minutes || 0;
    // Add current elapsed time if this is the active category
    if (activeTracker?.category_id === categoryId) {
      return saved + Math.floor(elapsedSeconds / 60);
    }
    return saved;
  };

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (showStats) {
    return <LifetimeStatsView onBack={() => setShowStats(false)} />;
  }

  const activeCategory = CATEGORIES.find(c => c.id === activeTracker?.category_id);

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

      {/* Active Timer Display */}
      {activeTracker && activeCategory && (
        <div 
          className="p-4 rounded-2xl border-2 text-center"
          style={{ 
            borderColor: activeCategory.color,
            backgroundColor: `${activeCategory.color}10`
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <activeCategory.icon 
              className="w-5 h-5" 
              style={{ color: activeCategory.color }} 
            />
            <span className="font-medium" style={{ color: activeCategory.color }}>
              {activeCategory.label}
            </span>
          </div>
          <div 
            className="text-3xl font-mono font-bold tabular-nums"
            style={{ color: activeCategory.color }}
          >
            {formatElapsedTime(elapsedSeconds)}
          </div>
        </div>
      )}

      {/* No active timer hint */}
      {!activeTracker && (
        <div className="p-4 rounded-2xl border border-dashed border-muted-foreground/30 text-center">
          <p className="text-sm text-muted-foreground">
            Tippe auf eine Aktivität um zu starten
          </p>
        </div>
      )}

      {/* Total */}
      <div className="text-sm text-muted-foreground">
        Heute gesamt: {formatTime(getTotalMinutes() + (activeTracker ? Math.floor(elapsedSeconds / 60) : 0))}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeTracker?.category_id === cat.id;
          const minutes = getEntryMinutes(cat.id);
          
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                isActive 
                  ? 'scale-[1.02]' 
                  : 'border-border/50 hover:border-border active:scale-95'
              }`}
              style={{
                borderColor: isActive ? cat.color : undefined,
                backgroundColor: isActive ? `${cat.color}15` : undefined,
              }}
            >
              <div 
                className={`p-2.5 rounded-xl transition-all ${isActive ? '' : 'opacity-70'}`}
                style={{ 
                  backgroundColor: `${cat.color}20`,
                  color: cat.color 
                }}
              >
                {isActive ? (
                  <div className="w-5 h-5 relative">
                    <Icon className="w-5 h-5 absolute animate-pulse" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              
              <span className={`text-xs font-medium ${isActive ? '' : 'text-muted-foreground'}`}>
                {cat.label}
              </span>
              
              <span 
                className={`text-[10px] tabular-nums ${isActive ? 'font-medium' : 'text-muted-foreground'}`}
                style={{ color: isActive ? cat.color : undefined }}
              >
                {isActive ? formatElapsedTime(elapsedSeconds) : formatTime(minutes)}
              </span>
            </button>
          );
        })}
      </div>

      <LifetimeGoalsDialog
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        onGoalsChange={fetchEntries}
      />
    </div>
  );
}
