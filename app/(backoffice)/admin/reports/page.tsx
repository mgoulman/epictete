'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Calendar, Table, BarChart3, Receipt, ArrowUpDown, Plus, Download,
  ChevronLeft, ChevronRight, X, Trash2, Save, Check, AlertTriangle,
  TrendingUp, TrendingDown, DollarSign, Package, Loader2, FileText, Printer
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface DailyEntry {
  id: string;
  entry_date: string;
  revenue_card: number;
  revenue_cash: number;
  revenue_transfer: number;
  total_revenue: number;
  expense_cash: number;
  expense_cash_desc: string | null;
  expense_card_pro: number;
  expense_card_pro_desc: string | null;
  expense_tpe: number;
  expense_tpe_desc: string | null;
  total_expenses: number;
  withdrawal_pro: number;
  withdrawal_pro_desc: string | null;
  withdrawal_perso: number;
  withdrawal_perso_desc: string | null;
  total_withdrawals: number;
  solde_theorique: number;
  observations: string | null;
  status: 'draft' | 'validated' | 'locked';
  created_at: string;
  updated_at: string;
}

interface CashSheetItem {
  label: string;
  amount: number;
}

interface CashSheet {
  id?: string;
  entry_date: string;
  total_ca: number;
  total_cb: number;
  total_especes: number;
  especes_note: string | null;
  paid_items: CashSheetItem[];
  unpaid_items: CashSheetItem[];
  paid_outside_items: CashSheetItem[];
  total_depense: number;
  reste_especes: number;
  manager_name: string | null;
  visa_caisse: string | null;
}

interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  payment_method: 'cash' | 'card_pro' | 'tpe';
  category: string;
  description: string;
  vendor_id: string | null;
  vendor: { id: string; name: string } | null;
  daily_entry_id: string | null;
  created_at: string;
}

interface MonthlyRecap {
  month: string;
  totals: {
    revenue_card: number;
    revenue_cash: number;
    revenue_transfer: number;
    total_revenue: number;
    expense_cash: number;
    expense_card_pro: number;
    expense_tpe: number;
    total_expenses: number;
    withdrawal_pro: number;
    withdrawal_perso: number;
    total_withdrawals: number;
    solde_theorique: number;
  };
  metrics: {
    daysWorked: number;
    avgDailyRevenue: number;
    avgDailyExpense: number;
    bestDay: { date: string; revenue: number };
    totalSalaries: number;
    totalVendorDebts: number;
    totalVendorPayments: number;
    netResult: number;
  };
  entries: DailyEntry[];
}

interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  inventory_item: { id: string; name: string; unit: string } | null;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

type TabType = 'daily' | 'suivi' | 'recap' | 'expenses' | 'movements';

// ============================================
// Helpers
// ============================================
const fmtMAD = (n: number) => {
  if (n == null || isNaN(n)) return '0.00 DH';
  return n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
};

// Short format without "DH" suffix — used in compact tables
const fmtMADShort = (n: number) => {
  if (n == null || isNaN(n) || n === 0) return '—';
  return n.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const fmtPct = (n: number, total: number) => {
  if (!total) return '—';
  return ((n / total) * 100).toFixed(1) + '%';
};

const getMonthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const EXPENSE_CATEGORIES = [
  'vendor_order', 'market_purchase', 'utilities', 'equipment',
  'cleaning', 'transport', 'maintenance', 'salary_advance', 'other'
] as const;

const PAYMENT_METHODS = ['cash', 'card_pro', 'tpe'] as const;

// ============================================
// Component
// ============================================
export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const rp = t.backoffice.reportsPage;

  const tabParam = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['daily', 'suivi', 'recap', 'expenses', 'movements'];
  const activeTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : 'daily';
  const setActiveTab = (tab: TabType) => router.push(`/admin/reports?tab=${tab}`, { scroll: false });

  // ── Daily Entry State ──
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [entry, setEntry] = useState<DailyEntry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [posTotal, setPosTotal] = useState<number | null>(null);
  const [previousEntry, setPreviousEntry] = useState<DailyEntry | null>(null);
  const [form, setForm] = useState({
    revenue_card: 0, revenue_cash: 0, revenue_transfer: 0,
    expense_cash: 0, expense_cash_desc: '',
    expense_card_pro: 0, expense_card_pro_desc: '',
    expense_tpe: 0, expense_tpe_desc: '',
    withdrawal_pro: 0, withdrawal_pro_desc: '',
    withdrawal_perso: 0, withdrawal_perso_desc: '',
    observations: '',
  });

  // ── Cash Sheet (Feuille de Caisse) State ──
  const [cashSheet, setCashSheet] = useState<CashSheet>({
    entry_date: today,
    total_ca: 0, total_cb: 0, total_especes: 0,
    especes_note: '',
    paid_items: [{ label: '', amount: 0 }],
    unpaid_items: [{ label: '', amount: 0 }],
    paid_outside_items: [{ label: '', amount: 0 }],
    total_depense: 0,
    reste_especes: 0,
    manager_name: '', visa_caisse: '',
  });
  const [cashSheetSaving, setCashSheetSaving] = useState(false);
  const [showCashSheet, setShowCashSheet] = useState(false);

  // ── Suivi / Recap State ──
  const [selectedMonth, setSelectedMonth] = useState(getMonthStr(new Date()));
  const [monthEntries, setMonthEntries] = useState<DailyEntry[]>([]);
  const [monthPosTotals, setMonthPosTotals] = useState<Record<string, number>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [recap, setRecap] = useState<MonthlyRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);

  // ── Expenses State ──
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_date: today, amount: 0, payment_method: 'cash' as string,
    category: 'market_purchase' as string, description: '', vendor_id: '',
  });

  // ── Movements State ──
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Computed totals for the daily entry form
  const totalRevenue = form.revenue_card + form.revenue_cash + form.revenue_transfer;
  const totalExpenses = form.expense_cash + form.expense_card_pro + form.expense_tpe;
  const totalWithdrawals = form.withdrawal_pro + form.withdrawal_perso;
  const soldeTheorique = totalRevenue - totalExpenses - form.withdrawal_pro;

  // ── Fetchers ──
  const fetchCashSheet = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/reports/cash-sheets?date=${date}`);
      const data = await res.json();
      if (data.sheet) {
        setCashSheet({
          ...data.sheet,
          paid_items: (data.sheet.paid_items?.length ? data.sheet.paid_items : [{ label: '', amount: 0 }]),
          unpaid_items: (data.sheet.unpaid_items?.length ? data.sheet.unpaid_items : [{ label: '', amount: 0 }]),
          paid_outside_items: (data.sheet.paid_outside_items?.length ? data.sheet.paid_outside_items : [{ label: '', amount: 0 }]),
        });
      } else {
        setCashSheet({
          entry_date: date,
          total_ca: 0, total_cb: 0, total_especes: 0,
          especes_note: '',
          paid_items: [{ label: '', amount: 0 }],
          unpaid_items: [{ label: '', amount: 0 }],
          paid_outside_items: [{ label: '', amount: 0 }],
          total_depense: 0, reste_especes: 0,
          manager_name: '', visa_caisse: '',
        });
      }
    } catch { /* silent */ }
  }, []);

  const saveCashSheet = async () => {
    setCashSheetSaving(true);
    try {
      const res = await fetch('/api/reports/cash-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cashSheet),
      });
      const data = await res.json();
      if (data.success) {
        // Auto-fill the suivi form with values from cash sheet
        const totalDepense = (cashSheet.paid_items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
        setForm(f => ({
          ...f,
          revenue_card: cashSheet.total_cb,
          revenue_cash: cashSheet.total_especes,
          expense_cash: totalDepense,
          expense_cash_desc: cashSheet.paid_items.filter(i => i.label).map(i => `${i.label}: ${i.amount}`).join(', '),
        }));
        setCashSheet(prev => ({ ...prev, ...data.sheet }));
      }
    } catch { /* silent */ } finally {
      setCashSheetSaving(false);
    }
  };

  const exportCashSheetPDF = () => {
    // Open print-ready window with the receipt design
    const win = window.open('', '_blank', 'width=600,height=900');
    if (!win) return;
    const date = new Date(cashSheet.entry_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const fmt = (n: number) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const renderItems = (items: CashSheetItem[]) => items.filter(i => i.label).map(i => `<div>${i.label} : ${fmt(Number(i.amount))}</div>`).join('') || '<div>&nbsp;</div>';

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Feuille de Caisse — ${date}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 600px; margin: 20px auto; padding: 20px; color: #000; }
        .header { background: #e8e9d8; text-align: center; padding: 8px; border: 1px solid #999; margin-bottom: 0; }
        .logo { font-family: 'Brush Script MT', cursive; font-size: 36px; text-align: center; padding: 16px 0; border: 1px solid #999; border-top: 0; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; vertical-align: top; }
        .label { font-weight: bold; width: 30%; }
        .amount { text-align: right; width: 25%; font-family: monospace; }
        .col-section { min-height: 200px; vertical-align: top; }
        .col-header { background: #f5f5f0; font-weight: bold; text-align: center; }
        .signature { padding: 20px 10px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style></head><body>
      <div class="header">FEUILLE DE CAISSE</div>
      <div class="logo">epictete</div>
      <table>
        <tr><td colspan="2" class="amount">DATE : ${date}</td></tr>
        <tr><td class="label">TOTAL CA :</td><td class="amount">${fmt(cashSheet.total_ca)}</td></tr>
        <tr><td class="label">TOTAL CB :</td><td class="amount">${fmt(cashSheet.total_cb)}</td></tr>
        <tr><td class="label">TOTAL ESPÈCES :</td><td class="amount">${fmt(cashSheet.total_especes)}${cashSheet.especes_note ? `<br><span style="font-size:11px;font-weight:normal">${cashSheet.especes_note}</span>` : ''}</td></tr>
      </table>
      <table style="margin-top:0">
        <tr>
          <th class="col-header">PAYÉ</th>
          <th class="col-header">NON PAYÉ</th>
          <th class="col-header">PAYÉ HORS CAISSE</th>
        </tr>
        <tr>
          <td class="col-section">${renderItems(cashSheet.paid_items)}</td>
          <td class="col-section">${renderItems(cashSheet.unpaid_items)}</td>
          <td class="col-section">${renderItems(cashSheet.paid_outside_items)}</td>
        </tr>
      </table>
      <table style="margin-top:0">
        <tr><td class="label">TOTAL DÉPENSE :</td><td class="amount">${fmt(cashSheet.total_depense)}</td></tr>
        <tr><td class="label">RESTE EN ESPÈCES :</td><td class="amount">${fmt(cashSheet.reste_especes)}</td></tr>
      </table>
      <table style="margin-top:24px">
        <tr><td class="label" style="width:25%">MANAGER</td><td class="signature">${cashSheet.manager_name || ''}</td></tr>
        <tr><td class="label">VISA CAISSE</td><td class="signature">${cashSheet.visa_caisse || ''}</td></tr>
      </table>
      <div class="no-print" style="text-align:center;margin-top:20px">
        <button onclick="window.print()" style="padding:8px 16px;font-size:14px">Imprimer</button>
      </div>
    </body></html>`);
    win.document.close();
  };

  const fetchDailyEntry = useCallback(async (date: string) => {
    setEntryLoading(true);
    try {
      const res = await fetch(`/api/reports/daily-entries?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data.entry) {
          setEntry(data.entry);
          setForm({
            revenue_card: Number(data.entry.revenue_card) || 0,
            revenue_cash: Number(data.entry.revenue_cash) || 0,
            revenue_transfer: Number(data.entry.revenue_transfer) || 0,
            expense_cash: Number(data.entry.expense_cash) || 0,
            expense_cash_desc: data.entry.expense_cash_desc || '',
            expense_card_pro: Number(data.entry.expense_card_pro) || 0,
            expense_card_pro_desc: data.entry.expense_card_pro_desc || '',
            expense_tpe: Number(data.entry.expense_tpe) || 0,
            expense_tpe_desc: data.entry.expense_tpe_desc || '',
            withdrawal_pro: Number(data.entry.withdrawal_pro) || 0,
            withdrawal_pro_desc: data.entry.withdrawal_pro_desc || '',
            withdrawal_perso: Number(data.entry.withdrawal_perso) || 0,
            withdrawal_perso_desc: data.entry.withdrawal_perso_desc || '',
            observations: data.entry.observations || '',
          });
        } else {
          setEntry(null);
          setForm({
            revenue_card: 0, revenue_cash: 0, revenue_transfer: 0,
            expense_cash: 0, expense_cash_desc: '',
            expense_card_pro: 0, expense_card_pro_desc: '',
            expense_tpe: 0, expense_tpe_desc: '',
            withdrawal_pro: 0, withdrawal_pro_desc: '',
            withdrawal_perso: 0, withdrawal_perso_desc: '',
            observations: '',
          });
        }
      }
    } catch (err) {
      console.error('Fetch daily entry error:', err);
    }
    setEntryLoading(false);
  }, []);

  const fetchPosTotal = useCallback(async (date: string) => {
    try {
      const month = date.substring(0, 7);
      const res = await fetch(`/api/reports/daily-entries?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPosTotal(data.posTotals?.[date] ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchPreviousEntry = useCallback(async (date: string) => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/reports/daily-entries?date=${prevStr}`);
      if (res.ok) {
        const data = await res.json();
        setPreviousEntry(data.entry || null);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchMonthEntries = useCallback(async () => {
    setMonthLoading(true);
    try {
      const res = await fetch(`/api/reports/daily-entries?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setMonthEntries(data.entries || []);
        setMonthPosTotals(data.posTotals || {});
      }
    } catch (err) {
      console.error('Fetch month entries error:', err);
    }
    setMonthLoading(false);
  }, [selectedMonth]);

  const fetchRecap = useCallback(async () => {
    setRecapLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly-recap?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setRecap(data);
      }
    } catch (err) {
      console.error('Fetch recap error:', err);
    }
    setRecapLoading(false);
  }, [selectedMonth]);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const params = new URLSearchParams({
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
      });
      const res = await fetch(`/api/reports/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error('Fetch expenses error:', err);
    }
    setExpensesLoading(false);
  }, [selectedMonth]);

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const params = new URLSearchParams({
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
      });
      const res = await fetch(`/api/reports/inventory-movements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
      }
    } catch (err) {
      console.error('Fetch movements error:', err);
    }
    setMovementsLoading(false);
  }, [selectedMonth]);

  // ── Effects ──
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyEntry(selectedDate);
      fetchPosTotal(selectedDate);
      fetchPreviousEntry(selectedDate);
      fetchCashSheet(selectedDate);
    }
  }, [activeTab, selectedDate, fetchDailyEntry, fetchPosTotal, fetchPreviousEntry, fetchCashSheet]);

  useEffect(() => {
    if (activeTab === 'suivi') fetchMonthEntries();
    if (activeTab === 'recap') fetchRecap();
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'movements') fetchMovements();
  }, [activeTab, selectedMonth, fetchMonthEntries, fetchRecap, fetchExpenses, fetchMovements]);

  // ── Handlers ──
  const handleSaveEntry = async (status: 'draft' | 'validated' = 'draft') => {
    setEntrySaving(true);
    try {
      const payload = {
        ...(entry?.id ? { id: entry.id } : {}),
        entry_date: selectedDate,
        ...form,
        status,
      };
      const method = entry?.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/reports/daily-entries', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save entry error:', err);
    }
    setEntrySaving(false);
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    try {
      const res = await fetch('/api/reports/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setNewExpense({ expense_date: today, amount: 0, payment_method: 'cash', category: 'market_purchase', description: '', vendor_id: '' });
        fetchExpenses();
      }
    } catch (err) {
      console.error('Add expense error:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      await fetch(`/api/reports/expenses?id=${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const navigateMonth = (dir: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(getMonthStr(d));
  };

  const getCatLabel = (cat: string) => {
    const map: Record<string, string> = {
      vendor_order: rp.catVendorOrder, market_purchase: rp.catMarketPurchase,
      utilities: rp.catUtilities, equipment: rp.catEquipment, cleaning: rp.catCleaning,
      transport: rp.catTransport, maintenance: rp.catMaintenance,
      salary_advance: rp.catSalaryAdvance, other: rp.catOther,
    };
    return map[cat] || cat;
  };

  const getMethodLabel = (m: string) => {
    const map: Record<string, string> = { cash: rp.cash, card_pro: rp.cardPro, tpe: rp.tpe };
    return map[m] || m;
  };

  const getMovementLabel = (m: string) => {
    const map: Record<string, string> = {
      invoice_receive: rp.invoiceReceive, manual_add: rp.manualAdd,
      manual_subtract: rp.manualSubtract, sale_deduction: rp.saleDeduction,
      waste: rp.waste, adjustment: rp.adjustment, initial_stock: rp.initialStock,
    };
    return map[m] || m;
  };

  // Number input helper
  const numInput = (value: number, onChange: (v: number) => void, label: string) => (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm text-right"
        placeholder="0.00"
      />
    </div>
  );

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <PermissionGate permission="finance.read" fallback={<div className="p-8 text-center text-muted-foreground">Access denied</div>}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{rp.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{rp.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit flex-wrap">
          {([
            { id: 'daily' as TabType, label: rp.tabs.daily, icon: Calendar },
            { id: 'suivi' as TabType, label: rp.tabs.suivi, icon: Table },
            { id: 'recap' as TabType, label: rp.tabs.recap, icon: BarChart3 },
            { id: 'expenses' as TabType, label: rp.tabs.expenses, icon: Receipt },
            { id: 'movements' as TabType, label: rp.tabs.movements, icon: ArrowUpDown },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: DAILY ENTRY                           */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Date Picker */}
              <div className="flex items-center gap-3">
                <button onClick={() => navigateDate(-1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="py-2.5 px-4 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium"
                />
                <button onClick={() => navigateDate(1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronRight className="w-4 h-4" />
                </button>
                {entry && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    entry.status === 'validated' ? 'bg-green-500/10 text-green-600' :
                    entry.status === 'locked' ? 'bg-red-500/10 text-red-500' :
                    'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    {entry.status === 'validated' ? rp.validated : entry.status === 'locked' ? rp.locked : rp.draft}
                  </span>
                )}
                <button
                  onClick={() => setShowCashSheet(s => !s)}
                  className="ml-auto flex items-center gap-2 px-3 py-2 bg-[#606338]/10 text-[#606338] border border-[#606338]/30 rounded-lg text-sm font-medium hover:bg-[#606338]/20 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {showCashSheet ? 'Masquer' : 'Étape 1: Feuille de Caisse'}
                </button>
              </div>

              {/* ═══════════ FEUILLE DE CAISSE (Step 1) ═══════════ */}
              {showCashSheet && (
                <div className="bg-secondary border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#606338]" />
                        Feuille de Caisse — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Remplir d'abord cette fiche, puis le suivi sera pré-rempli automatiquement.</p>
                    </div>
                    <button onClick={exportCashSheetPDF} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-card transition-colors">
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer
                    </button>
                  </div>

                  {/* Top totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">TOTAL CA</span>
                      <input type="number" step="0.01" value={cashSheet.total_ca || ''} onChange={e => setCashSheet({ ...cashSheet, total_ca: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-right" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">TOTAL CB</span>
                      <input type="number" step="0.01" value={cashSheet.total_cb || ''} onChange={e => setCashSheet({ ...cashSheet, total_cb: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-right" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">TOTAL ESPÈCES</span>
                      <input type="number" step="0.01" value={cashSheet.total_especes || ''} onChange={e => setCashSheet({ ...cashSheet, total_especes: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-right" />
                    </label>
                  </div>
                  <input type="text" value={cashSheet.especes_note || ''} onChange={e => setCashSheet({ ...cashSheet, especes_note: e.target.value })} placeholder="Note espèces (ex: 07/04/2026 (450,00))" className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs" />

                  {/* 3 columns: Payé / Non payé / Payé hors caisse */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {([
                      { key: 'paid_items' as const, title: 'PAYÉ', color: 'text-emerald-600', bg: 'bg-emerald-500/5' },
                      { key: 'unpaid_items' as const, title: 'NON PAYÉ', color: 'text-orange-600', bg: 'bg-orange-500/5' },
                      { key: 'paid_outside_items' as const, title: 'PAYÉ HORS CAISSE', color: 'text-blue-600', bg: 'bg-blue-500/5' },
                    ]).map(col => (
                      <div key={col.key} className={`${col.bg} border border-border rounded-lg p-3`}>
                        <div className={`text-xs font-bold uppercase ${col.color} mb-2 text-center`}>{col.title}</div>
                        <div className="space-y-1.5">
                          {cashSheet[col.key].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={item.label}
                                onChange={e => {
                                  const items = [...cashSheet[col.key]];
                                  items[idx] = { ...items[idx], label: e.target.value };
                                  setCashSheet({ ...cashSheet, [col.key]: items });
                                }}
                                placeholder="Description"
                                className="flex-1 min-w-0 px-2 py-1.5 bg-card border border-border rounded text-xs"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount || ''}
                                onChange={e => {
                                  const items = [...cashSheet[col.key]];
                                  items[idx] = { ...items[idx], amount: parseFloat(e.target.value) || 0 };
                                  setCashSheet({ ...cashSheet, [col.key]: items });
                                }}
                                placeholder="0"
                                className="w-20 px-2 py-1.5 bg-card border border-border rounded text-xs text-right"
                              />
                              {cashSheet[col.key].length > 1 && (
                                <button
                                  onClick={() => {
                                    const items = cashSheet[col.key].filter((_, i) => i !== idx);
                                    setCashSheet({ ...cashSheet, [col.key]: items });
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => setCashSheet({ ...cashSheet, [col.key]: [...cashSheet[col.key], { label: '', amount: 0 }] })}
                            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 border border-dashed border-border rounded flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Ajouter
                          </button>
                        </div>
                        {col.key === 'paid_items' && cashSheet.paid_items.some(i => i.amount > 0) && (
                          <div className="mt-2 pt-2 border-t border-border text-xs flex justify-between font-medium">
                            <span>Total:</span>
                            <span>{fmtMAD(cashSheet.paid_items.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bottom totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">TOTAL DÉPENSE</span>
                      <span className="text-lg font-bold text-orange-600">{fmtMAD(cashSheet.paid_items.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">RESTE EN ESPÈCES</span>
                      <span className={`text-lg font-bold ${cashSheet.total_especes - cashSheet.paid_items.reduce((s, i) => s + (Number(i.amount) || 0), 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtMAD(cashSheet.total_especes - cashSheet.paid_items.reduce((s, i) => s + (Number(i.amount) || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">MANAGER</span>
                      <input type="text" value={cashSheet.manager_name || ''} onChange={e => setCashSheet({ ...cashSheet, manager_name: e.target.value })} placeholder="Nom" className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">VISA CAISSE</span>
                      <input type="text" value={cashSheet.visa_caisse || ''} onChange={e => setCashSheet({ ...cashSheet, visa_caisse: e.target.value })} placeholder="Visa" className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                    </label>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-3 border-t border-border">
                    <button onClick={saveCashSheet} disabled={cashSheetSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] disabled:opacity-50 transition-colors">
                      {cashSheetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Enregistrer & Pré-remplir le Suivi
                    </button>
                  </div>
                </div>
              )}

              {entryLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Revenue Section */}
                  <div className="bg-secondary border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-foreground">{rp.revenue}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {numInput(form.revenue_card, v => setForm({ ...form, revenue_card: v }), rp.revenueCard)}
                      {numInput(form.revenue_cash, v => setForm({ ...form, revenue_cash: v }), rp.revenueCash)}
                      {numInput(form.revenue_transfer, v => setForm({ ...form, revenue_transfer: v }), rp.revenueTransfer)}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{rp.totalRevenue}</span>
                      <span className="text-lg font-bold text-foreground">{fmtMAD(totalRevenue)}</span>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div className="bg-secondary border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-orange-500" />
                      </div>
                      <h3 className="font-semibold text-foreground">{rp.expensesSection}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                        {numInput(form.expense_cash, v => setForm({ ...form, expense_cash: v }), rp.expenseCash)}
                        <input type="text" value={form.expense_cash_desc} onChange={e => setForm({ ...form, expense_cash_desc: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                        {numInput(form.expense_card_pro, v => setForm({ ...form, expense_card_pro: v }), rp.expenseCardPro)}
                        <input type="text" value={form.expense_card_pro_desc} onChange={e => setForm({ ...form, expense_card_pro_desc: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                        {numInput(form.expense_tpe, v => setForm({ ...form, expense_tpe: v }), rp.expenseTpe)}
                        <input type="text" value={form.expense_tpe_desc} onChange={e => setForm({ ...form, expense_tpe_desc: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{rp.totalExpenses}</span>
                      <span className="text-lg font-bold text-foreground">{fmtMAD(totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Withdrawals Section */}
                  <div className="bg-secondary border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-red-500" />
                      </div>
                      <h3 className="font-semibold text-foreground">{rp.withdrawals}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                        {numInput(form.withdrawal_pro, v => setForm({ ...form, withdrawal_pro: v }), rp.withdrawalPro)}
                        <input type="text" value={form.withdrawal_pro_desc} onChange={e => setForm({ ...form, withdrawal_pro_desc: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                        {numInput(form.withdrawal_perso, v => setForm({ ...form, withdrawal_perso: v }), rp.withdrawalPerso)}
                        <input type="text" value={form.withdrawal_perso_desc} onChange={e => setForm({ ...form, withdrawal_perso_desc: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">{rp.totalWithdrawals}</span>
                      <span className="text-lg font-bold text-foreground">{fmtMAD(totalWithdrawals)}</span>
                    </div>
                  </div>

                  {/* Solde Theorique */}
                  <div className={`rounded-xl p-5 border ${soldeTheorique >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-foreground">{rp.soldeTheorique}</span>
                      <span className={`text-2xl font-bold ${soldeTheorique >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtMAD(soldeTheorique)}
                      </span>
                    </div>
                  </div>

                  {/* Observations */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{rp.observations}</label>
                    <textarea
                      value={form.observations}
                      onChange={e => setForm({ ...form, observations: e.target.value })}
                      className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm resize-none"
                      rows={2}
                      placeholder={rp.observationsPlaceholder}
                    />
                  </div>

                  {/* Save Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSaveEntry('draft')}
                      disabled={entrySaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium hover:bg-card disabled:opacity-50"
                    >
                      {entrySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {rp.saveDraft}
                    </button>
                    <button
                      onClick={() => handleSaveEntry('validated')}
                      disabled={entrySaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium disabled:opacity-50"
                    >
                      {entrySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {rp.validate}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* POS Cross-reference */}
              {posTotal !== null && (
                <div className="bg-secondary border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{rp.posTotal}</p>
                  <p className="text-lg font-bold text-foreground">{fmtMAD(posTotal)}</p>
                  {totalRevenue > 0 && Math.abs(totalRevenue - posTotal) > totalRevenue * 0.05 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Ecart &gt; 5% avec Z caisse</span>
                    </div>
                  )}
                </div>
              )}

              {/* Previous Day */}
              {previousEntry && (
                <div className="bg-secondary border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-3">{rp.previousDay}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{rp.totalRevenue}</span>
                      <span className="font-medium">{fmtMAD(Number(previousEntry.total_revenue))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{rp.totalExpenses}</span>
                      <span className="font-medium">{fmtMAD(Number(previousEntry.total_expenses))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{rp.totalWithdrawals}</span>
                      <span className="font-medium">{fmtMAD(Number(previousEntry.total_withdrawals))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-medium text-foreground">{rp.soldeTheorique}</span>
                      <span className={`font-bold ${Number(previousEntry.solde_theorique) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtMAD(Number(previousEntry.solde_theorique))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: SUIVI JOURNALIER                      */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'suivi' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateMonth(-1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground capitalize min-w-[160px] text-center">
                  {monthLabel(selectedMonth)}
                </span>
                <button onClick={() => navigateMonth(1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {monthLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
                </div>
              ) : monthEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Calendar className="w-10 h-10 mb-3 opacity-50" />
                  <p>{rp.noEntries}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-secondary text-[10px] text-muted-foreground uppercase tracking-wide">
                        <th rowSpan={2} className="sticky left-0 z-10 bg-secondary px-3 py-3 text-left border-r border-border min-w-[68px] font-semibold">{rp.date}</th>
                        <th colSpan={4} className="px-3 py-2 text-center border-r border-border font-semibold text-[#606338]">Recettes</th>
                        <th colSpan={4} className="px-3 py-2 text-center border-r border-border font-semibold text-foreground/80">Dépenses</th>
                        <th colSpan={3} className="px-3 py-2 text-center border-r border-border font-semibold text-foreground/80">Retraits</th>
                        <th rowSpan={2} className="px-3 py-3 text-right font-semibold align-bottom">Solde</th>
                        <th rowSpan={2} className="px-3 py-3 text-left font-semibold align-bottom">Obs.</th>
                      </tr>
                      <tr className="bg-secondary/70 text-[10px] text-muted-foreground border-t border-border">
                        <th className="px-2 py-2 text-right font-medium">Carte</th>
                        <th className="px-2 py-2 text-right font-medium">Espèces</th>
                        <th className="px-2 py-2 text-right font-medium">Vir.</th>
                        <th className="px-2 py-2 text-right border-r border-border font-bold text-[#606338]">Total</th>
                        <th className="px-2 py-2 text-right font-medium">Caisse</th>
                        <th className="px-2 py-2 text-right font-medium">Carte Pro</th>
                        <th className="px-2 py-2 text-right font-medium">TPE</th>
                        <th className="px-2 py-2 text-right border-r border-border font-bold">Total</th>
                        <th className="px-2 py-2 text-right font-medium">Pro</th>
                        <th className="px-2 py-2 text-right font-medium">Perso</th>
                        <th className="px-2 py-2 text-right border-r border-border font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      {monthEntries.map(e => (
                        <tr
                          key={e.id}
                          className="border-t border-border hover:bg-card/50 cursor-pointer"
                          onClick={() => { setSelectedDate(e.entry_date); setActiveTab('daily'); }}
                        >
                          <td className="sticky left-0 z-10 bg-secondary px-3 py-2 font-semibold border-r border-border">
                            {new Date(e.entry_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtMADShort(Number(e.revenue_card))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtMADShort(Number(e.revenue_cash))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtMADShort(Number(e.revenue_transfer))}</td>
                          <td className="px-2 py-2 text-right font-bold tabular-nums border-r border-border">{fmtMADShort(Number(e.total_revenue))}</td>
                          <td className="px-2 py-2 text-right tabular-nums" title={e.expense_cash_desc || ''}>
                            {fmtMADShort(Number(e.expense_cash))}
                            {e.expense_cash_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[80px] ml-auto">{e.expense_cash_desc}</div>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" title={e.expense_card_pro_desc || ''}>
                            {fmtMADShort(Number(e.expense_card_pro))}
                            {e.expense_card_pro_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[80px] ml-auto">{e.expense_card_pro_desc}</div>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" title={e.expense_tpe_desc || ''}>
                            {fmtMADShort(Number(e.expense_tpe))}
                            {e.expense_tpe_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[80px] ml-auto">{e.expense_tpe_desc}</div>}
                          </td>
                          <td className="px-2 py-2 text-right font-bold tabular-nums border-r border-border">{fmtMADShort(Number(e.total_expenses))}</td>
                          <td className="px-2 py-2 text-right tabular-nums" title={e.withdrawal_pro_desc || ''}>
                            {fmtMADShort(Number(e.withdrawal_pro))}
                            {e.withdrawal_pro_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[80px] ml-auto">{e.withdrawal_pro_desc}</div>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" title={e.withdrawal_perso_desc || ''}>
                            {fmtMADShort(Number(e.withdrawal_perso))}
                            {e.withdrawal_perso_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[80px] ml-auto">{e.withdrawal_perso_desc}</div>}
                          </td>
                          <td className="px-2 py-2 text-right font-bold tabular-nums border-r border-border">{fmtMADShort(Number(e.total_withdrawals))}</td>
                          <td className={`px-2 py-2 text-right font-bold tabular-nums ${Number(e.solde_theorique) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fmtMADShort(Number(e.solde_theorique))}
                          </td>
                          <td className="px-2 py-2 text-[10px] text-muted-foreground max-w-[120px] truncate" title={e.observations || ''}>
                            {e.observations || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-card font-bold text-xs">
                        <td className="sticky left-0 z-10 bg-card px-3 py-3 border-r border-border">{rp.monthlyTotals}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.revenue_card), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.revenue_cash), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.revenue_transfer), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums border-r border-border text-emerald-600">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.total_revenue), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.expense_cash), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.expense_card_pro), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.expense_tpe), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums border-r border-border text-orange-600">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.total_expenses), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.withdrawal_pro), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.withdrawal_perso), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums border-r border-border text-red-600">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.total_withdrawals), 0))}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{fmtMADShort(monthEntries.reduce((s, e) => s + Number(e.solde_theorique), 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: RECAP MENSUEL                         */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'recap' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground capitalize min-w-[160px] text-center">
                {monthLabel(selectedMonth)}
              </span>
              <button onClick={() => navigateMonth(1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recapLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
              </div>
            ) : recap ? (
              <>
                {/* Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: rp.daysWorked, value: String(recap.metrics.daysWorked), icon: Calendar, color: 'blue' },
                    { label: rp.avgDailyRevenue, value: fmtMAD(recap.metrics.avgDailyRevenue), icon: TrendingUp, color: 'green' },
                    { label: rp.avgDailyExpense, value: fmtMAD(recap.metrics.avgDailyExpense), icon: TrendingDown, color: 'orange' },
                    { label: rp.bestDay, value: recap.metrics.bestDay.date ? `${new Date(recap.metrics.bestDay.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} — ${fmtMAD(recap.metrics.bestDay.revenue)}` : '—', icon: BarChart3, color: 'purple' },
                  ].map((card, i) => (
                    <div key={i} className="bg-secondary border border-border rounded-xl p-4">
                      <div className={`w-8 h-8 rounded-lg bg-${card.color}-500/10 flex items-center justify-center mb-2`}>
                        <card.icon className={`w-4 h-4 text-${card.color}-500`} />
                      </div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdown Table */}
                <div className="bg-secondary border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card text-xs text-muted-foreground uppercase">
                        <th className="px-4 py-3 text-left">{rp.indicator}</th>
                        <th className="px-4 py-3 text-right">{rp.amount}</th>
                        <th className="px-4 py-3 text-right">{rp.pctOfRevenue}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: rp.revenueCard, val: recap.totals.revenue_card, bold: false },
                        { label: rp.revenueCash, val: recap.totals.revenue_cash, bold: false },
                        { label: rp.revenueTransfer, val: recap.totals.revenue_transfer, bold: false },
                        { label: rp.totalRevenue, val: recap.totals.total_revenue, bold: true },
                        null,
                        { label: rp.expenseCash, val: recap.totals.expense_cash, bold: false },
                        { label: rp.expenseCardPro, val: recap.totals.expense_card_pro, bold: false },
                        { label: rp.expenseTpe, val: recap.totals.expense_tpe, bold: false },
                        { label: rp.totalExpenses, val: recap.totals.total_expenses, bold: true },
                        null,
                        { label: rp.withdrawalPro, val: recap.totals.withdrawal_pro, bold: false },
                        { label: rp.withdrawalPerso, val: recap.totals.withdrawal_perso, bold: false },
                        { label: rp.totalWithdrawals, val: recap.totals.total_withdrawals, bold: true },
                        null,
                        { label: rp.soldeTheorique, val: recap.totals.solde_theorique, bold: true, highlight: true },
                        null,
                        { label: rp.totalSalaries, val: recap.metrics.totalSalaries, bold: false },
                        { label: rp.totalVendorDebts, val: recap.metrics.totalVendorDebts, bold: false },
                        { label: rp.totalVendorPayments, val: recap.metrics.totalVendorPayments, bold: false },
                        { label: rp.netResult, val: recap.metrics.netResult, bold: true, highlight: true },
                      ].map((row, i) => {
                        if (!row) return <tr key={i} className="h-2" />;
                        return (
                          <tr key={i} className={`border-t border-border ${row.highlight ? 'bg-card' : ''}`}>
                            <td className={`px-4 py-2.5 ${row.bold ? 'font-bold' : ''}`}>{row.label}</td>
                            <td className={`px-4 py-2.5 text-right ${row.bold ? 'font-bold' : ''} ${row.highlight && row.val < 0 ? 'text-red-500' : ''}`}>
                              {fmtMAD(row.val)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {fmtPct(row.val, recap.totals.total_revenue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>{rp.noEntries}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: EXPENSES                              */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateMonth(-1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground capitalize min-w-[160px] text-center">
                  {monthLabel(selectedMonth)}
                </span>
                <button onClick={() => navigateMonth(1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> {rp.addExpense}
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {PAYMENT_METHODS.map(method => {
                const total = expenses.filter(e => e.payment_method === method).reduce((s, e) => s + Number(e.amount), 0);
                return (
                  <div key={method} className="bg-secondary border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">{getMethodLabel(method)}</p>
                    <p className="text-lg font-bold text-foreground mt-1">{fmtMAD(total)}</p>
                  </div>
                );
              })}
            </div>

            {/* Expenses Table */}
            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {expensesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Receipt className="w-10 h-10 mb-3 opacity-50" />
                  <p>{rp.noEntries}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card text-xs text-muted-foreground uppercase">
                        <th className="px-4 py-3 text-left">{rp.date}</th>
                        <th className="px-4 py-3 text-left">{rp.description}</th>
                        <th className="px-4 py-3 text-left">{rp.category}</th>
                        <th className="px-4 py-3 text-left">{rp.paymentMethod}</th>
                        <th className="px-4 py-3 text-right">{rp.amount}</th>
                        <th className="px-4 py-3 text-right">{rp.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp.id} className="border-t border-border hover:bg-card/50">
                          <td className="px-4 py-2.5">{new Date(exp.expense_date + 'T12:00:00').toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{exp.description}</p>
                            {exp.vendor?.name && <p className="text-xs text-muted-foreground">{exp.vendor.name}</p>}
                          </td>
                          <td className="px-4 py-2.5"><span className="px-2 py-1 bg-card rounded-md text-xs">{getCatLabel(exp.category)}</span></td>
                          <td className="px-4 py-2.5"><span className="px-2 py-1 bg-card rounded-md text-xs">{getMethodLabel(exp.payment_method)}</span></td>
                          <td className="px-4 py-2.5 text-right font-medium">{fmtMAD(Number(exp.amount))}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: STOCK MOVEMENTS                       */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground capitalize min-w-[160px] text-center">
                {monthLabel(selectedMonth)}
              </span>
              <button onClick={() => navigateMonth(1)} className="p-2 bg-secondary border border-border rounded-lg hover:bg-card">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {movementsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
                </div>
              ) : movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Package className="w-10 h-10 mb-3 opacity-50" />
                  <p>{rp.noEntries}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card text-xs text-muted-foreground uppercase">
                        <th className="px-4 py-3 text-left">{rp.date}</th>
                        <th className="px-4 py-3 text-left">{rp.product}</th>
                        <th className="px-4 py-3 text-left">{rp.type}</th>
                        <th className="px-4 py-3 text-right">{rp.qtyChange}</th>
                        <th className="px-4 py-3 text-right">{rp.before}</th>
                        <th className="px-4 py-3 text-right">{rp.after}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(mv => (
                        <tr key={mv.id} className="border-t border-border hover:bg-card/50">
                          <td className="px-4 py-2.5">{new Date(mv.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-2.5 font-medium">{mv.inventory_item?.name || '—'}</td>
                          <td className="px-4 py-2.5"><span className="px-2 py-1 bg-card rounded-md text-xs">{getMovementLabel(mv.movement_type)}</span></td>
                          <td className={`px-4 py-2.5 text-right font-bold ${Number(mv.quantity_change) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {Number(mv.quantity_change) > 0 ? '+' : ''}{Number(mv.quantity_change).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{Number(mv.quantity_before).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right">{Number(mv.quantity_after).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* MODAL: Add Expense                         */}
        {/* ═══════════════════════════════════════════ */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{rp.addExpense}</h3>
                <button onClick={() => setShowExpenseModal(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{rp.date}</label>
                  <input type="date" value={newExpense.expense_date}
                    onChange={e => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{rp.description}</label>
                  <input type="text" value={newExpense.description}
                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="Ex: Achat tomates marché Maarif" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{rp.amount}</label>
                    <input type="number" step="0.01" value={newExpense.amount || ''}
                      onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm text-right"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{rp.paymentMethod}</label>
                    <select value={newExpense.payment_method}
                      onChange={e => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{getMethodLabel(m)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{rp.category}</label>
                  <select value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{getCatLabel(c)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm">
                  Annuler
                </button>
                <button onClick={handleAddExpense}
                  className="px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium">
                  {rp.addExpense}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
