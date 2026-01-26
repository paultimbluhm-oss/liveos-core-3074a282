import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { AppLayout } from '@/components/layout/AppLayout';
import { TimeDistributionWidget } from '@/components/dashboard/TimeDistributionWidget';
import { ProgressRingWidget } from '@/components/dashboard/ProgressRingWidget';
import { HealthProgressWidget } from '@/components/dashboard/HealthProgressWidget';
import { TodayDetailsCard } from '@/components/dashboard/TodayDetailsCard';
import { NextActionsCard } from '@/components/dashboard/NextActionsCard';
import { HabitsOverview } from '@/components/dashboard/HabitsOverview';
import { AchievementsCard, checkAndUnlockAchievements } from '@/components/dashboard/AchievementsCard';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DataBackupButton } from '@/components/dashboard/DataBackupButton';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { stats, loading: statsLoading } = useStats();
  const { visibleWidgets, loading: configLoading } = useDashboardConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && profile && !profileLoading && !statsLoading) {
      checkAchievements();
    }
  }, [user, profile, profileLoading, statsLoading]);

  const checkAchievements = async () => {
    if (!user || !profile) return;

    const [habitsRes, gradesRes, termsRes] = await Promise.all([
      supabase.from('habits').select('id').eq('user_id', user.id).eq('is_active', true),
      supabase.from('grades').select('id').eq('user_id', user.id),
      supabase.from('technical_terms').select('id').eq('user_id', user.id),
    ]);

    await checkAndUnlockAchievements(user.id, {
      level: profile.level,
      xp: profile.xp,
      streakDays: profile.streak_days,
      tasksCompleted: stats.tasksCompleted,
      habitsCreated: habitsRes.data?.length || 0,
      gradesCount: gradesRes.data?.length || 0,
      termsCount: termsRes.data?.length || 0,
    });
  };

  const isLoading = authLoading || profileLoading || statsLoading || configLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isVisible = (widgetId: string) => visibleWidgets.includes(widgetId);

  // Check if ring widgets are visible (they go in top row together)
  const showTimeDistribution = isVisible('time-distribution');
  const showProgressRing = isVisible('progress-ring');
  const showRingRow = showTimeDistribution || showProgressRing;

  // Check if action widgets are visible (they go together)
  const showNextActions = isVisible('next-actions');
  const showHabitsOverview = isVisible('habits-overview');
  const showActionsRow = showNextActions || showHabitsOverview;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4 max-w-7xl mx-auto">
        {/* Top Row: Ring Widgets */}
        {showRingRow && (
          <div className={`grid gap-3 ${showTimeDistribution && showProgressRing ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showTimeDistribution && <TimeDistributionWidget />}
            {showProgressRing && <ProgressRingWidget />}
          </div>
        )}

        {/* Health Progress Bar */}
        {isVisible('health-progress') && <HealthProgressWidget />}

        {/* Today Details */}
        {isVisible('today-details') && <TodayDetailsCard />}

        {/* Quick Stats */}
        {isVisible('quick-stats') && (
          <QuickStats
            averageGrade={stats.averageGrade}
            totalBalance={stats.totalBalance}
            loadingPrices={stats.loadingPrices}
          />
        )}

        {/* Actions + Habits Row */}
        {showActionsRow && (
          <div className={`grid gap-3 md:gap-4 ${showNextActions && showHabitsOverview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {showNextActions && <NextActionsCard />}
            {showHabitsOverview && <HabitsOverview />}
          </div>
        )}

        {/* Achievements */}
        {isVisible('achievements') && <AchievementsCard />}

        {/* Backup Button */}
        {isVisible('data-backup') && (
          <div className="pt-4">
            <DataBackupButton />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
