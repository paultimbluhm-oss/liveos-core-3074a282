import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Award, Lock, ChevronRight, Star, Flame, Target, Zap, BookOpen, CheckCircle2, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { playAchievementSound } from '@/lib/sounds';

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at?: string;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'id' | 'unlocked' | 'unlocked_at'>[] = [
  { type: 'streak_3', name: 'Feuer gefangen', description: '3 Tage Streak erreicht', icon: 'Flame', requirement: 3, xp_reward: 25 },
  { type: 'streak_7', name: 'Wochenkrieger', description: '7 Tage Streak erreicht', icon: 'Flame', requirement: 7, xp_reward: 50 },
  { type: 'streak_30', name: 'Monatsmeister', description: '30 Tage Streak erreicht', icon: 'Flame', requirement: 30, xp_reward: 150 },
  { type: 'level_5', name: 'Aufsteiger', description: 'Level 5 erreicht', icon: 'Trophy', requirement: 5, xp_reward: 30 },
  { type: 'level_10', name: 'Profi', description: 'Level 10 erreicht', icon: 'Trophy', requirement: 10, xp_reward: 75 },
  { type: 'level_25', name: 'Veteran', description: 'Level 25 erreicht', icon: 'Trophy', requirement: 25, xp_reward: 200 },
  { type: 'xp_1000', name: 'XP Sammler', description: '1.000 XP gesammelt', icon: 'Zap', requirement: 1000, xp_reward: 50 },
  { type: 'xp_5000', name: 'XP Jäger', description: '5.000 XP gesammelt', icon: 'Zap', requirement: 5000, xp_reward: 100 },
  { type: 'xp_10000', name: 'XP Meister', description: '10.000 XP gesammelt', icon: 'Zap', requirement: 10000, xp_reward: 250 },
  { type: 'tasks_10', name: 'Produktiv', description: '10 Aufgaben erledigt', icon: 'CheckCircle2', requirement: 10, xp_reward: 30 },
  { type: 'tasks_50', name: 'Fleißig', description: '50 Aufgaben erledigt', icon: 'CheckCircle2', requirement: 50, xp_reward: 100 },
  { type: 'tasks_100', name: 'Unaufhaltsam', description: '100 Aufgaben erledigt', icon: 'CheckCircle2', requirement: 100, xp_reward: 200 },
  { type: 'habits_created', name: 'Gewohnheitstier', description: '5 Habits erstellt', icon: 'Target', requirement: 5, xp_reward: 40 },
  { type: 'first_grade', name: 'Erster Erfolg', description: 'Erste Note eingetragen', icon: 'Star', requirement: 1, xp_reward: 15 },
  { type: 'terms_10', name: 'Wortgewandt', description: '10 Fachbegriffe gelernt', icon: 'BookOpen', requirement: 10, xp_reward: 35 },
];

const iconMap: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-6 h-6" />,
  Trophy: <Trophy className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  CheckCircle2: <CheckCircle2 className="w-6 h-6" />,
  Target: <Target className="w-6 h-6" />,
  Star: <Star className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
};

export function AchievementsCard() {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    const { data } = await supabase
      .from('achievements')
      .select('achievement_type')
      .eq('user_id', user!.id);

    if (data) {
      setUnlockedAchievements(data.map(a => a.achievement_type));
    }
  };

  const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map((def, i) => ({
    ...def,
    id: `ach_${i}`,
    unlocked: unlockedAchievements.includes(def.type),
  }));

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const recentUnlocked = achievements.filter(a => a.unlocked).slice(0, 3);

  return (
    <>
      <Card className="glass-card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-bl from-yellow-500/20 to-transparent rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-500/20">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold">Achievements</h3>
                <p className="text-xs text-muted-foreground">{unlockedCount}/{totalCount} freigeschaltet</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  Alle <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Alle Achievements ({unlockedCount}/{totalCount})
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-xl border transition-all ${
                        achievement.unlocked
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-secondary/30 border-border/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.unlocked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'
                        }`}>
                          {achievement.unlocked ? iconMap[achievement.icon] : <Lock className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${!achievement.unlocked && 'text-muted-foreground'}`}>
                            {achievement.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          <p className="text-xs text-primary mt-1">+{achievement.xp_reward} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Recent achievements */}
          <div className="space-y-2">
            {recentUnlocked.length > 0 ? (
              recentUnlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/5"
                >
                  <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-500">
                    {iconMap[achievement.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Noch keine Achievements freigeschaltet
              </p>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

// Hook to check and unlock achievements
export async function checkAndUnlockAchievements(
  userId: string,
  stats: {
    level?: number;
    xp?: number;
    streakDays?: number;
    tasksCompleted?: number;
    habitsCreated?: number;
    gradesCount?: number;
    termsCount?: number;
  }
) {
  const toCheck: { type: string; value: number }[] = [];

  if (stats.streakDays !== undefined) {
    if (stats.streakDays >= 3) toCheck.push({ type: 'streak_3', value: stats.streakDays });
    if (stats.streakDays >= 7) toCheck.push({ type: 'streak_7', value: stats.streakDays });
    if (stats.streakDays >= 30) toCheck.push({ type: 'streak_30', value: stats.streakDays });
  }

  if (stats.level !== undefined) {
    if (stats.level >= 5) toCheck.push({ type: 'level_5', value: stats.level });
    if (stats.level >= 10) toCheck.push({ type: 'level_10', value: stats.level });
    if (stats.level >= 25) toCheck.push({ type: 'level_25', value: stats.level });
  }

  if (stats.xp !== undefined) {
    if (stats.xp >= 1000) toCheck.push({ type: 'xp_1000', value: stats.xp });
    if (stats.xp >= 5000) toCheck.push({ type: 'xp_5000', value: stats.xp });
    if (stats.xp >= 10000) toCheck.push({ type: 'xp_10000', value: stats.xp });
  }

  if (stats.tasksCompleted !== undefined) {
    if (stats.tasksCompleted >= 10) toCheck.push({ type: 'tasks_10', value: stats.tasksCompleted });
    if (stats.tasksCompleted >= 50) toCheck.push({ type: 'tasks_50', value: stats.tasksCompleted });
    if (stats.tasksCompleted >= 100) toCheck.push({ type: 'tasks_100', value: stats.tasksCompleted });
  }

  if (stats.habitsCreated !== undefined && stats.habitsCreated >= 5) {
    toCheck.push({ type: 'habits_created', value: stats.habitsCreated });
  }

  if (stats.gradesCount !== undefined && stats.gradesCount >= 1) {
    toCheck.push({ type: 'first_grade', value: stats.gradesCount });
  }

  if (stats.termsCount !== undefined && stats.termsCount >= 10) {
    toCheck.push({ type: 'terms_10', value: stats.termsCount });
  }

  // Check which are already unlocked
  const { data: existing } = await supabase
    .from('achievements')
    .select('achievement_type')
    .eq('user_id', userId);

  const existingTypes = new Set(existing?.map(a => a.achievement_type) || []);
  const newAchievements = toCheck.filter(a => !existingTypes.has(a.type));

  // Unlock new achievements
  for (const achievement of newAchievements) {
    await supabase
      .from('achievements')
      .insert({
        user_id: userId,
        achievement_type: achievement.type,
      });

    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === achievement.type);
    if (def) {
      // Play achievement sound
      playAchievementSound();
    }
  }

  return newAchievements;
}

export { ACHIEVEMENT_DEFINITIONS };
