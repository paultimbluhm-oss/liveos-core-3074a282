import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { format, parseISO, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';

// Types
export interface V2Account {
  id: string;
  user_id: string;
  name: string;
  account_type: 'giro' | 'tagesgeld' | 'cash' | 'sonstiges';
  currency: 'EUR' | 'USD';
  balance: number;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface V2Category {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  is_active: boolean;
}

export interface V2Transaction {
  id: string;
  user_id: string;
  transaction_type: 'income' | 'expense' | 'transfer' | 'investment_buy' | 'investment_sell';
  amount: number;
  currency: string;
  date: string;
  time?: string;
  account_id?: string;
  to_account_id?: string;
  category_id?: string;
  investment_id?: string;
  note?: string;
  automation_id?: string;
  execution_id?: string;
  created_at: string;
}

export interface V2Investment {
  id: string;
  user_id: string;
  name: string;
  symbol?: string;
  asset_type: 'etf' | 'stock' | 'fund' | 'crypto' | 'metal' | 'other';
  currency: string;
  quantity: number;
  avg_purchase_price: number;
  current_price?: number;
  current_price_updated_at?: string;
  is_active: boolean;
}

// Keep type export for backward compatibility but won't load data
export interface V2MaterialAsset {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  purchase_price?: number;
  purchase_date?: string;
  current_value?: number;
  note?: string;
}

export interface V2Automation {
  id: string;
  user_id: string;
  name: string;
  automation_type: 'income' | 'expense' | 'transfer' | 'investment';
  amount: number;
  currency: string;
  interval_type: 'weekly' | 'monthly' | 'yearly';
  execution_day: number;
  account_id?: string;
  to_account_id?: string;
  investment_id?: string;
  category_id?: string;
  note?: string;
  is_active: boolean;
  last_executed_at?: string;
  next_execution_date?: string;
}

export interface V2DailySnapshot {
  id: string;
  user_id: string;
  date: string;
  account_balances: Record<string, number>;
  total_accounts_eur: number;
  total_investments_eur: number;
  net_worth_eur: number;
  income_eur: number;
  expenses_eur: number;
  eur_usd_rate?: number;
}

export interface V2CashDenomination {
  id: string;
  account_id: string;
  denomination: number;
  quantity: number;
}

export interface V2ExternalSaving {
  id: string;
  user_id: string;
  name: string;
  source_person: string;
  amount: number;
  currency: string;
  expected_date?: string;
  note?: string;
  is_received: boolean;
  received_date?: string;
  received_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface V2Loan {
  id: string;
  user_id: string;
  loan_type: 'lent' | 'borrowed';
  person_name: string;
  amount: number;
  currency: string;
  account_id?: string;
  date: string;
  note?: string;
  is_settled: boolean;
  settled_date?: string;
  settled_account_id?: string;
  friend_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface FinanceV2ContextType {
  accounts: V2Account[];
  categories: V2Category[];
  transactions: V2Transaction[];
  investments: V2Investment[];
  automations: V2Automation[];
  snapshots: V2DailySnapshot[];
  cashDenominations: Record<string, V2CashDenomination[]>;
  loans: V2Loan[];
  loading: boolean;
  totalAccountsEur: number;
  totalInvestmentsEur: number;
  netWorthEur: number;
  refreshData: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshInvestments: () => Promise<void>;
  refreshAutomations: () => Promise<void>;
  refreshSnapshots: () => Promise<void>;
  refreshLoans: () => Promise<void>;
  createSnapshot: () => Promise<void>;
  recalculateSnapshotsFromDate: (fromDate: string) => Promise<void>;
  eurUsdRate: number;
}

const FinanceV2Context = createContext<FinanceV2ContextType | undefined>(undefined);

export function FinanceV2Provider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [accounts, setAccounts] = useState<V2Account[]>([]);
  const [categories, setCategories] = useState<V2Category[]>([]);
  const [transactions, setTransactions] = useState<V2Transaction[]>([]);
  const [investments, setInvestments] = useState<V2Investment[]>([]);
  const [automations, setAutomations] = useState<V2Automation[]>([]);
  const [snapshots, setSnapshots] = useState<V2DailySnapshot[]>([]);
  const [cashDenominations, setCashDenominations] = useState<Record<string, V2CashDenomination[]>>({});
  const [loans, setLoans] = useState<V2Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [eurUsdRate, setEurUsdRate] = useState(1.08);

  const refreshAccounts = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) {
      setAccounts(data as V2Account[]);
      
      const cashAccounts = data.filter(a => a.account_type === 'cash');
      if (cashAccounts.length > 0) {
        const { data: denoms } = await supabase
          .from('v2_cash_denominations')
          .select('*')
          .in('account_id', cashAccounts.map(a => a.id));
        
        if (denoms) {
          const denomMap: Record<string, V2CashDenomination[]> = {};
          denoms.forEach((d: V2CashDenomination) => {
            if (!denomMap[d.account_id]) denomMap[d.account_id] = [];
            denomMap[d.account_id].push(d);
          });
          setCashDenominations(denomMap);
        }
      }
    }
  }, [user]);

  const refreshCategories = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setCategories(data as V2Category[]);
  }, [user]);

  const refreshTransactions = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (data) setTransactions(data as V2Transaction[]);
  }, [user]);

  const refreshInvestments = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_investments')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    if (!data) return;
    
    const investments = data as V2Investment[];
    
    const updatedInvestments = await Promise.all(
      investments.map(async (inv) => {
        const lastUpdate = inv.current_price_updated_at ? new Date(inv.current_price_updated_at) : null;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const needsUpdate = !lastUpdate || lastUpdate < oneHourAgo;
        
        if (!needsUpdate && inv.current_price) {
          return inv;
        }
        
        try {
          if (inv.asset_type === 'crypto' && inv.symbol) {
            const vsCurrency = inv.currency.toLowerCase();
            const res = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(inv.symbol)}&vs_currencies=${vsCurrency}`
            );
            const priceData = await res.json();
            const newPrice = priceData[inv.symbol]?.[vsCurrency];
            
            if (newPrice) {
              await supabase
                .from('v2_investments')
                .update({
                  current_price: newPrice,
                  current_price_updated_at: new Date().toISOString(),
                })
                .eq('id', inv.id);
              
              return { ...inv, current_price: newPrice, current_price_updated_at: new Date().toISOString() };
            }
          } else if ((inv.asset_type === 'etf' || inv.asset_type === 'stock') && inv.symbol) {
            const { data: priceData, error } = await supabase.functions.invoke('get-stock-price', {
              body: { symbol: inv.symbol, targetCurrency: inv.currency },
            });
            
            if (!error && priceData?.price) {
              await supabase
                .from('v2_investments')
                .update({
                  current_price: priceData.price,
                  current_price_updated_at: new Date().toISOString(),
                })
                .eq('id', inv.id);
              
              return { ...inv, current_price: priceData.price, current_price_updated_at: new Date().toISOString() };
            }
          }
        } catch (error) {
          console.error(`Failed to fetch price for ${inv.name}:`, error);
        }
        
        return inv;
      })
    );
    
    setInvestments(updatedInvestments as V2Investment[]);
  }, [user]);

  const refreshAutomations = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_automations')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setAutomations(data as V2Automation[]);
  }, [user]);

  const refreshSnapshots = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_daily_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(365);
    if (data) setSnapshots(data as V2DailySnapshot[]);
  }, [user]);

  const refreshLoans = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('v2_loans')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (data) setLoans(data as V2Loan[]);
  }, [user]);

  // Trigger automations edge function to process pending automations
  const triggerAutomations = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    try {
      const { error } = await supabase.functions.invoke('v2-process-automations');
      if (error) {
        console.error('Failed to trigger automations:', error);
      } else {
        // Refresh data after automations ran
        await Promise.all([refreshAccounts(), refreshTransactions(), refreshAutomations(), refreshInvestments()]);
      }
    } catch (err) {
      console.error('Automation trigger error:', err);
    }
  }, [user, refreshAccounts, refreshTransactions, refreshAutomations, refreshInvestments]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshAccounts(),
      refreshCategories(),
      refreshTransactions(),
      refreshInvestments(),
      refreshAutomations(),
      refreshSnapshots(),
      refreshLoans(),
    ]);
    setLoading(false);
  }, [refreshAccounts, refreshCategories, refreshTransactions, refreshInvestments, refreshAutomations, refreshSnapshots, refreshLoans]);

  // Create/update today's snapshot
  const createSnapshot = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const accountBalances: Record<string, number> = {};
    let totalAccountsEurCalc = 0;
    
    accounts.forEach(acc => {
      accountBalances[acc.id] = acc.balance;
      if (acc.currency === 'USD') {
        totalAccountsEurCalc += acc.balance / eurUsdRate;
      } else {
        totalAccountsEurCalc += acc.balance;
      }
    });
    
    let totalInvestmentsEurCalc = 0;
    investments.forEach(inv => {
      const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      if (inv.currency === 'USD') {
        totalInvestmentsEurCalc += value / eurUsdRate;
      } else {
        totalInvestmentsEurCalc += value;
      }
    });
    
    const todayTx = transactions.filter(tx => tx.date === today);
    let incomeEur = 0;
    let expensesEur = 0;
    
    todayTx.forEach(tx => {
      const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
      if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
        incomeEur += amt;
      } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy') {
        expensesEur += amt;
      }
    });
    
    await supabase.from('v2_daily_snapshots').upsert({
      user_id: user.id,
      date: today,
      account_balances: accountBalances,
      total_accounts_eur: totalAccountsEurCalc,
      total_investments_eur: totalInvestmentsEurCalc,
      net_worth_eur: totalAccountsEurCalc + totalInvestmentsEurCalc,
      income_eur: incomeEur,
      expenses_eur: expensesEur,
      eur_usd_rate: eurUsdRate,
    }, { onConflict: 'user_id,date' });
    
    await refreshSnapshots();
  }, [user, accounts, investments, transactions, eurUsdRate, refreshSnapshots]);

  // Recalculate snapshots from a specific date to today
  const recalculateSnapshotsFromDate = useCallback(async (fromDate: string) => {
    if (!user) return;
    const supabase = getSupabase();
    const today = startOfDay(new Date());
    const startDate = startOfDay(parseISO(fromDate));
    
    if (isBefore(today, startDate)) return;
    
    const daysToRecalculate = eachDayOfInterval({ start: startDate, end: today });
    
    const { data: allTransactions } = await supabase
      .from('v2_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    
    if (!allTransactions) return;
    
    const { data: currentAccounts } = await supabase
      .from('v2_accounts')
      .select('*')
      .eq('user_id', user.id);
    
    if (!currentAccounts) return;
    
    const { data: currentInvestments } = await supabase
      .from('v2_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    for (const day of daysToRecalculate) {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayTx = allTransactions.filter(tx => tx.date === dayStr);
      let incomeEur = 0;
      let expensesEur = 0;
      
      dayTx.forEach(tx => {
        const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
        if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
          incomeEur += amt;
        } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy') {
          expensesEur += amt;
        }
      });
      
      const accountBalances: Record<string, number> = {};
      let totalAccountsEurCalc = 0;
      
      currentAccounts.forEach(acc => {
        let historicalBalance = acc.balance;
        
        allTransactions
          .filter(tx => tx.date > dayStr)
          .forEach(tx => {
            if (tx.account_id === acc.id) {
              if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
                historicalBalance -= tx.amount;
              } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy' || tx.transaction_type === 'transfer') {
                historicalBalance += tx.amount;
              }
            }
            if (tx.to_account_id === acc.id && tx.transaction_type === 'transfer') {
              historicalBalance -= tx.amount;
            }
          });
        
        accountBalances[acc.id] = historicalBalance;
        if (acc.currency === 'USD') {
          totalAccountsEurCalc += historicalBalance / eurUsdRate;
        } else {
          totalAccountsEurCalc += historicalBalance;
        }
      });
      
      let totalInvestmentsEurCalc = 0;
      if (currentInvestments) {
        currentInvestments.forEach((inv) => {
          const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
          if (inv.currency === 'USD') {
            totalInvestmentsEurCalc += value / eurUsdRate;
          } else {
            totalInvestmentsEurCalc += value;
          }
        });
      }
      
      await supabase.from('v2_daily_snapshots').upsert({
        user_id: user.id,
        date: dayStr,
        account_balances: accountBalances,
        total_accounts_eur: totalAccountsEurCalc,
        total_investments_eur: totalInvestmentsEurCalc,
        net_worth_eur: totalAccountsEurCalc + totalInvestmentsEurCalc,
        income_eur: incomeEur,
        expenses_eur: expensesEur,
        eur_usd_rate: eurUsdRate,
      }, { onConflict: 'user_id,date' });
    }
    
    await refreshSnapshots();
  }, [user, eurUsdRate, refreshSnapshots]);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Trigger automations after initial load
  const [automationsTriggered, setAutomationsTriggered] = useState(false);
  
  useEffect(() => {
    if (user && !loading && !automationsTriggered) {
      setAutomationsTriggered(true);
      triggerAutomations();
    }
  }, [user, loading, automationsTriggered, triggerAutomations]);

  // Create/update snapshot when data changes
  const [snapshotsRepaired, setSnapshotsRepaired] = useState(false);
  
  useEffect(() => {
    if (user && !loading && accounts.length > 0) {
      createSnapshot();
    }
  }, [user, loading, accounts.length, investments.length]);

  // One-time repair of historical snapshots
  useEffect(() => {
    if (user && !loading && transactions.length > 0 && !snapshotsRepaired) {
      setSnapshotsRepaired(true);
      const oldestDate = transactions.reduce(
        (min, tx) => (tx.date < min ? tx.date : min),
        format(new Date(), 'yyyy-MM-dd')
      );
      recalculateSnapshotsFromDate(oldestDate);
    }
  }, [user, loading, transactions.length, snapshotsRepaired, recalculateSnapshotsFromDate]);

  // Computed values
  const totalAccountsEur = accounts.reduce((sum, acc) => {
    if (acc.currency === 'USD') {
      return sum + acc.balance / eurUsdRate;
    }
    return sum + acc.balance;
  }, 0);

  const totalInvestmentsEur = investments.reduce((sum, inv) => {
    const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
    if (inv.currency === 'USD') {
      return sum + value / eurUsdRate;
    }
    return sum + value;
  }, 0);

  const netWorthEur = totalAccountsEur + totalInvestmentsEur;

  return (
    <FinanceV2Context.Provider value={{
      accounts,
      categories,
      transactions,
      investments,
      automations,
      snapshots,
      cashDenominations,
      loans,
      loading,
      totalAccountsEur,
      totalInvestmentsEur,
      netWorthEur,
      refreshData,
      refreshAccounts,
      refreshCategories,
      refreshTransactions,
      refreshInvestments,
      refreshAutomations,
      refreshSnapshots,
      refreshLoans,
      createSnapshot,
      recalculateSnapshotsFromDate,
      eurUsdRate,
    }}>
      {children}
    </FinanceV2Context.Provider>
  );
}

export function useFinanceV2() {
  const context = useContext(FinanceV2Context);
  if (!context) {
    throw new Error('useFinanceV2 must be used within FinanceV2Provider');
  }
  return context;
}
