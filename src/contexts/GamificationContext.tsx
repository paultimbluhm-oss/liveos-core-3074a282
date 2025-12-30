import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { CelebrationOverlay } from '@/components/gamification/CelebrationOverlay';
import { playXPSound, playLevelUpSound, playStreakSound, playTaskCompleteSound, playAchievementSound } from '@/lib/sounds';
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
  const [celebrations, setCelebrations] = useState<CelebrationState[]>([]);

  const showCelebration = useCallback((celebration: CelebrationState) => {
    setCelebrations(prev => [...prev, celebration]);
  }, []);

  const removeCelebration = useCallback(() => {
    setCelebrations(prev => prev.slice(1));
  }, []);

  // Check achievements whenever profile changes
  useEffect(() => {
    const checkAchievements = async () => {
      if (!user || !profile) return;
      
      const newAchievements = await checkAndUnlockAchievements(user.id, {
        level: profile.level,
        xp: profile.xp,
        streakDays: profile.streak_days,
      });

      // Show celebration for each new achievement
      for (const achievement of newAchievements) {
        const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === achievement.type);
        if (def) {
          setTimeout(() => {
            showCelebration({
              type: 'achievement',
              message: def.name,
            });
          }, 500);
        }
      }
    };

    checkAchievements();
  }, [user, profile?.level, profile?.xp, profile?.streak_days, showCelebration]);

  const addXP = useCallback(async (amount: number, reason?: string) => {
    const result = await addXPBase(amount, reason);
    
    if (result) {
      // Only show celebration for positive XP
      if (amount > 0) {
        // Play XP sound and show animation
        playXPSound();
        showCelebration({
          type: 'xp',
          amount,
          message: reason,
        });
        
        // Check for level up
        if (result.leveledUp) {
          setTimeout(() => {
            playLevelUpSound();
            showCelebration({
              type: 'levelUp',
              amount: result.newLevel,
              message: 'Du hast ein neues Level erreicht!',
            });
          }, 2200);
        }
      }
      
      // Refetch to update recent activity
      await refetch();
    }
  }, [addXPBase, refetch, showCelebration]);

  const celebrateStreak = useCallback((days: number) => {
    playStreakSound();
    showCelebration({
      type: 'streak',
      amount: days,
      message: 'Weiter so!',
    });
  }, [showCelebration]);

  const celebrateAchievement = useCallback((name: string) => {
    playAchievementSound();
    showCelebration({
      type: 'achievement',
      message: name,
    });
  }, [showCelebration]);

  const celebrateTaskComplete = useCallback((taskName?: string) => {
    playTaskCompleteSound();
    showCelebration({
      type: 'taskComplete',
      message: taskName || 'Aufgabe erledigt!',
    });
  }, [showCelebration]);

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
      {celebrations.length > 0 && (
        <CelebrationOverlay
          key={celebrations.length}
          type={celebrations[0].type}
          amount={celebrations[0].amount}
          message={celebrations[0].message}
          onComplete={removeCelebration}
        />
      )}
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
