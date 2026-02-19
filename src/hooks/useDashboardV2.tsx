import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetType = 
  | 'streak-ring' 
  | 'habits-checklist' 
  | 'today-progress' 
  | 'health-bar' 
  | 'quick-stats' 
  | 'motivation-quote'
  | 'tasks';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  order: number;
  visible: boolean;
}

export const WIDGET_CATALOG: { type: WidgetType; name: string; description: string; defaultSize: WidgetSize; sizes: WidgetSize[] }[] = [
  { type: 'streak-ring', name: 'Streak', description: 'Tagesfortschritt und Streak-Zaehler', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'habits-checklist', name: 'Habits', description: 'Taegliche Gewohnheiten abhaken', defaultSize: 'large', sizes: ['medium', 'large'] },
  { type: 'today-progress', name: 'Heute', description: 'Aufgaben, Hausaufgaben, Habits', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'health-bar', name: 'Gesundheit', description: 'Taegliche Routinen', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'quick-stats', name: 'Statistiken', description: 'Noten und Vermoegen', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'motivation-quote', name: 'Motivation', description: 'Taeglicher Motivationsspruch', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'tasks', name: 'Aufgaben', description: 'Aufgaben verwalten und abhaken', defaultSize: 'large', sizes: ['small', 'medium', 'large'] },
];

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w1', type: 'streak-ring', size: 'medium', order: 0, visible: true },
  { id: 'w2', type: 'quick-stats', size: 'small', order: 1, visible: true },
  { id: 'w3', type: 'today-progress', size: 'medium', order: 2, visible: true },
  { id: 'w4', type: 'habits-checklist', size: 'large', order: 3, visible: true },
  { id: 'w5', type: 'health-bar', size: 'small', order: 4, visible: true },
  { id: 'w7', type: 'motivation-quote', size: 'medium', order: 6, visible: true },
  { id: 'w8', type: 'quick-stats', size: 'small', order: 7, visible: true },
  { id: 'w9', type: 'tasks', size: 'large', order: 8, visible: true },
];

export interface DashboardSettings {
  habitDisplayLimit: number;
  showXpToast: boolean;
  statsVisibleFields: string[];
}

const DEFAULT_SETTINGS: DashboardSettings = { habitDisplayLimit: 0, showXpToast: true, statsVisibleFields: ['grade', 'netWorth'] };

export function useDashboardV2Config() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConfig();
    else setLoading(false);
  }, [user]);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('dashboard_v2_config')
      .select('widgets, settings')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      if (data.widgets && Array.isArray(data.widgets) && data.widgets.length > 0) {
        let loaded = data.widgets as unknown as DashboardWidget[];
        // Auto-add any new widget types from the catalog that are missing
        const existingTypes = new Set(loaded.map(w => w.type));
        const maxOrder = Math.max(...loaded.map(w => w.order), -1);
        let nextOrder = maxOrder + 1;
        for (const cat of WIDGET_CATALOG) {
          if (!existingTypes.has(cat.type)) {
            loaded = [...loaded, { id: `w-auto-${cat.type}`, type: cat.type, size: cat.defaultSize, order: nextOrder++, visible: false }];
          }
        }
        // Remove widgets whose type no longer exists in the catalog
        const validTypes = new Set(WIDGET_CATALOG.map(c => c.type));
        loaded = loaded.filter(w => validTypes.has(w.type));
        setWidgets(loaded);
      }
      if (data.settings && typeof data.settings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as Record<string, unknown>) } as DashboardSettings);
      }
    } else {
      // Migrate from localStorage if exists
      const savedWidgets = localStorage.getItem(`dashboard-v2-${user.id}`);
      const savedSettings = localStorage.getItem(`dashboard-v2-settings-${user.id}`);
      let w = DEFAULT_WIDGETS;
      let s = DEFAULT_SETTINGS;
      try { if (savedWidgets) w = JSON.parse(savedWidgets); } catch {}
      try { if (savedSettings) s = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }; } catch {}
      
      setWidgets(w);
      setSettings(s);

      // Save to Supabase and clean up localStorage
      await supabase.from('dashboard_v2_config').upsert([{
        user_id: user.id,
        widgets: w as any,
        settings: s as any,
      }], { onConflict: 'user_id' });
      localStorage.removeItem(`dashboard-v2-${user.id}`);
      localStorage.removeItem(`dashboard-v2-settings-${user.id}`);
    }
    
    setLoading(false);
  }, [user]);

  const persistToDb = useCallback(async (w: DashboardWidget[], s: DashboardSettings) => {
    if (!user) return;
    await supabase.from('dashboard_v2_config').upsert([{
      user_id: user.id,
      widgets: w as any,
      settings: s as any,
    }], { onConflict: 'user_id' });
  }, [user]);

  const saveConfig = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    persistToDb(newWidgets, settings);
  }, [persistToDb, settings]);

  const updateSettings = useCallback((patch: Partial<DashboardSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persistToDb(widgets, next);
  }, [settings, widgets, persistToDb]);

  const updateWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    saveConfig(widgets.map(w => w.id === widgetId ? { ...w, size } : w));
  }, [widgets, saveConfig]);

  const toggleWidget = useCallback((widgetId: string) => {
    saveConfig(widgets.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
  }, [widgets, saveConfig]);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    const visible = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
    const [moved] = visible.splice(fromIndex, 1);
    visible.splice(toIndex, 0, moved);
    const reordered = visible.map((w, i) => ({ ...w, order: i }));
    const hidden = widgets.filter(w => !w.visible);
    saveConfig([...reordered, ...hidden]);
  }, [widgets, saveConfig]);

  const resetToDefault = useCallback(() => {
    saveConfig(DEFAULT_WIDGETS);
  }, [saveConfig]);

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return { widgets, visibleWidgets, loading, updateWidgetSize, toggleWidget, moveWidget, resetToDefault, settings, updateSettings };
}

// === Live data hooks ===

export interface TodayStats {
  tasksCompleted: number;
  tasksTotal: number;
  homeworkCompleted: number;
  homeworkTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
}

export function useTodayStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TodayStats>({
    tasksCompleted: 0, tasksTotal: 0,
    homeworkCompleted: 0, homeworkTotal: 0,
    habitsCompleted: 0, habitsTotal: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [tasksRes, habitsRes, completionsRes] = await Promise.all([
      supabase.from('tasks').select('id, completed, due_date').eq('user_id', user.id).not('due_date', 'is', null),
      supabase.from('habits').select('id').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('id').eq('user_id', user.id).eq('completed_date', today),
    ]);

    const todayTasks = (tasksRes.data || []).filter(t => t.due_date && format(new Date(t.due_date), 'yyyy-MM-dd') === today);

    setStats({
      tasksCompleted: todayTasks.filter(t => t.completed).length,
      tasksTotal: todayTasks.length,
      homeworkCompleted: 0,
      homeworkTotal: 0,
      habitsCompleted: completionsRes.data?.length || 0,
      habitsTotal: habitsRes.data?.length || 0,
    });
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel('dv2-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats).subscribe();
    const ch3 = supabase.channel('dv2-hc').on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchStats).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch3); };
  }, [user, fetchStats]);

  const totalDone = stats.homeworkCompleted + stats.habitsCompleted;
  const totalAll = stats.homeworkTotal + stats.habitsTotal;
  const percentage = totalAll === 0 ? 100 : Math.round((totalDone / totalAll) * 100);

  return { stats, percentage, allDone: totalAll > 0 && totalDone === totalAll, totalDone, totalAll };
}
