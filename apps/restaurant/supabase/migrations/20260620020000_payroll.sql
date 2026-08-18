-- Payroll: per-staff monthly salary records + free-form payroll register entries.
-- BACKFILL: these tables were created directly in Neon without a migration.
-- This file reproduces their live schema (introspected from the DB) so the
-- database can be rebuilt from version control.
--   salary_records  → app/api/personnel/route.ts (type='salary'), reports/monthly-recap
--   payroll_entries → app/api/reports/payroll/route.ts

-- Structured per-staff salary record (base + bonuses - deductions = total)
CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  base_salary NUMERIC DEFAULT 0,
  bonuses NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Free-form monthly payroll register (employee_name is plain text, not an FK)
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_month DATE NOT NULL,
  employee_name TEXT NOT NULL,
  working_days NUMERIC DEFAULT 0,
  day_offs NUMERIC DEFAULT 0,
  holidays NUMERIC DEFAULT 0,
  cnss NUMERIC DEFAULT 0,
  tac NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_records_staff_id ON public.salary_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_year_month ON public.salary_records(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_pay_month ON public.payroll_entries(pay_month);
