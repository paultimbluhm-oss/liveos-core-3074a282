import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, Gift, User, ChevronDown, Trash2, ExternalLink, Check, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GiftRecipient {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

interface GiftIdea {
  id: string;
  recipient_id: string;
  title: string;
  description: string | null;
  price: number | null;
  url: string | null;
  purchased: boolean;
  purchased_date: string | null;
  account_id: string | null;
  created_at: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface GiftsSectionProps {
  onBack: () => void;
}

export function GiftsSection({ onBack }: GiftsSectionProps) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<GiftRecipient[]>([]);
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedRecipients, setExpandedRecipients] = useState<Set<string>>(new Set());
  
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [selectedRecipientForIdea, setSelectedRecipientForIdea] = useState<string | null>(null);
  
  const [recipientName, setRecipientName] = useState('');
  const [recipientNotes, setRecipientNotes] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaPrice, setIdeaPrice] = useState('');
  const [ideaUrl, setIdeaUrl] = useState('');

  useEffect(() => {
    if (user) {
      fetchRecipients();
      fetchIdeas();
    }
  }, [user]);

  const fetchRecipients = async () => {
    const { data } = await supabase
      .from('gift_recipients')
      .select('*')
      .eq('user_id', user!.id)
      .order('name');
    if (data) setRecipients(data);
  };

  const fetchIdeas = async () => {
    const { data } = await supabase
      .from('gift_ideas')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setIdeas(data);
  };

  const fetchAccounts = async () => {
    // accounts table removed - no-op
  };

  const toggleRecipient = (id: string) => {
    const newSet = new Set(expandedRecipients);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRecipients(newSet);
  };

  const addRecipient = async () => {
    if (!recipientName.trim()) return;
    const { error } = await supabase.from('gift_recipients').insert({
      user_id: user!.id,
      name: recipientName.trim(),
      notes: recipientNotes.trim() || null,
    });
    if (!error) {
      toast.success('Person hinzugefügt');
      setRecipientName('');
      setRecipientNotes('');
      setAddRecipientOpen(false);
      fetchRecipients();
    }
  };

  const deleteRecipient = async (id: string) => {
    const { error } = await supabase.from('gift_recipients').delete().eq('id', id);
    if (!error) {
      toast.success('Person gelöscht');
      fetchRecipients();
      fetchIdeas();
    }
  };

  const addIdea = async () => {
    if (!ideaTitle.trim() || !selectedRecipientForIdea) return;
    const { error } = await supabase.from('gift_ideas').insert({
      user_id: user!.id,
      recipient_id: selectedRecipientForIdea,
      title: ideaTitle.trim(),
      description: ideaDescription.trim() || null,
      price: ideaPrice ? parseFloat(ideaPrice) : null,
      url: ideaUrl.trim() || null,
    });
    if (!error) {
      toast.success('Geschenkidee hinzugefügt');
      resetIdeaForm();
      setAddIdeaOpen(false);
      fetchIdeas();
    }
  };

  const deleteIdea = async (id: string) => {
    const { error } = await supabase.from('gift_ideas').delete().eq('id', id);
    if (!error) {
      toast.success('Idee gelöscht');
      fetchIdeas();
    }
  };

  const togglePurchased = async (idea: GiftIdea, accountId?: string) => {
    if (!idea.purchased && !accountId && accounts.length > 0) return false;

    const updates: any = {
      purchased: !idea.purchased,
      purchased_date: !idea.purchased ? format(new Date(), 'yyyy-MM-dd') : null,
    };

    if (accountId && !idea.purchased && idea.price) {
      updates.account_id = accountId;
    }

    const { error } = await supabase.from('gift_ideas').update(updates).eq('id', idea.id);
    if (!error) {
      toast.success(idea.purchased ? 'Als nicht gekauft markiert' : 'Als gekauft markiert');
      fetchIdeas();
      fetchAccounts();
    }
    return true;
  };

  const resetIdeaForm = () => {
    setIdeaTitle('');
    setIdeaDescription('');
    setIdeaPrice('');
    setIdeaUrl('');
    setSelectedRecipientForIdea(null);
  };

  const getIdeasForRecipient = (recipientId: string) => ideas.filter(i => i.recipient_id === recipientId);

  const openIdeas = ideas.filter(i => !i.purchased).length;
  const totalBudget = ideas.filter(i => !i.purchased && i.price).reduce((sum, i) => sum + (i.price || 0), 0);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shrink-0">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold truncate">Geschenke</h2>
            {openIdeas > 0 && (
              <Badge variant="secondary" className="text-xs">{openIdeas} offen</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="hidden sm:flex gap-1 h-8 px-2 text-xs">
                <User className="w-3.5 h-3.5" />
                Person
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Person hinzufügen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="z.B. Mama" />
                </div>
                <div className="space-y-2">
                  <Label>Notizen (optional)</Label>
                  <Input value={recipientNotes} onChange={(e) => setRecipientNotes(e.target.value)} placeholder="z.B. Interessen" />
                </div>
                <Button onClick={addRecipient} className="w-full">Hinzufügen</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={addIdeaOpen} onOpenChange={(open) => { setAddIdeaOpen(open); if (!open) resetIdeaForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hidden sm:flex gap-1 h-8 px-2 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Idee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Geschenkidee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Für wen?</Label>
                  <Select value={selectedRecipientForIdea || ''} onValueChange={setSelectedRecipientForIdea}>
                    <SelectTrigger><SelectValue placeholder="Person wählen" /></SelectTrigger>
                    <SelectContent>
                      {recipients.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Geschenk</Label>
                  <Input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="z.B. Buch" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preis (€)</Label>
                    <Input type="number" step="0.01" value={ideaPrice} onChange={(e) => setIdeaPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input value={ideaUrl} onChange={(e) => setIdeaUrl(e.target.value)} placeholder="https://" />
                  </div>
                </div>
                <Button onClick={addIdea} className="w-full" disabled={!selectedRecipientForIdea || !ideaTitle.trim()}>Hinzufügen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Compact Stats */}
      {ideas.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{openIdeas} offene Ideen</span>
          {totalBudget > 0 && (
            <span>Budget: <span className="text-amber-500 font-medium">{totalBudget.toLocaleString('de-DE')}€</span></span>
          )}
        </div>
      )}

      {/* Recipients List */}
      {recipients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Keine Personen</p>
          <Button variant="link" className="text-xs mt-1" onClick={() => setAddRecipientOpen(true)}>
            Erste Person hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {recipients.map(recipient => {
            const recipientIdeas = getIdeasForRecipient(recipient.id);
            const openCount = recipientIdeas.filter(i => !i.purchased).length;
            const isExpanded = expandedRecipients.has(recipient.id);
            
            return (
              <Collapsible key={recipient.id} open={isExpanded} onOpenChange={() => toggleRecipient(recipient.id)}>
                <div className="rounded-lg bg-card/80 border border-border/50 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-pink-500/20 shrink-0">
                          <User className="w-4 h-4 text-pink-500" />
                        </div>
                        <span className="font-medium text-sm truncate">{recipient.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {openCount > 0 && (
                          <Badge variant="secondary" className="text-xs">{openCount}</Badge>
                        )}
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                      {recipientIdeas.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Keine Ideen</p>
                      ) : (
                        recipientIdeas.map(idea => (
                          <GiftIdeaCard 
                            key={idea.id} 
                            idea={idea} 
                            accounts={accounts}
                            onTogglePurchased={togglePurchased}
                            onDelete={deleteIdea}
                          />
                        ))
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs h-8"
                        onClick={() => { setSelectedRecipientForIdea(recipient.id); setAddIdeaOpen(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Idee hinzufügen
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <Button 
        className="fixed bottom-20 right-4 sm:hidden h-12 w-12 rounded-full shadow-lg z-40"
        onClick={() => setAddIdeaOpen(true)}
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}

function GiftIdeaCard({ 
  idea, 
  accounts,
  onTogglePurchased, 
  onDelete 
}: { 
  idea: GiftIdea; 
  accounts: Account[];
  onTogglePurchased: (idea: GiftIdea, accountId?: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [showAccountSelect, setShowAccountSelect] = useState(false);

  const handleToggle = async (accountId?: string) => {
    const success = await onTogglePurchased(idea, accountId);
    if (success) setShowAccountSelect(false);
  };

  return (
    <div className={cn(
      "relative flex items-center gap-3 p-2.5 rounded-lg border transition-all",
      idea.purchased 
        ? "bg-muted/30 border-border/30 opacity-60" 
        : "bg-background/50 border-border/50"
    )}>
      {/* Status indicator */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
        idea.purchased ? "bg-emerald-500" : "bg-pink-500"
      )} />

      {/* Checkbox */}
      <button
        className={cn(
          "ml-2 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          idea.purchased ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-pink-500"
        )}
        onClick={() => {
          if (!idea.purchased && accounts.length > 0 && idea.price) {
            setShowAccountSelect(true);
          } else {
            handleToggle();
          }
        }}
      >
        {idea.purchased && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", idea.purchased && "line-through")}>{idea.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {idea.price && <span>{idea.price.toLocaleString('de-DE')}€</span>}
          {idea.url && (
            <a href={idea.url} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              Link <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* Delete */}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onDelete(idea.id)}>
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
      </Button>

      {/* Account Selection Dialog */}
      {showAccountSelect && (
        <Dialog open={showAccountSelect} onOpenChange={setShowAccountSelect}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">Konto wählen</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {accounts.map(account => (
                <Button
                  key={account.id}
                  variant="outline"
                  className="w-full justify-between text-sm h-10"
                  onClick={() => handleToggle(account.id)}
                >
                  <span>{account.name}</span>
                  <span className="text-muted-foreground">{account.balance.toLocaleString('de-DE')}€</span>
                </Button>
              ))}
              <Button variant="ghost" className="w-full text-xs" onClick={() => handleToggle()}>
                Ohne Konto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
