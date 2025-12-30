import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookHeart, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { JournalEntryForm } from './JournalEntryForm';
import { JournalSuggestions } from './JournalSuggestions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface JournalEntry {
  id: string;
  entry_date: string;
  mood_rating: number | null;
  energy_level: number | null;
  stress_level: number | null;
  flow_experiences: number | null;
  social_interactions: number | null;
  connection_quality: number | null;
  purpose_feeling: number | null;
  helped_others: boolean | null;
  accomplishment_feeling: number | null;
  progress_made: number | null;
  autonomy_feeling: number | null;
  exercise_minutes: number | null;
  quality_time_minutes: number | null;
  gratitude_1: string | null;
  gratitude_2: string | null;
  gratitude_3: string | null;
  best_moment: string | null;
  notes: string | null;
}

interface JournalSectionProps {
  onBack: () => void;
}

export function JournalSection({ onBack }: JournalSectionProps) {
  const { user } = useAuth();
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    
    setLoading(false);
    
    // Fetch today's entry
    const { data: todayData } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .single();
    
    if (todayData) {
      setTodayEntry(todayData as JournalEntry);
      setIsFormOpen(false);
    }
    
    // Fetch last 7 days for suggestions
    const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const { data: recentData } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', weekAgo)
      .order('entry_date', { ascending: false });
    
    if (recentData) {
      setRecentEntries(recentData as JournalEntry[]);
    }
  };

  const handleSave = async (entry: Partial<JournalEntry>) => {
    if (!user) return;
    
    const entryData = {
      ...entry,
      user_id: user.id,
      entry_date: today
    };
    
    if (todayEntry) {
      const { error } = await supabase
        .from('journal_entries')
        .update(entryData)
        .eq('id', todayEntry.id);
      
      if (error) {
        toast.error('Fehler beim Speichern');
        return;
      }
    } else {
      const { error } = await supabase
        .from('journal_entries')
        .insert(entryData);
      
      if (error) {
        toast.error('Fehler beim Speichern');
        return;
      }
    }
    
    toast.success('Journal gespeichert');
    fetchEntries();
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Header - compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border-2 border-cyan-500 text-cyan-500">
              <BookHeart className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <h1 className="text-lg font-bold">Journal</h1>
          </div>
        </div>
        {todayEntry && !isFormOpen && (
          <Button 
            variant="outline" 
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsFormOpen(true)}
          >
            Bearbeiten
          </Button>
        )}
      </div>

      {/* Suggestions Card */}
      <JournalSuggestions entries={recentEntries} todayEntry={todayEntry} />

      {/* Today's Entry Form */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card className="border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-cyan-500" />
                  Heutiger Eintrag
                  <span className="text-xs text-muted-foreground font-normal">
                    {format(new Date(), 'EEE, d. MMM', { locale: de })}
                  </span>
                </CardTitle>
                {isFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-3 pb-3">
              <JournalEntryForm 
                initialData={todayEntry || undefined} 
                onSave={handleSave}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* History */}
      {recentEntries.length > 1 && (
        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <Card className="border-border/50">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Letzte Einträge</CardTitle>
                  {isHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                {recentEntries.filter(e => e.entry_date !== today).map(entry => (
                  <div key={entry.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="text-sm font-medium">
                      {format(new Date(entry.entry_date), 'EEEE, d. MMMM', { locale: de })}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {entry.mood_rating && <span>Stimmung: {entry.mood_rating}/5</span>}
                      {entry.energy_level && <span>Energie: {entry.energy_level}/5</span>}
                      {entry.flow_experiences !== null && entry.flow_experiences > 0 && <span>Flow: {entry.flow_experiences}x</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
