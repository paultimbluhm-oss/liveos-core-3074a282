import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, addWeeks, addMonths, addYears, format, isBefore, isEqual, startOfDay } from "https://esm.sh/date-fns@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Automation {
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

function getExecutionDates(auto: Automation, fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(fromDate);
  
  // Set to execution day
  if (auto.interval_type === 'weekly') {
    // execution_day is day of week (0 = Sunday)
    const dayOfWeek = auto.execution_day;
    const currentDay = currentDate.getDay();
    const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
    currentDate = addDays(currentDate, daysUntilNext);
  } else {
    // Monthly/Yearly: execution_day is day of month
    currentDate.setDate(auto.execution_day);
    if (currentDate < fromDate) {
      if (auto.interval_type === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      } else {
        currentDate = addYears(currentDate, 1);
      }
    }
  }
  
  while (isBefore(currentDate, toDate) || isEqual(startOfDay(currentDate), startOfDay(toDate))) {
    dates.push(new Date(currentDate));
    
    if (auto.interval_type === 'weekly') {
      currentDate = addWeeks(currentDate, 1);
    } else if (auto.interval_type === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    } else {
      currentDate = addYears(currentDate, 1);
    }
  }
  
  return dates;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');

    // Get all active automations
    const { data: automations, error: autoError } = await supabase
      .from('v2_automations')
      .select('*')
      .eq('is_active', true);

    if (autoError) throw autoError;

    let processedCount = 0;
    let transactionsCreated = 0;

    for (const auto of automations || []) {
      // Determine the start date for checking
      const lastExecuted = auto.last_executed_at 
        ? startOfDay(new Date(auto.last_executed_at))
        : startOfDay(addMonths(new Date(), -1)); // Default to 1 month ago if never executed

      // Get all execution dates from last execution to today
      const executionDates = getExecutionDates(auto, addDays(lastExecuted, 1), today);

      for (const execDate of executionDates) {
        const execDateStr = format(execDate, 'yyyy-MM-dd');
        const executionId = `${auto.id}_${execDateStr}`;

        // Check if this execution already exists
        const { data: existingTx } = await supabase
          .from('v2_transactions')
          .select('id')
          .eq('execution_id', executionId)
          .single();

        if (existingTx) {
          // Already executed, skip
          continue;
        }

        // Create the transaction
        const transactionData: Record<string, unknown> = {
          user_id: auto.user_id,
          transaction_type: auto.automation_type === 'investment' ? 'investment_buy' : auto.automation_type,
          amount: auto.amount,
          currency: auto.currency,
          date: execDateStr,
          account_id: auto.account_id,
          to_account_id: auto.to_account_id,
          investment_id: auto.investment_id,
          category_id: auto.category_id,
          note: auto.note ? `${auto.note} (Auto: ${auto.name})` : `Auto: ${auto.name}`,
          automation_id: auto.id,
          execution_id: executionId,
        };

        const { error: txError } = await supabase
          .from('v2_transactions')
          .insert(transactionData);

        if (txError) {
          console.error(`Failed to create transaction for automation ${auto.id}:`, txError);
          continue;
        }

        // Update account balances
        if (auto.account_id) {
          const { data: account } = await supabase
            .from('v2_accounts')
            .select('balance')
            .eq('id', auto.account_id)
            .single();

          if (account) {
            let newBalance = account.balance;
            if (auto.automation_type === 'income') {
              newBalance += auto.amount;
            } else if (auto.automation_type === 'expense' || auto.automation_type === 'transfer' || auto.automation_type === 'investment') {
              newBalance -= auto.amount;
            }

            await supabase
              .from('v2_accounts')
              .update({ balance: newBalance })
              .eq('id', auto.account_id);
          }
        }

        // Update target account for transfers
        if (auto.automation_type === 'transfer' && auto.to_account_id) {
          const { data: toAccount } = await supabase
            .from('v2_accounts')
            .select('balance')
            .eq('id', auto.to_account_id)
            .single();

          if (toAccount) {
            await supabase
              .from('v2_accounts')
              .update({ balance: toAccount.balance + auto.amount })
              .eq('id', auto.to_account_id);
          }
        }

        // Update investment for investment automations
        if (auto.automation_type === 'investment' && auto.investment_id) {
          const { data: investment } = await supabase
            .from('v2_investments')
            .select('quantity, avg_purchase_price, current_price')
            .eq('id', auto.investment_id)
            .single();

          if (investment && investment.current_price) {
            const purchaseQty = auto.amount / investment.current_price;
            const oldValue = investment.quantity * investment.avg_purchase_price;
            const newQty = investment.quantity + purchaseQty;
            const newAvg = (oldValue + auto.amount) / newQty;

            await supabase
              .from('v2_investments')
              .update({ 
                quantity: newQty,
                avg_purchase_price: newAvg,
              })
              .eq('id', auto.investment_id);
          }
        }

        transactionsCreated++;
      }

      // Update automation with last execution date
      await supabase
        .from('v2_automations')
        .update({ 
          last_executed_at: today.toISOString(),
          next_execution_date: format(
            getExecutionDates(auto, addDays(today, 1), addMonths(today, 2))[0] || today,
            'yyyy-MM-dd'
          ),
        })
        .eq('id', auto.id);

      processedCount++;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCount} automations, created ${transactionsCreated} transactions`,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in v2-process-automations:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
