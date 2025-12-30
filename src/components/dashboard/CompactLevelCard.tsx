import { useState } from 'react';
import { calculateXPProgress } from '@/hooks/useProfile';
import { Zap, Flame, Trophy, ChevronRight, X, Star, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CompactLevelCardProps {
  xp: number;
  level: number;
  streakDays: number;
}

const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Anfänger';
  if (level < 10) return 'Lehrling';
  if (level < 20) return 'Geselle';
  if (level < 35) return 'Experte';
  if (level < 50) return 'Meister';
  return 'Legende';
};

const getNextLevelTitle = (level: number): string => {
  if (level < 4) return 'Anfänger';
  if (level < 9) return 'Lehrling';
  if (level < 19) return 'Geselle';
  if (level < 34) return 'Experte';
  if (level < 49) return 'Meister';
  return 'Legende';
};

const getLevelMilestones = (currentLevel: number) => {
  const milestones = [
    { level: 5, title: 'Lehrling', icon: '📚' },
    { level: 10, title: 'Geselle', icon: '⚡' },
    { level: 20, title: 'Experte', icon: '🎯' },
    { level: 35, title: 'Meister', icon: '👑' },
    { level: 50, title: 'Legende', icon: '🏆' },
  ];
  return milestones.map(m => ({
    ...m,
    achieved: currentLevel >= m.level,
    current: currentLevel >= m.level && (milestones.find(next => next.level > m.level)?.level || 100) > currentLevel,
  }));
};

export function CompactLevelCard({ xp, level, streakDays }: CompactLevelCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { current, needed, percentage } = calculateXPProgress(xp);
  const title = getLevelTitle(level);
  const nextTitle = getNextLevelTitle(level + 1);
  const milestones = getLevelMilestones(level);
  const xpToNext = needed - current;

  // Calculate total XP needed for each level (simple formula: level * 100)
  const getXPForLevel = (lvl: number) => lvl * 100;
  const totalXPForCurrentLevel = getXPForLevel(level);
  const totalXPForNextLevel = getXPForLevel(level + 1);

  return (
    <>
      <div 
        className="glass-card p-4 md:p-5 relative overflow-hidden cursor-pointer hover:bg-white/5 transition-all group"
        onClick={() => setDialogOpen(true)}
      >
        {/* Background decorations */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-xp/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            {/* Level Circle */}
            <div className="relative flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="8"
                  className="opacity-50"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#compactXpGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - percentage / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="drop-shadow-[0_0_10px_hsl(var(--xp)/0.5)]"
                />
                <defs>
                  <linearGradient id="compactXpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(280 80% 60%)" />
                    <stop offset="100%" stopColor="hsl(320 70% 50%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-level font-mono">{level}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-level" />
                <span className="text-sm font-medium text-foreground">{title}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[hsl(var(--xp))]" />
                <span className="text-sm text-gradient-xp font-bold font-mono">{xp.toLocaleString()} XP</span>
              </div>

              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(280 80% 60%), hsl(320 70% 50%))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {xpToNext} XP bis Level {level + 1}
              </p>
            </div>

            {/* Streak */}
            <div className="flex-shrink-0 text-center p-3 rounded-lg bg-streak/10 border border-streak/20">
              <Flame className={`w-5 h-5 mx-auto mb-1 ${streakDays > 0 ? 'text-streak animate-pulse' : 'text-muted-foreground'}`} />
              <span className="text-lg font-bold text-streak font-mono">{streakDays}</span>
              <p className="text-xs text-muted-foreground">Tage</p>
            </div>

            {/* Click indicator */}
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Level Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-level" />
              Level-Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Level Display */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-xp/10 border border-primary/20">
              <div className="relative inline-block mb-4">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="6"
                    className="opacity-30"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#dialogXpGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - percentage / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="dialogXpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(280 80% 60%)" />
                      <stop offset="100%" stopColor="hsl(320 70% 50%)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-level font-mono">{level}</span>
                  <span className="text-xs text-muted-foreground">{title}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-[hsl(var(--xp))]" />
                  <span className="text-xl font-bold text-gradient-xp font-mono">{xp.toLocaleString()} XP</span>
                </div>
                <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}% zu Level {level + 1}</p>
              </div>
            </div>

            {/* Next Level Info */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Nächstes Level</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-level font-mono">{level + 1}</p>
                  <p className="text-xs text-muted-foreground">{nextTitle}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-[hsl(var(--xp))] font-mono">{xpToNext}</p>
                  <p className="text-xs text-muted-foreground">XP benötigt</p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-level" />
                Rang-Meilensteine
              </h4>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.level}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      milestone.achieved 
                        ? 'bg-success/10 border border-success/20' 
                        : 'bg-secondary/30 border border-transparent'
                    }`}
                  >
                    <span className="text-xl">{milestone.icon}</span>
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.achieved ? 'text-success' : 'text-muted-foreground'}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-muted-foreground">Level {milestone.level}</p>
                    </div>
                    {milestone.achieved && (
                      <span className="text-success text-sm">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-streak/10 border border-streak/20">
              <Flame className={`w-8 h-8 ${streakDays > 0 ? 'text-streak' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-bold text-lg text-streak font-mono">{streakDays} Tage Streak</p>
                <p className="text-xs text-muted-foreground">
                  {streakDays > 0 
                    ? 'Mach heute weiter, um deinen Streak zu halten!' 
                    : 'Starte heute deinen Streak!'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
