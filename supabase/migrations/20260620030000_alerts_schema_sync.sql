-- Schema sync + columns needed for the new alert types.
-- BACKFILL: several staff_members columns were added directly in Neon without a
-- migration (profile_id, salary, monthly_salary, cin, cnss, address,
-- emergency_contact, notes). This reproduces them, adds the genuinely-new
-- columns (vendor_invoices.due_date, staff_members.contract_end_date), and keeps
-- version control in sync with the live database.

-- Vendor-invoice payment-due alerts need an explicit due date.
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS due_date DATE;

-- Staff: backfill untracked columns + add contract_end_date (new, for contract-expiry alerts).
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS cin TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS cnss TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS contract_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_staff_members_contract_end_date ON public.staff_members(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_due_date ON public.vendor_invoices(due_date);
