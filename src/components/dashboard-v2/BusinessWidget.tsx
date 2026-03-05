import { useState, useEffect, useCallback, useMemo } from 'react';
import { Briefcase, Plus, Flame, Clock, Users, Building2, ChevronRight, StickyNote, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, subDays } from 'date-fns';
import type { WidgetSize } from '@/hooks/useDashboardV2';
import { Company, CompanyStatus, STATUS_CONFIG } from '@/components/business-v2/types';
import { BusinessV2Provider } from '@/components/business-v2/context/BusinessV2Context';
import { AddCompanyDialog } from '@/components/business-v2/companies/AddCompanyDialog';

interface CompanyContact {
  id: string;
  company_id: string;
  created_at: string;
}

const STATUS_COLORS: Record<CompanyStatus, string> = {
  researched: 'bg-muted-foreground/40',
  contacted: 'bg-blue-500',
  in_contact: 'bg-violet-500',
  completed: 'bg-emerald-500',
};

const STATUS_STROKES: Record<CompanyStatus, string> = {
  researched: 'stroke-muted-foreground/40',
  contacted: 'stroke-blue-500',
  in_contact: 'stroke-violet-500',
  completed: 'stroke-emerald-500',
};

export function BusinessWidget({ size, onOpenSheet }: { size: WidgetSize; onOpenSheet?: () => void }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [openTodos, setOpenTodos] = useState(0);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  // Quick-action states
  const [statusCompanyId, setStatusCompanyId] = useState('');
  const [newStatus, setNewStatus] = useState<CompanyStatus | ''>('');
  const [noteCompanyId, setNoteCompanyId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showStatusAction, setShowStatusAction] = useState(false);
  const [showNoteAction, setShowNoteAction] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [compRes, contRes] = await Promise.all([
      supabase.from('v2_companies').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('v2_company_contacts').select('id, company_id, created_at').eq('user_id', user.id),
    ]);
    const todosRes = await (supabase.from('v2_company_todos').select('id').eq('user_id', user.id) as any).eq('done', false);
    setCompanies((compRes.data || []) as Company[]);
    setContacts((contRes.data || []) as CompanyContact[]);
    setOpenTodos((todosRes.data || []).length);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('bw-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_companies' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_company_contacts' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadData]);

  // Pipeline counts
  const pipeline = useMemo(() => {
    const counts: Record<CompanyStatus, number> = { researched: 0, contacted: 0, in_contact: 0, completed: 0 };
    companies.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });
    return counts;
  }, [companies]);

  const total = companies.length;

  // Weekly score
  const weeklyScore = useMemo(() => {
    const weekAgo = subDays(new Date(), 7).toISOString();
    const newCompanies = companies.filter(c => c.created_at >= weekAgo).length;
    const newContacts = contacts.filter(c => c.created_at >= weekAgo).length;
    return { newCompanies, newContacts };
  }, [companies, contacts]);

  // Networking streak
  const streak = useMemo(() => {
    let days = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      const hasActivity = companies.some(c => format(new Date(c.created_at), 'yyyy-MM-dd') === d || format(new Date(c.updated_at), 'yyyy-MM-dd') === d)
        || contacts.some(c => format(new Date(c.created_at), 'yyyy-MM-dd') === d);
      if (hasActivity) days++;
      else if (i > 0) break; // allow today to be empty
      else break;
    }
    return days;
  }, [companies, contacts]);

  // Follow-ups: non-completed companies sorted by oldest update
  const followUps = useMemo(() => {
    return companies
      .filter(c => c.status !== 'completed')
      .map(c => ({ ...c, daysSince: differenceInDays(new Date(), new Date(c.updated_at)) }))
      .filter(c => c.daysSince >= 7)
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [companies]);

  const handleStatusChange = async () => {
    if (!statusCompanyId || !newStatus) return;
    await supabase.from('v2_companies').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', statusCompanyId);
    setShowStatusAction(false);
    setStatusCompanyId('');
    setNewStatus('');
    toast.success('Status aktualisiert');
    loadData();
  };

  const handleNoteAdd = async () => {
    if (!noteCompanyId || !noteText.trim()) return;
    const company = companies.find(c => c.id === noteCompanyId);
    const existingNotes = company?.notes || '';
    const separator = existingNotes ? '\n' : '';
    const newNotes = `${existingNotes}${separator}[${format(new Date(), 'dd.MM')}] ${noteText.trim()}`;
    await supabase.from('v2_companies').update({ notes: newNotes, updated_at: new Date().toISOString() }).eq('id', noteCompanyId);
    setShowNoteAction(false);
    setNoteCompanyId('');
    setNoteText('');
    toast.success('Notiz hinzugefuegt');
    loadData();
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-center min-h-[80px]">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // === SMALL ===
  if (size === 'small') {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Business</button>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-lg font-bold">{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-lg font-bold">{contacts.length}</span>
          </div>
        </div>
        {/* Pipeline dots */}
        <div className="flex gap-2">
          {(Object.entries(pipeline) as [CompanyStatus, number][]).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
              <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === MEDIUM / LARGE ===
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Business</button>
          {streak > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/40">
              <Flame className="w-3 h-3 text-orange-500" strokeWidth={1.5} />
              <span className="text-[10px] font-mono font-bold text-orange-500">{streak}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Building2 className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono font-medium">{contacts.length}</span>
          </div>
          <div className="flex items-center gap-1">
            {size === 'large' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowNoteAction(!showNoteAction); setShowStatusAction(false); }}>
                  <StickyNote className="w-4 h-4" strokeWidth={1.5} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowStatusAction(!showStatusAction); setShowNoteAction(false); }}>
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddCompanyOpen(true)}>
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline donut */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            {total === 0 ? (
              <circle cx="36" cy="36" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            ) : (() => {
              const entries = (Object.entries(pipeline) as [CompanyStatus, number][]).filter(([, c]) => c > 0);
              let offset = 0;
              const circumference = 2 * Math.PI * 28;
              return entries.map(([status, count]) => {
                const pct = count / total;
                const dash = pct * circumference;
                const gap = circumference - dash;
                const currentOffset = offset;
                offset += pct * 360;
                return (
                  <circle
                    key={status}
                    cx="36" cy="36" r="28"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={STATUS_STROKES[status]}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-currentOffset / 360 * circumference}
                    transform="rotate(-90 36 36)"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold font-mono">{total}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          {(Object.entries(pipeline) as [CompanyStatus, number][]).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[status]}`} />
              <span className="text-[11px] text-muted-foreground truncate">{STATUS_CONFIG[status].label}</span>
              <span className="text-[11px] font-mono font-medium ml-auto">{count}</span>
            </div>
          ))}
          {openTodos > 0 && (
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border/30">
              <ListChecks className="w-3 h-3 shrink-0 text-amber-500" strokeWidth={1.5} />
              <span className="text-[11px] text-muted-foreground">Offene To-Dos</span>
              <span className="text-[11px] font-mono font-bold text-amber-500 ml-auto">{openTodos}</span>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up reminder (medium: 1, large: list) */}
      {followUps.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Follow-up</span>
          {(size === 'medium' ? followUps.slice(0, 1) : followUps).map(fu => (
            <div key={fu.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs truncate">{fu.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{fu.daysSince}d</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions (large only) */}
      {size === 'large' && showStatusAction && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status aendern</span>
          <Select value={statusCompanyId} onValueChange={setStatusCompanyId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Firma" /></SelectTrigger>
            <SelectContent>
              {companies.filter(c => c.status !== 'completed').map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CompanyStatus)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Neuer Status" /></SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_CONFIG) as [CompanyStatus, { label: string }][]).map(([s, cfg]) => (
                <SelectItem key={s} value={s} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full h-8 text-xs" disabled={!statusCompanyId || !newStatus} onClick={handleStatusChange}>Speichern</Button>
        </div>
      )}

      {size === 'large' && showNoteAction && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Notiz hinzufuegen</span>
          <Select value={noteCompanyId} onValueChange={setNoteCompanyId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Firma" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notiz..." className="h-8 text-xs" />
          <Button size="sm" className="w-full h-8 text-xs" disabled={!noteCompanyId || !noteText.trim()} onClick={handleNoteAdd}>Speichern</Button>
        </div>
      )}

      {addCompanyOpen && (
        <BusinessV2Provider>
          <AddCompanyDialog open={addCompanyOpen} onOpenChange={(open) => { setAddCompanyOpen(open); if (!open) loadData(); }} />
        </BusinessV2Provider>
      )}
    </div>
  );
}
