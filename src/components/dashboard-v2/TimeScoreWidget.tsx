import { Zap } from 'lucide-react';
import { useTimeScore } from '@/hooks/useTimeScore';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/hooks/useDashboardV2';

export function TimeScoreWidget({ size }: { size: WidgetSize }) {
  const { score, yesterdayScore, hasActiveTracker } = useTimeScore();

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center',
          hasActiveTracker ? 'bg-primary/15' : 'bg-muted'
        )}>
          <Zap className={cn('w-4 h-4', hasActiveTracker ? 'text-primary animate-pulse' : 'text-muted-foreground')} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <span className="text-xs text-muted-foreground">Time Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono">{score}</span>
            <span className="text-[10px] text-muted-foreground font-mono">/ {yesterdayScore}</span>
          </div>
        </div>
      </div>
      {hasActiveTracker && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: yesterdayScore > 0 ? `${Math.min((score / yesterdayScore) * 100, 100)}%` : '0%' }} />
        </div>
      )}
    </div>
  );
}
