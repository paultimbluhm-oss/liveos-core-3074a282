import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface FalkoChallenge {
  id: string;
  text: string;
  type: 'habit' | 'task' | 'business' | 'finance' | 'school' | 'general';
  actionLabel?: string;
  /** If set, completing this challenge marks a habit */
  habitId?: string;
  /** If set, completing this challenge marks a task */
  taskId?: string;
}

export type FalkoMood = 'happy' | 'motivated' | 'neutral' | 'sad';

export function getMood(pct: number, streakDays: number): FalkoMood {
  if (pct >= 1) return 'happy';
  if (pct >= 0.5 || streakDays >= 3) return 'motivated';
  if (pct >= 0.15) return 'neutral';
  return 'sad';
}

function getStableRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function generateChallenges(userId: string): Promise<FalkoChallenge[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const challenges: FalkoChallenge[] = [];

  const [habitsRes, completionsRes, yesterdayCompRes, tasksRes, contactsRes] = await Promise.all([
    supabase.from('habits').select('id, name, habit_type').eq('user_id', userId).eq('is_active', true),
    supabase.from('habit_completions').select('habit_id, value, created_at').eq('user_id', userId).eq('completed_date', today),
    supabase.from('habit_completions').select('habit_id, created_at').eq('user_id', userId).eq('completed_date', yesterday),
    supabase.from('tasks').select('id, title, completed, due_date, priority').eq('user_id', userId).eq('completed', false).limit(20),
    supabase.from('contacts').select('id, name, status, created_at').eq('user_id', userId).limit(20),
  ]);

  const habits = habitsRes.data || [];
  const todayCompletions = new Set((completionsRes.data || []).map(c => c.habit_id));
  const yesterdayComps = yesterdayCompRes.data || [];
  const tasks = tasksRes.data || [];
  const contacts = contactsRes.data || [];

  // --- HABIT CHALLENGES ---
  const incompleteHabits = habits.filter(h => !todayCompletions.has(h.id));
  
  // Time-based habit challenges (beat yesterday's time)
  for (const habit of incompleteHabits) {
    const yComp = yesterdayComps.find(c => c.habit_id === habit.id);
    if (yComp?.created_at) {
      const yTime = new Date(yComp.created_at);
      const yHour = yTime.getHours();
      const yMin = yTime.getMinutes();
      const earlierHour = yHour > 0 ? yHour - 1 : yHour;
      challenges.push({
        id: `habit-beat-${habit.id}`,
        text: `Schliesse "${habit.name}" vor ${earlierHour}:${String(yMin).padStart(2, '0')} Uhr ab`,
        type: 'habit',
        habitId: habit.id,
        actionLabel: 'Erledigt',
      });
    } else {
      challenges.push({
        id: `habit-do-${habit.id}`,
        text: `Erledige "${habit.name}" in der naechsten Stunde`,
        type: 'habit',
        habitId: habit.id,
        actionLabel: 'Erledigt',
      });
    }
  }

  // --- TASK CHALLENGES ---
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today);
  const todayTasks = tasks.filter(t => t.due_date === today);
  const highPrioTasks = tasks.filter(t => t.priority === 'high');

  if (overdueTasks.length > 0) {
    const t = overdueTasks[0];
    challenges.push({
      id: `task-overdue-${t.id}`,
      text: `"${t.title}" ist ueberfaellig - erledige sie jetzt`,
      type: 'task',
      taskId: t.id,
      actionLabel: 'Erledigt',
    });
  }

  if (todayTasks.length > 0) {
    challenges.push({
      id: `task-today-count`,
      text: `Schaffe ${todayTasks.length} Aufgabe${todayTasks.length > 1 ? 'n' : ''} bis heute Abend`,
      type: 'task',
    });
  }

  if (highPrioTasks.length > 0) {
    const t = highPrioTasks[0];
    challenges.push({
      id: `task-prio-${t.id}`,
      text: `Wichtig: "${t.title}" wartet auf dich`,
      type: 'task',
      taskId: t.id,
      actionLabel: 'Erledigt',
    });
  }

  if (tasks.length > 0 && todayTasks.length === 0 && overdueTasks.length === 0) {
    const seed = getStableRandom(today + 'task');
    const t = tasks[seed % tasks.length];
    challenges.push({
      id: `task-random-${t.id}`,
      text: `Erledige "${t.title}" innerhalb der naechsten Stunde`,
      type: 'task',
      taskId: t.id,
      actionLabel: 'Erledigt',
    });
  }

  // --- BUSINESS CHALLENGES ---
  if (contacts.length > 0) {
    const seed = getStableRandom(today + 'biz');
    const c = contacts[seed % contacts.length];
    challenges.push({
      id: `biz-contact-${c.id}`,
      text: `Schreibe "${c.name}" heute eine Nachricht`,
      type: 'business',
    });
  }

  if (contacts.length > 0) {
    challenges.push({
      id: `biz-new-contact`,
      text: `Recherchiere ein neues Unternehmen und lege es an`,
      type: 'business',
    });
  }

  // --- GENERAL CHALLENGES ---
  const hour = new Date().getHours();
  if (hour < 10) {
    challenges.push({
      id: 'general-morning',
      text: 'Schliesse 3 Habits vor 10 Uhr ab',
      type: 'general',
    });
  }
  if (hour >= 14 && hour < 18) {
    challenges.push({
      id: 'general-afternoon',
      text: 'Erledige noch 2 offene Aufgaben bis zum Feierabend',
      type: 'general',
    });
  }

  return challenges;
}

/** Pick the best challenge for the current moment */
export function pickChallenge(challenges: FalkoChallenge[], today: string, doneCount: number): FalkoChallenge | null {
  if (challenges.length === 0) return null;
  
  // Prioritize: overdue tasks > habit-beat > high-prio tasks > rest
  const overdue = challenges.find(c => c.id.startsWith('task-overdue'));
  if (overdue) return overdue;
  
  const habitBeat = challenges.find(c => c.id.startsWith('habit-beat'));
  if (habitBeat) return habitBeat;

  const highPrio = challenges.find(c => c.id.startsWith('task-prio'));
  if (highPrio) return highPrio;

  // Stable random from remaining
  const seed = getStableRandom(today + doneCount);
  return challenges[seed % challenges.length];
}
