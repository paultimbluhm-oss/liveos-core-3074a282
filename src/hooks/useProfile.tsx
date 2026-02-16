import { useState, useEffect, useCallback } from 'react';
import { useAuth, getSupabase } from './useAuth';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  streak_days: number;
  last_active_date: string | null;
}

interface Activity {
  id: string;
  type: 'task_completed' | 'grade_added' | 'item_added';
  title: string;
  timestamp: Date;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile as any);
      }
    } else if (profileData) {
      setProfile(profileData as any);
    }
    
    setLoading(false);
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    
    const supabase = getSupabase();
    const activities: Activity[] = [];
    
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, created_at')
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
      });
    });
    
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [user]);

  useEffect(() => {
    fetchProfile();
    fetchRecentActivity();
  }, [fetchProfile, fetchRecentActivity]);

  return {
    profile,
    loading,
    refetch: fetchProfile,
    recentActivity,
  };
}
