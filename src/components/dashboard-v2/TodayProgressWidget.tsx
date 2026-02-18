import { useTodayStats, WidgetSize } from '@/hooks/useDashboardV2';
import { CheckCircle2, BookOpen, ListTodo, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export function TodayProgressWidget({ size }: { size: WidgetSize }) {
  const { stats, percentage, allDone } = useTodayStats();

  const items = [
    { label: 'Hausaufgaben', done: stats.homeworkCompleted, total: stats.homeworkTotal, icon: BookOpen },
    { label: 'Habits', done: stats.habitsCompleted, total: stats.habitsTotal, icon: Target },
  ].filter(i => i.total > 0);

  return (
    <div className={`rounded-2xl bg-card border border-border/50 p-4 space-y-3 ${allDone ? 'ring-1 ring-success/30' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Heute</span>
        <motion.span
          key={percentage}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-lg font-bold font-mono ${allDone ? 'text-success' : 'text-primary'}`}
        >
          {percentage}%
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${allDone ? 'bg-success' : 'bg-primary'}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {size !== 'small' && items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => {
            const pct = item.total > 0 ? (item.done / item.total) * 100 : 0;
            const complete = item.done === item.total;
            return (
              <div key={item.label} className="flex items-center gap-2.5">
                <item.icon className={`w-3.5 h-3.5 ${complete ? 'text-success' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                <div className="flex-1">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-success' : 'bg-primary/70'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                  {item.done}/{item.total}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {allDone && (
        <div className="flex items-center gap-1.5 text-success text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Alles erledigt</span>
        </div>
      )}
    </div>
  );
}
