import { useState, useEffect, useCallback, useMemo } from 'react';
import { Briefcase, Plus, Flame, Clock, Users, Building2, ChevronRight, StickyNote, ListChecks, ClipboardList, Euro, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, subDays } from 'date-fns';
import type { WidgetSize } from '@/hooks/useDashboardV2';
import { Company, DEFAULT_STATUSES } from '@/components/business-v2/types';
import { BusinessV2Provider } from '@/components/business-v2/context/BusinessV2Context';
import { AddCompanyDialog } from '@/components/business-v2/companies/AddCompanyDialog';

interface CompanyContact {
  id: string;
  company_id: string;
  created_at: string;
}

interface StatusEntry {
  key: string;
  name: string;
  color: string;
  order_index: number;
}

export function BusinessWidget({ size, onOpenSheet }: { size: WidgetSize; onOpenSheet?: () => void }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [openTodos, setOpenTodos] = useState(0);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([]);

  // Quick-action states
  const [statusCompanyId, setStatusCompanyId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [noteCompanyId, setNoteCompanyId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showStatusAction, setShowStatusAction] = useState(false);
  const [showNoteAction, setShowNoteAction] = useState(false);

  const [loading, setLoading] = useState(true);

  // Order stats
  const [orderStats, setOrderStats] = useState({ total: 0, withDeposit: 0, totalRevenue: 0, totalExpenses: 0 });

  const loadData = useCallback(async () => {
    if (!user) return;
    const [compRes, contRes, statusRes, ordersRes, checklistRes] = await Promise.all([
      supabase.from('v2_companies').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('v2_company_contacts').select('id, company_id, created_at').eq('user_id', user.id),
      supabase.from('v2_company_statuses').select('*').eq('user_id', user.id).order('order_index'),
      supabase.from('v2_company_orders').select('id, revenue, expenses, status').eq('user_id', user.id),
      supabase.from('v2_order_checklist_items').select('order_id, title, completed').eq('user_id', user.id),
    ]);
    const todosRes = await (supabase.from('v2_company_todos').select('id').eq('user_id', user.id) as any).eq('done', false);
    setCompanies((compRes.data || []) as Company[]);
    setContacts((contRes.data || []) as CompanyContact[]);
    setOpenTodos((todosRes.data || []).length);
    const loadedStatuses = (statusRes.data || []) as StatusEntry[];
    setStatusEntries(loadedStatuses.length > 0 ? loadedStatuses : DEFAULT_STATUSES.map(s => ({ ...s })));

    // Calculate order stats
    const allOrders = (ordersRes.data || []) as { id: string; revenue: number; expenses: number; status: string }[];
    const allChecklist = (checklistRes.data || []) as { order_id: string; title: string; completed: boolean }[];
    const depositOrders = new Set<string>();
    allChecklist.forEach(item => {
      if (item.completed && item.title.toLowerCase().includes('anzahlung')) {
        depositOrders.add(item.order_id);
      }
    });
    setOrderStats({
      total: allOrders.length,
      withDeposit: depositOrders.size,
      totalRevenue: allOrders.reduce((s, o) => s + Number(o.revenue || 0), 0),
      totalExpenses: allOrders.reduce((s, o) => s + Number(o.expenses || 0), 0),
    });

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

  const getStatusCfg = (key: string) => {
    const found = statusEntries.find(s => s.key === key);
    if (found) return found;
    const def = DEFAULT_STATUSES.find(s => s.key === key);
    return def || { key, name: key, color: '#64748b', order_index: 99 };
  };

  // Pipeline counts
  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    statusEntries.forEach(s => { counts[s.key] = 0; });
    companies.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
      else counts[c.status] = 1;
    });
    return counts;
  }, [companies, statusEntries]);

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
      else if (i > 0) break;
      else break;
    }
    return days;
  }, [companies, contacts]);

  // Last activity info
  const lastActivity = useMemo(() => {
    if (companies.length === 0) return null;
    const lastAdded = companies.reduce((latest, c) => c.created_at > latest.created_at ? c : latest);
    const lastUpdated = companies.reduce((latest, c) => c.updated_at > latest.updated_at ? c : latest);
    return {
      lastAddedDays: differenceInDays(new Date(), new Date(lastAdded.created_at)),
      lastAddedName: lastAdded.name,
      lastUpdatedDays: differenceInDays(new Date(), new Date(lastUpdated.updated_at)),
      lastUpdatedName: lastUpdated.name,
    };
  }, [companies]);

  // Follow-ups
  const followUps = useMemo(() => {
    const completedKey = statusEntries.find(s => s.key === 'completed')?.key || 'completed';
    return companies
      .filter(c => c.status !== completedKey)
      .map(c => ({ ...c, daysSince: differenceInDays(new Date(), new Date(c.updated_at)) }))
      .filter(c => c.daysSince >= 7)
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [companies, statusEntries]);

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

  const sortedStatuses = [...statusEntries].sort((a, b) => a.order_index - b.order_index);

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
        <div className="flex gap-2">
          {sortedStatuses.map(s => (
            <div key={s.key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-mono text-muted-foreground">{pipeline[s.key] || 0}</span>
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
              const entries = sortedStatuses.filter(s => (pipeline[s.key] || 0) > 0);
              let offset = 0;
              const circumference = 2 * Math.PI * 28;
              return entries.map(s => {
                const count = pipeline[s.key] || 0;
                const pct = count / total;
                const dash = pct * circumference;
                const gap = circumference - dash;
                const currentOffset = offset;
                offset += pct * 360;
                return (
                  <circle
                    key={s.key}
                    cx="36" cy="36" r="28"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke={s.color}
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
          {sortedStatuses.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-muted-foreground truncate">{s.name}</span>
              <span className="text-[11px] font-mono font-medium ml-auto">{pipeline[s.key] || 0}</span>
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
        {lastActivity && (
          <div className="flex flex-col gap-2 ml-auto shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Hinzugefuegt</span>
              <span className="text-xs font-medium">
                {lastActivity.lastAddedDays === 0 ? 'Heute' : lastActivity.lastAddedDays === 1 ? 'Gestern' : `vor ${lastActivity.lastAddedDays}d`}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Update</span>
              <span className="text-xs font-medium">
                {lastActivity.lastUpdatedDays === 0 ? 'Heute' : lastActivity.lastUpdatedDays === 1 ? 'Gestern' : `vor ${lastActivity.lastUpdatedDays}d`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up reminder */}
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
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Neuer Status" /></SelectTrigger>
            <SelectContent>
              {sortedStatuses.map(s => (
                <SelectItem key={s.key} value={s.key} className="text-xs">{s.name}</SelectItem>
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
