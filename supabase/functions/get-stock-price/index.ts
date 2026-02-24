import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch current EUR/USD exchange rate
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
    console.log('EUR/USD rate:', rate);
    return rate || 1.08; // Fallback rate
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return 1.08; // Fallback rate
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, targetCurrency = 'EUR' } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching price for ${symbol}, target currency: ${targetCurrency}`);

    // Use Yahoo Finance API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error('Yahoo Finance API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stock price', status: response.status }),
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
    
    // Get exchange rate if conversion needed
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
        // Approximate GBP conversion
        if (targetCurrency === 'EUR') {
          exchangeRate = 1.17;
        } else if (targetCurrency === 'USD') {
          exchangeRate = 1.27;
        }
        convertedPrice = price * exchangeRate;
      }
    }

    console.log(`Price: ${price} ${sourceCurrency} -> ${convertedPrice.toFixed(4)} ${targetCurrency}`);

    return new Response(
      JSON.stringify({
        symbol: symbol,
        price: convertedPrice,
        originalPrice: price,
        sourceCurrency: sourceCurrency,
        targetCurrency: targetCurrency,
        exchangeRate: exchangeRate,
        previousClose: previousClose,
        change: price - previousClose,
        changePercent: ((price - previousClose) / previousClose) * 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
