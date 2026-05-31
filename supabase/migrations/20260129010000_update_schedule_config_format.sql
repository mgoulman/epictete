-- Update generate_staff_schedules to handle new shifts array format
-- Backward compatible: detects old vs new format by checking for shifts/default_shifts/working_days keys

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
  v_shift JSONB;
  v_count INTEGER := 0;
  v_is_new_format BOOLEAN;
  v_working_days JSONB;
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
      v_day_name := LOWER(TRIM(TO_CHAR(v_current_date, 'day')));
      v_day_config := v_staff.schedule_config->v_day_name;

      IF v_day_config IS NOT NULL AND (v_day_config->>'enabled')::boolean = true THEN
        -- Check if new format (has shifts array) or old format (has start_time/end_time)
        v_is_new_format := v_day_config ? 'shifts';

        IF v_is_new_format THEN
          -- New format: iterate shifts array
          FOR v_shift IN SELECT * FROM jsonb_array_elements(v_day_config->'shifts') LOOP
            INSERT INTO public.schedules (staff_id, date, start_time, end_time, shift_type)
            VALUES (
              p_staff_id,
              v_current_date,
              (v_shift->>'start_time')::TIME,
              (v_shift->>'end_time')::TIME,
              'regular'
            )
            ON CONFLICT DO NOTHING;
            v_count := v_count + 1;
          END LOOP;
        ELSE
          -- Old format: single start_time/end_time
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
      END IF;

      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;

  -- For monthly type
  IF v_staff.schedule_type = 'monthly' THEN
    v_current_date := p_start_date;
    v_is_new_format := v_staff.schedule_config ? 'default_shifts';
    v_working_days := v_staff.schedule_config->'working_days';

    WHILE v_current_date <= p_end_date AND v_count < COALESCE((v_staff.schedule_config->>'days_per_month')::INTEGER, 22) LOOP
      v_day_name := LOWER(TRIM(TO_CHAR(v_current_date, 'day')));

      -- Check if this day should be worked
      IF v_working_days IS NOT NULL THEN
        -- New format: check working_days array
        IF v_working_days @> to_jsonb(v_day_name) THEN
          IF v_is_new_format THEN
            FOR v_shift IN SELECT * FROM jsonb_array_elements(v_staff.schedule_config->'default_shifts') LOOP
              INSERT INTO public.schedules (staff_id, date, start_time, end_time, shift_type)
              VALUES (
                p_staff_id,
                v_current_date,
                (v_shift->>'start_time')::TIME,
                (v_shift->>'end_time')::TIME,
                'regular'
              )
              ON CONFLICT DO NOTHING;
              v_count := v_count + 1;
            END LOOP;
          ELSE
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
        END IF;
      ELSE
        -- Old format fallback: skip weekends
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
      END IF;

      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

-- Update documentation comment
COMMENT ON COLUMN public.staff_members.schedule_config IS 'JSON configuration for the schedule. Weekly: {day: {enabled, shifts: [{start_time, end_time}]}}. Monthly: {default_shifts: [{start_time, end_time}], days_per_month, working_days: [day_names]}';
