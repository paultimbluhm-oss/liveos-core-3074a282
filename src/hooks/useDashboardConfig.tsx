import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'time-distribution', name: 'Zeitverteilung', description: 'Ring-Widget für Lifetime-Kategorien' },
  { id: 'progress-ring', name: 'Streak', description: 'Ring-Widget für Streak-Fortschritt' },
  { id: 'health-progress', name: 'Gesundheit', description: 'Fortschrittsbalken für tägliche Routinen' },
  { id: 'today-details', name: 'Heute', description: 'Übersicht der heutigen Aufgaben' },
  { id: 'quick-stats', name: 'Statistiken', description: 'Notendurchschnitt und Vermögen' },
  { id: 'next-actions', name: 'Nächste Aktionen', description: 'Anstehende Aufgaben und Hausaufgaben' },
  { id: 'habits-overview', name: 'Gewohnheiten', description: 'Übersicht der täglichen Habits' },
  { id: 'achievements', name: 'Erfolge', description: 'Freigeschaltete Achievements' },
  { id: 'data-backup', name: 'Backup', description: 'PDF-Export aller Daten' },
];

const DEFAULT_ORDER = AVAILABLE_WIDGETS.map(w => w.id);

export function useDashboardConfig() {
  const { user } = useAuth();
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('dashboard_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setWidgetOrder(data.widget_order || DEFAULT_ORDER);
      setHiddenWidgets(data.hidden_widgets || []);
    } else if (!error || error.code === 'PGRST116') {
      // No config exists, use defaults
      setWidgetOrder(DEFAULT_ORDER);
      setHiddenWidgets([]);
    }
    
    setLoading(false);
  };

  const saveConfig = useCallback(async (order: string[], hidden: string[]) => {
    if (!user) return;
    
    const { data: existing } = await supabase
      .from('dashboard_config')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('dashboard_config')
        .update({ widget_order: order, hidden_widgets: hidden })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('dashboard_config')
        .insert({ user_id: user.id, widget_order: order, hidden_widgets: hidden });
    }
    
    setWidgetOrder(order);
    setHiddenWidgets(hidden);
  }, [user]);

  const toggleWidget = useCallback((widgetId: string) => {
    const newHidden = hiddenWidgets.includes(widgetId)
      ? hiddenWidgets.filter(id => id !== widgetId)
      : [...hiddenWidgets, widgetId];
    saveConfig(widgetOrder, newHidden);
  }, [hiddenWidgets, widgetOrder, saveConfig]);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...widgetOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    saveConfig(newOrder, hiddenWidgets);
  }, [widgetOrder, hiddenWidgets, saveConfig]);

  const resetToDefault = useCallback(() => {
    saveConfig(DEFAULT_ORDER, []);
  }, [saveConfig]);

  const visibleWidgets = widgetOrder.filter(id => !hiddenWidgets.includes(id));

  return {
    widgetOrder,
    hiddenWidgets,
    visibleWidgets,
    loading,
    toggleWidget,
    moveWidget,
    resetToDefault,
    AVAILABLE_WIDGETS,
  };
}
