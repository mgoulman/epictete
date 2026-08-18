-- Add schedule configuration columns to staff_members table
-- This migration adds schedule_type and schedule_config to enable
-- automatic schedule generation for employees

-- Add schedule_type column
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS schedule_type TEXT CHECK (schedule_type IN ('weekly', 'monthly'));

-- Add schedule_config column (JSONB for flexible configuration)
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS schedule_config JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.staff_members.schedule_type IS 'Type of schedule: weekly (specific days) or monthly (full month)';
COMMENT ON COLUMN public.staff_members.schedule_config IS 'JSON configuration for the schedule. For weekly: {day: {enabled, start_time, end_time}}. For monthly: {default_start_time, default_end_time, days_per_month}';

-- Function to generate schedules based on staff member's schedule config
CREATE OR REPLACE FUNCTION public.generate_staff_schedules(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff RECORD;
  v_current_date DATE;
  v_day_name TEXT;
  v_day_config JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Get staff member with schedule config
  SELECT * INTO v_staff FROM public.staff_members WHERE id = p_staff_id;

  IF v_staff IS NULL OR v_staff.schedule_type IS NULL OR v_staff.schedule_config IS NULL THEN
    RETURN 0;
  END IF;

  -- Generate schedules for weekly schedule type
  IF v_staff.schedule_type = 'weekly' THEN
    v_current_date := p_start_date;

    WHILE v_current_date <= p_end_date LOOP
      -- Get day name in lowercase
      v_day_name := LOWER(TRIM(TO_CHAR(v_current_date, 'day')));

      -- Get day config from schedule_config
      v_day_config := v_staff.schedule_config->v_day_name;

      -- If day is enabled, create schedule
      IF v_day_config IS NOT NULL AND (v_day_config->>'enabled')::boolean = true THEN
        INSERT INTO public.schedules (staff_id, date, start_time, end_time, shift_type)
        VALUES (
          p_staff_id,
          v_current_date,
          (v_day_config->>'start_time')::TIME,
          (v_day_config->>'end_time')::TIME,
          'regular'
        )
        ON CONFLICT DO NOTHING;

        v_count := v_count + 1;
      END IF;

      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;

  -- For monthly type, generate based on days_per_month (weekdays only)
  IF v_staff.schedule_type = 'monthly' THEN
    v_current_date := p_start_date;

    WHILE v_current_date <= p_end_date AND v_count < COALESCE((v_staff.schedule_config->>'days_per_month')::INTEGER, 22) LOOP
      -- Skip weekends
      IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
        INSERT INTO public.schedules (staff_id, date, start_time, end_time, shift_type)
        VALUES (
          p_staff_id,
          v_current_date,
          (v_staff.schedule_config->>'default_start_time')::TIME,
          (v_staff.schedule_config->>'default_end_time')::TIME,
          'regular'
        )
        ON CONFLICT DO NOTHING;

        v_count := v_count + 1;
      END IF;

      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.generate_staff_schedules IS 'Generates schedule entries for a staff member based on their schedule configuration. Returns the number of schedules created.';
