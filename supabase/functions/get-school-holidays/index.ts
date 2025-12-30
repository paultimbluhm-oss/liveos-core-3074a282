const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Holiday {
  start: string;
  end: string;
  year: number;
  stateCode: string;
  name: string;
  slug: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stateCode = 'NI', year } = await req.json();
    
    // Get current year and next year to ensure we have upcoming holidays
    const currentYear = year || new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    
    console.log(`Fetching holidays for state ${stateCode}, years: ${years.join(', ')}`);
    
    const allHolidays: Holiday[] = [];
    
    for (const y of years) {
      try {
        const response = await fetch(`https://ferien-api.de/api/v1/holidays/${stateCode}/${y}`);
        
        if (response.ok) {
          const holidays: Holiday[] = await response.json();
          console.log(`Found ${holidays.length} holidays for ${y}`);
          allHolidays.push(...holidays);
        } else {
          console.log(`No holidays found for ${stateCode}/${y}: ${response.status}`);
        }
      } catch (fetchError) {
        console.error(`Error fetching holidays for ${y}:`, fetchError);
      }
    }

    // Sort by start date
    allHolidays.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Transform to a more usable format
    const formattedHolidays = allHolidays.map(h => ({
      name: formatHolidayName(h.name),
      start: h.start.split('T')[0],
      end: h.end.split('T')[0],
      year: h.year,
      stateCode: h.stateCode,
    }));

    console.log(`Returning ${formattedHolidays.length} total holidays`);

    return new Response(
      JSON.stringify({ success: true, holidays: formattedHolidays }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching school holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatHolidayName(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Check for each holiday type in the name
  if (lowerName.includes('winterferien')) return 'Winterferien';
  if (lowerName.includes('osterferien')) return 'Osterferien';
  if (lowerName.includes('pfingstferien')) return 'Pfingstferien';
  if (lowerName.includes('sommerferien')) return 'Sommerferien';
  if (lowerName.includes('herbstferien')) return 'Herbstferien';
  if (lowerName.includes('weihnachtsferien')) return 'Weihnachtsferien';
  
  // Default: capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}