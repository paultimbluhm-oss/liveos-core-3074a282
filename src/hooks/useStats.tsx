import { useState, useEffect, useCallback } from 'react';
import { useAuth, getSupabase } from './useAuth';

interface Stats {
  tasksCompleted: number;
  tasksPending: number;
  homeworkCompleted: number;
  homeworkPending: number;
  averageGrade: number | null;
  totalBalance: number;
  subjectsCount: number;
  recipesCount: number;
  ideasCount: number;
  loadingPrices: boolean;
}

interface Investment {
  id: string;
  symbol: string | null;
  investment_type: string;
  quantity: number;
  purchase_price: number;
  currency: string;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    tasksPending: 0,
    homeworkCompleted: 0,
    homeworkPending: 0,
    averageGrade: null,
    totalBalance: 0,
    subjectsCount: 0,
    recipesCount: 0,
    ideasCount: 0,
    loadingPrices: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchInvestmentPrices = useCallback(async (investments: Investment[]): Promise<number> => {
    if (investments.length === 0) return 0;

    const prices: Record<string, number> = {};
    
    // Fetch crypto prices
    const cryptoInvs = investments.filter(i => i.investment_type === 'crypto' && i.symbol);
    
    if (cryptoInvs.length > 0) {
      // Group by currency
      const cryptoByEur = cryptoInvs.filter(i => i.currency === 'EUR' || !i.currency);
      const cryptoByUsd = cryptoInvs.filter(i => i.currency === 'USD');
      
      const fetchCrypto = async (invList: Investment[], vsCurrency: string) => {
        if (invList.length === 0) return;
        const ids = invList.map(i => i.symbol?.toLowerCase()).join(',');
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}`
          );
          const data = await res.json();
          invList.forEach(inv => {
            const symbol = inv.symbol?.toLowerCase();
            if (symbol && data[symbol]?.[vsCurrency]) {
              prices[inv.id] = data[symbol][vsCurrency];
            }
          });
        } catch (e) {
          console.error('Error fetching crypto prices:', e);
        }
      };
      
      await Promise.all([
        fetchCrypto(cryptoByEur, 'eur'),
        fetchCrypto(cryptoByUsd, 'usd'),
      ]);
    }
    
    // Fetch stock/ETF prices
    const stockInvs = investments.filter(
      i => (i.investment_type === 'etf' || i.investment_type === 'stock') && i.symbol
    );
    
    const supabase = getSupabase();
    for (const inv of stockInvs) {
      if (!inv.symbol) continue;
      try {
        const { data, error } = await supabase.functions.invoke('get-stock-price', {
          body: { symbol: inv.symbol, targetCurrency: inv.currency || 'EUR' },
        });
        if (!error && data?.price) {
          prices[inv.id] = data.price;
        }
      } catch (e) {
        console.error('Error fetching stock price:', e);
      }
    }
    
    // Calculate total investment value
    let total = 0;
    investments.forEach(inv => {
      const price = prices[inv.id] || inv.purchase_price;
      total += inv.quantity * price;
    });
    
    return total;
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    // Fetch all stats in parallel
    const [
      tasksRes,
      homeworkRes,
      gradesRes,
      accountsRes,
      investmentsRes,
      subjectsRes,
      recipesRes,
      ideasRes,
    ] = await Promise.all([
      supabase.from('tasks').select('completed').eq('user_id', user.id),
      supabase.from('homework').select('completed').eq('user_id', user.id),
      supabase.from('grades').select('points, grade_type, subject_id').eq('user_id', user.id),
      supabase.from('accounts').select('balance').eq('user_id', user.id),
      supabase.from('investments').select('id, symbol, investment_type, quantity, purchase_price, currency').eq('user_id', user.id),
      supabase.from('subjects').select('id, oral_weight, written_weight').eq('user_id', user.id),
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    // Calculate task stats
    const tasks = tasksRes.data || [];
    const tasksCompleted = tasks.filter(t => t.completed).length;
    const tasksPending = tasks.filter(t => !t.completed).length;

    // Calculate homework stats
    const homework = homeworkRes.data || [];
    const homeworkCompleted = homework.filter(h => h.completed).length;
    const homeworkPending = homework.filter(h => !h.completed).length;

    // Calculate average grade (weighted by subject)
    const grades = gradesRes.data || [];
    const subjects = subjectsRes.data || [];
    
    let averageGrade: number | null = null;
    
    if (grades.length > 0 && subjects.length > 0) {
      const subjectGrades: Record<string, { oral: number[], written: number[], weights: { oral: number, written: number } }> = {};
      
      subjects.forEach(subject => {
        subjectGrades[subject.id] = { 
          oral: [], 
          written: [], 
          weights: { oral: subject.oral_weight || 50, written: subject.written_weight || 50 } 
        };
      });

      grades.forEach(grade => {
        if (subjectGrades[grade.subject_id]) {
          if (grade.grade_type === 'oral') {
            subjectGrades[grade.subject_id].oral.push(grade.points);
          } else {
            subjectGrades[grade.subject_id].written.push(grade.points);
          }
        }
      });

      const finalGrades: number[] = [];
      Object.values(subjectGrades).forEach(({ oral, written, weights }) => {
        const oralAvg = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : null;
        const writtenAvg = written.length > 0 ? written.reduce((a, b) => a + b, 0) / written.length : null;

        if (oralAvg !== null && writtenAvg !== null) {
          finalGrades.push((writtenAvg * weights.written + oralAvg * weights.oral) / 100);
        } else if (oralAvg !== null) {
          finalGrades.push(oralAvg);
        } else if (writtenAvg !== null) {
          finalGrades.push(writtenAvg);
        }
      });

      if (finalGrades.length > 0) {
        averageGrade = Math.round((finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length) * 10) / 10;
      }
    }

    // Calculate accounts balance
    const accounts = accountsRes.data || [];
    const accountsBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Set initial stats with accounts only (fast)
    setStats({
      tasksCompleted,
      tasksPending,
      homeworkCompleted,
      homeworkPending,
      averageGrade,
      totalBalance: accountsBalance,
      subjectsCount: subjects.length,
      recipesCount: recipesRes.count || 0,
      ideasCount: ideasRes.count || 0,
      loadingPrices: true,
    });

    setLoading(false);

    // Now fetch investment prices and update total (slower, async)
    const investments = investmentsRes.data || [];
    if (investments.length > 0) {
      const investmentsValue = await fetchInvestmentPrices(investments);
      setStats(prev => ({
        ...prev,
        totalBalance: accountsBalance + investmentsValue,
        loadingPrices: false,
      }));
    } else {
      setStats(prev => ({ ...prev, loadingPrices: false }));
    }
  }, [user, fetchInvestmentPrices]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
