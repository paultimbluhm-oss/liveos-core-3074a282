import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDashboardV2Config, type DashboardSettings } from '@/hooks/useDashboardV2';
import { StreakRingWidget } from '@/components/dashboard-v2/StreakRingWidget';
import { HabitsChecklistWidget } from '@/components/dashboard-v2/HabitsChecklistWidget';
import { TodayProgressWidget } from '@/components/dashboard-v2/TodayProgressWidget';
import { HealthBarWidget } from '@/components/dashboard-v2/HealthBarWidget';


import { QuickStatsWidget } from '@/components/dashboard-v2/QuickStatsWidget';
import { MotivationWidget } from '@/components/dashboard-v2/MotivationWidget';
import { QuickStatsConfigSheet } from '@/components/dashboard-v2/QuickStatsConfigSheet';
import { TasksWidget } from '@/components/dashboard-v2/TasksWidget';
import { TimetableWidget } from '@/components/dashboard-v2/TimetableWidget';
import { WIDGET_CATALOG } from '@/hooks/useDashboardV2';
import { Settings2, X, Plus, Minus, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardWidget, WidgetSize } from '@/hooks/useDashboardV2';

const WIDGET_COMPONENTS: Record<string, React.FC<any>> = {
  'streak-ring': StreakRingWidget,
  'habits-checklist': HabitsChecklistWidget,
  'today-progress': TodayProgressWidget,
  'health-bar': HealthBarWidget,
  'quick-stats': QuickStatsWidget,
  'motivation-quote': MotivationWidget,
  'tasks': TasksWidget,
  'timetable': TimetableWidget,
};

function getGridClass(size: WidgetSize): string {
  switch (size) {
    case 'small': return 'col-span-1 md:col-span-1';
    case 'medium': return 'col-span-2 md:col-span-2';
    case 'large': return 'col-span-2 md:col-span-3 lg:col-span-3';
  }
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { widgets, visibleWidgets, loading: configLoading, updateWidgetSize, toggleWidget, moveWidget, resetToDefault, settings, updateSettings } = useDashboardV2Config();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [statsConfigOpen, setStatsConfigOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const hiddenWidgets = widgets.filter(w => !w.visible);

  const getInfo = (type: string) => WIDGET_CATALOG.find(w => w.type === type);

  const cycleSizeUp = (widget: DashboardWidget) => {
    const info = getInfo(widget.type);
    if (!info) return;
    const idx = info.sizes.indexOf(widget.size);
    if (idx < info.sizes.length - 1) updateWidgetSize(widget.id, info.sizes[idx + 1]);
  };

  const cycleSizeDown = (widget: DashboardWidget) => {
    const info = getInfo(widget.type);
    if (!info) return;
    const idx = info.sizes.indexOf(widget.size);
    if (idx > 0) updateWidgetSize(widget.id, info.sizes[idx - 1]);
  };

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto space-y-3">
        {/* Edit mode toggle */}
        <div className="flex justify-end">
          <Button
            variant={editMode ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <X className="w-4 h-4" strokeWidth={1.5} /> : <Settings2 className="w-4 h-4" strokeWidth={1.5} />}
          </Button>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleWidgets.map((widget, index) => {
            const Component = WIDGET_COMPONENTS[widget.type];
            const info = getInfo(widget.type);
            if (!Component || !info) return null;

            const canSizeUp = info.sizes.indexOf(widget.size) < info.sizes.length - 1;
            const canSizeDown = info.sizes.indexOf(widget.size) > 0;

            return (
              <motion.div
                key={widget.id}
                className={`${getGridClass(widget.size)} relative`}
                animate={editMode ? {
                  rotate: [0, -0.8, 0.8, -0.8, 0],
                } : { rotate: 0 }}
                transition={editMode ? {
                  repeat: Infinity,
                  duration: 0.4,
                  ease: 'easeInOut',
                  delay: index * 0.05,
                } : { duration: 0.2 }}
              >
                {/* Widget content */}
                <div className={editMode ? 'pointer-events-none opacity-80' : ''}>
                  {widget.type === 'habits-checklist' 
                    ? <Component size={widget.size} settings={settings} />
                    : widget.type === 'quick-stats'
                    ? <Component 
                        size={widget.size} 
                        editMode={editMode}
                        statsConfig={{ visibleFields: settings.statsVisibleFields || ['grade', 'netWorth'] }}
                      />
                    : <Component size={widget.size} />
                  }
                </div>

                {/* Edit overlay controls */}
                <AnimatePresence>
                  {editMode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 z-10"
                      onClick={(e) => {
                        if (widget.type === 'quick-stats') {
                          e.stopPropagation();
                          setStatsConfigOpen(true);
                        }
                      }}
                    >
                      {/* Remove button (top-left) */}
                      <button
                        className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
                        onClick={(e) => { e.stopPropagation(); toggleWidget(widget.id); }}
                      >
                        <EyeOff className="w-3 h-3" strokeWidth={2} />
                      </button>

                      {/* Size controls (top-right) */}
                      {info.sizes.length > 1 && (
                        <div className="absolute -top-2 -right-2 flex gap-1">
                          <button
                            className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30"
                            disabled={!canSizeDown}
                            onClick={(e) => { e.stopPropagation(); cycleSizeDown(widget); }}
                          >
                            <Minus className="w-3 h-3" strokeWidth={2} />
                          </button>
                          <button
                            className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30"
                            disabled={!canSizeUp}
                            onClick={(e) => { e.stopPropagation(); cycleSizeUp(widget); }}
                          >
                            <Plus className="w-3 h-3" strokeWidth={2} />
                          </button>
                        </div>
                      )}

                      {/* Move controls (bottom-center) */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        <button
                          className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30"
                          disabled={index <= 0}
                          onClick={(e) => { e.stopPropagation(); moveWidget(index, index - 1); }}
                        >
                          <ChevronUp className="w-3 h-3" strokeWidth={2} />
                        </button>
                        <button
                          className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30"
                          disabled={index >= visibleWidgets.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveWidget(index, index + 1); }}
                        >
                          <ChevronDown className="w-3 h-3" strokeWidth={2} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Hidden widgets (show in edit mode) */}
        <AnimatePresence>
          {editMode && hiddenWidgets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <p className="text-xs text-muted-foreground font-medium px-1">Ausgeblendete Widgets</p>
              <div className="grid grid-cols-2 gap-2">
                {hiddenWidgets.map(widget => {
                  const info = getInfo(widget.type);
                  if (!info) return null;
                  return (
                    <button
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-dashed border-border hover:bg-muted transition-colors text-left"
                    >
                      <Plus className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{info.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{info.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit mode footer */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-3 pt-2"
            >
              {/* Habit display limit */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                <span className="text-xs font-medium">Sichtbare Habits</span>
                <div className="flex items-center gap-2">
                  {[0, 3, 5, 7].map(n => (
                    <button
                      key={n}
                      onClick={() => updateSettings({ habitDisplayLimit: n })}
                      className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                        settings.habitDisplayLimit === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {n === 0 ? 'Alle' : n}
                    </button>
                  ))}
                </div>
              </div>


              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={resetToDefault} className="text-xs">
                  Zuruecksetzen
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <QuickStatsConfigSheet
        open={statsConfigOpen}
        onOpenChange={setStatsConfigOpen}
        visibleFields={(settings.statsVisibleFields || ['grade', 'netWorth']) as any}
        onToggleField={(field) => {
          const current = settings.statsVisibleFields || ['grade', 'netWorth'];
          const next = current.includes(field)
            ? current.filter(f => f !== field)
            : [...current, field];
          updateSettings({ statsVisibleFields: next });
        }}
      />
    </AppLayout>
  );
}
