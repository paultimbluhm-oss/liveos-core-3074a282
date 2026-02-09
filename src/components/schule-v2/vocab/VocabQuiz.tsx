import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Check, X, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { VocabSet, VocabWord, QuizMode } from './types';
import { cn } from '@/lib/utils';

interface Props {
  set: VocabSet;
  mode: QuizMode;
  onBack: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function VocabQuiz({ set, mode, onBack }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [allWords, setAllWords] = useState<VocabWord[]>([]);
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [current, setCurrent] = useState<VocabWord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [firstRoundTotal, setFirstRoundTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongQueue, setWrongQueue] = useState<VocabWord[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(1);

  // Load words
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('v2_vocab_words')
        .select('*')
        .eq('set_id', set.id)
        .eq('user_id', user.id);
      if (data && data.length > 0) {
        setAllWords(data);
        const shuffled = shuffle(data);
        setQueue(shuffled);
        setFirstRoundTotal(shuffled.length);
        setCurrent(shuffled[0]);
        if (mode === 'multiple_choice') {
          setOptions(generateOptions(shuffled[0], data));
        }
      }
    })();
  }, [user, set.id, mode]);

  function generateOptions(word: VocabWord, pool: VocabWord[]): string[] {
    const correct = word.target_word;
    const others = pool.filter(w => w.id !== word.id).map(w => w.target_word);
    const distractors = shuffle(others).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }

  const nextWord = useCallback(() => {
    setShowResult(false);
    setSelected(null);
    setTyped('');
    setIsCorrect(false);

    const remainingQueue = queue.slice(1);

    if (remainingQueue.length > 0) {
      setQueue(remainingQueue);
      setCurrent(remainingQueue[0]);
      if (mode === 'multiple_choice') {
        setOptions(generateOptions(remainingQueue[0], allWords));
      }
    } else if (wrongQueue.length > 0) {
      // Start new round with wrong answers
      setRound(prev => prev + 1);
      const newQueue = shuffle(wrongQueue);
      setQueue(newQueue);
      setWrongQueue([]);
      setCurrent(newQueue[0]);
      if (mode === 'multiple_choice') {
        setOptions(generateOptions(newQueue[0], allWords));
      }
    } else {
      // Finished
      setFinished(true);
      saveHighScore();
    }
  }, [queue, wrongQueue, mode, allWords]);

  const checkAnswer = useCallback((answer: string) => {
    if (!current || showResult) return;
    
    const correct = current.target_word.trim().toLowerCase();
    const given = answer.trim().toLowerCase();
    const right = correct === given;

    setIsCorrect(right);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    if (right) {
      setScore(prev => prev + 1);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
      setWrongQueue(prev => [...prev, current]);
    }

    // Auto-advance after delay
    setTimeout(() => nextWord(), right ? 1000 : 2000);
  }, [current, showResult, nextWord]);

  const handleMCSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    checkAnswer(option);
  };

  const handleTypeSubmit = () => {
    if (!typed.trim()) return;
    checkAnswer(typed);
  };

  const saveHighScore = async () => {
    if (!user) return;
    const pct = Math.round((score / firstRoundTotal) * 100);
    const field = mode === 'multiple_choice' ? 'high_score_mc' : 'high_score_type';
    const currentHigh = mode === 'multiple_choice' ? set.high_score_mc : set.high_score_type;
    
    if (pct > currentHigh) {
      await supabase
        .from('v2_vocab_sets')
        .update({ [field]: pct })
        .eq('id', set.id);
    }
  };

  const restart = () => {
    const shuffled = shuffle(allWords);
    setQueue(shuffled);
    setCurrent(shuffled[0]);
    setWrongQueue([]);
    setScore(0);
    setTotalAnswered(0);
    setFirstRoundTotal(shuffled.length);
    setFinished(false);
    setShowResult(false);
    setSelected(null);
    setTyped('');
    setStreak(0);
    setBestStreak(0);
    setRound(1);
    if (mode === 'multiple_choice') {
      setOptions(generateOptions(shuffled[0], allWords));
    }
  };

  useEffect(() => {
    if (mode === 'type_in' && !showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [current, showResult, mode]);

  if (allWords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Lade Woerter...</p>
      </div>
    );
  }

  const progress = firstRoundTotal > 0 ? ((totalAnswered) / firstRoundTotal) * 100 : 0;

  // Finished screen
  if (finished) {
    const pct = Math.round((score / firstRoundTotal) * 100);
    const isNewHigh = pct > (mode === 'multiple_choice' ? set.high_score_mc : set.high_score_type);

    return (
      <div className="space-y-6 text-center py-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 absolute left-4 top-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-2">
          <Trophy className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">{pct}%</h2>
          <p className="text-sm text-muted-foreground">
            {score} von {firstRoundTotal} beim ersten Versuch richtig
          </p>
          {isNewHigh && (
            <p className="text-sm font-medium text-primary">Neuer Highscore!</p>
          )}
        </div>

        <div className="flex gap-4 justify-center text-center">
          <div>
            <p className="text-lg font-bold">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">Beste Serie</p>
          </div>
          <div>
            <p className="text-lg font-bold">{round}</p>
            <p className="text-xs text-muted-foreground">{round === 1 ? 'Runde' : 'Runden'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={restart}>
            <RotateCcw className="h-3.5 w-3.5" /> Nochmal
          </Button>
          <Button className="flex-1" onClick={onBack}>Zurueck</Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{score}</span>
          <span className="text-muted-foreground">/ {firstRoundTotal}</span>
        </div>
      </div>

      {/* Streak indicator */}
      {streak >= 3 && (
        <div className="text-center">
          <span className="text-xs font-medium text-primary">{streak}x Serie</span>
        </div>
      )}

      {/* Round indicator */}
      {round > 1 && (
        <p className="text-xs text-center text-muted-foreground">
          Runde {round} - Wiederholung ({queue.length} uebrig)
        </p>
      )}

      {/* Question */}
      <div className="text-center py-6">
        <p className="text-xs text-muted-foreground mb-1">Uebersetze:</p>
        <p className="text-2xl font-bold">{current.source_word}</p>
      </div>

      {/* Answer area */}
      {mode === 'multiple_choice' ? (
        <div className="space-y-2">
          {options.map((option, i) => {
            let variant: 'outline' | 'default' | 'destructive' = 'outline';
            let extraClass = '';
            
            if (showResult) {
              if (option === current.target_word) {
                extraClass = 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
              } else if (option === selected && !isCorrect) {
                extraClass = 'border-destructive bg-destructive/10 text-destructive';
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleMCSelect(option)}
                disabled={showResult}
                className={cn(
                  'w-full p-3 rounded-lg border text-sm text-left transition-colors',
                  showResult ? '' : 'hover:border-primary/50 hover:bg-accent',
                  extraClass || 'border-border'
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            ref={inputRef}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Uebersetzung eingeben..."
            disabled={showResult}
            onKeyDown={e => e.key === 'Enter' && handleTypeSubmit()}
            className={cn(
              'text-center text-lg h-12',
              showResult && isCorrect && 'border-green-500 bg-green-500/10',
              showResult && !isCorrect && 'border-destructive bg-destructive/10'
            )}
          />
          {!showResult && (
            <Button onClick={handleTypeSubmit} disabled={!typed.trim()} className="w-full">
              Pruefen
            </Button>
          )}
          {showResult && !isCorrect && (
            <p className="text-sm text-center">
              Richtig: <span className="font-medium text-primary">{current.target_word}</span>
            </p>
          )}
        </div>
      )}

      {/* Result feedback */}
      {showResult && (
        <div className={cn(
          'flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium',
          isCorrect ? 'text-green-600 dark:text-green-400' : 'text-destructive'
        )}>
          {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {isCorrect ? 'Richtig!' : 'Falsch'}
        </div>
      )}
    </div>
  );
}
