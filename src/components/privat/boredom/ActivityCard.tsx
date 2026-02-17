import { Trash2, Target, Lightbulb, Gamepad2, Music, Palette, Book, Dumbbell, Code, Camera, ChefHat, Wrench, Languages, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Lightbulb, Gamepad2, Music, Palette, Book, Dumbbell, Code, Camera, ChefHat, Wrench, Languages, Brain
};

interface ActivityCardProps {
  activity: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    icon: string;
    skills_count?: number;
    completed_skills?: number;
  };
  onClick: () => void;
  onDelete: () => void;
}

export function ActivityCard({ activity, onClick, onDelete }: ActivityCardProps) {
  const progress = activity.skills_count 
    ? ((activity.completed_skills || 0) / activity.skills_count) * 100 
    : 0;

  const IconComponent = iconMap[activity.icon] || Lightbulb;

  return (
    <div className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer group" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{activity.name}</h3>
            {activity.category && (
              <Badge variant="outline" className="mt-1 text-xs">{activity.category}</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {activity.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{activity.description}</p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Target className="w-4 h-4" />
            {activity.completed_skills || 0} / {activity.skills_count || 0} Skills
          </span>
        </div>
        {activity.skills_count && activity.skills_count > 0 && (
          <Progress value={progress} className="h-2" />
        )}
      </div>
    </div>
  );
}
