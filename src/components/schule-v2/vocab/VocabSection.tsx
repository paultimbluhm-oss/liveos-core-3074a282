import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, BookOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { VocabLanguage, VocabSet } from './types';
import { AddLanguageDialog } from './AddLanguageDialog';
import { AddSetDialog } from './AddSetDialog';
import { VocabSetView } from './VocabSetView';
import { VocabQuiz } from './VocabQuiz';

export function VocabSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState<VocabLanguage[]>([]);
  const [sets, setSets] = useState<Record<string, VocabSet[]>>({});
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [addLangOpen, setAddLangOpen] = useState(false);
  const [addSetLangId, setAddSetLangId] = useState<string | null>(null);
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);
  const [quizSet, setQuizSet] = useState<{ set: VocabSet; mode: 'multiple_choice' | 'type_in' } | null>(null);
  const [expandedLangs, setExpandedLangs] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    const { data: langs } = await supabase
      .from('v2_vocab_languages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');

    if (langs) {
      setLanguages(langs);
      const expanded: Record<string, boolean> = {};
      langs.forEach(l => { expanded[l.id] = expandedLangs[l.id] ?? true; });
      setExpandedLangs(prev => ({ ...expanded, ...prev }));

      const { data: allSets } = await supabase
        .from('v2_vocab_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allSets) {
        const grouped: Record<string, VocabSet[]> = {};
        langs.forEach(l => { grouped[l.id] = []; });
        allSets.forEach(s => {
          if (grouped[s.language_id]) grouped[s.language_id].push(s);
        });
        setSets(grouped);

        // Fetch word counts
        const setIds = allSets.map(s => s.id);
        if (setIds.length > 0) {
          const { data: words } = await supabase
            .from('v2_vocab_words')
            .select('id, set_id')
            .eq('user_id', user.id);
          
          if (words) {
            const counts: Record<string, number> = {};
            words.forEach(w => { counts[w.set_id] = (counts[w.set_id] || 0) + 1; });
            setWordCounts(counts);
          }
        }
      }
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleLang = (id: string) => {
    setExpandedLangs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // If viewing a quiz
  if (quizSet) {
    return (
      <VocabQuiz
        set={quizSet.set}
        mode={quizSet.mode}
        onBack={() => { setQuizSet(null); fetchData(); }}
      />
    );
  }

  // If viewing a set's words
  if (activeSet) {
    return (
      <VocabSetView
        set={activeSet}
        onBack={() => { setActiveSet(null); fetchData(); }}
        onStartQuiz={(mode) => setQuizSet({ set: activeSet, mode })}
      />
    );
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-semibold text-foreground py-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <BookOpen className="h-4 w-4" />
              Vokabeln
              {languages.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({Object.values(sets).flat().length})
                </span>
              )}
            </button>
          </CollapsibleTrigger>
          {open && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddLangOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <CollapsibleContent className="space-y-3">
          {languages.length === 0 ? (
            <button
              onClick={() => setAddLangOpen(true)}
              className="w-full py-6 border border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              Sprachpaar hinzufuegen
            </button>
          ) : (
            languages.map(lang => (
              <div key={lang.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleLang(lang.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {expandedLangs[lang.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {lang.source_lang} → {lang.target_lang}
                  </button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddSetLangId(lang.id)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {expandedLangs[lang.id] && (
                  <div className="space-y-1.5 pl-4">
                    {(sets[lang.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Noch keine Lernsets</p>
                    ) : (
                      (sets[lang.id] || []).map(set => (
                        <button
                          key={set.id}
                          onClick={() => setActiveSet(set)}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium">{set.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {wordCounts[set.id] || 0} Woerter
                              {set.set_date && ` · ${new Date(set.set_date).toLocaleDateString('de-DE')}`}
                            </p>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {set.high_score_mc > 0 && <span>MC: {set.high_score_mc}%</span>}
                            {set.high_score_type > 0 && <span>TI: {set.high_score_type}%</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <AddLanguageDialog open={addLangOpen} onOpenChange={setAddLangOpen} onCreated={fetchData} />
      <AddSetDialog open={!!addSetLangId} onOpenChange={(v) => !v && setAddSetLangId(null)} languageId={addSetLangId} onCreated={fetchData} />
    </>
  );
}
