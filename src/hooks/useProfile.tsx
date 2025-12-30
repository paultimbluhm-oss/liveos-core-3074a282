import { useState, useEffect, useCallback } from 'react';
import { useAuth, getSupabase } from './useAuth';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
}

interface Activity {
  id: string;
  type: 'task_completed' | 'homework_completed' | 'grade_added' | 'achievement' | 'item_added';
  title: string;
  timestamp: Date;
  xp?: number;
}

// XP needed for each level (exponential growth)
const XP_PER_LEVEL = 100;
const LEVEL_MULTIPLIER = 1.5;

export function calculateLevelFromXP(xp: number): number {
  let level = 1;
  let xpNeeded = XP_PER_LEVEL;
  let totalXpNeeded = 0;
  
  while (totalXpNeeded + xpNeeded <= xp) {
    totalXpNeeded += xpNeeded;
    level++;
    xpNeeded = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
  }
  
  return level;
}

export function calculateXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, i - 1));
  }
  return total;
}

export function calculateXPProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevelFromXP(xp);
  const xpForCurrentLevel = calculateXPForLevel(level);
  const xpForNextLevel = calculateXPForLevel(level + 1);
  const current = xp - xpForCurrentLevel;
  const needed = xpForNextLevel - xpForCurrentLevel;
  const percentage = Math.min((current / needed) * 100, 100);
  
  return { current, needed, percentage };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [hassynced, setHasSynced] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    
    // Fetch profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile);
      }
    } else if (profileData) {
      let updatedProfile = { ...profileData };
      
      // Recalculate level from XP
      const calculatedLevel = calculateLevelFromXP(updatedProfile.xp || 0);
      if (calculatedLevel !== updatedProfile.level) {
        await supabase
          .from('profiles')
          .update({ level: calculatedLevel })
          .eq('user_id', user.id);
        updatedProfile.level = calculatedLevel;
      }
      
      setProfile(updatedProfile);
    }
    
    setLoading(false);
  }, [user]);

  const syncXP = useCallback(async () => {
    if (!user) return;
    
    const supabase = getSupabase();
    
    // Calculate total XP from all completed activities
    const [tasksRes, homeworkRes, gradesRes, skillsRes] = await Promise.all([
      supabase.from('tasks').select('xp_reward').eq('user_id', user.id).eq('completed', true),
      supabase.from('homework').select('xp_reward').eq('user_id', user.id).eq('completed', true),
      supabase.from('grades').select('id').eq('user_id', user.id),
      supabase.from('activity_skills').select('xp_reward').eq('user_id', user.id).eq('completed', true),
    ]);
    
    let totalXP = 0;
    
    // Tasks: default 10 XP each
    (tasksRes.data || []).forEach(t => { totalXP += (t.xp_reward || 10); });
    
    // Homework: default 10 XP each  
    (homeworkRes.data || []).forEach(h => { totalXP += (h.xp_reward || 10); });
    
    // Grades: 5 XP each
    totalXP += (gradesRes.data?.length || 0) * 5;
    
    // Activity skills: default 15 XP each
    (skillsRes.data || []).forEach(s => { totalXP += (s.xp_reward || 15); });
    
    // Update profile if XP is different
    const newLevel = calculateLevelFromXP(totalXP);
    const { data: updated } = await supabase
      .from('profiles')
      .update({ xp: totalXP, level: newLevel })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updated) {
      setProfile(updated);
    }
    
    return totalXP;
  }, [user]);

  const addXP = useCallback(async (amount: number, reason?: string) => {
    if (!user || !profile) return;
    
    const supabase = getSupabase();
    const newXP = (profile.xp || 0) + amount;
    const newLevel = calculateLevelFromXP(newXP);
    
    const { data: updated } = await supabase
      .from('profiles')
      .update({ xp: newXP, level: newLevel })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updated) {
      setProfile(updated);
    }
    
    return { newXP, newLevel, leveledUp: newLevel > (profile.level || 1) };
  }, [user, profile]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    
    const supabase = getSupabase();
    const activities: Activity[] = [];
    
    // Fetch recent completed tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, created_at, xp_reward')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    tasks?.forEach(t => {
      activities.push({
        id: `task-${t.id}`,
        type: 'task_completed',
        title: `Aufgabe erledigt: ${t.title}`,
        timestamp: new Date(t.created_at),
        xp: t.xp_reward || 10
      });
    });
    
    // Fetch recent completed homework
    const { data: homework } = await supabase
      .from('homework')
      .select('id, title, created_at, xp_reward')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    homework?.forEach(h => {
      activities.push({
        id: `hw-${h.id}`,
        type: 'homework_completed',
        title: `Hausaufgabe erledigt: ${h.title}`,
        timestamp: new Date(h.created_at),
        xp: h.xp_reward || 10
      });
    });
    
    // Fetch recent grades
    const { data: grades } = await supabase
      .from('grades')
      .select('id, points, grade_type, created_at, subjects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    grades?.forEach((g: any) => {
      activities.push({
        id: `grade-${g.id}`,
        type: 'grade_added',
        title: `Note eingetragen: ${g.points}P in ${g.subjects?.name || 'Fach'}`,
        timestamp: new Date(g.created_at),
        xp: 5
      });
    });
    
    // Sort by timestamp and take top 10
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [user]);

  useEffect(() => {
    fetchProfile();
    fetchRecentActivity();
  }, [fetchProfile, fetchRecentActivity]);

  // Sync XP once when profile is loaded and XP is 0
  useEffect(() => {
    if (profile && profile.xp === 0 && user && !hassynced) {
      setHasSynced(true);
      syncXP();
    }
  }, [profile, user, syncXP, hassynced]);

  return {
    profile,
    loading,
    addXP,
    syncXP,
    refetch: fetchProfile,
    recentActivity,
    xpProgress: profile ? calculateXPProgress(profile.xp || 0) : { current: 0, needed: 100, percentage: 0 }
  };
}
