import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { GraduationCap, Coins } from 'lucide-react';
import type { StatsField } from './QuickStatsWidget';

interface QuickStatsConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleFields: StatsField[];
  onToggleField: (field: StatsField) => void;
}

const FIELDS: { id: StatsField; label: string; icon: typeof GraduationCap }[] = [
  { id: 'grade', label: 'Notenschnitt', icon: GraduationCap },
  { id: 'netWorth', label: 'Vermoegen', icon: Coins },
];

export function QuickStatsConfigSheet({ open, onOpenChange, visibleFields, onToggleField }: QuickStatsConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">Statistik-Widget</SheetTitle>
        </SheetHeader>

        <div className="space-y-1">
          {FIELDS.map(field => {
            const Icon = field.icon;
            const isActive = visibleFields.includes(field.id);
            return (
              <button
                key={field.id}
                onClick={() => onToggleField(field.id)}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium">{field.label}</span>
                </div>
                <Switch checked={isActive} />
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
