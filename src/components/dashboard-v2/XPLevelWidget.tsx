import { Sparkles, TrendingUp } from 'lucide-react';
import { useProfile, calculateXPProgress } from '@/hooks/useProfile';
import { motion } from 'framer-motion';
import type { WidgetSize } from '@/hooks/useDashboardV2';

export function XPLevelWidget({ size }: { size: WidgetSize }) {
  const { profile, xpProgress } = useProfile();
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-xp/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-xp" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <span className="text-xs text-muted-foreground">Level</span>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={level}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold font-mono"
            >
              {level}
            </motion.span>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{xp} XP</span>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-xp"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress.percentage}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>{xpProgress.current}</span>
          <span>{xpProgress.needed}</span>
        </div>
      </div>
    </div>
  );
}
