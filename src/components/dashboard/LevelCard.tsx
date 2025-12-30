import { Trophy } from 'lucide-react';

interface LevelCardProps {
  level: number;
}

const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Anfänger';
  if (level < 10) return 'Lehrling';
  if (level < 20) return 'Geselle';
  if (level < 35) return 'Experte';
  if (level < 50) return 'Meister';
  return 'Legende';
};

export function LevelCard({ level }: LevelCardProps) {
  const title = getLevelTitle(level);

  return (
    <div className="glass-card p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-yellow-500/20 to-transparent rounded-bl-full" />
      
      <div className="flex items-center gap-3 md:gap-4">
        <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 shrink-0">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">Aktuelles Level</p>
          <p className="text-2xl md:text-3xl font-bold text-level font-mono">{level}</p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 p-2 md:p-3 rounded-lg bg-secondary/50 border border-border/50">
        <p className="text-xs md:text-sm text-muted-foreground">Rang</p>
        <p className="text-sm md:text-lg font-semibold text-foreground">{title}</p>
      </div>
    </div>
  );
}
