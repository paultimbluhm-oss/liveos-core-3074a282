import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, BookOpen, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Term {
  id: string;
  term: string;
  simple_term: string | null;
  explanation: string | null;
  created_at: string;
}

interface TermsSectionProps {
  onBack: () => void;
}

export function TermsSection({ onBack }: TermsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  
  // Form state
  const [term, setTerm] = useState('');
  const [simpleTerm, setSimpleTerm] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTerms = async () => {
    if (!user) return;
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('technical_terms')
      .select('*')
      .eq('user_id', user.id)
      .order('term', { ascending: true });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setTerms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTerms();
  }, [user]);

  const resetForm = () => {
    setTerm('');
    setSimpleTerm('');
    setExplanation('');
    setEditingTerm(null);
  };

  const openEditDialog = (t: Term) => {
    setTerm(t.term);
    setSimpleTerm(t.simple_term || '');
    setExplanation(t.explanation || '');
    setEditingTerm(t);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!user || !term.trim()) return;
    setSaving(true);
    const supabase = getSupabase();

    if (editingTerm) {
      const { error } = await supabase
        .from('technical_terms')
        .update({
          term: term.trim(),
          simple_term: simpleTerm.trim() || null,
          explanation: explanation.trim() || null,
        })
        .eq('id', editingTerm.id);

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Begriff aktualisiert' });
        setShowAddDialog(false);
        resetForm();
        fetchTerms();
      }
    } else {
      const { error } = await supabase
        .from('technical_terms')
        .insert({
          user_id: user.id,
          term: term.trim(),
          simple_term: simpleTerm.trim() || null,
          explanation: explanation.trim() || null,
        });

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Begriff hinzugefügt' });
        setShowAddDialog(false);
        resetForm();
        fetchTerms();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('technical_terms')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Begriff gelöscht' });
      fetchTerms();
    }
  };

  const filteredTerms = terms.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      t.term.toLowerCase().includes(query) ||
      (t.simple_term && t.simple_term.toLowerCase().includes(query)) ||
      (t.explanation && t.explanation.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-3 rounded-xl bg-purple-500/20">
            <BookOpen className="w-6 h-6 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold">Fachbegriffe</h2>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Neuer Begriff
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Begriff oder Erklärung suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Terms List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : filteredTerms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{searchQuery ? 'Keine Begriffe gefunden' : 'Noch keine Fachbegriffe angelegt'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTerms.map((t) => (
            <div key={t.id} className="glass-card p-4 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary">{t.term}</span>
                    {t.simple_term && (
                      <>
                        <span className="text-muted-foreground">statt</span>
                        <span className="text-muted-foreground italic">"{t.simple_term}"</span>
                      </>
                    )}
                  </div>
                  {t.explanation && (
                    <p className="text-sm text-muted-foreground mt-2">{t.explanation}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Begriff bearbeiten' : 'Neuer Fachbegriff'}</DialogTitle>
            <DialogDescription>
              Füge professionelle Begriffe hinzu, um deine Sprache zu verbessern.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fachbegriff / Professioneller Ausdruck</Label>
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="z.B. darüber hinaus"
              />
            </div>
            <div className="space-y-2">
              <Label>Alltagsbegriff (optional)</Label>
              <Input
                value={simpleTerm}
                onChange={(e) => setSimpleTerm(e.target.value)}
                placeholder="z.B. außerdem"
              />
              <p className="text-xs text-muted-foreground">Das Wort, das du normalerweise verwendest</p>
            </div>
            <div className="space-y-2">
              <Label>Erklärung / Beispiel (optional)</Label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="z.B. Wird in formellen Texten verwendet..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving || !term.trim()}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
