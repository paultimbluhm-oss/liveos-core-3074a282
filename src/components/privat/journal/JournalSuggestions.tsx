import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Heart, Users, Target, Compass, Sparkles, Dumbbell, Brain } from 'lucide-react';

interface JournalEntry {
  mood_rating?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  flow_experiences?: number | null;
  social_interactions?: number | null;
  connection_quality?: number | null;
  purpose_feeling?: number | null;
  helped_others?: boolean | null;
  progress_made?: number | null;
  autonomy_feeling?: number | null;
  exercise_minutes?: number | null;
  gratitude_1?: string | null;
}

interface JournalSuggestionsProps {
  entries: JournalEntry[];
  todayEntry: JournalEntry | null;
}

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

function generateSuggestions(entries: JournalEntry[], today: JournalEntry | null): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  const validEntries = entries.filter(e => e.mood_rating || e.energy_level);
  if (validEntries.length === 0 && !today) {
    return [{
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      title: 'Beginne dein Journal',
      description: 'Fülle deinen ersten Eintrag aus, um personalisierte Vorschläge basierend auf der Glücksforschung zu erhalten.',
      priority: 'high'
    }];
  }

  // Calculate averages
  const avg = (field: keyof JournalEntry) => {
    const vals = validEntries.filter(e => typeof e[field] === 'number').map(e => e[field] as number);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const avgMood = avg('mood_rating');
  const avgEnergy = avg('energy_level');
  const avgStress = avg('stress_level');
  const avgFlow = avg('flow_experiences');
  const avgSocial = avg('social_interactions');
  const avgConnection = avg('connection_quality');
  const avgPurpose = avg('purpose_feeling');
  const avgProgress = avg('progress_made');
  const avgAutonomy = avg('autonomy_feeling');
  const avgExercise = avg('exercise_minutes');
  const entriesWithGratitude = entries.filter(e => e.gratitude_1);
  const entriesWithHelping = entries.filter(e => e.helped_others === true);

  // PERMA-based suggestions

  // Positive Emotions (P) - Stress management
  if (avgStress > 3) {
    suggestions.push({
      icon: <Brain className="h-4 w-4 text-rose-500" />,
      title: 'Stressreduktion priorisieren',
      description: 'Dein Stresslevel ist erhöht. Studien zeigen: 10 Min. Atemübungen oder Meditation senken Cortisol signifikant.',
      priority: avgStress > 4 ? 'high' : 'medium'
    });
  }

  // Engagement (E) - Flow experiences
  if (avgFlow < 1) {
    suggestions.push({
      icon: <Target className="h-4 w-4 text-cyan-500" />,
      title: 'Flow-Momente schaffen',
      description: 'Plane Aktivitäten, die dich herausfordern aber nicht überfordern. Flow erhöht nachweislich das Wohlbefinden.',
      priority: 'medium'
    });
  }

  // Relationships (R) - Social connections
  if (avgSocial < 2) {
    suggestions.push({
      icon: <Users className="h-4 w-4 text-emerald-500" />,
      title: 'Soziale Verbindungen stärken',
      description: 'Harvard-Studie (75+ Jahre): Qualität der Beziehungen ist der wichtigste Faktor für Lebenszufriedenheit.',
      priority: avgSocial < 1 ? 'high' : 'medium'
    });
  }

  if (avgConnection > 0 && avgConnection < 3) {
    suggestions.push({
      icon: <Users className="h-4 w-4 text-emerald-500" />,
      title: 'Tiefere Gespräche führen',
      description: 'Oberflächliche Gespräche vs. tiefe: Letztere korrelieren 3x stärker mit Glück. Stelle bedeutungsvolle Fragen.',
      priority: 'medium'
    });
  }

  // Meaning (M) - Purpose and helping others
  if (avgPurpose > 0 && avgPurpose < 3) {
    suggestions.push({
      icon: <Compass className="h-4 w-4 text-amber-500" />,
      title: 'Sinn im Alltag finden',
      description: 'Verbinde tägliche Aufgaben mit grösseren Werten. Frag dich: Wem hilft das? Warum ist es wichtig?',
      priority: 'medium'
    });
  }

  if (entriesWithHelping.length < entries.length / 2 && entries.length > 2) {
    suggestions.push({
      icon: <Heart className="h-4 w-4 text-rose-500" />,
      title: 'Anderen helfen',
      description: 'Altruismus aktiviert das Belohnungszentrum stärker als eigener Gewinn. Kleine Hilfen zählen.',
      priority: 'low'
    });
  }

  // Accomplishment (A) - Progress and autonomy
  if (avgProgress > 0 && avgProgress < 3) {
    suggestions.push({
      icon: <Target className="h-4 w-4 text-green-500" />,
      title: 'Kleine Fortschritte feiern',
      description: 'Der "Progress Principle": Selbst minimaler Fortschritt bei bedeutsamen Zielen steigert die Motivation.',
      priority: 'medium'
    });
  }

  if (avgAutonomy > 0 && avgAutonomy < 3) {
    suggestions.push({
      icon: <Compass className="h-4 w-4 text-sky-500" />,
      title: 'Mehr Selbstbestimmung',
      description: 'Self-Determination Theory: Autonomie ist ein Grundbedürfnis. Wo kannst du mehr Wahlfreiheit schaffen?',
      priority: 'medium'
    });
  }

  // Exercise - kept as requested
  if (avgExercise < 20) {
    suggestions.push({
      icon: <Dumbbell className="h-4 w-4 text-green-500" />,
      title: 'Bewegung für die Psyche',
      description: '20 Min. moderate Bewegung wirkt antidepressiv und steigert Endorphine. Spaziergang zählt.',
      priority: avgExercise < 10 ? 'high' : 'medium'
    });
  }

  // Gratitude practice
  if (entriesWithGratitude.length < entries.length / 2) {
    suggestions.push({
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      title: 'Dankbarkeit praktizieren',
      description: 'Emmons-Studie: 3 Dinge täglich aufschreiben steigert Wohlbefinden um 25% nach 10 Wochen.',
      priority: 'low'
    });
  }

  // Positive reinforcement
  if (avgMood >= 4 && avgEnergy >= 4 && avgStress <= 2) {
    suggestions.unshift({
      icon: <Heart className="h-4 w-4 text-green-500" />,
      title: 'Weiter so!',
      description: 'Deine Werte sind sehr gut. Behalte deine aktuellen Gewohnheiten bei.',
      priority: 'low'
    });
  }

  // Low mood with good social connections - suggest other areas
  if (avgMood < 3 && avgSocial >= 3 && avgConnection >= 3) {
    suggestions.push({
      icon: <Target className="h-4 w-4 text-cyan-500" />,
      title: 'Fokus auf Fortschritt',
      description: 'Soziale Verbindungen sind gut. Versuche mehr Flow-Aktivitäten oder setze dir erreichbare Tagesziele.',
      priority: 'high'
    });
  }

  return suggestions.slice(0, 4);
}

export function JournalSuggestions({ entries, todayEntry }: JournalSuggestionsProps) {
  const suggestions = generateSuggestions(entries, todayEntry);

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Vorschläge
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2 px-3 space-y-1.5">
        {suggestions.map((suggestion, i) => (
          <div 
            key={i} 
            className={`p-2 rounded-lg border flex gap-2 ${
              suggestion.priority === 'high' 
                ? 'bg-rose-500/10 border-rose-500/20' 
                : suggestion.priority === 'medium'
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-muted/50 border-border/50'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">{suggestion.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{suggestion.title}</div>
              <div className="text-xs text-muted-foreground leading-snug">{suggestion.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
