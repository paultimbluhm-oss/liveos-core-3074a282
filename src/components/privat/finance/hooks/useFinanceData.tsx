import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

export interface Investment {
  id: string;
  name: string;
  symbol: string | null;
  investment_type: string;
  quantity: number;
  purchase_price: number;
  currency: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
}

export interface BalanceHistory {
  date: string;
  total_balance: number;
  accounts_balance: number;
  investments_balance: number;
}

export function useFinanceData() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [showEtfs, setShowEtfs] = useState(true);
  const [showCrypto, setShowCrypto] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();

    const [accountsRes, investmentsRes, transactionsRes, historyRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
      supabase.from('investments').select('*').eq('user_id', user.id).order('name'),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50),
      supabase
        .from('balance_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }),
    ]);

    if (accountsRes.data) {
      setAccounts(accountsRes.data);
      if (selectedAccountIds.length === 0) {
        setSelectedAccountIds(accountsRes.data.map(a => a.id));
      }
    }
    if (investmentsRes.data) {
      setInvestments(investmentsRes.data);
      fetchPrices(investmentsRes.data);
    }
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (historyRes.data) setBalanceHistory(historyRes.data);
  }, [user, selectedAccountIds.length]);

  const saveBalanceHistory = useCallback(async (accountsBalance: number, investmentsBalance: number) => {
    if (!user) return;
    const supabase = getSupabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    const totalBalance = accountsBalance + investmentsBalance;

    const { data: existing } = await supabase
      .from('balance_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('balance_history')
        .update({
          total_balance: totalBalance,
          accounts_balance: accountsBalance,
          investments_balance: investmentsBalance,
          balance: totalBalance,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('balance_history')
        .insert({
          user_id: user.id,
          date: today,
          balance: totalBalance,
          total_balance: totalBalance,
          accounts_balance: accountsBalance,
          investments_balance: investmentsBalance,
        });
    }
  }, [user]);

  const fetchPrices = async (invs: Investment[]) => {
    const cryptoInvs = invs.filter((i) => i.investment_type === 'crypto' && i.symbol);
    const cryptoByEur = cryptoInvs.filter(i => i.currency === 'EUR' || !i.currency);
    const cryptoByUsd = cryptoInvs.filter(i => i.currency === 'USD');
    
    const fetchCryptoPrices = async (invList: Investment[], vsCurrency: string) => {
      if (invList.length === 0) return;
      const ids = invList.map((i) => i.symbol?.toLowerCase()).join(',');
      setLoadingPrices((prev) => {
        const newState = { ...prev };
        invList.forEach((i) => (newState[i.id] = true));
        return newState;
      });

      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}`
        );
        const data = await res.json();

        const newPrices: Record<string, number> = {};
        invList.forEach((inv) => {
          const symbol = inv.symbol?.toLowerCase();
          if (symbol && data[symbol]?.[vsCurrency]) {
            newPrices[inv.id] = data[symbol][vsCurrency];
          }
        });
        setPrices((prev) => ({ ...prev, ...newPrices }));
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }

      setLoadingPrices((prev) => {
        const newState = { ...prev };
        invList.forEach((i) => (newState[i.id] = false));
        return newState;
      });
    };

    await Promise.all([
      fetchCryptoPrices(cryptoByEur, 'eur'),
      fetchCryptoPrices(cryptoByUsd, 'usd'),
    ]);

    const stockInvs = invs.filter(
      (i) => (i.investment_type === 'etf' || i.investment_type === 'stock') && i.symbol
    );
    
    for (const inv of stockInvs) {
      if (!inv.symbol) continue;
      setLoadingPrices((prev) => ({ ...prev, [inv.id]: true }));
      try {
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
          body: { symbol: inv.symbol, targetCurrency: inv.currency || 'EUR' },
        });
        if (!error && data?.price) {
          setPrices((prev) => ({ ...prev, [inv.id]: data.price }));
        }
      } catch (error) {
        console.error('Error fetching stock price:', error);
      }
      setLoadingPrices((prev) => ({ ...prev, [inv.id]: false }));
    }
  };

  const refreshPrice = async (investment: Investment) => {
    if (!investment.symbol) return;
    const currency = investment.currency || 'EUR';
    const vsCurrency = currency.toLowerCase();
    
    setLoadingPrices((prev) => ({ ...prev, [investment.id]: true }));
    
    try {
      if (investment.investment_type === 'crypto') {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${investment.symbol.toLowerCase()}&vs_currencies=${vsCurrency}`
        );
        const data = await res.json();
        const price = data[investment.symbol.toLowerCase()]?.[vsCurrency];
        if (price) {
          setPrices((prev) => ({ ...prev, [investment.id]: price }));
        }
      } else {
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
          body: { symbol: investment.symbol, targetCurrency: currency },
        });
        if (!error && data?.price) {
          setPrices((prev) => ({ ...prev, [investment.id]: data.price }));
        }
      }
    } catch (error) {
      console.error('Error refreshing price:', error);
    }
    
    setLoadingPrices((prev) => ({ ...prev, [investment.id]: false }));
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    
    const supabaseClient = getSupabase();
    const tx = transactions.find(t => t.id === id);
    
    if (tx) {
      const account = accounts.find(a => a.id === tx.account_id);
      if (account) {
        const balanceChange = tx.transaction_type === 'income' ? -tx.amount : tx.amount;
        await supabaseClient
          .from('accounts')
          .update({ balance: account.balance + balanceChange })
          .eq('id', account.id);
      }
    }
    
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Transaktion gelöscht');
      fetchData();
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  const stockInvestments = investments.filter(i => i.investment_type === 'etf' || i.investment_type === 'stock');
  const cryptoInvestments = investments.filter(i => i.investment_type === 'crypto');
  
  const etfTotalValue = stockInvestments.reduce((sum, inv) => {
    const price = prices[inv.id] || inv.purchase_price / inv.quantity;
    return sum + inv.quantity * price;
  }, 0);
  
  const etfTotalCost = stockInvestments.reduce((sum, inv) => sum + inv.purchase_price, 0);
  const etfProfit = etfTotalValue - etfTotalCost;
  const etfProfitPercent = etfTotalCost > 0 ? (etfProfit / etfTotalCost) * 100 : 0;
  
  const cryptoTotalValue = cryptoInvestments.reduce((sum, inv) => {
    const price = prices[inv.id] || inv.purchase_price / inv.quantity;
    return sum + inv.quantity * price;
  }, 0);
  
  const cryptoTotalCost = cryptoInvestments.reduce((sum, inv) => sum + inv.purchase_price, 0);
  const cryptoProfit = cryptoTotalValue - cryptoTotalCost;
  const cryptoProfitPercent = cryptoTotalCost > 0 ? (cryptoProfit / cryptoTotalCost) * 100 : 0;
  
  const totalInvestments = etfTotalValue + cryptoTotalValue;

  useEffect(() => {
    if (accounts.length > 0 || investments.length > 0) {
      saveBalanceHistory(totalBalance, totalInvestments);
    }
  }, [totalBalance, totalInvestments, accounts.length, investments.length, saveBalanceHistory]);

  // Monthly overview calculations (excluding transfers)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });
    
    const income = monthTransactions
      .filter(tx => tx.transaction_type === 'income' && tx.category !== 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const expenses = monthTransactions
      .filter(tx => tx.transaction_type === 'expense' && tx.category !== 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    return { income, expenses, difference: income - expenses };
  }, [transactions]);

  const bankAccounts = accounts.filter((a) => a.account_type === 'bank');
  const cashAccounts = accounts.filter((a) => a.account_type === 'cash_bills' || a.account_type === 'cash_coins');

  return {
    // Data
    accounts,
    investments,
    transactions,
    balanceHistory,
    prices,
    loadingPrices,
    
    // Computed
    totalBalance,
    totalInvestments,
    stockInvestments,
    cryptoInvestments,
    etfTotalValue,
    etfTotalCost,
    etfProfit,
    etfProfitPercent,
    cryptoTotalValue,
    cryptoTotalCost,
    cryptoProfit,
    cryptoProfitPercent,
    monthlyStats,
    bankAccounts,
    cashAccounts,
    
    // Chart state
    selectedAccountIds,
    setSelectedAccountIds,
    showEtfs,
    setShowEtfs,
    showCrypto,
    setShowCrypto,
    
    // Actions
    fetchData,
    refreshPrice,
    deleteTransaction,
    fetchPrices: () => fetchPrices(investments),
  };
}
