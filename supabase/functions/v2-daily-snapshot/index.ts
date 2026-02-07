import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all unique user IDs from v2_accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from('v2_accounts')
      .select('user_id')
      .order('user_id');

    if (accountsError) throw accountsError;

    const uniqueUserIds = [...new Set(accountsData?.map(a => a.user_id) || [])];
    let processedCount = 0;

    // Fetch EUR/USD rate (simplified - in production use a real API)
    const eurUsdRate = 1.08;

    for (const userId of uniqueUserIds) {
      // Get all accounts for this user
      const { data: accounts } = await supabase
        .from('v2_accounts')
        .select('id, balance, currency')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!accounts) continue;

      // Calculate account balances
      const accountBalances: Record<string, number> = {};
      let totalAccountsEur = 0;

      for (const acc of accounts) {
        accountBalances[acc.id] = acc.balance;
        if (acc.currency === 'USD') {
          totalAccountsEur += acc.balance / eurUsdRate;
        } else {
          totalAccountsEur += acc.balance;
        }
      }

      // Get investments and calculate value
      const { data: investments } = await supabase
        .from('v2_investments')
        .select('quantity, avg_purchase_price, current_price, currency')
        .eq('user_id', userId)
        .eq('is_active', true);

      let totalInvestmentsEur = 0;

      if (investments) {
        for (const inv of investments) {
          const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
          if (inv.currency === 'USD') {
            totalInvestmentsEur += value / eurUsdRate;
          } else {
            totalInvestmentsEur += value;
          }
        }
      }

      // Calculate today's cashflow from ALL transactions on this date
      const { data: todayTransactions } = await supabase
        .from('v2_transactions')
        .select('transaction_type, amount, currency')
        .eq('user_id', userId)
        .eq('date', today);

      let incomeEur = 0;
      let expensesEur = 0;

      if (todayTransactions) {
        for (const tx of todayTransactions) {
          const amountEur = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
          // Income and investment_sell count as income
          if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
            incomeEur += amountEur;
          // Expense and investment_buy count as expenses
          } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy') {
            expensesEur += amountEur;
          }
          // Transfers are NOT counted as income/expense (internal movement)
        }
      }

      const netWorthEur = totalAccountsEur + totalInvestmentsEur;

      // Upsert daily snapshot
      const { error: upsertError } = await supabase
        .from('v2_daily_snapshots')
        .upsert({
          user_id: userId,
          date: today,
          account_balances: accountBalances,
          total_accounts_eur: totalAccountsEur,
          total_investments_eur: totalInvestmentsEur,
          net_worth_eur: netWorthEur,
          income_eur: incomeEur,
          expenses_eur: expensesEur,
          eur_usd_rate: eurUsdRate,
        }, { onConflict: 'user_id,date' });

      if (!upsertError) {
        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created/updated snapshots for ${processedCount} users`,
        date: today,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v2-daily-snapshot:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
