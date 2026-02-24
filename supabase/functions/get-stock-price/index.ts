import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getExchangeRate(): Promise<number> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const data = await response.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return rate || 1.08;
  } catch {
    return 1.08;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claims?.claims) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { symbol, targetCurrency = 'EUR' } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stock price' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    const result = data.chart?.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'No data found for symbol' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const sourceCurrency = meta.currency;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    
    let convertedPrice = price;
    let exchangeRate = 1;
    
    if (sourceCurrency !== targetCurrency) {
      const eurUsdRate = await getExchangeRate();
      
      if (sourceCurrency === 'USD' && targetCurrency === 'EUR') {
        exchangeRate = 1 / eurUsdRate;
        convertedPrice = price * exchangeRate;
      } else if (sourceCurrency === 'EUR' && targetCurrency === 'USD') {
        exchangeRate = eurUsdRate;
        convertedPrice = price * exchangeRate;
      } else if (sourceCurrency === 'GBP') {
        if (targetCurrency === 'EUR') {
          exchangeRate = 1.17;
        } else if (targetCurrency === 'USD') {
          exchangeRate = 1.27;
        }
        convertedPrice = price * exchangeRate;
      }
    }

    return new Response(
      JSON.stringify({
        symbol,
        price: convertedPrice,
        originalPrice: price,
        sourceCurrency,
        targetCurrency,
        exchangeRate,
        previousClose,
        change: price - previousClose,
        changePercent: ((price - previousClose) / previousClose) * 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
