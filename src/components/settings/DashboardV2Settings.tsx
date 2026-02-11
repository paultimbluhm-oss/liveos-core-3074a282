import { useDashboardV2Config, WIDGET_CATALOG, WidgetSize } from '@/hooks/useDashboardV2';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';

export function DashboardV2Settings() {
  const { widgets, visibleWidgets, updateWidgetSize, toggleWidget, moveWidget, resetToDefault } = useDashboardV2Config();

  const allWidgets = [...widgets].sort((a, b) => {
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    return a.order - b.order;
  });

  const getInfo = (type: string) => WIDGET_CATALOG.find(w => w.type === type);

  const cycleSizeUp = (widget: typeof widgets[0]) => {
    const info = getInfo(widget.type);
    if (!info) return;
    const sizes = info.sizes;
    const idx = sizes.indexOf(widget.size);
    if (idx < sizes.length - 1) updateWidgetSize(widget.id, sizes[idx + 1]);
  };

  const cycleSizeDown = (widget: typeof widgets[0]) => {
    const info = getInfo(widget.type);
    if (!info) return;
    const sizes = info.sizes;
    const idx = sizes.indexOf(widget.size);
    if (idx > 0) updateWidgetSize(widget.id, sizes[idx - 1]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Dashboard Widgets</h3>
          <p className="text-sm text-muted-foreground">Widgets ein-/ausblenden, Groesse und Reihenfolge aendern</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        {allWidgets.map((widget, index) => {
          const info = getInfo(widget.type);
          if (!info) return null;
          const visIdx = visibleWidgets.findIndex(w => w.id === widget.id);
          const canSizeUp = info.sizes.indexOf(widget.size) < info.sizes.length - 1;
          const canSizeDown = info.sizes.indexOf(widget.size) > 0;

          return (
            <Card key={widget.id} className={`transition-opacity ${!widget.visible ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 flex items-center gap-2">
                {/* Move buttons */}
                {widget.visible && (
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveWidget(visIdx, visIdx - 1)} disabled={visIdx <= 0}>
                      <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveWidget(visIdx, visIdx + 1)} disabled={visIdx >= visibleWidgets.length - 1}>
                      <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{info.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{info.description}</p>
                </div>

                {/* Size controls */}
                {widget.visible && info.sizes.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleSizeDown(widget)} disabled={!canSizeDown}>
                      <Minimize2 className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                    <span className="text-[10px] text-muted-foreground font-mono w-6 text-center uppercase">{widget.size[0]}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cycleSizeUp(widget)} disabled={!canSizeUp}>
                      <Maximize2 className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}

                {/* Visibility toggle */}
                <div className="flex items-center gap-1.5">
                  {widget.visible ? <Eye className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />}
                  <Switch checked={widget.visible} onCheckedChange={() => toggleWidget(widget.id)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
