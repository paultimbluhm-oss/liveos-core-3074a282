import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
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

export function FinanceWidget({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showChart, setShowChart] = useState(false);
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

    const [accRes, invRes, catRes, snapRes] = await Promise.all([
      supabase.from('v2_accounts').select('id, name, account_type, currency, balance, color').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_investments').select('id, name, symbol, asset_type, currency, quantity, avg_purchase_price, current_price').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_categories').select('id, name, icon').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('v2_daily_snapshots').select('date, net_worth_eur').eq('user_id', user.id).gte('date', format(subMonths(new Date(), 1), 'yyyy-MM-dd')).order('date', { ascending: true }),
    ]);

    setAccounts((accRes.data || []) as Account[]);
    setInvestments((invRes.data || []) as Investment[]);
    setCategories((catRes.data || []) as Category[]);
    setSnapshots((snapRes.data || []) as Snapshot[]);
    if (accRes.data?.length && !txAccountId) {
      setTxAccountId((accRes.data as Account[])[0].id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('fw-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_accounts' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'v2_transactions' }, loadData)
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

  const fmt = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const handleQuickAdd = async () => {
    if (!user || !txAmount || !txAccountId) return;
    setTxSaving(true);
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) { setTxSaving(false); return; }

    const acc = accounts.find(a => a.id === txAccountId);
    const currency = acc?.currency || 'EUR';

    // Insert transaction
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

    // Update account balance
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
          <span className="text-sm font-semibold">Finanzen</span>
        </div>
        <p className="text-2xl font-bold">{fmt(netWorth)}</p>
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
          <span className="text-sm font-semibold">Finanzen</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowAddTx(!showAddTx)}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Net Worth */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nettovermoegen</p>
        <p className="text-2xl font-bold">{fmt(netWorth)}</p>
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
        <div className="space-y-1">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between py-1.5 px-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: acc.color || 'hsl(var(--primary))' }}
                />
                <span className="text-xs">{acc.name}</span>
              </div>
              <span className="text-xs font-mono font-medium">
                {acc.balance.toLocaleString('de-DE', { style: 'currency', currency: acc.currency, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Investment list (large only) */}
      {size === 'large' && investments.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/30">
          {investments.map(inv => {
            const val = inv.quantity * (inv.current_price || inv.avg_purchase_price);
            const cost = inv.quantity * inv.avg_purchase_price;
            const pnl = val - cost;
            return (
              <div key={inv.id} className="flex items-center justify-between py-1.5 px-1">
                <span className="text-xs">{inv.name}</span>
                <div className="text-right">
                  <span className="text-xs font-mono font-medium">
                    {val.toLocaleString('de-DE', { style: 'currency', currency: inv.currency, maximumFractionDigits: 0 })}
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
