import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Coins, TrendingUp } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { FinanceSheetWrapper } from './FinanceSheetWrapper';
import type { WidgetSize } from '@/hooks/useDashboardV2';

export type StatsField = 'grade' | 'netWorth';

interface QuickStatsWidgetProps {
  size: WidgetSize;
  editMode?: boolean;
  statsConfig?: { visibleFields: StatsField[] };
  onOpenConfig?: () => void;
}

export function QuickStatsWidget({ size, editMode, statsConfig, onOpenConfig }: QuickStatsWidgetProps) {
  const { user } = useAuth();
  const [showFinance, setShowFinance] = useState(false);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState(0);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const visibleFields = statsConfig?.visibleFields ?? ['grade', 'netWorth'];

  const fetchData = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();

    const promises: Promise<any>[] = [];

    // Grades from V2 courses
    if (visibleFields.includes('grade')) {
      promises.push(
        (async () => {
          const { data } = await supabase
            .from('grades')
            .select('points, grade_type, course_id')
            .eq('user_id', user.id);
          const grades = data || [];
          if (grades.length > 0) {
            const avg = Math.round((grades.reduce((s, g) => s + g.points, 0) / grades.length) * 10) / 10;
            setAverageGrade(avg);
          } else {
            setAverageGrade(null);
          }
        })()
      );
    }

    // Net worth from V2 finance
    if (visibleFields.includes('netWorth')) {
      setLoadingPrices(true);
      promises.push(
        Promise.all([
          supabase.from('v2_accounts').select('balance, currency, is_active').eq('user_id', user.id).eq('is_active', true),
          supabase.from('v2_investments').select('quantity, avg_purchase_price, current_price, currency, is_active').eq('user_id', user.id).eq('is_active', true),
          supabase.from('v2_external_savings').select('amount, currency, is_received').eq('user_id', user.id).eq('is_received', false),
        ]).then(([accRes, invRes, extRes]) => {
          const rate = 1.08; // EUR/USD fallback
          let total = 0;

          (accRes.data || []).forEach(a => {
            total += a.currency === 'USD' ? a.balance / rate : a.balance;
          });

          (invRes.data || []).forEach(i => {
            const val = i.quantity * (i.current_price || i.avg_purchase_price);
            total += i.currency === 'USD' ? val / rate : val;
          });

          (extRes.data || []).forEach(e => {
            total += e.currency === 'USD' ? e.amount / rate : e.amount;
          });

          setNetWorth(total);
          setLoadingPrices(false);
        })
      );
    }

    await Promise.all(promises);
  }, [user, visibleFields]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeFields = visibleFields.filter(f => {
    if (f === 'grade') return true;
    if (f === 'netWorth') return true;
    return false;
  });

  if (activeFields.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-center min-h-[80px]">
        <p className="text-xs text-muted-foreground">Keine Statistik ausgewaehlt</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-2.5">
        {visibleFields.includes('grade') && averageGrade !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-accent" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-muted-foreground">Schnitt</span>
            </div>
            <span className="text-lg font-bold font-mono">{averageGrade}P</span>
          </div>
        )}

        {visibleFields.includes('netWorth') && (
          <button
            onClick={() => !editMode && setShowFinance(true)}
            className="flex items-center justify-between w-full hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-muted-foreground">Vermoegen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold font-mono">
                {loadingPrices
                  ? '...'
                  : `${netWorth.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`}
              </span>
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>

      <FinanceSheetWrapper open={showFinance} onOpenChange={setShowFinance} />
    </>
  );
}
