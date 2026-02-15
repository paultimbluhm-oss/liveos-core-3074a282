import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { checkAndUnlockAchievements, ACHIEVEMENT_DEFINITIONS } from '@/components/dashboard/AchievementsCard';
import { useAuth } from '@/hooks/useAuth';

interface CelebrationState {
  type: 'xp' | 'levelUp' | 'streak' | 'achievement' | 'taskComplete';
  amount?: number;
  message?: string;
}

interface GamificationContextType {
  addXP: (amount: number, reason?: string) => Promise<void>;
  celebrateStreak: (days: number) => void;
  celebrateAchievement: (name: string) => void;
  celebrateTaskComplete: (taskName?: string) => void;
  profile: ReturnType<typeof useProfile>['profile'];
  xpProgress: ReturnType<typeof useProfile>['xpProgress'];
  recentActivity: ReturnType<typeof useProfile>['recentActivity'];
  loading: ReturnType<typeof useProfile>['loading'];
  refetch: ReturnType<typeof useProfile>['refetch'];
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, addXP: addXPBase, xpProgress, refetch, recentActivity, loading } = useProfile();


  // Check achievements whenever profile changes (silently, no celebrations)
  useEffect(() => {
    const checkAchievements = async () => {
      if (!user || !profile) return;
      await checkAndUnlockAchievements(user.id, {
        level: profile.level,
        xp: profile.xp,
        streakDays: profile.streak_days,
      });
    };
    checkAchievements();
  }, [user, profile?.level, profile?.xp, profile?.streak_days]);

  const addXP = useCallback(async (amount: number, reason?: string) => {
    const result = await addXPBase(amount, reason);
    
    if (result) {
      // Refetch to update recent activity
      await refetch();
    }
  }, [addXPBase, refetch]);

  const celebrateStreak = useCallback((_days: number) => {}, []);

  const celebrateAchievement = useCallback((_name: string) => {}, []);

  const celebrateTaskComplete = useCallback((_taskName?: string) => {}, []);

  return (
    <GamificationContext.Provider value={{ 
      addXP, 
      celebrateStreak,
      celebrateAchievement,
      celebrateTaskComplete,
      profile, 
      xpProgress, 
      recentActivity, 
      loading, 
      refetch 
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
