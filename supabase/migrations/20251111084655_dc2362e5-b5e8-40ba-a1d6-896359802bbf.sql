-- Schedule daily cohort statistics refresh at 3 AM UTC
SELECT cron.schedule(
  'daily-cohort-stats-refresh',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ufpavzvrtdzxwcwasaqj.supabase.co/functions/v1/compute-cohort-stats',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcGF2enZydGR6eHdjd2FzYXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODk0ODMsImV4cCI6MjA3NDI2NTQ4M30.KWdhL3IiQ0YWW2Q6MBHkXOwEz41ZU7EVS_eKG0Hn600"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);