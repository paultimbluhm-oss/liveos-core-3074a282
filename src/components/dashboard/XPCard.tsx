import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';
import { calculateXPProgress } from '@/hooks/useProfile';

interface XPCardProps {
  xp: number;
  level: number;
}

export function XPCard({ xp, level }: XPCardProps) {
  const { current, needed, percentage } = calculateXPProgress(xp);

  return (
    <div className="glass-card p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      
      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 glow-xp shrink-0">
          <Zap className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">Experience Points</p>
          <p className="text-2xl md:text-3xl font-bold text-gradient-xp font-mono truncate">{xp.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        <div className="flex justify-between text-xs md:text-sm">
          <span className="text-muted-foreground">Level {level}</span>
          <span className="text-muted-foreground">Level {level + 1}</span>
        </div>
        <Progress value={percentage} variant="xp" className="h-2 md:h-3" />
        <p className="text-xs text-muted-foreground text-center">
          {needed - current} XP bis zum nächsten Level
        </p>
      </div>
    </div>
  );
}
