-- Fix staff transport flags: the app treats transport_pickup / transport_dropoff
-- as booleans (transport beneficiary yes/no), but the columns were text, so a
-- toggle wrote a string that didn't round-trip (e.g. 'false' is truthy on read).
-- Convert them to real booleans.

ALTER TABLE public.staff_members
  ALTER COLUMN transport_pickup  TYPE boolean
    USING (lower(coalesce(transport_pickup,  'false')) IN ('true', 't', 'yes', '1')),
  ALTER COLUMN transport_dropoff TYPE boolean
    USING (lower(coalesce(transport_dropoff, 'false')) IN ('true', 't', 'yes', '1'));

ALTER TABLE public.staff_members
  ALTER COLUMN transport_pickup  SET DEFAULT false,
  ALTER COLUMN transport_dropoff SET DEFAULT false;
