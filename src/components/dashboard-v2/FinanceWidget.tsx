import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, ChevronDown, Pencil, Check, X, HandCoins, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import type { WidgetSize } from '@/hooks/useDashboardV2';

interface Account {
  id: string;
  name: string;
  account_type: string;
  currency: string;
  balance: number;
  color?: string;
}

interface Investment {
  id: string;
  name: string;
  symbol?: string;
  asset_type: string;
  currency: string;
  quantity: number;
  avg_purchase_price: number;
  current_price?: number;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Snapshot {
  date: string;
  net_worth_eur: number;
}

interface Transaction {
  transaction_type: string;
  amount: number;
  currency: string;
}

interface Loan {
  id: string;
  loan_type: 'lent' | 'borrowed';
  person_name: string;
  amount: number;
  currency: string;
  account_id?: string;
  date: string;
  note?: string;
  is_settled: boolean;
}

export function FinanceWidget({ size, onOpenSheet }: { size: WidgetSize; onOpenSheet?: () => void }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [editingBalances, setEditingBalances] = useState(false);
  const [balanceEdits, setBalanceEdits] = useState<Record<string, string>>({});
  const [savingBalances, setSavingBalances] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanType, setLoanType] = useState<'lent' | 'borrowed'>('lent');
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanNote, setLoanNote] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanSaving, setLoanSaving] = useState(false);
  // Settle state
  const [settlingLoanId, setSettlingLoanId] = useState<string | null>(null);
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleSaving, setSettleSaving] = useState(false);
  const eurUsdRate = 1.08;

  // Quick add transaction state
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txSaving, setTxSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [accRes, invRes, catRes, snapRes, loanRes] = await Promise.all([
      supabase.from('v2_accounts').select('id, name, account_type, currency, balance, color').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_investments').select('id, name, symbol, asset_type, currency, quantity, avg_purchase_price, current_price').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_categories').select('id, name, icon').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_daily_snapshots').select('date, net_worth_eur').eq('user_id', user.id).gte('date', format(subMonths(new Date(), 1), 'yyyy-MM-dd')).order('date', { ascending: true }),
      supabase.from('v2_loans').select('*').eq('user_id', user.id).eq('is_settled', false).order('date', { ascending: false }),
    ]);

    setAccounts((accRes.data || []) as Account[]);
    setInvestments((invRes.data || []) as Investment[]);
    setCategories((catRes.data || []) as Category[]);
    setSnapshots((snapRes.data || []) as Snapshot[]);
    setLoans((loanRes.data || []) as Loan[]);
    if (accRes.data?.length && !txAccountId) {
      setTxAccountId((accRes.data as Account[])[0].id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('fw-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_accounts' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_transactions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_loans' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadData]);

  const totalAccounts = useMemo(() =>
    accounts.reduce((s, a) => s + (a.currency === 'USD' ? a.balance / eurUsdRate : a.balance), 0),
    [accounts]
  );

  const totalInvestments = useMemo(() =>
    investments.reduce((s, inv) => {
      const val = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      return s + (inv.currency === 'USD' ? val / eurUsdRate : val);
    }, 0),
    [investments]
  );

  const netWorth = totalAccounts + totalInvestments;

  const investmentProfit = useMemo(() => {
    const cost = investments.reduce((s, inv) => {
      const c = inv.quantity * inv.avg_purchase_price;
      return s + (inv.currency === 'USD' ? c / eurUsdRate : c);
    }, 0);
    return totalInvestments - cost;
  }, [investments, totalInvestments]);

  const chartData = useMemo(() =>
    snapshots.map(s => ({ date: s.date.slice(5), value: s.net_worth_eur })),
    [snapshots]
  );

  const fmt = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  const startEditBalances = () => {
    const edits: Record<string, string> = {};
    accounts.forEach(a => { edits[a.id] = a.balance.toString(); });
    setBalanceEdits(edits);
    setEditingBalances(true);
  };

  const saveBalances = async () => {
    setSavingBalances(true);
    try {
      for (const [id, val] of Object.entries(balanceEdits)) {
        const amount = parseFloat(val.replace(',', '.'));
        if (!isNaN(amount)) {
          await supabase.from('v2_accounts').update({ balance: amount, updated_at: new Date().toISOString() }).eq('id', id);
        }
      }
      setEditingBalances(false);
      toast.success('Kontodaten aktualisiert');
      loadData();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingBalances(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!user || !txAmount || !txAccountId) return;
    setTxSaving(true);
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { setTxSaving(false); return; }

    const acc = accounts.find(a => a.id === txAccountId);
    const currency = acc?.currency || 'EUR';

    await supabase.from('v2_transactions').insert({
      user_id: user.id,
      transaction_type: txType,
      amount,
      currency,
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: txAccountId,
      category_id: txCategoryId || null,
      note: txNote || null,
    });

    const balanceChange = txType === 'income' ? amount : -amount;
    await supabase.from('v2_accounts').update({
      balance: (acc?.balance || 0) + balanceChange,
    }).eq('id', txAccountId);

    setTxAmount('');
    setTxNote('');
    setShowAddTx(false);
    setTxSaving(false);
    toast.success(txType === 'income' ? 'Einnahme gebucht' : 'Ausgabe gebucht');
    loadData();
  };

  const handleLoanAdd = async () => {
    if (!user || !loanPerson || !loanAmount) return;
    const effectiveAccountId = loanAccountId || accounts[0]?.id;
    if (!effectiveAccountId) return;
    setLoanSaving(true);
    const amount = parseFloat(loanAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { setLoanSaving(false); return; }

    const acc = accounts.find(a => a.id === effectiveAccountId);
    const currency = acc?.currency || 'EUR';

    const { error } = await supabase.from('v2_loans').insert({
      user_id: user.id,
      loan_type: loanType,
      person_name: loanPerson,
      amount,
      currency,
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: effectiveAccountId,
      note: loanNote || null,
      is_settled: false,
    });

    if (error) {
      toast.error('Fehler beim Speichern');
      setLoanSaving(false);
      return;
    }

    // Update account balance
    const balanceChange = loanType === 'lent' ? -amount : amount;
    await supabase.from('v2_accounts').update({
      balance: (acc?.balance || 0) + balanceChange,
    }).eq('id', effectiveAccountId);

    setLoanPerson('');
    setLoanAmount('');
    setLoanNote('');
    setShowLoanForm(false);
    setLoanSaving(false);
    toast.success(loanType === 'lent' ? 'Verleih gespeichert' : 'Leihe gespeichert');
    loadData();
  };

  const handleSettle = async (loan: Loan) => {
    const effectiveAccountId = settleAccountId || accounts[0]?.id;
    if (!effectiveAccountId) return;
    setSettleSaving(true);

    const acc = accounts.find(a => a.id === effectiveAccountId);
    // Settle: reverse the original balance change
    const balanceChange = loan.loan_type === 'lent' ? loan.amount : -loan.amount;
    
    await supabase.from('v2_loans').update({
      is_settled: true,
      settled_date: format(new Date(), 'yyyy-MM-dd'),
      settled_account_id: effectiveAccountId,
    }).eq('id', loan.id);

    await supabase.from('v2_accounts').update({
      balance: (acc?.balance || 0) + balanceChange,
    }).eq('id', effectiveAccountId);

    setSettlingLoanId(null);
    setSettleAccountId('');
    setSettleSaving(false);
    toast.success('Rueckzahlung verbucht');
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
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Finanzen</button>
        </div>
        <p className="text-2xl font-bold tracking-tight">{fmt(netWorth)}</p>
        <p className="text-[10px] text-muted-foreground">Nettovermoegen</p>
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
            <Wallet className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <button onClick={onOpenSheet} className="text-sm font-semibold hover:text-primary transition-colors">Finanzen</button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowLoanForm(!showLoanForm); setShowAddTx(false); }}>
            <HandCoins className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAddTx(!showAddTx); setShowLoanForm(false); }}>
            <Plus className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Net Worth */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nettovermoegen</p>
        <p className="text-2xl font-bold tracking-tight">{fmt(netWorth)}</p>
      </div>

      {/* Accounts / Investments split */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/30 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground">Konten</span>
          </div>
          <p className="text-sm font-bold">{fmt(totalAccounts)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground">Investments</span>
          </div>
          <p className="text-sm font-bold">{fmt(totalInvestments)}</p>
          {investmentProfit !== 0 && (
            <p className={`text-[10px] font-mono ${investmentProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {investmentProfit >= 0 ? '+' : ''}{fmt(investmentProfit)}
            </p>
          )}
        </div>
      </div>

      {/* Account list (large only) */}
      {size === 'large' && accounts.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Konten</span>
            {!editingBalances ? (
              <button onClick={startEditBalances} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={saveBalances} disabled={savingBalances} className="p-1 rounded-lg hover:bg-success/20 transition-colors">
                  <Check className="w-3.5 h-3.5 text-success" />
                </button>
                <button onClick={() => setEditingBalances(false)} className="p-1 rounded-lg hover:bg-destructive/20 transition-colors">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            )}
          </div>
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color || 'hsl(var(--primary))' }} />
                <span className="text-xs">{acc.name}</span>
              </div>
              {editingBalances ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={balanceEdits[acc.id] || ''}
                  onChange={e => setBalanceEdits(prev => ({ ...prev, [acc.id]: e.target.value }))}
                  className="h-6 w-24 text-xs text-right font-mono bg-muted/30 border-border/30"
                />
              ) : (
                <span className="text-xs font-mono font-medium">
                  {acc.balance.toLocaleString('de-DE', { style: 'currency', currency: acc.currency })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Investment list (large only) */}
      {size === 'large' && investments.length > 0 && (
        <div className="space-y-0.5 pt-1 border-t border-border/30">
          {investments.map(inv => {
            const val = inv.quantity * (inv.current_price || inv.avg_purchase_price);
            const cost = inv.quantity * inv.avg_purchase_price;
            const pnl = val - cost;
            return (
              <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                <span className="text-xs">{inv.name}</span>
                <div className="text-right">
                  <span className="text-xs font-mono font-medium">
                    {val.toLocaleString('de-DE', { style: 'currency', currency: inv.currency })}
                  </span>
                  {pnl !== 0 && (
                    <span className={`text-[9px] font-mono ml-1.5 ${pnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {pnl >= 0 ? '+' : ''}{((pnl / cost) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Open Loans */}
      {loans.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Offen</span>
          {loans.map(loan => (
            <div key={loan.id} className="space-y-1.5">
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  {loan.loan_type === 'lent'
                    ? <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <ArrowDownRight className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{loan.person_name}</p>
                    {loan.note && <p className="text-[10px] text-muted-foreground truncate">{loan.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-mono font-medium ${loan.loan_type === 'lent' ? 'text-amber-500' : 'text-violet-500'}`}>
                    {loan.amount.toLocaleString('de-DE', { style: 'currency', currency: loan.currency })}
                  </span>
                  <button
                    onClick={() => { setSettlingLoanId(settlingLoanId === loan.id ? null : loan.id); setSettleAccountId(''); }}
                    className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                    title="Zurueckerhalten"
                  >
                    <RotateCcw className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {settlingLoanId === loan.id && (
                <div className="flex gap-1.5 px-2">
                  <Select value={settleAccountId || (accounts[0]?.id ?? '')} onValueChange={setSettleAccountId}>
                    <SelectTrigger className="h-7 text-[10px] flex-1 bg-muted/30 border-border/30">
                      <SelectValue placeholder="Konto" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-[10px] px-3" onClick={() => handleSettle(loan)} disabled={settleSaving}>
                    {settleSaving ? '...' : 'Erledigt'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Optional Chart */}
      {chartData.length > 1 && (
        <Collapsible open={showChart} onOpenChange={setShowChart}>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={`w-3 h-3 transition-transform ${showChart ? 'rotate-180' : ''}`} />
            <span>Verlauf (30 Tage)</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#fwGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Quick Loan Form */}
      {showLoanForm && (
        <div className="pt-2 border-t border-border/30 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setLoanType('lent')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                loanType === 'lent' ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Verleihen
            </button>
            <button
              onClick={() => setLoanType('borrowed')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                loanType === 'borrowed' ? 'bg-violet-500/15 text-violet-600' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              Leihen
            </button>
          </div>

          <Input
            placeholder="Person"
            value={loanPerson}
            onChange={e => setLoanPerson(e.target.value)}
            className="h-9 text-sm"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-1.5">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Betrag"
              value={loanAmount}
              onChange={e => setLoanAmount(e.target.value)}
              className="h-9 text-sm"
            />
            <Select value={loanAccountId || (accounts[0]?.id ?? '')} onValueChange={setLoanAccountId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Konto" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Grund / Notiz"
            value={loanNote}
            onChange={e => setLoanNote(e.target.value)}
            className="h-8 text-xs"
          />

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleLoanAdd}
            disabled={loanSaving || !loanPerson || !loanAmount}
          >
            {loanSaving ? 'Speichern...' : loanType === 'lent' ? 'Verleih speichern' : 'Leihe speichern'}
          </Button>
        </div>
      )}

      {/* Quick Add Transaction */}
      {showAddTx && (
        <div className="pt-2 border-t border-border/30 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setTxType('expense')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                txType === 'expense' ? 'bg-destructive/15 text-destructive' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              Ausgabe
            </button>
            <button
              onClick={() => setTxType('income')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                txType === 'income' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Einnahme
            </button>
          </div>

          <Input
            type="number"
            placeholder="Betrag"
            value={txAmount}
            onChange={e => setTxAmount(e.target.value)}
            className="h-9 text-sm"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-1.5">
            <Select value={txAccountId} onValueChange={setTxAccountId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Konto" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={txCategoryId} onValueChange={setTxCategoryId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Notiz (optional)"
            value={txNote}
            onChange={e => setTxNote(e.target.value)}
            className="h-8 text-xs"
          />

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleQuickAdd}
            disabled={txSaving || !txAmount || !txAccountId}
          >
            {txSaving ? 'Speichern...' : 'Buchen'}
          </Button>
        </div>
      )}
    </div>
  );
}
