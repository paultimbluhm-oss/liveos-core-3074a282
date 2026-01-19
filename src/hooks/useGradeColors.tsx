import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GradeColorSettings {
  green_min: number;
  yellow_min: number;
}

const DEFAULT_SETTINGS: GradeColorSettings = {
  green_min: 13,
  yellow_min: 10,
};

export function useGradeColors() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GradeColorSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('grade_color_settings')
        .select('green_min, yellow_min')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const getGradeColor = (grade: number | null): string => {
    if (grade === null) return 'bg-muted text-muted-foreground';
    if (grade >= settings.green_min) return 'bg-emerald-500 text-white';
    if (grade >= settings.yellow_min) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const getGradeTextColor = (grade: number | null): string => {
    if (grade === null) return 'text-muted-foreground';
    if (grade >= settings.green_min) return 'text-emerald-500';
    if (grade >= settings.yellow_min) return 'text-amber-500';
    return 'text-rose-500';
  };

  return {
    settings,
    loading,
    getGradeColor,
    getGradeTextColor,
  };
}
