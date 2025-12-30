import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { TimeDistributionWidget } from '@/components/dashboard/TimeDistributionWidget';
import { ProgressRingWidget } from '@/components/dashboard/ProgressRingWidget';
import { TodayDetailsCard } from '@/components/dashboard/TodayDetailsCard';
import { NextActionsCard } from '@/components/dashboard/NextActionsCard';
import { HabitsOverview } from '@/components/dashboard/HabitsOverview';
import { AchievementsCard, checkAndUnlockAchievements } from '@/components/dashboard/AchievementsCard';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { stats, loading: statsLoading } = useStats();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check achievements when profile/stats load
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

  const isLoading = authLoading || profileLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4 max-w-7xl mx-auto">
        {/* Top Row: Two Ring Widgets */}
        <div className="grid grid-cols-2 gap-3">
          <TimeDistributionWidget />
          <ProgressRingWidget />
        </div>

        {/* Details Row: Tasks + Homework + Habits breakdown */}
        <TodayDetailsCard />

        {/* Quick Stats: Grade average and wealth */}
        <QuickStats
          averageGrade={stats.averageGrade}
          totalBalance={stats.totalBalance}
          loadingPrices={stats.loadingPrices}
        />

        {/* Main Content: Actions + Habits side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <NextActionsCard />
          <HabitsOverview />
        </div>
      </div>
    </AppLayout>
  );
}
