import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get all users who have accounts or investments
    const { data: users, error: usersError } = await supabase
      .from('accounts')
      .select('user_id')
      .order('user_id');

    if (usersError) throw usersError;

    const uniqueUserIds = [...new Set(users?.map(u => u.user_id) || [])];
    const today = new Date().toISOString().split('T')[0];
    let processed = 0;

    for (const userId of uniqueUserIds) {
      // Get accounts balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId);

      const accountsBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      // Get investments and calculate value
      const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId);

      let investmentsBalance = 0;
      
      if (investments && investments.length > 0) {
        // For now, use purchase_price as the value
        // A more complex solution would fetch live prices, but that's expensive for a cron job
        investmentsBalance = investments.reduce((sum, inv) => sum + (inv.purchase_price || 0), 0);
      }

      const totalBalance = accountsBalance + investmentsBalance;

      // Upsert balance history for today
      const { error: upsertError } = await supabase
        .from('balance_history')
        .upsert({
          user_id: userId,
          date: today,
          total_balance: totalBalance,
          accounts_balance: accountsBalance,
          investments_balance: investmentsBalance,
        }, { onConflict: 'user_id,date' });

      if (!upsertError) {
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} users for date ${today}`,
        date: today 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in daily-balance-capture:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});