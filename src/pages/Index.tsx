import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDashboardV2Config, WIDGET_CATALOG, type DashboardSettings } from '@/hooks/useDashboardV2';
import { StreakRingWidget } from '@/components/dashboard-v2/StreakRingWidget';
import { HabitsChecklistWidget } from '@/components/dashboard-v2/HabitsChecklistWidget';
import { TasksWidget } from '@/components/dashboard-v2/TasksWidget';
import { TimetableWidget } from '@/components/dashboard-v2/TimetableWidget';
import { FinanceWidget } from '@/components/dashboard-v2/FinanceWidget';
import { FinanceSheetWrapper } from '@/components/dashboard-v2/FinanceSheetWrapper';
import { SchoolSheetWrapper } from '@/components/dashboard-v2/SchoolSheetWrapper';
import { Settings2, X, Plus, Minus, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardWidget, WidgetSize } from '@/hooks/useDashboardV2';

const WIDGET_COMPONENTS: Record<string, React.FC<any>> = {
  'streak-ring': StreakRingWidget,
  'habits-checklist': HabitsChecklistWidget,
  'tasks': TasksWidget,
  'timetable': TimetableWidget,
  'finance': FinanceWidget,
};

function getGridClass(size: WidgetSize): string {
  switch (size) {
    case 'small': return '';
    case 'medium': return '';
    case 'large': return '';
  }
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { widgets, visibleWidgets, loading: configLoading, updateWidgetSize, toggleWidget, moveWidget, resetToDefault, settings, updateSettings } = useDashboardV2Config();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [financeSheetOpen, setFinanceSheetOpen] = useState(false);
  const [schoolSheetOpen, setSchoolSheetOpen] = useState(false);

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

  const renderWidget = (widget: DashboardWidget) => {
    const Component = WIDGET_COMPONENTS[widget.type];
    if (!Component) return null;
    if (widget.type === 'habits-checklist') return <Component size={widget.size} settings={settings} />;
    if (widget.type === 'finance') return <Component size={widget.size} onOpenSheet={() => setFinanceSheetOpen(true)} />;
    if (widget.type === 'timetable') return <Component size={widget.size} onOpenSheet={() => setSchoolSheetOpen(true)} />;
    return <Component size={widget.size} />;
  };

  const renderEditOverlay = (widget: DashboardWidget, info: any, index: number, total: number) => (
    <AnimatePresence>
      {editMode && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 z-10">
          <button className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
            onClick={(e) => { e.stopPropagation(); toggleWidget(widget.id); }}><EyeOff className="w-3 h-3" strokeWidth={2} /></button>
          {info.sizes.length > 1 && (
            <div className="absolute -top-2 -right-2 flex gap-1">
              <button className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30" disabled={info.sizes.indexOf(widget.size) <= 0}
                onClick={(e) => { e.stopPropagation(); cycleSizeDown(widget); }}><Minus className="w-3 h-3" strokeWidth={2} /></button>
              <button className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30" disabled={info.sizes.indexOf(widget.size) >= info.sizes.length - 1}
                onClick={(e) => { e.stopPropagation(); cycleSizeUp(widget); }}><Plus className="w-3 h-3" strokeWidth={2} /></button>
            </div>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <button className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30" disabled={index <= 0}
              onClick={(e) => { e.stopPropagation(); moveWidget(index, index - 1); }}><ChevronUp className="w-3 h-3" strokeWidth={2} /></button>
            <button className="w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center disabled:opacity-30" disabled={index >= total - 1}
              onClick={(e) => { e.stopPropagation(); moveWidget(index, index + 1); }}><ChevronDown className="w-3 h-3" strokeWidth={2} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <AppLayout>
      <div className="p-4 pb-24 mx-auto space-y-3 max-w-lg md:max-w-3xl lg:max-w-5xl">
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

        {/* Mobile widget list */}
        <div className="md:hidden space-y-3">
          {visibleWidgets.map((widget, index) => {
            const info = getInfo(widget.type);
            if (!WIDGET_COMPONENTS[widget.type] || !info) return null;
            return (
              <motion.div
                key={widget.id}
                className="relative"
                animate={editMode ? { rotate: [0, -0.8, 0.8, -0.8, 0] } : { rotate: 0 }}
                transition={editMode ? { repeat: Infinity, duration: 0.4, ease: 'easeInOut', delay: index * 0.05 } : { duration: 0.2 }}
              >
                <div className={editMode ? 'pointer-events-none opacity-80' : ''}>
                  {renderWidget(widget)}
                </div>
                {renderEditOverlay(widget, info, index, visibleWidgets.length)}
              </motion.div>
            );
          })}
        </div>

        {/* Desktop: two columns */}
        <div className="hidden md:flex gap-4">
          {(() => {
            const col1: typeof visibleWidgets = [];
            const col2: typeof visibleWidgets = [];
            visibleWidgets.forEach((w, i) => { (i % 2 === 0 ? col1 : col2).push(w); });
            const renderCol = (col: typeof visibleWidgets) => (
              <div className="flex-1 space-y-4">
                {col.map((widget) => {
                  const info = getInfo(widget.type);
                  const globalIndex = visibleWidgets.indexOf(widget);
                  if (!WIDGET_COMPONENTS[widget.type] || !info) return null;
                  return (
                    <motion.div
                      key={widget.id}
                      className="relative"
                      animate={editMode ? { rotate: [0, -0.8, 0.8, -0.8, 0] } : { rotate: 0 }}
                      transition={editMode ? { repeat: Infinity, duration: 0.4, ease: 'easeInOut', delay: globalIndex * 0.05 } : { duration: 0.2 }}
                    >
                      <div className={editMode ? 'pointer-events-none opacity-80' : ''}>
                        {renderWidget(widget)}
                      </div>
                      {renderEditOverlay(widget, info, globalIndex, visibleWidgets.length)}
                    </motion.div>
                  );
                })}
              </div>
            );
            return <>{renderCol(col1)}{renderCol(col2)}</>;
          })()}
        </div>

        {/* Hidden widgets (edit mode) */}
        <AnimatePresence>
          {editMode && hiddenWidgets.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium px-1">Ausgeblendete Widgets</p>
              <div className="grid grid-cols-2 gap-2">
                {hiddenWidgets.map(widget => {
                  const info = getInfo(widget.type);
                  if (!info) return null;
                  return (
                    <button key={widget.id} onClick={() => toggleWidget(widget.id)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-dashed border-border hover:bg-muted transition-colors text-left">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                <span className="text-xs font-medium">Sichtbare Habits</span>
                <div className="flex items-center gap-2">
                  {[0, 3, 5, 7].map(n => (
                    <button key={n} onClick={() => updateSettings({ habitDisplayLimit: n })}
                      className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                        settings.habitDisplayLimit === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}>
                      {n === 0 ? 'Alle' : n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={resetToDefault} className="text-xs">Zuruecksetzen</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FinanceSheetWrapper open={financeSheetOpen} onOpenChange={setFinanceSheetOpen} />
      <SchoolSheetWrapper open={schoolSheetOpen} onOpenChange={setSchoolSheetOpen} />
    </AppLayout>
  );
}
