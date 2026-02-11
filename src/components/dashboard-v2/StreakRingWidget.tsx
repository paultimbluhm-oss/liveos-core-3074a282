import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useTodayStats, WidgetSize } from '@/hooks/useDashboardV2';

export function StreakRingWidget({ size }: { size: WidgetSize }) {
  const { profile } = useProfile();
  const { percentage, allDone, totalDone, totalAll } = useTodayStats();
  const streakDays = profile?.streak_days || 0;

  const ringSize = size === 'small' ? 80 : 120;
  const strokeWidth = size === 'small' ? 5 : 7;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 flex flex-col items-center justify-center gap-2 h-full">
      <div className="relative">
        <svg
          className="transform -rotate-90"
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
        >
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius}
            fill="none"
            stroke={allDone ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: allDone
                ? 'drop-shadow(0 0 8px hsl(var(--success) / 0.6))'
                : 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={percentage}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-bold font-mono ${size === 'small' ? 'text-base' : 'text-2xl'} ${allDone ? 'text-success' : 'text-foreground'}`}
          >
            {percentage}%
          </motion.span>
        </div>
      </div>

      {/* Streak badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
        streakDays > 0 ? 'bg-streak/15 text-streak' : 'bg-muted text-muted-foreground'
      }`}>
        <Flame className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} ${streakDays > 0 ? 'animate-pulse' : ''}`} />
        <span className={`font-bold font-mono ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          {streakDays} {streakDays === 1 ? 'Tag' : 'Tage'}
        </span>
      </div>

      {size !== 'small' && (
        <p className="text-[11px] text-muted-foreground text-center">
          {totalDone}/{totalAll} erledigt
        </p>
      )}
    </div>
  );
}
