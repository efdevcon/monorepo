-- 1. Add columns
ALTER TABLE public."atproto-events"
ADD COLUMN show_on_calendar boolean DEFAULT false,
ADD COLUMN dont_return_from_api boolean DEFAULT false;

-- 2. Create a view for general API use
CREATE OR REPLACE VIEW public.safe_atproto_events AS
SELECT
  did,
  record
  -- (add other columns you want to expose)
FROM public."atproto-events"
WHERE NOT dont_return_from_api;

-- 3. Enable RLS
ALTER TABLE public."atproto-events" ENABLE ROW LEVEL SECURITY;

-- 4. Allow only Lasse to select all columns
CREATE POLICY "Allow Lasse to select all columns"
ON public."atproto-events"
FOR SELECT
USING (
  auth.email() = 'lasse.jacobsen@ethereum.org'
);

-- 5. Allow only Lasse to update the sensitive columns
CREATE POLICY "Allow Lasse to update sensitive columns"
ON public."atproto-events"
FOR UPDATE
USING (
  auth.email() = 'lasse.jacobsen@ethereum.org'
)
WITH CHECK (
  auth.email() = 'lasse.jacobsen@ethereum.org'
);
