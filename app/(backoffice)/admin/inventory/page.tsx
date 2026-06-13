'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Package, Plus, Trash2, Search, Calendar,
  ChevronLeft, ChevronRight, Loader2, ShoppingCart,
  History, Download, Check, TrendingDown, Wallet, ClipboardList, Eye, X, ChevronDown
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import ExcelJS from 'exceljs';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  category_id: string | null;
  inventory_category: { id: string; name: string } | null;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  last_purchase_price: number;
  pack_size: number;
  vendor_id: string | null;
  vendor: { id: string; name: string } | null;
}

interface InventoryCategory {
  id: string;
  name: string;
}

interface PurchaseLine {
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  notes: string;
  // Pack mode
  pack_mode: boolean;
  pack_count: number;
  pack_size: number;
  pack_price: number;
  // For inline new product creation
  new_product_name: string;
  new_product_unit: string;
  new_product_category_id: string;
  new_product_vendor_id: string;
  new_vendor_name: string;
}

interface UsageLine {
  inventory_item_id: string;
  quantity: number;
  reason: string;
  notes: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number;
  reference_type: string;
  reference_id: string;
  notes: string | null;
  created_at: string;
  inventory_item: { id: string; name: string; unit: string } | null;
}

interface PurchaseOrderItem {
  id: string;
  order_id: string;
  inventory_item_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  received_quantity: number | null;
  vendor_id: string | null;
}

interface PurchaseOrder {
  id: string;
  vendor_id: string;
  vendor: { id: string; name: string } | null;
  order_date: string;
  expected_date: string | null;
  status: 'draft' | 'pending' | 'received' | 'cancelled';
  notes: string | null;
  total_amount: number;
  paid_amount: number;
  received_at: string | null;
  created_at: string;
  items: PurchaseOrderItem[];
}

type TabKey = 'purchase' | 'usage' | 'history' | 'orders';
type HistoryFilter = 'all' | 'purchase' | 'usage';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function displayDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
}

const USAGE_REASONS = [
  { value: 'consumption', labelFr: 'Consommation', labelEn: 'Consumption' },
  { value: 'sale', labelFr: 'Vente', labelEn: 'Sale' },
  { value: 'waste', labelFr: 'Perte / Déchet', labelEn: 'Waste / Loss' },
] as const;

// ─── Product Search Select ──────────────────────────────────────────────────

interface ProductSearchSelectProps {
  items: InventoryItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  newProductLabel?: string;
  showNewOption?: boolean;
}

function ProductSearchSelect({ items, value, onChange, placeholder, newProductLabel, showNewOption }: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === value);
  const isNew = value === '__new__';

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when filtered changes
  useEffect(() => { setHighlightIdx(0); }, [filtered]);

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filtered.length + (showNewOption ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showNewOption && highlightIdx === 0) {
        handleSelect('__new__');
      } else {
        const idx = showNewOption ? highlightIdx - 1 : highlightIdx;
        if (filtered[idx]) handleSelect(filtered[idx].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const displayValue = isNew ? `+ ${newProductLabel || 'New'}` : selected ? selected.name : '';

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : displayValue}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          placeholder={placeholder}
          className={`w-full bg-transparent border border-border rounded-lg pl-8 pr-3 py-2 text-sm ${!open && value ? 'text-foreground' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {showNewOption && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect('__new__')}
              className={`w-full text-left px-3 py-2 text-sm font-semibold text-[#606338] hover:bg-[#606338]/10 ${highlightIdx === 0 ? 'bg-[#606338]/10' : ''}`}
            >
              + {newProductLabel || 'New'}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">—</div>
          ) : (
            filtered.map((item, i) => {
              const idx = showNewOption ? i + 1 : i;
              return (
                <button
                  type="button"
                  key={item.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center justify-between ${highlightIdx === idx ? 'bg-secondary' : ''}`}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Multi Select Dropdown ──────────────────────────────────────────────────

function MultiSelectDropdown({ label, options, selected, onChange }: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options;
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm hover:bg-secondary transition-colors ${selected.length > 0 ? 'text-foreground border-[#606338]/50' : 'text-muted-foreground'}`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg w-56 max-h-64 overflow-hidden flex flex-col">
          {options.length > 6 && (
            <div className="p-2 border-b border-border">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="..." className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs" autoFocus />
            </div>
          )}
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm" onMouseDown={e => e.preventDefault()}>
                <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="rounded border-border accent-[#606338]" />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">—</p>}
          </div>
          {selected.length > 0 && (
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onChange([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 border-t border-border text-center w-full">
              Effacer ({selected.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { t, locale } = useTranslation();
  const inv = (t as Record<string, unknown>).inventoryPage as Record<string, unknown> | undefined;

  const tt = useCallback((key: string, fallback: string): string => {
    if (!inv) return fallback;
    const keys = key.split('.');
    let val: unknown = inv;
    for (const k of keys) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k];
      else return fallback;
    }
    return typeof val === 'string' ? val : fallback;
  }, [inv]);

  // ─── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── State ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>('history');

  // Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase form
  const [purchaseDate, setPurchaseDate] = useState(formatDate(new Date()));
  const [lines, setLines] = useState<PurchaseLine[]>([
    { inventory_item_id: '', quantity: 0, unit_cost: 0, notes: '', pack_mode: false, pack_count: 1, pack_size: 1, pack_price: 0, new_product_name: '', new_product_unit: 'kg', new_product_category_id: '', new_product_vendor_id: '', new_vendor_name: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [existingDayMovements, setExistingDayMovements] = useState<Movement[]>([]);
  const [vendorPayments, setVendorPayments] = useState<Record<string, number>>({});
  const [purchaseTvaAmount, setPurchaseTvaAmount] = useState(0);
  const [editingMovement, setEditingMovement] = useState<{ id: string; quantity: number; unit_cost: number } | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [detailMovements, setDetailMovements] = useState<Movement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Usage form
  const [usageDate, setUsageDate] = useState(formatDate(new Date()));
  const [usageLines, setUsageLines] = useState<UsageLine[]>([
    { inventory_item_id: '', quantity: 0, reason: 'consumption', notes: '' },
  ]);
  const [usageSaving, setUsageSaving] = useState(false);
  const [usageCategoryFilter, setUsageCategoryFilter] = useState('');
  const [usageSearchTerm, setUsageSearchTerm] = useState('');

  // History
  const [historyStart, setHistoryStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [historyEnd, setHistoryEnd] = useState(formatDate(new Date()));
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string[]>([]);
  const [historyProductFilter, setHistoryProductFilter] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [purchaseMovements, setPurchaseMovements] = useState<Movement[]>([]);
  const [usageMovements, setUsageMovements] = useState<Movement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderVendorId, setOrderVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(formatDate(new Date()));
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ inventory_item_id: string; product_name: string; quantity: number; unit: string; unit_cost: number; vendor_id: string }>>([]);
  const [orderSaving, setOrderSaving] = useState(false);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [receivePaidAmount, setReceivePaidAmount] = useState(0);

  // ─── Fetch inventory items + vendors ───────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, vendorRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/vendors?type=vendors'),
      ]);
      const invData = await invRes.json();
      const vendorData = await vendorRes.json();
      setItems(invData.items || []);
      setCategories(invData.categories || []);
      setVendors((vendorData.vendors || []).map((v: Vendor & Record<string, unknown>) => ({ id: v.id, name: v.name })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Fetch existing movements for the selected purchase date
  useEffect(() => {
    if (tab !== 'purchase') return;
    fetch(`/api/inventory/daily-purchase?startDate=${purchaseDate}&endDate=${purchaseDate}`)
      .then(r => r.json())
      .then(d => setExistingDayMovements(d.movements || []))
      .catch(() => setExistingDayMovements([]));
  }, [purchaseDate, tab]);

  // ─── Fetch history ────────────────────────────────────────────────────
  const fetchPurchaseHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (historyStart) params.set('startDate', historyStart);
    if (historyEnd) params.set('endDate', historyEnd);
    const res = await fetch(`/api/inventory/daily-purchase?${params}`);
    const data = await res.json();
    setPurchaseMovements(data.movements || []);
  }, [historyStart, historyEnd]);

  const fetchUsageHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (historyStart) params.set('startDate', historyStart);
    if (historyEnd) params.set('endDate', historyEnd);
    const res = await fetch(`/api/inventory/daily-usage?${params}`);
    const data = await res.json();
    setUsageMovements(data.movements || []);
  }, [historyStart, historyEnd]);

  const fetchAllHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      await Promise.all([fetchPurchaseHistory(), fetchUsageHistory()]);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchPurchaseHistory, fetchUsageHistory]);

  useEffect(() => {
    if (tab === 'history') fetchAllHistory();
  }, [tab, fetchAllHistory]);

  // ─── Purchase form logic ──────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = items;
    if (categoryFilter) result = result.filter(i => i.category_id === categoryFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(s));
    }
    return result;
  }, [items, categoryFilter, searchTerm]);

  const usageFilteredItems = useMemo(() => {
    let result = items;
    if (usageCategoryFilter) result = result.filter(i => i.category_id === usageCategoryFilter);
    if (usageSearchTerm) {
      const s = usageSearchTerm.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(s));
    }
    return result;
  }, [items, usageCategoryFilter, usageSearchTerm]);

  const addLine = () => {
    setLines(prev => [...prev, { inventory_item_id: '', quantity: 0, unit_cost: 0, notes: '', pack_mode: false, pack_count: 1, pack_size: 1, pack_price: 0, new_product_name: '', new_product_unit: 'kg', new_product_category_id: '', new_product_vendor_id: '', new_vendor_name: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof PurchaseLine, value: string | number | boolean) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      const updated = { ...line, [field]: value };

      // When selecting a product, check for duplicates and auto-fill
      if (field === 'inventory_item_id' && value && value !== '__new__') {
        const item = items.find(it => it.id === value);
        if (item) {
          const hasPackSize = (item.pack_size || 1) > 1;
          updated.pack_size = item.pack_size || 1;
          updated.pack_mode = hasPackSize;
          if (hasPackSize) {
            // Auto-fill pack price from last purchase price * pack_size
            updated.pack_price = Math.round((item.last_purchase_price || item.cost_per_unit || 0) * (item.pack_size || 1) * 100) / 100;
            updated.pack_count = 1;
            updated.quantity = item.pack_size || 1;
            updated.unit_cost = item.last_purchase_price || item.cost_per_unit || 0;
          } else {
            updated.unit_cost = item.last_purchase_price || item.cost_per_unit || 0;
          }
        }
      }

      // Recompute quantity and unit_cost when pack fields change
      if (updated.pack_mode && (field === 'pack_count' || field === 'pack_size' || field === 'pack_price')) {
        const ps = updated.pack_size || 1;
        const pc = updated.pack_count || 0;
        updated.quantity = pc * ps;
        updated.unit_cost = ps > 0 ? Math.round((updated.pack_price / ps) * 100) / 100 : 0;
      }

      // When toggling pack mode off, reset to direct entry
      if (field === 'pack_mode' && !value) {
        const item = items.find(it => it.id === updated.inventory_item_id);
        updated.unit_cost = item?.last_purchase_price || item?.cost_per_unit || 0;
        updated.quantity = 0;
      }

      return updated;
    }));
  };

  // Usage form logic
  const addUsageLine = () => {
    setUsageLines(prev => [...prev, { inventory_item_id: '', quantity: 0, reason: 'consumption', notes: '' }]);
  };

  const removeUsageLine = (index: number) => {
    setUsageLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateUsageLine = (index: number, field: keyof UsageLine, value: string | number) => {
    setUsageLines(prev => prev.map((line, i) => i !== index ? line : { ...line, [field]: value }));
  };

  const getItemById = (id: string) => items.find(i => i.id === id);

  const validLines = lines.filter(l => {
    if (l.quantity <= 0) return false;
    if (l.inventory_item_id === '__new__') return l.new_product_name.trim().length > 0;
    return !!l.inventory_item_id;
  });
  const subtotal = validLines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  // Group valid purchase lines by vendor for payment tracking
  const vendorSummary = useMemo(() => {
    const map: Record<string, { vendorId: string; vendorName: string; total: number }> = {};
    for (const line of validLines) {
      const lineTotal = line.quantity * line.unit_cost;
      if (line.inventory_item_id === '__new__') {
        // New product — use the assigned vendor
        const vid = line.new_product_vendor_id;
        if (vid) {
          const v = vendors.find(vn => vn.id === vid);
          const vName = line.new_vendor_name?.trim() || v?.name || '';
          if (vName) {
            if (!map[vid]) map[vid] = { vendorId: vid, vendorName: vName, total: 0 };
            map[vid].total += lineTotal;
          }
        } else if (line.new_vendor_name?.trim()) {
          // New vendor that doesn't exist yet — use name as key
          const key = `__new_${line.new_vendor_name.trim()}`;
          if (!map[key]) map[key] = { vendorId: key, vendorName: line.new_vendor_name.trim(), total: 0 };
          map[key].total += lineTotal;
        }
      } else {
        const item = items.find(i => i.id === line.inventory_item_id);
        if (!item?.vendor_id || !item.vendor) continue;
        const vid = item.vendor_id;
        if (!map[vid]) map[vid] = { vendorId: vid, vendorName: item.vendor.name, total: 0 };
        map[vid].total += lineTotal;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [validLines, items, vendors]);

  const total = subtotal + purchaseTvaAmount;

  const validUsageLines = usageLines.filter(l => l.inventory_item_id && l.quantity > 0);

  const navigateDate = (setter: (v: string) => void, current: string, direction: -1 | 1) => {
    const d = new Date(current + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    setter(formatDate(d));
  };

  const handleSavePurchase = async () => {
    if (validLines.length === 0) return;
    setSaving(true);
    try {
      // First, create any new products
      const resolvedLines = await Promise.all(
        validLines.map(async (line) => {
          if (line.inventory_item_id !== '__new__') return line;

          // Create new vendor if needed
          let vendorId = line.new_product_vendor_id || null;
          if (line.new_vendor_name.trim()) {
            const vRes = await fetch('/api/vendors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'vendor', name: line.new_vendor_name.trim() }),
            });
            const vData = await vRes.json();
            if (vData.vendor?.id) vendorId = vData.vendor.id;
          }

          // Create the product via inventory API
          const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: line.new_product_name.trim(),
              unit: line.new_product_unit || 'kg',
              category_id: line.new_product_category_id || null,
              vendor_id: vendorId,
              quantity: 0,
              cost_per_unit: line.unit_cost,
              minimum_stock: 0,
              pack_size: line.pack_mode ? line.pack_size : 1,
            }),
          });
          const data = await res.json();
          if (data.item?.id) {
            return { ...line, inventory_item_id: data.item.id };
          }
          return null; // failed to create
        })
      );

      const finalLines = resolvedLines.filter((l): l is PurchaseLine => l !== null && l.inventory_item_id !== '__new__');

      if (finalLines.length === 0) return;

      const res = await fetch('/api/inventory/daily-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: finalLines, date: purchaseDate }),
      });
      const data = await res.json();
      if (data.success) {
        // Create vendor transactions (debt + payment if any)
        // Distribute TVA proportionally across vendors
        const tvaRatio = subtotal > 0 ? purchaseTvaAmount / subtotal : 0;
        for (const vs of vendorSummary) {
          const paid = vendorPayments[vs.vendorId] || 0;
          const vendorTvaShare = Math.round(vs.total * tvaRatio * 100) / 100;
          const vendorTotal = Math.round((vs.total + vendorTvaShare) * 100) / 100;

          // Always create a debt transaction for the full amount
          if (vendorTotal > 0) {
            await fetch('/api/vendors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'transaction',
                vendor_id: vs.vendorId,
                transaction_type: 'debt',
                amount: vendorTotal,
                description: `Achats du ${purchaseDate}`,
                date: purchaseDate,
                reference: `purchase_${purchaseDate}`,
              }),
            });
          }

          // If paid, create a payment transaction
          if (paid > 0) {
            await fetch('/api/vendors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'transaction',
                vendor_id: vs.vendorId,
                transaction_type: 'payment',
                amount: Math.min(paid, vendorTotal),
                description: `Paiement achats du ${purchaseDate}`,
                date: purchaseDate,
                reference: `payment_${purchaseDate}`,
              }),
            });
          }
        }

        showToast(tt('saved', 'Enregistré !'));
        setLines([{ inventory_item_id: '', quantity: 0, unit_cost: 0, notes: '', pack_mode: false, pack_count: 1, pack_size: 1, pack_price: 0, new_product_name: '', new_product_unit: 'kg', new_product_category_id: '', new_product_vendor_id: '', new_vendor_name: '' }]);
        setVendorPayments({});
        setPurchaseTvaAmount(0);
        // Refresh existing movements indicator
        fetch(`/api/inventory/daily-purchase?startDate=${purchaseDate}&endDate=${purchaseDate}`)
          .then(r => r.json()).then(d => setExistingDayMovements(d.movements || [])).catch(() => {});
        fetchItems();
        fetchAllHistory();
        setTab('history');
      } else if (data.pending) {
        // Held by the approval workflow — no vendor debt is created until approved.
        showToast(tt('pendingApproval', 'Soumis pour approbation'));
        setLines([{ inventory_item_id: '', quantity: 0, unit_cost: 0, notes: '', pack_mode: false, pack_count: 1, pack_size: 1, pack_price: 0, new_product_name: '', new_product_unit: 'kg', new_product_category_id: '', new_product_vendor_id: '', new_vendor_name: '' }]);
        setVendorPayments({});
        setPurchaseTvaAmount(0);
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleSaveUsage = async () => {
    if (validUsageLines.length === 0) return;
    setUsageSaving(true);
    try {
      const res = await fetch('/api/inventory/daily-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validUsageLines, date: usageDate }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(tt('savedUsage', 'Sorties enregistrées !'));
        setUsageLines([{ inventory_item_id: '', quantity: 0, reason: 'consumption', notes: '' }]);
        fetchItems();
        fetchAllHistory();
        setTab('history');
      }
    } catch { /* silent */ } finally {
      setUsageSaving(false);
    }
  };

  // ─── Delete a day's entries ────────────────────────────────────────────

  const handleDeleteDay = async (date: string, dayMovements: Movement[]) => {
    const hasPurchases = dayMovements.some(m => m.reference_type === 'daily_purchase');
    const hasUsage = dayMovements.some(m => m.reference_type === 'daily_usage');

    const deletes: Promise<Response>[] = [];
    if (hasPurchases) {
      deletes.push(fetch(`/api/inventory/daily-purchase?date=${date}&type=daily_purchase`, { method: 'DELETE' }));
    }
    if (hasUsage) {
      deletes.push(fetch(`/api/inventory/daily-purchase?date=${date}&type=daily_usage`, { method: 'DELETE' }));
    }
    await Promise.all(deletes);
    showToast(tt('deleted', 'Supprimé'));
    fetchAllHistory();
    fetchItems();
  };

  const handleDeleteSingleMovement = async (movementId: string) => {
    await fetch(`/api/inventory/daily-purchase?id=${movementId}`, { method: 'DELETE' });
    showToast(tt('deleted', 'Supprimé'));
    fetchAllHistory();
    fetchItems();
  };

  // Edit a movement's quantity/price via API
  const handleEditMovement = async () => {
    if (!editingMovement) return;
    try {
      const res = await fetch('/api/inventory/daily-purchase', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMovement),
      });
      const data = await res.json();
      if (data.success) {
        setEditingMovement(null);
        showToast(tt('updated', 'Mis à jour'));
        fetchAllHistory();
        fetchItems();
      }
    } catch (e) {
      console.error('Edit movement error:', e);
    }
  };

  // Vendor payment update from history
  const handleVendorPaymentFromHistory = async (vendorId: string, amount: number, date: string) => {
    if (amount <= 0) return;
    await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transaction',
        vendor_id: vendorId,
        transaction_type: 'payment',
        amount,
        description: `Paiement du ${date}`,
        date,
        reference: `payment_${date}_${Date.now()}`,
      }),
    });
    showToast(tt('paymentSaved', 'Paiement enregistré'));
  };

  // ─── Orders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/purchase-orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { /* silent */ } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'orders') fetchOrders();
  }, [tab, fetchOrders]);

  const resetOrderForm = () => {
    setShowOrderForm(false);
    setOrderVendorId('');
    setOrderDate(formatDate(new Date()));
    setOrderNotes('');
    setOrderItems([]);
  };

  const handleCreateOrder = async () => {
    if (!orderVendorId || orderItems.length === 0) return;
    setOrderSaving(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: orderVendorId,
          order_date: orderDate,
          notes: orderNotes,
          items: orderItems
            .filter(i => i.product_name && i.quantity > 0)
            .map(i => ({ ...i, vendor_id: i.vendor_id || null })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(tt('orderCreated', 'Commande créée'));
        resetOrderForm();
        fetchOrders();
      }
    } catch { /* silent */ } finally {
      setOrderSaving(false);
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setOrderSaving(true);
    try {
      const receivedItems = order.items.map(i => ({
        id: i.id,
        received_quantity: i.received_quantity ?? i.quantity,
      }));
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          order_id: orderId,
          items: receivedItems,
          paid_amount: receivePaidAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(tt('orderReceived', 'Commande reçue — stock mis à jour'));
        setReceivingOrderId(null);
        setReceivePaidAmount(0);
        fetchOrders();
        fetchItems();
      }
    } catch { /* silent */ } finally {
      setOrderSaving(false);
    }
  };

  const handleUpdateItemVendor = async (orderId: string, itemId: string, vendorId: string | null) => {
    // Optimistic update — patch local state then persist
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o,
      items: o.items.map(it => it.id === itemId ? { ...it, vendor_id: vendorId } : it),
    }));
    try {
      await fetch('/api/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, vendor_id: vendorId }),
      });
    } catch { /* keep optimistic; user can refresh */ }
  };

  const handleCancelOrder = async (orderId: string) => {
    await fetch('/api/purchase-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: 'cancelled' }),
    });
    showToast(tt('orderCancelled', 'Commande annulée'));
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    await fetch(`/api/purchase-orders?id=${orderId}`, { method: 'DELETE' });
    showToast(tt('deleted', 'Supprimé'));
    fetchOrders();
  };

  // Items helper for order form
  const addOrderItem = () => {
    setOrderItems(prev => [...prev, { inventory_item_id: '', product_name: '', quantity: 0, unit: 'kg', unit_cost: 0, vendor_id: '' }]);
  };

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'inventory_item_id') {
        const inv = items.find(it => it.id === value);
        if (inv) {
          updated.product_name = inv.name;
          updated.unit = inv.unit;
          updated.unit_cost = inv.last_purchase_price || inv.cost_per_unit || 0;
          // Pre-fill vendor from product's normal vendor (if different from PO main).
          // Empty string means "use the PO's main vendor".
          if (inv.vendor_id && inv.vendor_id !== orderVendorId) {
            updated.vendor_id = inv.vendor_id;
          }
        }
      }
      return updated;
    }));
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Filter items for the line's effective vendor (override or PO main)
  const itemsForLineVendor = useCallback((lineVendorId: string) => {
    const effective = lineVendorId || orderVendorId;
    if (!effective) return items;
    return items.filter(i => i.vendor_id === effective || !i.vendor_id);
  }, [items, orderVendorId]);

  // ─── Product detail ──────────────────────────────────────────────────

  const openProductDetail = useCallback(async (productId: string) => {
    setDetailProductId(productId);
    setDetailLoading(true);
    try {
      const [purchaseRes, usageRes] = await Promise.all([
        fetch(`/api/inventory/daily-purchase?itemId=${productId}`),
        fetch(`/api/inventory/daily-usage?itemId=${productId}`),
      ]);
      const [pData, uData] = await Promise.all([purchaseRes.json(), usageRes.json()]);
      const all = [...(pData.movements || []), ...(uData.movements || [])].sort(
        (a: Movement, b: Movement) => b.created_at.localeCompare(a.created_at)
      );
      setDetailMovements(all);
    } catch { setDetailMovements([]); } finally { setDetailLoading(false); }
  }, []);

  const detailProduct = detailProductId ? items.find(i => i.id === detailProductId) : null;

  const detailStats = useMemo(() => {
    if (!detailMovements.length) return null;
    const purchases = detailMovements.filter(m => m.reference_type === 'daily_purchase');
    const usages = detailMovements.filter(m => m.reference_type === 'daily_usage');
    const prices = purchases.map(m => m.unit_cost).filter(p => p > 0);
    const totalPurchased = purchases.reduce((s, m) => s + Math.abs(m.quantity_change), 0);
    const totalUsed = usages.reduce((s, m) => s + Math.abs(m.quantity_change), 0);
    const totalSpent = purchases.reduce((s, m) => s + Math.abs(m.quantity_change) * m.unit_cost, 0);
    return {
      purchaseCount: purchases.length,
      usageCount: usages.length,
      totalPurchased: Math.round(totalPurchased * 100) / 100,
      totalUsed: Math.round(totalUsed * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100 : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      lastPrice: prices.length > 0 ? prices[0] : 0,
      priceVariation: prices.length >= 2 ? Math.round((prices[0] - prices[prices.length - 1]) / prices[prices.length - 1] * 100) : 0,
    };
  }, [detailMovements]);

  // ─── History grouping helper ──────────────────────────────────────────

  const groupByDate = (mvts: Movement[]) => {
    const groups: Record<string, Movement[]> = {};
    for (const m of mvts) {
      const date = m.reference_id || m.created_at.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  const activeMovements = useMemo(() => {
    let result: Movement[];
    if (historyFilter === 'purchase') result = purchaseMovements;
    else if (historyFilter === 'usage') result = usageMovements;
    else result = [...purchaseMovements, ...usageMovements].sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Filter by categories
    if (historyCategoryFilter.length > 0) {
      const catSet = new Set(historyCategoryFilter);
      const categoryItemIds = new Set(items.filter(i => i.category_id && catSet.has(i.category_id)).map(i => i.id));
      result = result.filter(m => categoryItemIds.has(m.inventory_item_id));
    }

    // Filter by products
    if (historyProductFilter.length > 0) {
      const prodSet = new Set(historyProductFilter);
      result = result.filter(m => prodSet.has(m.inventory_item_id));
    }

    return result;
  }, [historyFilter, purchaseMovements, usageMovements, historyCategoryFilter, historyProductFilter, items]);
  const groupedHistory = useMemo(() => groupByDate(activeMovements), [activeMovements]);
  const isFilteredUsage = historyFilter === 'usage';

  // ─── Helpers for movement display ──────────────────────────────────────

  const isUsageMovement = (m: Movement) => m.reference_type === 'daily_usage';

  const movementTypeLabel = (m: Movement) => {
    if (m.reference_type === 'daily_purchase') return tt('typePurchase', 'Achat');
    if (m.movement_type === 'waste') return tt('reasons.waste', 'Perte');
    if (m.movement_type === 'sale_deduction') return tt('reasons.sale', 'Vente');
    return tt('reasons.consumption', 'Consommation');
  };

  // ─── Excel export (styled with exceljs) ────────────────────────────────

  const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: '606338' } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  const totalFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EDE6D6' } };
  const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 11 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'D0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'D0D0D0' } },
    left: { style: 'thin', color: { argb: 'D0D0D0' } },
    right: { style: 'thin', color: { argb: 'D0D0D0' } },
  };
  const currencyFmt = '#,##0.00 "DH"';

  const buildExcel = async (movements: Movement[], grouped: [string, Movement[]][], filename: string, title: string) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Epictète Restaurant';
    const showType = historyFilter === 'all';

    // ── Sheet 1: Detail ─────────────────────────────────
    const ws = wb.addWorksheet('Détail');

    // Title row
    const titleRow = ws.addRow([title]);
    titleRow.font = { bold: true, size: 14, color: { argb: '606338' } };
    ws.mergeCells(1, 1, 1, showType ? 7 : 6);
    ws.addRow([]);

    // Headers
    const headers = showType
      ? ['Produit', 'Type', 'Quantité', 'Unité', 'Prix unitaire', 'Total']
      : ['Produit', 'Quantité', 'Unité', 'Prix unitaire', 'Total'];
    const hRow = ws.addRow(headers);
    hRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; c.alignment = { horizontal: 'center' }; });

    for (const [date, dayMvts] of grouped) {
      // Day separator
      const dayLabel = displayDate(date, locale);
      const dayRow = ws.addRow([`📅 ${dayLabel}`]);
      dayRow.font = { bold: true, size: 11, color: { argb: '606338' } };
      ws.mergeCells(dayRow.number, 1, dayRow.number, headers.length);
      dayRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F0' } };

      for (const m of dayMvts) {
        const isOut = isUsageMovement(m);
        const qty = Math.abs(m.quantity_change);
        const rowData = showType
          ? [m.inventory_item?.name || '', isOut ? 'Sortie' : 'Achat', qty, m.inventory_item?.unit || '', m.unit_cost, Math.round(qty * m.unit_cost * 100) / 100]
          : [m.inventory_item?.name || '', qty, m.inventory_item?.unit || '', m.unit_cost, Math.round(qty * m.unit_cost * 100) / 100];
        const r = ws.addRow(rowData);
        r.eachCell(c => { c.border = thinBorder; });
        // Color the type cell
        if (showType) {
          r.getCell(2).font = { color: { argb: isOut ? 'DC2626' : '16A34A' }, bold: true };
        }
        // Currency format on price + total
        const priceCol = showType ? 5 : 4;
        const totalCol = showType ? 6 : 5;
        r.getCell(priceCol).numFmt = currencyFmt;
        r.getCell(totalCol).numFmt = currencyFmt;
        if (isOut) r.getCell(totalCol).font = { color: { argb: 'DC2626' } };
      }

      // Day total
      const dayTotal = dayMvts.reduce((s, m) => s + Math.abs(m.quantity_change) * m.unit_cost, 0);
      const dtRow = ws.addRow([...Array(headers.length - 2).fill(''), 'Total jour:', Math.round(dayTotal * 100) / 100]);
      dtRow.eachCell(c => { c.fill = totalFill; c.font = totalFont; c.border = thinBorder; });
      dtRow.getCell(headers.length).numFmt = currencyFmt;
    }

    // Grand total
    ws.addRow([]);
    const grandTotal = movements.reduce((s, m) => s + Math.abs(m.quantity_change) * m.unit_cost, 0);
    const gtRow = ws.addRow([...Array(headers.length - 2).fill(''), 'TOTAL GÉNÉRAL', Math.round(grandTotal * 100) / 100]);
    gtRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
    gtRow.getCell(headers.length).numFmt = currencyFmt;

    // Column widths
    ws.columns = showType
      ? [{ width: 30 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 15 }]
      : [{ width: 30 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 15 }];

    // ── Sheet 2: By product ─────────────────────────────
    const ws2 = wb.addWorksheet('Par produit');
    const h2 = ws2.addRow(['Produit', 'Qté totale', 'Unité', 'Total (DH)']);
    h2.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; c.alignment = { horizontal: 'center' }; });

    const productTotals: Record<string, { name: string; unit: string; qty: number; cost: number }> = {};
    for (const m of movements) {
      const key = m.inventory_item_id;
      if (!productTotals[key]) productTotals[key] = { name: m.inventory_item?.name || '', unit: m.inventory_item?.unit || '', qty: 0, cost: 0 };
      productTotals[key].qty += Math.abs(m.quantity_change);
      productTotals[key].cost += Math.abs(m.quantity_change) * m.unit_cost;
    }
    for (const p of Object.values(productTotals).sort((a, b) => b.cost - a.cost)) {
      const r = ws2.addRow([p.name, Math.round(p.qty * 100) / 100, p.unit, Math.round(p.cost * 100) / 100]);
      r.eachCell(c => { c.border = thinBorder; });
      r.getCell(4).numFmt = currencyFmt;
    }
    const gt2 = ws2.addRow(['TOTAL', '', '', Math.round(grandTotal * 100) / 100]);
    gt2.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
    gt2.getCell(4).numFmt = currencyFmt;
    ws2.columns = [{ width: 30 }, { width: 12 }, { width: 10 }, { width: 15 }];

    // ── Download ─────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const label = historyFilter === 'usage' ? 'Sorties' : historyFilter === 'purchase' ? 'Achats' : 'Mouvements';
    buildExcel(activeMovements, groupedHistory, `${label}_${historyStart}_${historyEnd}.xlsx`, `${label} — ${historyStart} au ${historyEnd}`);
  };

  const exportDayExcel = (date: string, dayMovements: Movement[]) => {
    const grouped: [string, Movement[]][] = [[date, dayMovements]];
    buildExcel(dayMovements, grouped, `Achats_${date}.xlsx`, `Mouvements — ${displayDate(date, locale)}`);
  };

  // ─── Shared sub-components ────────────────────────────────────────────

  const renderDateNav = (date: string, setDate: (v: string) => void) => (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
      <Calendar className="w-5 h-5 text-muted-foreground" />
      <button onClick={() => navigateDate(setDate, date, -1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm font-medium"
      />
      <button onClick={() => navigateDate(setDate, date, 1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="text-sm text-muted-foreground ml-2">
        {displayDate(date, locale)}
      </span>
    </div>
  );

  const renderHistoryTab = () => {
    const movements = activeMovements;

    return (
      <div className="space-y-4">
        {/* Filters bar */}
        <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-xl p-4">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">{tt('from', 'Du')}</label>
            <input type="date" value={historyStart} onChange={e => setHistoryStart(e.target.value)} className="bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">{tt('to', 'Au')}</label>
            <input type="date" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} className="bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <button onClick={fetchAllHistory} className="px-4 py-1.5 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e] transition-colors">
            {tt('filter', 'Filtrer')}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTab('purchase')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> {tt('newPurchase', 'Achat')}
            </button>
            <button
              onClick={() => setTab('usage')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <TrendingDown className="w-4 h-4" /> {tt('newUsage', 'Sortie')}
            </button>
            {movements.length > 0 && (
              <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Download className="w-4 h-4" />
                Excel
              </button>
            )}
          </div>
        </div>

        {/* Category + Product multi-select filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <MultiSelectDropdown
            label={historyCategoryFilter.length > 0 ? `${historyCategoryFilter.length} ${tt('allCategories', 'catégories')}` : tt('allCategories', 'Toutes les catégories')}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            selected={historyCategoryFilter}
            onChange={v => { setHistoryCategoryFilter(v); setHistoryProductFilter([]); }}
          />
          <MultiSelectDropdown
            label={historyProductFilter.length > 0 ? `${historyProductFilter.length} ${tt('allProducts', 'produits')}` : tt('allProducts', 'Tous les produits')}
            options={(historyCategoryFilter.length > 0 ? items.filter(i => i.category_id && historyCategoryFilter.includes(i.category_id)) : items)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(i => ({ value: i.id, label: i.name }))}
            selected={historyProductFilter}
            onChange={setHistoryProductFilter}
          />
          {(historyCategoryFilter.length > 0 || historyProductFilter.length > 0) && (
            <button
              onClick={() => { setHistoryCategoryFilter([]); setHistoryProductFilter([]); }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded-lg"
            >
              {tt('clearFilters', 'Effacer filtres')}
            </button>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
          {([
            { key: 'all' as HistoryFilter, label: tt('filterAll', 'Tout') },
            { key: 'purchase' as HistoryFilter, label: tt('filterPurchases', 'Achats') },
            { key: 'usage' as HistoryFilter, label: tt('filterUsage', 'Sorties') },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setHistoryFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                historyFilter === f.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groupedHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{tt('noHistoryAll', 'Aucun mouvement trouvé pour cette période')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedHistory.map(([date, dayMovements]) => {
              const dayTotal = dayMovements.reduce((sum, m) => sum + Math.abs(m.quantity_change) * m.unit_cost, 0);
              const isExpanded = expandedDays[date] ?? false;
              return (
                <div key={date} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary/70 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                      <span className="text-sm font-semibold">{displayDate(date, locale)}</span>
                      {(() => {
                        const purchases = dayMovements.filter(m => !isUsageMovement(m));
                        const sorties = dayMovements.filter(m => isUsageMovement(m));

                        // Vendors involved that day, ordered by spend (purchases) or by item count (usage)
                        const vendorSpend = new Map<string, { name: string; amount: number }>();
                        for (const m of dayMovements) {
                          const item = items.find(i => i.id === m.inventory_item_id);
                          if (!item) continue;
                          const vendorName = item.vendor?.name;
                          if (!vendorName) continue;
                          const key = item.vendor?.id || vendorName;
                          const lineAmount = Math.abs(m.quantity_change) * (m.unit_cost || 0);
                          const e = vendorSpend.get(key) || { name: vendorName, amount: 0 };
                          e.amount += lineAmount;
                          vendorSpend.set(key, e);
                        }
                        const vendorList = [...vendorSpend.values()].sort((a, b) => b.amount - a.amount);
                        const VISIBLE = 3;

                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            {purchases.length > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                                {purchases.length} {tt('filterPurchases', 'Achats')}
                              </span>
                            )}
                            {sorties.length > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                {sorties.length} {tt('filterUsage', 'Sorties')}
                              </span>
                            )}
                            {vendorList.length > 0 && (
                              <span className="hidden md:inline-block w-px h-3 bg-border mx-1" />
                            )}
                            {vendorList.slice(0, VISIBLE).map(v => (
                              <span
                                key={v.name}
                                title={`${v.name} · ${formatCurrency(v.amount)}`}
                                className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                              >
                                {v.name}
                              </span>
                            ))}
                            {vendorList.length > VISIBLE && (
                              <span
                                title={vendorList.slice(VISIBLE).map(v => `${v.name} · ${formatCurrency(v.amount)}`).join('\n')}
                                className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                              >
                                +{vendorList.length - VISIBLE}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => exportDayExcel(date, dayMovements)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(tt('confirmDelete', 'Supprimer toutes les entrées de ce jour ? Les quantités seront restaurées.'))) handleDeleteDay(date, dayMovements); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title={tt('deleteDay', 'Supprimer')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(dayTotal)}
                      </span>
                    </div>
                  </button>
                  <div className={`transition-all duration-200 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="divide-y divide-border border-t border-border">
                    {dayMovements.map(m => {
                      const isOut = isUsageMovement(m);
                      const isEditing = editingMovement?.id === m.id;
                      const itemData = items.find(i => i.id === m.inventory_item_id);
                      const catName = itemData?.inventory_category?.name;
                      return (
                        <div key={m.id} className="group grid grid-cols-[auto_1fr_auto_80px_80px_100px_56px] gap-2 px-4 py-2.5 items-center text-sm">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {movementTypeLabel(m)}
                          </span>
                          <button type="button" onClick={() => openProductDetail(m.inventory_item_id)} className="font-medium text-left hover:text-[#606338] hover:underline cursor-pointer">{m.inventory_item?.name || '—'}</button>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">{catName || '—'}</span>
                          {isEditing ? (
                            <>
                              <input type="number" min="0" step="0.1" value={editingMovement.quantity} onChange={e => setEditingMovement({ ...editingMovement, quantity: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent border border-[#606338] rounded px-1.5 py-0.5 text-sm text-right" autoFocus />
                              <div className="relative">
                                <input type="number" min="0" step="0.01" value={editingMovement.unit_cost} onChange={e => setEditingMovement({ ...editingMovement, unit_cost: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent border border-[#606338] rounded px-1.5 py-0.5 pr-6 text-sm text-right" />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">DH</span>
                              </div>
                              <span className="text-right text-xs text-muted-foreground">{formatCurrency(editingMovement.quantity * editingMovement.unit_cost)}</span>
                              <div className="flex items-center gap-0.5">
                                <button onClick={handleEditMovement} className="p-1 rounded text-emerald-600 hover:bg-emerald-100"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingMovement(null)} className="p-1 rounded text-muted-foreground hover:bg-secondary"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span
                                onClick={() => setEditingMovement({ id: m.id, quantity: Math.abs(m.quantity_change), unit_cost: m.unit_cost })}
                                className="text-right text-muted-foreground cursor-pointer hover:text-foreground hover:underline"
                              >
                                {isOut ? '-' : '+'}{Math.abs(m.quantity_change)} {m.inventory_item?.unit || ''}
                              </span>
                              <span
                                onClick={() => setEditingMovement({ id: m.id, quantity: Math.abs(m.quantity_change), unit_cost: m.unit_cost })}
                                className="text-right text-muted-foreground cursor-pointer hover:text-foreground hover:underline"
                              >
                                {formatCurrency(m.unit_cost)}
                              </span>
                              <span className={`text-right font-medium ${isOut ? 'text-red-600' : 'text-[#606338]'}`}>
                                {isOut ? '-' : ''}{formatCurrency(Math.abs(m.quantity_change) * m.unit_cost)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => { if (confirm(tt('confirmDeleteItem', 'Supprimer cet article ?'))) handleDeleteSingleMovement(m.id); }}
                                  className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Vendor payment quick action */}
                  {(() => {
                    const purchaseMvts = dayMovements.filter(m => m.reference_type === 'daily_purchase');
                    if (purchaseMvts.length === 0) return null;
                    // Group by vendor via items
                    const vendorTotals: Record<string, { name: string; total: number }> = {};
                    for (const m of purchaseMvts) {
                      const item = items.find(i => i.id === m.inventory_item_id);
                      if (!item?.vendor_id || !item.vendor) continue;
                      if (!vendorTotals[item.vendor_id]) vendorTotals[item.vendor_id] = { name: item.vendor.name, total: 0 };
                      vendorTotals[item.vendor_id].total += Math.abs(m.quantity_change) * m.unit_cost;
                    }
                    const vendorList = Object.entries(vendorTotals);
                    if (vendorList.length === 0) return null;
                    return (
                      <div className="border-t border-border bg-secondary/30 px-4 py-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase">{tt('vendorPayments', 'Paiement fournisseurs')}</span>
                        </div>
                        <div className="space-y-1.5">
                          {vendorList.map(([vid, v]) => (
                            <div key={vid} className="flex items-center gap-3 text-sm">
                              <span className="font-medium min-w-[120px]">{v.name}</span>
                              <span className="text-muted-foreground">{formatCurrency(v.total)}</span>
                              <div className="flex items-center gap-1.5 ml-auto">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  className="w-24 bg-transparent border border-border rounded-lg px-2 py-1 pr-7 text-xs text-right"
                                  id={`pay_${date}_${vid}`}
                                />
                                <span className="text-xs text-muted-foreground -ml-6 pointer-events-none">DH</span>
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`pay_${date}_${vid}`) as HTMLInputElement;
                                    const amt = parseFloat(input?.value) || 0;
                                    if (amt > 0) {
                                      handleVendorPaymentFromHistory(vid, amt, date);
                                      if (input) input.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#606338] text-white rounded-md text-xs font-medium hover:bg-[#4d4f2e] transition-colors"
                                >
                                  {tt('pay', 'Payer')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                </div>
              );
            })}

            {/* Grand total */}
            <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
              <span className="text-sm font-medium text-muted-foreground">{tt('grandTotal', 'Total sur la période')}</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(movements.reduce((sum, m) => sum + Math.abs(m.quantity_change) * m.unit_cost, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <Check className="w-4 h-4" />
          {toast.message}
        </div>
      )}

      {/* Tab navigation — Achat / Sortie are quick-action buttons (below) instead of tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
        {([
          { key: 'history' as TabKey, icon: History, label: tt('tabs.history', 'Historique') },
          { key: 'orders' as TabKey, icon: ClipboardList, label: tt('tabs.orders', 'Commandes') },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.key
                ? 'border-[#606338] text-[#606338]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Purchase Tab ──────────────────────────────────────────────── */}
      {tab === 'purchase' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto p-4">
          <div className="w-full max-w-6xl mx-auto bg-card border border-border rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-secondary border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-600" />{tt('tabs.purchase', 'Achats du jour')}</h2>
              <button onClick={() => setTab('history')} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
          {renderDateNav(purchaseDate, setPurchaseDate)}

          {/* Quick filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={tt('search', 'Rechercher un produit...')} className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">{tt('allCategories', 'Toutes les catégories')}</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {/* Purchase lines */}
          <div className="bg-card border border-border rounded-xl overflow-visible">
            <div className="grid grid-cols-[1fr_100px_120px_1fr_40px] gap-3 px-4 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>{tt('columns.product', 'Produit')}</span>
              <span>{tt('columns.quantity', 'Quantité')}</span>
              <span>{tt('columns.unitCost', 'Prix unitaire')}</span>
              <span>{tt('columns.notes', 'Notes')}</span>
              <span></span>
            </div>
            <div className="divide-y divide-border">
              {lines.map((line, index) => {
                const isNewProduct = line.inventory_item_id === '__new__';
                const selectedItem = isNewProduct ? null : getItemById(line.inventory_item_id);
                const lineTotal = line.quantity * line.unit_cost;
                return (
                  <div key={index} className="grid grid-cols-[1fr_100px_120px_1fr_40px] gap-3 px-4 py-3 items-center">
                    {/* Product search or new product fields */}
                    <div className="space-y-2">
                      <ProductSearchSelect
                        items={filteredItems}
                        value={line.inventory_item_id}
                        onChange={v => updateLine(index, 'inventory_item_id', v)}
                        placeholder={tt('searchProduct', 'Chercher un produit...')}
                        newProductLabel={tt('newProduct', 'Nouveau produit')}
                        showNewOption
                      />
                      {/* Indicator: already registered for this date */}
                      {!isNewProduct && selectedItem && (() => {
                        const existing = existingDayMovements.find(m => m.inventory_item_id === line.inventory_item_id);
                        if (!existing) return null;
                        return (
                          <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                            <span>{tt('alreadyRegistered', 'Déjà enregistré')}: {Math.abs(existing.quantity_change)} {selectedItem.unit} {tt('at', 'à')} {formatCurrency(existing.unit_cost)}</span>
                          </div>
                        );
                      })()}
                      {isNewProduct && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input type="text" value={line.new_product_name} onChange={e => updateLine(index, 'new_product_name', e.target.value)} placeholder={tt('productName', 'Nom du produit')} className="flex-1 bg-transparent border border-dashed border-[#606338]/40 rounded-lg px-3 py-1.5 text-sm" autoFocus />
                            <select value={line.new_product_unit} onChange={e => updateLine(index, 'new_product_unit', e.target.value)} className="w-20 bg-transparent border border-dashed border-[#606338]/40 rounded-lg px-2 py-1.5 text-xs">
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="L">L</option>
                              <option value="cl">cl</option>
                              <option value="pièces">pcs</option>
                              <option value="boîte">boîte</option>
                              <option value="bouteille">bout.</option>
                              <option value="sachet">sachet</option>
                              <option value="carton">carton</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <select value={line.new_product_category_id} onChange={e => updateLine(index, 'new_product_category_id', e.target.value)} className="flex-1 bg-transparent border border-dashed border-[#606338]/40 rounded-lg px-2 py-1.5 text-xs">
                              <option value="">{tt('noCategory', 'Catégorie')}</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                            {line.new_vendor_name ? (
                              <div className="flex items-center gap-1 flex-1">
                                <input type="text" value={line.new_vendor_name} onChange={e => updateLine(index, 'new_vendor_name', e.target.value)} placeholder={tt('vendorName', 'Nom fournisseur')} className="flex-1 bg-transparent border border-dashed border-[#606338]/40 rounded-lg px-2 py-1.5 text-xs" />
                                <button type="button" onClick={() => { updateLine(index, 'new_vendor_name', ''); }} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
                              </div>
                            ) : (
                              <select value={line.new_product_vendor_id} onChange={e => { if (e.target.value === '__new_vendor__') { updateLine(index, 'new_vendor_name', ' '); updateLine(index, 'new_product_vendor_id', ''); } else { updateLine(index, 'new_product_vendor_id', e.target.value); } }} className="flex-1 bg-transparent border border-dashed border-[#606338]/40 rounded-lg px-2 py-1.5 text-xs">
                                <option value="">{tt('selectVendor', 'Fournisseur')}</option>
                                <option value="__new_vendor__">+ {tt('newVendor', 'Nouveau fournisseur')}</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Quantity + Price — pack mode or unit mode */}
                    {line.pack_mode ? (
                      <>
                        {/* Pack mode: nb packs × size */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" step="1" value={line.pack_count || ''} onChange={e => updateLine(index, 'pack_count', parseFloat(e.target.value) || 0)} placeholder="0" className="w-14 bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                            <span className="text-xs text-muted-foreground">×</span>
                            <input type="number" min="1" step="1" value={line.pack_size || ''} onChange={e => updateLine(index, 'pack_size', parseFloat(e.target.value) || 1)} placeholder="1" className="w-14 bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">/{selectedItem?.unit || line.new_product_unit || 'u'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-1">= {line.quantity} {selectedItem?.unit || line.new_product_unit || 'u'}</div>
                        </div>
                        {/* Pack price */}
                        <div className="space-y-1">
                          <div className="relative">
                            <input type="number" min="0" step="0.01" value={line.pack_price || ''} onChange={e => updateLine(index, 'pack_price', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 pr-8 text-sm text-right" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DH</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-1">{tt('perUnit', 'unité')}: {formatCurrency(line.unit_cost)}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Unit mode */}
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" step="0.1" value={line.quantity || ''} onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                          {selectedItem && <span className="text-xs text-muted-foreground whitespace-nowrap">{selectedItem.unit}</span>}
                          {isNewProduct && line.new_product_unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{line.new_product_unit}</span>}
                        </div>
                        <div className="relative">
                          <input type="number" min="0" step="0.01" value={line.unit_cost || ''} onChange={e => updateLine(index, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 pr-8 text-sm text-right" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DH</span>
                        </div>
                      </>
                    )}
                    {/* Notes + pack toggle + delete */}
                    <div className="flex items-center gap-1">
                      <input type="text" value={line.notes} onChange={e => updateLine(index, 'notes', e.target.value)} placeholder={tt('notesPlaceholder', 'Notes (optionnel)')} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm" />
                      {(selectedItem || isNewProduct) && (
                        <button
                          type="button"
                          onClick={() => updateLine(index, 'pack_mode', !line.pack_mode)}
                          title={tt('packMode', 'Achat en lot')}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${line.pack_mode ? 'text-[#606338] bg-[#606338]/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center">
                      <button onClick={() => {
                        if (lines.length > 1) { removeLine(index); }
                        else { setLines([{ inventory_item_id: '', quantity: 0, unit_cost: 0, notes: '', pack_mode: false, pack_count: 1, pack_size: 1, pack_price: 0, new_product_name: '', new_product_unit: 'kg', new_product_category_id: '', new_product_vendor_id: '', new_vendor_name: '' }]); }
                      }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {(selectedItem || isNewProduct) && line.quantity > 0 && (
                      <div className="col-span-5 -mt-1 pb-1 pl-1 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">= {formatCurrency(lineTotal)}</span>
                        {isNewProduct && (
                          <span className="text-xs text-[#606338] font-medium">{tt('newProductLabel', '(nouveau)')}</span>
                        )}
                        {selectedItem && selectedItem.cost_per_unit > 0 && line.unit_cost !== selectedItem.cost_per_unit && (
                          <span className={`text-xs ${line.unit_cost > selectedItem.cost_per_unit ? 'text-red-500' : 'text-emerald-500'}`}>
                            {line.unit_cost > selectedItem.cost_per_unit ? '▲' : '▼'}
                            {' '}{Math.abs(Math.round((line.unit_cost - selectedItem.cost_per_unit) / selectedItem.cost_per_unit * 100))}%
                            {' '}{tt('vsMoyenne', 'vs moy.')} {formatCurrency(selectedItem.cost_per_unit)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button onClick={addLine} className="flex items-center gap-2 text-sm text-[#606338] hover:text-[#4d4f2e] font-medium transition-colors">
                <Plus className="w-4 h-4" />
                {tt('addLine', 'Ajouter un produit')}
              </button>
            </div>
          </div>

          {/* Vendor payment summary */}
          {vendorSummary.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tt('vendorPayments', 'Paiement fournisseurs')}</span>
              </div>
              <div className="divide-y divide-border">
                {vendorSummary.map(vs => {
                  const vendorTvaShare = subtotal > 0 ? Math.round(vs.total * (purchaseTvaAmount / subtotal) * 100) / 100 : 0;
                  const vendorTotalWithTva = Math.round((vs.total + vendorTvaShare) * 100) / 100;
                  const paid = vendorPayments[vs.vendorId] || 0;
                  const debt = Math.max(0, Math.round((vendorTotalWithTva - paid) * 100) / 100);
                  return (
                    <div key={vs.vendorId} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-sm font-medium flex-1">{vs.vendorName}</span>
                      <span className="text-sm text-muted-foreground">{formatCurrency(vendorTotalWithTva)}</span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">{tt('paid', 'Payé')}</label>
                        <div className="relative">
                          <input type="number" min="0" step="0.01" value={paid || ''} onChange={e => setVendorPayments(prev => ({ ...prev, [vs.vendorId]: parseFloat(e.target.value) || 0 }))} placeholder="0" className="w-24 bg-transparent border border-border rounded-lg px-2 py-1.5 pr-7 text-sm text-right" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DH</span>
                        </div>
                        <button type="button" onClick={() => setVendorPayments(prev => ({ ...prev, [vs.vendorId]: vendorTotalWithTva }))} className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">{tt('payAll', 'Tout')}</button>
                        <div className="w-24 text-right">
                          {debt > 0 ? (
                            <span className="text-xs text-red-500 font-medium">{tt('remaining', 'Reste')}: {formatCurrency(debt)}</span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">{tt('fullyPaid', 'Soldé')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TVA + Total + Save */}
          <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 flex-wrap gap-3">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-muted-foreground">{tt('totalProducts', 'Produits')}: </span>
                <span className="text-sm font-semibold">{validLines.length}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">HT: </span>
                <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-sm text-muted-foreground">TVA</label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" value={purchaseTvaAmount || ''} onChange={e => setPurchaseTvaAmount(parseFloat(e.target.value) || 0)} placeholder="0" className="w-24 bg-transparent border border-border rounded-lg px-2 py-1.5 pr-7 text-sm text-right" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DH</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">TTC: </span>
                <span className="text-lg font-bold text-[#606338]">{formatCurrency(total)}</span>
              </div>
            </div>
            <button onClick={handleSavePurchase} disabled={saving || validLines.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {tt('save', 'Enregistrer les achats')}
            </button>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Usage Modal ───────────────────────────────────────────────── */}
      {tab === 'usage' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto p-4">
          <div className="w-full max-w-6xl mx-auto bg-card border border-border rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-secondary border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" />{tt('tabs.usage', 'Sorties du jour')}</h2>
              <button onClick={() => setTab('history')} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
          {renderDateNav(usageDate, setUsageDate)}

          {/* Quick filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={usageSearchTerm} onChange={e => setUsageSearchTerm(e.target.value)} placeholder={tt('search', 'Rechercher un produit...')} className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm" />
            </div>
            <select value={usageCategoryFilter} onChange={e => setUsageCategoryFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">{tt('allCategories', 'Toutes les catégories')}</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {/* Usage lines */}
          <div className="bg-card border border-border rounded-xl overflow-visible">
            <div className="grid grid-cols-[1fr_100px_140px_1fr_40px] gap-3 px-4 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>{tt('columns.product', 'Produit')}</span>
              <span>{tt('columns.quantity', 'Quantité')}</span>
              <span>{tt('columns.reason', 'Motif')}</span>
              <span>{tt('columns.notes', 'Notes')}</span>
              <span></span>
            </div>
            <div className="divide-y divide-border">
              {usageLines.map((line, index) => {
                const selectedItem = getItemById(line.inventory_item_id);
                return (
                  <div key={index} className="grid grid-cols-[1fr_100px_140px_1fr_40px] gap-3 px-4 py-3 items-center">
                    <ProductSearchSelect
                      items={usageFilteredItems}
                      value={line.inventory_item_id}
                      onChange={v => updateUsageLine(index, 'inventory_item_id', v)}
                      placeholder={tt('searchProduct', 'Chercher un produit...')}
                    />
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" step="0.1" value={line.quantity || ''} onChange={e => updateUsageLine(index, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                      {selectedItem && <span className="text-xs text-muted-foreground whitespace-nowrap">{selectedItem.unit}</span>}
                    </div>
                    <select value={line.reason} onChange={e => updateUsageLine(index, 'reason', e.target.value)} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm">
                      {USAGE_REASONS.map(r => (
                        <option key={r.value} value={r.value}>{locale === 'fr' ? r.labelFr : r.labelEn}</option>
                      ))}
                    </select>
                    <input type="text" value={line.notes} onChange={e => updateUsageLine(index, 'notes', e.target.value)} placeholder={tt('notesPlaceholder', 'Notes (optionnel)')} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex items-center">
                      <button onClick={() => {
                        if (usageLines.length > 1) { removeUsageLine(index); }
                        else { setUsageLines([{ inventory_item_id: '', quantity: 0, reason: 'consumption', notes: '' }]); }
                      }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {selectedItem && line.quantity > 0 && (
                      <div className="col-span-5 -mt-1 pb-1 pl-1">
                        <span className="text-xs text-muted-foreground">
                          {tt('stockAfter', 'Stock après')}: {Math.max(0, selectedItem.quantity - line.quantity)} {selectedItem.unit}
                          {line.quantity > selectedItem.quantity && (
                            <span className="text-red-500 ml-2">{tt('overStock', '(dépasse le stock !)')}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button onClick={addUsageLine} className="flex items-center gap-2 text-sm text-[#606338] hover:text-[#4d4f2e] font-medium transition-colors">
                <Plus className="w-4 h-4" />
                {tt('addLine', 'Ajouter un produit')}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <span className="text-sm text-muted-foreground">{tt('totalProducts', 'Produits')}: </span>
              <span className="text-sm font-semibold">{validUsageLines.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveUsage} disabled={usageSaving || validUsageLines.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {usageSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                {tt('saveUsage', 'Enregistrer les sorties')}
              </button>
            </div>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Tab ───────────────────────────────────────────────── */}
      {tab === 'history' && renderHistoryTab()}

      {/* ─── Orders Tab ────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {orders.filter(o => o.status === 'pending').length} {tt('pendingOrders', 'en attente')}
              </span>
            </div>
            {!showOrderForm && (
              <button onClick={() => { setShowOrderForm(true); addOrderItem(); }} className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] transition-colors">
                <Plus className="w-4 h-4" />
                {tt('newOrder', 'Nouvelle commande')}
              </button>
            )}
          </div>

          {/* New order form */}
          {showOrderForm && (
            <div className="bg-card border border-border rounded-xl overflow-visible">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
                <span className="text-sm font-semibold">{tt('newOrder', 'Nouvelle commande')}</span>
                <button onClick={resetOrderForm} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Vendor + date + notes */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">{tt('selectVendor', 'Fournisseur')}</label>
                    <select value={orderVendorId} onChange={e => setOrderVendorId(e.target.value)} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm">
                      <option value="">{tt('selectVendor', 'Fournisseur')}</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="w-44">
                    <label className="text-xs text-muted-foreground mb-1 block">{tt('orderDate', 'Date')}</label>
                    <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">{tt('columns.notes', 'Notes')}</label>
                    <input type="text" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={tt('notesPlaceholder', 'Notes (optionnel)')} className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_140px_80px_80px_100px_32px] gap-2 text-xs font-semibold text-muted-foreground uppercase">
                    <span>{tt('columns.product', 'Produit')}</span>
                    <span>{tt('columns.vendor', 'Fournisseur')}</span>
                    <span>{tt('columns.quantity', 'Qté')}</span>
                    <span>{tt('columns.unitCost', 'Prix')}</span>
                    <span>Total</span>
                    <span></span>
                  </div>
                  {orderItems.map((oi, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_140px_80px_80px_100px_32px] gap-2 items-center">
                      <ProductSearchSelect
                        items={itemsForLineVendor(oi.vendor_id)}
                        value={oi.inventory_item_id}
                        onChange={v => updateOrderItem(idx, 'inventory_item_id', v)}
                        placeholder={tt('searchProduct', 'Chercher un produit...')}
                      />
                      <select
                        value={oi.vendor_id}
                        onChange={e => updateOrderItem(idx, 'vendor_id', e.target.value)}
                        title={oi.vendor_id ? tt('lineVendorOverride', 'Fournisseur de cette ligne') : tt('lineVendorDefault', 'Utilise le fournisseur principal')}
                        className={`w-full bg-transparent border rounded-lg px-2 py-2 text-xs ${oi.vendor_id ? 'border-[#606338] text-foreground' : 'border-dashed border-border text-muted-foreground'}`}
                      >
                        <option value="">{tt('sameAsOrder', 'Idem commande')}</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" step="0.1" value={oi.quantity || ''} onChange={e => updateOrderItem(idx, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                      </div>
                      <div className="relative">
                        <input type="number" min="0" step="0.01" value={oi.unit_cost || ''} onChange={e => updateOrderItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full bg-transparent border border-border rounded-lg px-2 py-2 text-sm text-right" />
                      </div>
                      <span className="text-sm text-right text-muted-foreground">{formatCurrency(oi.quantity * oi.unit_cost)}</span>
                      {orderItems.length > 1 && (
                        <button onClick={() => removeOrderItem(idx)} className="p-1 rounded text-red-500 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addOrderItem} className="flex items-center gap-1.5 text-xs text-[#606338] hover:text-[#4d4f2e] font-medium">
                    <Plus className="w-3.5 h-3.5" /> {tt('addLine', 'Ajouter un produit')}
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-bold">Total: {formatCurrency(orderItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0))}</span>
                  <button onClick={handleCreateOrder} disabled={orderSaving || !orderVendorId || orderItems.filter(i => i.product_name && i.quantity > 0).length === 0} className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {orderSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                    {tt('createOrder', 'Créer la commande')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders list */}
          {ordersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{tt('noOrders', 'Aucune commande')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isReceiving = receivingOrderId === order.id;
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-700',
                  received: 'bg-emerald-100 text-emerald-700',
                  cancelled: 'bg-red-100 text-red-700',
                  draft: 'bg-secondary text-muted-foreground',
                };
                const statusLabels: Record<string, string> = {
                  pending: tt('statusPending', 'En attente'),
                  received: tt('statusReceived', 'Reçue'),
                  cancelled: tt('statusCancelled', 'Annulée'),
                  draft: tt('statusDraft', 'Brouillon'),
                };

                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Order header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                        <span className="text-sm font-semibold">{order.vendor?.name}</span>
                        <span className="text-xs text-muted-foreground">{order.order_date}</span>
                        <span className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setReceivingOrderId(isReceiving ? null : order.id); setReceivePaidAmount(0); }}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                            >
                              {tt('receive', 'Valider réception')}
                            </button>
                            <button
                              onClick={() => { if (confirm(tt('confirmCancel', 'Annuler cette commande ?'))) handleCancelOrder(order.id); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {(order.status === 'cancelled' || order.status === 'draft') && (
                          <button
                            onClick={() => { if (confirm(tt('confirmDeleteOrder', 'Supprimer cette commande ?'))) handleDeleteOrder(order.id); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-sm font-bold">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border">
                      {order.items.map(oi => {
                        const itemVendorId = (oi as PurchaseOrderItem & { vendor_id?: string | null }).vendor_id || null;
                        const effectiveVendor = itemVendorId
                          ? vendors.find(v => v.id === itemVendorId)
                          : null;
                        const editable = order.status === 'pending' || order.status === 'draft';
                        return (
                          <div key={oi.id} className="grid grid-cols-[1fr_140px_80px_80px_100px] gap-3 px-4 py-2 items-center text-sm">
                            <span className="font-medium">{oi.product_name}</span>
                            {editable ? (
                              <select
                                value={itemVendorId || ''}
                                onChange={e => handleUpdateItemVendor(order.id, oi.id, e.target.value || null)}
                                title={effectiveVendor ? tt('lineVendorOverride', 'Fournisseur de cette ligne') : tt('lineVendorDefault', 'Utilise le fournisseur principal')}
                                className={`bg-transparent border rounded-lg px-2 py-1 text-xs ${effectiveVendor ? 'border-[#606338] text-foreground' : 'border-dashed border-border text-muted-foreground'}`}
                              >
                                <option value="">{tt('sameAsOrder', 'Idem commande')}</option>
                                {vendors.map(v => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`text-xs ${effectiveVendor ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {effectiveVendor ? effectiveVendor.name : (order.vendor?.name || '—')}
                              </span>
                            )}
                            <span className="text-right text-muted-foreground">{oi.quantity} {oi.unit}</span>
                            <span className="text-right text-muted-foreground">{formatCurrency(oi.unit_cost)}</span>
                            <span className="text-right font-medium">{formatCurrency(oi.quantity * oi.unit_cost)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Receive panel */}
                    {isReceiving && (
                      <div className="border-t border-border bg-emerald-50 px-4 py-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">{tt('receiveTitle', 'Confirmer la réception')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-emerald-700">{tt('paid', 'Payé')}</label>
                            <div className="relative">
                              <input type="number" min="0" step="0.01" value={receivePaidAmount || ''} onChange={e => setReceivePaidAmount(parseFloat(e.target.value) || 0)} placeholder="0" className="w-28 bg-white border border-emerald-300 rounded-lg px-2 py-1.5 pr-7 text-sm text-right" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">DH</span>
                            </div>
                            <button onClick={() => setReceivePaidAmount(order.total_amount)} className="text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100">{tt('payAll', 'Tout')}</button>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button onClick={() => setReceivingOrderId(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground">{tt('cancel', 'Annuler')}</button>
                            <button
                              onClick={() => handleReceiveOrder(order.id)}
                              disabled={orderSaving}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {orderSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              {tt('confirmReceive', 'Confirmer et enregistrer')}
                            </button>
                          </div>
                        </div>
                        {receivePaidAmount < order.total_amount && receivePaidAmount >= 0 && (
                          <p className="text-xs text-red-600">{tt('remaining', 'Reste')}: {formatCurrency(order.total_amount - receivePaidAmount)} ({tt('willBeDebt', 'sera enregistré comme dette')})</p>
                        )}
                      </div>
                    )}

                    {/* Notes + received info */}
                    {(order.notes || order.status === 'received') && (
                      <div className="px-4 py-2 bg-secondary/30 text-xs text-muted-foreground flex items-center gap-4">
                        {order.notes && <span>{order.notes}</span>}
                        {order.status === 'received' && order.received_at && (
                          <span className="ml-auto">{tt('receivedOn', 'Reçue le')} {new Date(order.received_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Product Detail Slide-over ─────────────────────────────── */}
      {detailProductId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDetailProductId(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold">{detailProduct?.name || '—'}</h2>
                <p className="text-xs text-muted-foreground">{detailProduct?.inventory_category?.name || ''} — {detailProduct?.unit}</p>
              </div>
              <button onClick={() => setDetailProductId(null)} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="text-xl font-bold">{detailProduct?.quantity || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{detailProduct?.unit}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">{tt('columns.unitCost', 'Coût moy.')}</p>
                    <p className="text-lg font-bold">{formatCurrency(detailProduct?.cost_per_unit || 0)}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">{tt('lastPrice', 'Dernier prix')}</p>
                    <p className="text-lg font-bold">{formatCurrency(detailProduct?.last_purchase_price || 0)}</p>
                  </div>
                </div>
                {detailStats && detailStats.purchaseCount > 0 && (
                  <div className="bg-secondary rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold">{tt('priceAnalytics', 'Analyse des prix')}</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{tt('avgPrice', 'Prix moyen')}</span><span className="font-medium">{formatCurrency(detailStats.avgPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{tt('lastPrice', 'Dernier prix')}</span><span className="font-medium">{formatCurrency(detailStats.lastPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Min</span><span className="font-medium text-emerald-600">{formatCurrency(detailStats.minPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span className="font-medium text-red-600">{formatCurrency(detailStats.maxPrice)}</span></div>
                    </div>
                    {detailStats.priceVariation !== 0 && (
                      <div className={`text-xs px-2 py-1 rounded-lg inline-block ${detailStats.priceVariation > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {detailStats.priceVariation > 0 ? '▲' : '▼'} {Math.abs(detailStats.priceVariation)}% {tt('sinceFirst', 'depuis le 1er achat')}
                      </div>
                    )}
                  </div>
                )}
                {detailStats && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs text-emerald-700">{tt('totalPurchased', 'Total acheté')}</p>
                      <p className="text-lg font-bold text-emerald-700">{detailStats.totalPurchased} {detailProduct?.unit}</p>
                      <p className="text-[10px] text-emerald-600">{detailStats.purchaseCount} {tt('filterPurchases', 'achats')} — {formatCurrency(detailStats.totalSpent)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700">{tt('totalUsed', 'Total sorti')}</p>
                      <p className="text-lg font-bold text-red-700">{detailStats.totalUsed} {detailProduct?.unit}</p>
                      <p className="text-[10px] text-red-600">{detailStats.usageCount} {tt('filterUsage', 'sorties')}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold mb-3">{tt('tabs.history', 'Historique')} ({detailMovements.length})</h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {detailMovements.map(m => {
                      const isOut = m.reference_type === 'daily_usage';
                      return (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium min-w-[40px] text-center ${isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isOut ? '-' : '+'}{Math.abs(m.quantity_change)}
                          </span>
                          <span className="text-muted-foreground text-xs flex-1">{m.reference_id}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(m.unit_cost)}/{detailProduct?.unit}</span>
                          <span className={`text-xs font-medium ${isOut ? 'text-red-600' : 'text-[#606338]'}`}>
                            {formatCurrency(Math.abs(m.quantity_change) * m.unit_cost)}
                          </span>
                        </div>
                      );
                    })}
                    {detailMovements.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">{tt('noHistoryAll', 'Aucun mouvement')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
