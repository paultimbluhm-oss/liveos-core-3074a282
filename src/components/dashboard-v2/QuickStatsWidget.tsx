import { BarChart3, GraduationCap, Coins } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import type { WidgetSize } from '@/hooks/useDashboardV2';

export function QuickStatsWidget({ size }: { size: WidgetSize }) {
  const { stats } = useStats();

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-accent" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold">Statistiken</span>
      </div>

      <div className="space-y-2">
        {stats.averageGrade !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">Schnitt</span>
            </div>
            <span className="text-sm font-bold font-mono">{stats.averageGrade}P</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs text-muted-foreground">Vermoegen</span>
          </div>
          <span className="text-sm font-bold font-mono">
            {stats.loadingPrices ? '...' : `${stats.totalBalance.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`}
          </span>
        </div>
      </div>
    </div>
  );
}
