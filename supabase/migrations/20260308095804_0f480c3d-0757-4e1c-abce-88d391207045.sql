
SELECT cron.schedule(
  'daily-finance-snapshot',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://usvexhegaiufodtstkxp.supabase.co/functions/v1/v2-daily-snapshot',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdmV4aGVnYWl1Zm9kdHN0a3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODkwMzMsImV4cCI6MjA4MjY2NTAzM30.rY5Gx2MyX0oN4_93QqhV6Zeij5j5zC55CbB6JYnEqjE"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
