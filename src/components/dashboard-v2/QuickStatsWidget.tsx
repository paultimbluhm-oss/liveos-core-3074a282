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
}

export function QuickStatsWidget({ size, editMode, statsConfig }: QuickStatsWidgetProps) {
  const { user } = useAuth();
  const [showFinance, setShowFinance] = useState(false);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const visibleFields = statsConfig?.visibleFields ?? ['grade', 'netWorth'];

  const fetchData = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();

    // Grades: scope to current V2 semester
    if (visibleFields.includes('grade')) {
      // Get user's current scope
      const { data: membership } = await supabase
        .from('v2_school_memberships')
        .select('current_grade_level, current_semester, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        // Find the semester_id for this scope
        const { data: semData } = await supabase
          .from('year_semesters')
          .select('id')
          .eq('school_id', membership.school_id)
          .eq('grade_level', membership.current_grade_level)
          .eq('semester', membership.current_semester)
          .maybeSingle();

        if (semData) {
          // Get courses for this semester
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('semester_id', semData.id)
            .eq('created_by', user.id);

          const courseIds = (courses || []).map(c => c.id);

          if (courseIds.length > 0) {
            const { data: grades } = await supabase
              .from('grades')
              .select('points')
              .eq('user_id', user.id)
              .in('course_id', courseIds);

            if (grades && grades.length > 0) {
              const avg = Math.round((grades.reduce((s, g) => s + g.points, 0) / grades.length) * 10) / 10;
              setAverageGrade(avg);
            } else {
              setAverageGrade(null);
            }
          } else {
            setAverageGrade(null);
          }
        } else {
          setAverageGrade(null);
        }
      } else {
        setAverageGrade(null);
      }
    }

    // Net worth from V2 finance
    if (visibleFields.includes('netWorth')) {
      setLoadingPrices(true);
      const [accRes, invRes, extRes] = await Promise.all([
        supabase.from('v2_accounts').select('balance, currency, is_active').eq('user_id', user.id).eq('is_active', true),
        supabase.from('v2_investments').select('quantity, avg_purchase_price, current_price, currency, is_active').eq('user_id', user.id).eq('is_active', true),
        supabase.from('v2_external_savings').select('amount, currency, is_received').eq('user_id', user.id).eq('is_received', false),
      ]);

      const rate = 1.08;
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
    }
  }, [user, visibleFields]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasGrade = visibleFields.includes('grade');
  const hasNetWorth = visibleFields.includes('netWorth');

  if (!hasGrade && !hasNetWorth) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-center min-h-[80px]">
        <p className="text-xs text-muted-foreground">Keine Statistik ausgewaehlt</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-2.5">
        {hasGrade && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-accent" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-muted-foreground">Schnitt</span>
            </div>
            <span className="text-lg font-bold font-mono">
              {averageGrade !== null ? `${averageGrade}P` : '---'}
            </span>
          </div>
        )}

        {hasNetWorth && (
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
                {loadingPrices || netWorth === null
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
