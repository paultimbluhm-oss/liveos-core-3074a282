import { calculateXPProgress } from '@/hooks/useProfile';
import { Zap, Flame, Trophy, CheckCircle2 } from 'lucide-react';

interface HeroStatsProps {
  xp: number;
  level: number;
  streakDays: number;
  tasksCompleted: number;
  tasksTotal: number;
}

const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Anfänger';
  if (level < 10) return 'Lehrling';
  if (level < 20) return 'Geselle';
  if (level < 35) return 'Experte';
  if (level < 50) return 'Meister';
  return 'Legende';
};

export function HeroStats({ xp, level, streakDays, tasksCompleted, tasksTotal }: HeroStatsProps) {
  const { current, needed, percentage } = calculateXPProgress(xp);
  const title = getLevelTitle(level);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const taskProgress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/50 p-6 md:p-8">
      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-xp/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 industrial-grid opacity-30" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
        {/* Circular Level Display */}
        <div className="relative flex-shrink-0">
          <svg className="w-56 h-56 md:w-64 md:h-64 transform -rotate-90" viewBox="0 0 280 280">
            {/* Background circle */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="16"
              className="opacity-50"
            />
            {/* Progress circle */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="url(#xpGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out drop-shadow-[0_0_20px_hsl(var(--xp)/0.5)]"
            />
            {/* Glow effect */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="url(#xpGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="blur-sm opacity-70"
            />
            <defs>
              <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(280 80% 60%)" />
                <stop offset="50%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(320 70% 50%)" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-5 h-5 text-level" />
                <span className="text-sm text-muted-foreground uppercase tracking-wider">Level</span>
              </div>
              <span className="text-5xl md:text-6xl font-bold text-level font-mono drop-shadow-[0_0_30px_hsl(var(--level)/0.5)]">
                {level}
              </span>
              <p className="text-sm md:text-base font-medium text-foreground mt-1">{title}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* XP Card */}
          <div className="glass-card p-5 relative overflow-hidden group hover:border-xp/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-xp/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-xp/20">
                  <Zap className="w-5 h-5 text-[hsl(var(--xp))]" />
                </div>
                <span className="text-sm text-muted-foreground">Total XP</span>
              </div>
              <p className="text-3xl font-bold text-gradient-xp font-mono">{xp.toLocaleString()}</p>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${percentage}%`,
                    background: 'linear-gradient(90deg, hsl(280 80% 60%), hsl(320 70% 50%))'
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {needed - current} XP bis Level {level + 1}
              </p>
            </div>
          </div>

          {/* Streak Card */}
          <div className="glass-card p-5 relative overflow-hidden group hover:border-streak/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-streak/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl bg-streak/20 ${streakDays > 0 ? 'animate-pulse' : ''}`}>
                  <Flame className={`w-5 h-5 ${streakDays > 0 ? 'text-[hsl(var(--streak))]' : 'text-muted-foreground'}`} />
                </div>
                <span className="text-sm text-muted-foreground">Habit-Streak</span>
              </div>
              <p className="text-3xl font-bold text-streak font-mono">{streakDays} <span className="text-lg text-muted-foreground">Tage</span></p>
              <div className="mt-3 flex gap-1.5">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2.5 rounded-full transition-all ${
                      i < (streakDays % 7 || (streakDays > 0 ? 7 : 0))
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_hsl(var(--streak)/0.5)]'
                        : 'bg-secondary'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {streakDays > 0 
                  ? streakDays % 7 === 0 
                    ? '🎉 Wochen-Bonus erreicht!' 
                    : `${7 - (streakDays % 7)} Tage bis Wochen-Bonus`
                  : 'Schließe alle Habits ab!'
                }
              </p>
            </div>
          </div>

          {/* Today's Task Progress */}
          <div className="sm:col-span-2 glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-5 h-5 ${taskProgress === 100 ? 'text-success' : 'text-primary'}`} />
              <span className="text-sm text-foreground">Täglicher Fortschritt (Tasks)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    taskProgress === 100 
                      ? 'bg-gradient-to-r from-success to-emerald-400' 
                      : 'bg-gradient-to-r from-primary to-accent'
                  }`}
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{tasksCompleted}/{tasksTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
