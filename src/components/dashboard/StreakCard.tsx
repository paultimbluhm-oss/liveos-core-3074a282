import { Flame } from 'lucide-react';

interface StreakCardProps {
  streakDays: number;
}

export function StreakCard({ streakDays }: StreakCardProps) {
  return (
    <div className="glass-card p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full" />
      
      <div className="flex items-center gap-3 md:gap-4">
        <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 shrink-0 ${streakDays > 0 ? 'pulse-glow' : ''}`}>
          <Flame className={`w-5 h-5 md:w-6 md:h-6 ${streakDays > 0 ? 'text-orange-400' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">Tages-Streak</p>
          <p className="text-2xl md:text-3xl font-bold text-streak font-mono">{streakDays}</p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 flex gap-1">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 md:h-2 rounded-full ${
              i < streakDays % 7 ? 'bg-streak' : 'bg-secondary'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 md:mt-2">
        {streakDays > 0 ? `${7 - (streakDays % 7)} Tage bis zum Wochen-Bonus!` : 'Starte heute deine Serie!'}
      </p>
    </div>
  );
}
