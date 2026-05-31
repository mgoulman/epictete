-- ============================================
-- Financial Tracking System
-- Tables: daily_entries, expenses, inventory_movements
-- ============================================

-- ============================================
-- 1. DAILY_ENTRIES — Z de caisse daily summary
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date DATE NOT NULL UNIQUE,

  -- RECETTES (from Z de caisse)
  revenue_card NUMERIC(12,2) DEFAULT 0,
  revenue_cash NUMERIC(12,2) DEFAULT 0,
  revenue_transfer NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) GENERATED ALWAYS AS (revenue_card + revenue_cash + revenue_transfer) STORED,

  -- DEPENSES
  expense_cash NUMERIC(12,2) DEFAULT 0,
  expense_card_pro NUMERIC(12,2) DEFAULT 0,
  expense_tpe NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) GENERATED ALWAYS AS (expense_cash + expense_card_pro + expense_tpe) STORED,

  -- RETRAITS CARTE
  withdrawal_pro NUMERIC(12,2) DEFAULT 0,
  withdrawal_perso NUMERIC(12,2) DEFAULT 0,
  total_withdrawals NUMERIC(12,2) GENERATED ALWAYS AS (withdrawal_pro + withdrawal_perso) STORED,

  -- COMPUTED
  solde_theorique NUMERIC(12,2) GENERATED ALWAYS AS (
    (revenue_card + revenue_cash + revenue_transfer)
    - expense_cash - expense_card_pro - expense_tpe
    - withdrawal_pro
  ) STORED,

  -- META
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'locked')),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON public.daily_entries(entry_date DESC);

-- ============================================
-- 2. EXPENSES — Individual operating expenses
-- ============================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card_pro', 'tpe')),
  category TEXT NOT NULL CHECK (category IN (
    'vendor_order', 'market_purchase', 'utilities', 'equipment',
    'cleaning', 'transport', 'maintenance', 'salary_advance', 'other'
  )),

  description TEXT NOT NULL,

  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_transaction_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
  daily_entry_id UUID REFERENCES public.daily_entries(id) ON DELETE SET NULL,

  receipt_url TEXT,
  receipt_path TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_daily_entry ON public.expenses(daily_entry_id);

-- ============================================
-- 3. INVENTORY_MOVEMENTS — Stock change ledger
-- ============================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'invoice_receive', 'manual_add', 'manual_subtract',
    'sale_deduction', 'waste', 'adjustment', 'initial_stock'
  )),

  quantity_change NUMERIC(12,3) NOT NULL,
  quantity_before NUMERIC(12,3) NOT NULL,
  quantity_after NUMERIC(12,3) NOT NULL,

  unit_cost NUMERIC(12,2),

  reference_type TEXT,
  reference_id UUID,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_item ON public.inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_date ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON public.inventory_movements(movement_type);

-- ============================================
-- 4. TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_daily_entries_updated_at ON public.daily_entries;
CREATE TRIGGER update_daily_entries_updated_at
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- daily_entries
CREATE POLICY "Finance users can view daily entries"
  ON public.daily_entries FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.read'));

CREATE POLICY "Finance writers can manage daily entries"
  ON public.daily_entries FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'finance.write'));

-- expenses
CREATE POLICY "Finance users can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.read'));

CREATE POLICY "Finance writers can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'finance.write'));

-- inventory_movements
CREATE POLICY "Finance users can view inventory movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.read'));

CREATE POLICY "Finance writers can manage inventory movements"
  ON public.inventory_movements FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'finance.write'));
