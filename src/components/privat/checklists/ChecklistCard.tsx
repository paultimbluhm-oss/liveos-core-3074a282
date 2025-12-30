import { ListChecks, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChecklistCardProps {
  checklist: {
    id: string;
    name: string;
    items_count?: number;
    completed_count?: number;
  };
  onClick: () => void;
  onDelete: () => void;
}

export function ChecklistCard({ checklist, onClick, onDelete }: ChecklistCardProps) {
  const itemsCount = checklist.items_count || 0;
  const completedCount = checklist.completed_count || 0;
  const progress = itemsCount > 0 ? (completedCount / itemsCount) * 100 : 0;
  const isComplete = itemsCount > 0 && progress === 100;

  // Calculate progress ring properties
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
      onClick={onClick}
    >
      {/* Progress Ring */}
      <div className="relative shrink-0">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-all duration-300",
              isComplete ? "text-emerald-500" : "text-primary"
            )}
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <ListChecks className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "font-medium text-sm truncate",
          isComplete && "text-muted-foreground"
        )}>
          {checklist.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {completedCount} von {itemsCount} erledigt
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  );
}
