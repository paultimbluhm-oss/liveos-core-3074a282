import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActiveTracker {
  category_id: string;
  start_time: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  schlafen: { label: 'Schlafen', color: '#6366f1' },
  essen: { label: 'Essen', color: '#f59e0b' },
  sozial: { label: 'Sozial', color: '#ec4899' },
  hygiene: { label: 'Hygiene', color: '#06b6d4' },
  'social-media': { label: 'Social Media', color: '#ef4444' },
  optimieren: { label: 'Optimieren', color: '#22c55e' },
  lernen: { label: 'Lernen', color: '#a855f7' },
  aufraeumen: { label: 'Aufräumen', color: '#f97316' },
  gesundheit: { label: 'Gesundheit', color: '#ef4444' },
  schule: { label: 'Schule', color: '#3b82f6' },
  helfen: { label: 'Helfen', color: '#10b981' },
  wegzeit: { label: 'Wegzeit', color: '#64748b' },
  arbeiten: { label: 'Arbeiten', color: '#0ea5e9' },
  dokumentation: { label: 'Lebensdokumentation', color: '#78716c' },
};

export function TimeDistributionWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (user) fetchActiveTracker();
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-tracker-sync')
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
    if (!activeTracker) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const startTime = new Date(activeTracker.start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTracker]);

  const fetchActiveTracker = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('active_time_tracker')
      .select('category_id, start_time')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setActiveTracker({
        category_id: data.category_id,
        start_time: data.start_time,
      });
    }
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

  const handleClick = () => {
    navigate('/privat?section=lifetime');
  };

  const activeCategory = activeTracker 
    ? CATEGORY_CONFIG[activeTracker.category_id] 
    : null;

  const size = 96;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative flex items-center justify-center p-2 cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative w-24 h-24 md:w-28 md:h-28">
        <svg 
          className="w-full h-full transform -rotate-90" 
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          
          {/* Active category ring with animation */}
          {activeCategory && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={activeCategory.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                filter: `drop-shadow(0 0 8px ${activeCategory.color}80)`,
              }}
            />
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {activeTracker && activeCategory ? (
            <>
              <span 
                className="text-[10px] font-medium mb-0.5"
                style={{ color: activeCategory.color }}
              >
                {activeCategory.label}
              </span>
              <span 
                className="text-lg md:text-xl font-bold font-mono tabular-nums"
                style={{ color: activeCategory.color }}
              >
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-muted-foreground mb-0.5" />
              <span className="text-xs text-muted-foreground">Starten</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}