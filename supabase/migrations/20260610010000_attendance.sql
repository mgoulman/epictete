-- Staff attendance / presence ("pointage"): auto-recorded when a linked staff
-- account logs in during their scheduled shift, validated against the planning.
CREATE TABLE IF NOT EXISTS public.attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  date            date NOT NULL,
  check_in_time   timestamptz,
  scheduled_start text,                 -- planned start (HH:MM) for reference
  status          text DEFAULT 'present', -- present | late
  created_at      timestamptz DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
