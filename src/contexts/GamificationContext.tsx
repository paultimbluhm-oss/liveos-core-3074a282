import React, { createContext, useContext, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';

interface GamificationContextType {
  profile: ReturnType<typeof useProfile>['profile'];
  recentActivity: ReturnType<typeof useProfile>['recentActivity'];
  loading: ReturnType<typeof useProfile>['loading'];
  refetch: ReturnType<typeof useProfile>['refetch'];
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { profile, refetch, recentActivity, loading } = useProfile();

  return (
    <GamificationContext.Provider value={{ profile, recentActivity, loading, refetch }}>
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
