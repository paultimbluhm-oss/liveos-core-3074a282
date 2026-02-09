import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VocabSet, VocabWord, QuizMode } from './types';

interface Props {
  set: VocabSet;
  onBack: () => void;
  onStartQuiz: (mode: QuizMode) => void;
}

export function VocabSetView({ set, onBack, onStartQuiz }: Props) {
  const { user } = useAuth();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchWords = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('v2_vocab_words')
      .select('*')
      .eq('set_id', set.id)
      .eq('user_id', user.id)
      .order('created_at');
    if (data) setWords(data);
  }, [user, set.id]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const addWord = async () => {
    if (!user || !newSource.trim() || !newTarget.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('v2_vocab_words').insert({
      user_id: user.id,
      set_id: set.id,
      source_word: newSource.trim(),
      target_word: newTarget.trim(),
    });
    setAdding(false);
    if (error) { toast.error('Fehler'); return; }
    setNewSource('');
    setNewTarget('');
    fetchWords();
  };

  const deleteWord = async (id: string) => {
    await supabase.from('v2_vocab_words').delete().eq('id', id);
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const deleteSet = async () => {
    await supabase.from('v2_vocab_words').delete().eq('set_id', set.id);
    await supabase.from('v2_vocab_sets').delete().eq('id', set.id);
    toast.success('Lernset geloescht');
    onBack();
  };

  const canQuiz = words.length >= 4;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{set.name}</h3>
          <p className="text-xs text-muted-foreground">{words.length} Woerter</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={deleteSet}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Add word form */}
      <div className="flex gap-2">
        <Input
          value={newSource}
          onChange={e => setNewSource(e.target.value)}
          placeholder="Quellwort"
          className="flex-1 h-9 text-sm"
          onKeyDown={e => e.key === 'Enter' && addWord()}
        />
        <Input
          value={newTarget}
          onChange={e => setNewTarget(e.target.value)}
          placeholder="Uebersetzung"
          className="flex-1 h-9 text-sm"
          onKeyDown={e => e.key === 'Enter' && addWord()}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={addWord} disabled={adding || !newSource.trim() || !newTarget.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Word list */}
      <div className="space-y-1">
        {words.map(word => (
          <div key={word.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border group">
            <span className="flex-1 text-sm">{word.source_word}</span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="flex-1 text-sm text-right">{word.target_word}</span>
            <button 
              onClick={() => deleteWord(word.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Quiz buttons */}
      {words.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => onStartQuiz('multiple_choice')}
            disabled={!canQuiz}
          >
            <Play className="h-3.5 w-3.5" />
            Multiple Choice
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => onStartQuiz('type_in')}
          >
            <Play className="h-3.5 w-3.5" />
            Eintippen
          </Button>
        </div>
      )}
      {words.length > 0 && words.length < 4 && (
        <p className="text-xs text-muted-foreground text-center">
          Mindestens 4 Woerter fuer Multiple Choice noetig
        </p>
      )}

      {/* High Scores */}
      {(set.high_score_mc > 0 || set.high_score_type > 0) && (
        <div className="flex gap-4 justify-center pt-1">
          {set.high_score_mc > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{set.high_score_mc}%</p>
              <p className="text-xs text-muted-foreground">MC Highscore</p>
            </div>
          )}
          {set.high_score_type > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{set.high_score_type}%</p>
              <p className="text-xs text-muted-foreground">Eintippen Highscore</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
