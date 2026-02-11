import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDashboardV2Config } from '@/hooks/useDashboardV2';
import { StreakRingWidget } from '@/components/dashboard-v2/StreakRingWidget';
import { HabitsChecklistWidget } from '@/components/dashboard-v2/HabitsChecklistWidget';
import { TodayProgressWidget } from '@/components/dashboard-v2/TodayProgressWidget';
import { HealthBarWidget } from '@/components/dashboard-v2/HealthBarWidget';
import { XPLevelWidget } from '@/components/dashboard-v2/XPLevelWidget';
import { TimeScoreWidget } from '@/components/dashboard-v2/TimeScoreWidget';
import { QuickStatsWidget } from '@/components/dashboard-v2/QuickStatsWidget';
import { MotivationWidget } from '@/components/dashboard-v2/MotivationWidget';
import { NextActionsWidget } from '@/components/dashboard-v2/NextActionsWidget';
import { Loader2 } from 'lucide-react';
import type { DashboardWidget, WidgetSize } from '@/hooks/useDashboardV2';

const WIDGET_COMPONENTS: Record<string, React.FC<{ size: WidgetSize }>> = {
  'streak-ring': StreakRingWidget,
  'habits-checklist': HabitsChecklistWidget,
  'today-progress': TodayProgressWidget,
  'health-bar': HealthBarWidget,
  'xp-level': XPLevelWidget,
  'time-score': TimeScoreWidget,
  'quick-stats': QuickStatsWidget,
  'motivation-quote': MotivationWidget,
  'next-actions': NextActionsWidget,
};

function getGridClass(size: WidgetSize): string {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-2';
    case 'large': return 'col-span-2';
  }
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { visibleWidgets, loading: configLoading } = useDashboardV2Config();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-3">
        {/* Widget Grid */}
        <div className="grid grid-cols-2 gap-3">
          {visibleWidgets.map((widget) => {
            const Component = WIDGET_COMPONENTS[widget.type];
            if (!Component) return null;
            return (
              <div key={widget.id} className={getGridClass(widget.size)}>
                <Component size={widget.size} />
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
