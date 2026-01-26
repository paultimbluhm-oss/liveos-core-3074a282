import { useDashboardConfig, AVAILABLE_WIDGETS } from '@/hooks/useDashboardConfig';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, RotateCcw, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

export function DashboardSettings() {
  const {
    widgetOrder,
    hiddenWidgets,
    loading,
    toggleWidget,
    moveWidget,
    resetToDefault,
  } = useDashboardConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const getWidgetInfo = (id: string) => AVAILABLE_WIDGETS.find(w => w.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Dashboard anpassen</h3>
          <p className="text-sm text-muted-foreground">
            Widgets ein-/ausblenden und Reihenfolge ändern
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          Zurücksetzen
        </Button>
      </div>

      <div className="space-y-2">
        {widgetOrder.map((widgetId, index) => {
          const widget = getWidgetInfo(widgetId);
          if (!widget) return null;
          
          const isHidden = hiddenWidgets.includes(widgetId);
          
          return (
            <Card 
              key={widgetId}
              className={`transition-opacity ${isHidden ? 'opacity-50' : ''}`}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveWidget(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveWidget(index, Math.min(widgetOrder.length - 1, index + 1))}
                    disabled={index === widgetOrder.length - 1}
                  >
                    <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                  </Button>
                </div>
                
                <GripVertical className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{widget.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isHidden ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  )}
                  <Switch
                    checked={!isHidden}
                    onCheckedChange={() => toggleWidget(widgetId)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
