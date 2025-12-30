import { Activity, CheckCircle, Plus, Award, BookOpen, GraduationCap } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'homework_completed' | 'grade_added' | 'achievement' | 'item_added';
  title: string;
  timestamp: Date;
  xp?: number;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'task_completed':
      return CheckCircle;
    case 'homework_completed':
      return BookOpen;
    case 'grade_added':
      return GraduationCap;
    case 'item_added':
      return Plus;
    case 'achievement':
      return Award;
    default:
      return Activity;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'task_completed':
      return 'text-success bg-success/20';
    case 'homework_completed':
      return 'text-primary bg-primary/20';
    case 'grade_added':
      return 'text-accent bg-accent/20';
    case 'item_added':
      return 'text-accent bg-accent/20';
    case 'achievement':
      return 'text-yellow-400 bg-yellow-400/20';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  };

  return (
    <div className="glass-card p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        <h3 className="font-semibold text-sm md:text-base">Letzte Aktivitäten</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <p className="text-sm md:text-base">Noch keine Aktivitäten</p>
          <p className="text-xs md:text-sm mt-1">Beginne mit einer Aufgabe!</p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {activities.slice(0, 5).map((activity, i) => {
            const Icon = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-center gap-2 md:gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`p-1.5 md:p-2 rounded-lg shrink-0 ${colorClasses}`}>
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                </div>
                {activity.xp && (
                  <span className="text-xs font-mono text-xp shrink-0">+{activity.xp} XP</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
