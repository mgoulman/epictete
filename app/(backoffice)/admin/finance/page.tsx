'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { usePermissions } from '@/lib/auth/hooks';
import {
  DollarSign, TrendingUp, ShoppingCart, Upload, Plus,
  Download, RefreshCw, ChevronLeft, ChevronRight, X, Calendar,
  Search, FileSpreadsheet, Trash2, Eye, BarChart3, PieChart,
  Package, AlertTriangle, Edit2, Minus, Users, Phone, Mail, MapPin,
  CreditCard, ArrowUpRight, ArrowDownRight, Camera, FileText,
  Check, Image as ImageIcon, Loader2
} from 'lucide-react';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface SalesItem {
  id: string;
  ticket_number: string | null;
  family: string | null;
  category: string | null;
  product_name: string;
  sub_product: string | null;
  quantity: number;
  catalog_price: number;
  selling_price: number;
  tax_rate: number;
  profit: number;
  dine_in: boolean;
  sale_date: string;
  sale_time: string | null;
  created_at: string;
}

interface InventoryCategory {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  category_id: string | null;
  inventory_category: InventoryCategory | null;
  quantity: number;
  unit: string;
  minimum_stock: number;
  cost_per_unit: number;
  last_purchase_price: number;
  supplier: string | null;
  vendor_id: string | null;
  vendor: { id: string; name: string } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string;
  category_id: string | null;
  inventory_category: InventoryCategory | null;
  notes: string | null;
  is_active: boolean;
  balance: number;
  invoice_template_url: string | null;
  invoice_template_path: string | null;
  created_at: string;
  updated_at: string;
}

interface VendorInvoice {
  id: string;
  vendor_id: string;
  invoice_url: string;
  invoice_path: string;
  invoice_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed';
  vendor_transaction_id: string | null;
  raw_extraction: unknown;
  created_at: string;
  items?: VendorInvoiceItem[];
}

interface VendorInvoiceItem {
  id: string;
  invoice_id: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  matched_inventory_id: string | null;
}

interface ScannedItem {
  product_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  matched_inventory_id: string | null;
  matched_inventory_name: string | null;
  match_score: number;
}

interface VendorTransaction {
  id: string;
  vendor_id: string;
  vendor: { id: string; name: string };
  type: 'debt' | 'payment';
  amount: number;
  description: string | null;
  date: string;
  reference: string | null;
  created_at: string;
}

type TabType = 'overview' | 'sales' | 'inventory' | 'vendors';

export default function FinancePage() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('finance.write');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const fn = t.backoffice.financePage;

  // Get tab from URL or default to 'overview'
  const tabParam = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['overview', 'sales', 'inventory', 'vendors'];
  const activeTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : 'overview';

  const setActiveTab = (tab: TabType) => {
    router.push(`/admin/finance?tab=${tab}`, { scroll: false });
  };
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [dashStats, setDashStats] = useState<{
    summary: { revenue: number; transactions: number; couverts: number; days: number; avgTicket: number; last_synced: string | null };
    daily: Array<{ date: string; revenue: number; transactions: number; couverts: number; avg_ticket: number | null }>;
    lastSyncRun: { ca_realise: number; ca_annule: number; benefice: number; couverts: number; transactions: number; best_day: string | null; best_day_amount: number | null; created_at: string } | null;
    topProducts: Array<{ name: string; count: number; revenue: number }>;
    categoryStats: Array<{ name: string; count: number; revenue: number }>;
    profit: { benefice: number; totalCost: number; mappedRevenue: number; coverage: number; marginOnMapped: number; distinctDishes: number; mappedDishes: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoImporting, setAutoImporting] = useState(false);
  const [showAutoImportModal, setShowAutoImportModal] = useState(false);
  const [autoImportDates, setAutoImportDates] = useState(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  });
  const [autoImportResult, setAutoImportResult] = useState<{
    success: boolean;
    totalRows: number;
    insertedRows: number;
    skippedDuplicates: number;
    message?: string;
  } | null>(null);

  // Sort state
  const [salesSort, setSalesSort] = useState('sale_date');
  const [salesSortDir, setSalesSortDir] = useState<SortDir>('asc');
  const [invSort, setInvSort] = useState('name');
  const [invSortDir, setInvSortDir] = useState<SortDir>('asc');

  const handleSalesSort = (field: string) => {
    if (salesSort === field) {
      setSalesSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSalesSort(field);
      setSalesSortDir('asc');
    }
  };

  const handleInvSort = (field: string) => {
    if (invSort === field) {
      setInvSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInvSort(field);
      setInvSortDir('asc');
    }
  };

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [detailMovements, setDetailMovements] = useState<Array<{ id: string; inventory_item_id: string; movement_type: string; quantity_change: number; unit_cost: number; reference_type: string; reference_id: string; created_at: string }>>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newInventory, setNewInventory] = useState({
    name: '',
    category_id: '',
    quantity: 0,
    unit: 'kg',
    minimum_stock: 0,
    cost_per_unit: 0,
    vendor_id: '',
    notes: ''
  });

  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorTransactions, setVendorTransactions] = useState<VendorTransaction[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendorForTransaction, setSelectedVendorForTransaction] = useState<Vendor | null>(null);
  const [viewingVendorTransactions, setViewingVendorTransactions] = useState<Vendor | null>(null);
  // Vendor detail modal
  const [viewingVendorDetail, setViewingVendorDetail] = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<InventoryItem[]>([]);
  const [vendorProductsLoading, setVendorProductsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  // Per-transaction expansion (vendor history): clicking a tx fetches PO line items for that order
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<Record<string, Array<{ id: string; product_name: string; quantity: number; unit: string; unit_cost: number; vendor_id: string | null }>>>({});
  const [txDetailsLoading, setTxDetailsLoading] = useState<string | null>(null);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProduct, setQuickProduct] = useState({ name: '', category: '', quantity: 0, unit: 'pieces', cost_per_unit: 0 });
  const [showMoveProducts, setShowMoveProducts] = useState(false);
  const [moveTargetVendorId, setMoveTargetVendorId] = useState('');
  const [moveNewVendorName, setMoveNewVendorName] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    category_id: '',
    notes: '',
    invoice_template_url: '' as string,
    invoice_template_path: '' as string
  });
  const [newTransaction, setNewTransaction] = useState({
    type: 'debt' as 'debt' | 'payment',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: ''
  });

  // Invoice scanner state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerStage, setScannerStage] = useState<'upload' | 'review' | 'success'>('upload');
  const [scannerVendorId, setScannerVendorId] = useState('');
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [scannerPreview, setScannerPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scannedInvoiceDate, setScannedInvoiceDate] = useState('');
  const [scannedTotalAmount, setScannedTotalAmount] = useState(0);
  const [scannedInvoiceUrl, setScannedInvoiceUrl] = useState('');
  const [scannedInvoicePath, setScannedInvoicePath] = useState('');
  const [scannedRawExtraction, setScannedRawExtraction] = useState<unknown>(null);
  const [scannerInventoryItems, setScannerInventoryItems] = useState<Array<{ id: string; name: string }>>([]);
  const [confirming, setConfirming] = useState(false);
  const [updateInventoryOnConfirm, setUpdateInventoryOnConfirm] = useState(true);
  const [confirmResult, setConfirmResult] = useState<{ transaction: { id: string; amount: number }; inventory_updates: Array<{ name: string; added: number }> } | null>(null);

  // Invoice history
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);

  // Vendor match modal
  const [showVendorMatch, setShowVendorMatch] = useState(false);
  const [vendorMatchSaving, setVendorMatchSaving] = useState(false);
  const [vendorMatchSuccess, setVendorMatchSuccess] = useState<string | null>(null);
  const [vendorMatchSkipped, setVendorMatchSkipped] = useState<Set<string>>(new Set());
  const [vendorMatchCount, setVendorMatchCount] = useState(0);
  const [vendorMatchSearch, setVendorMatchSearch] = useState('');
  const [stableMatchInventory, setStableMatchInventory] = useState<InventoryItem | null>(null);

  // Template upload
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Manual entry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSale, setNewSale] = useState({
    product_name: '',
    category: '',
    quantity: 1,
    selling_price: 0,
    sale_date: new Date().toISOString().split('T')[0]
  });

  const fetchDashStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/finance/dashboard-stats?${params}`);
      if (res.ok) setDashStats(await res.json());
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
    }
  }, [startDate, endDate]);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchSales = useCallback(async () => {
    // offset === 0 is a reload (filters changed). Anything else is a
    // "load more" trigger from the infinite-scroll sentinel.
    const isAppending = offset > 0;
    if (isAppending) setIsLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (category) params.set('category', category);
      if (searchQuery) params.set('product', searchQuery);

      const res = await fetch(`/api/finance/sales?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setSalesItems(prev => (isAppending ? [...prev, ...items] : items));
        setTotal(data.total || 0);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error('Sales fetch error:', err);
    }
    if (isAppending) setIsLoadingMore(false);
    else setLoading(false);
  }, [offset, startDate, endDate, category, searchQuery]);

  // Infinite-scroll sentinel: when this element scrolls into view, load
  // the next page by bumping the offset (fetchSales appends when offset > 0).
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMoreSales = salesItems.length < total;
  useEffect(() => {
    if (activeTab !== 'sales' || !hasMoreSales || loading || isLoadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setOffset(prev => prev + limit);
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, hasMoreSales, loading, isLoadingMore, salesItems.length, limit]);

  const fetchInventory = useCallback(async (showLoader = true) => {
    if (showLoader) setInventoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (inventoryCategory) params.set('category', inventoryCategory);
      if (inventorySearch) params.set('search', inventorySearch);

      const res = await fetch(`/api/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data.items || []);
        setInventoryCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
    }
    if (showLoader) setInventoryLoading(false);
  }, [inventoryCategory, inventorySearch]);

  const fetchVendors = useCallback(async (showLoader = true) => {
    if (showLoader) setVendorsLoading(true);
    try {
      const res = await fetch('/api/vendors?type=vendors');
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Vendors fetch error:', err);
    }
    if (showLoader) setVendorsLoading(false);
  }, []);

  const fetchVendorProducts = useCallback(async (vendorId: string) => {
    setVendorProductsLoading(true);
    try {
      const res = await fetch(`/api/vendors?type=products&vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendorProducts(data.products || []);
      }
    } catch (err) {
      console.error('Vendor products fetch error:', err);
    }
    setVendorProductsLoading(false);
  }, []);

  const openVendorDetail = (vendor: Vendor) => {
    setViewingVendorDetail(vendor);
    setSelectedProductIds(new Set());
    setShowQuickAddProduct(false);
    setShowMoveProducts(false);
    setMoveTargetVendorId('');
    setMoveNewVendorName('');
    setQuickProduct({ name: '', category: vendor.category || '', quantity: 0, unit: 'pieces', cost_per_unit: 0 });
    fetchVendorProducts(vendor.id);
  };

  const closeVendorDetail = () => {
    setViewingVendorDetail(null);
    setVendorProducts([]);
    setSelectedProductIds(new Set());
    setShowQuickAddProduct(false);
    setShowMoveProducts(false);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedProductIds(prev =>
      prev.size === vendorProducts.length ? new Set() : new Set(vendorProducts.map(p => p.id))
    );
  };

  const handleQuickAddProduct = async () => {
    if (!viewingVendorDetail || !quickProduct.name.trim()) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quickProduct, vendor_id: viewingVendorDetail.id }),
      });
      if (res.ok) {
        await fetchVendorProducts(viewingVendorDetail.id);
        await fetchInventory(false);
        setShowQuickAddProduct(false);
        setQuickProduct({ name: '', category: viewingVendorDetail.category || '', quantity: 0, unit: 'pieces', cost_per_unit: 0 });
      }
    } catch (err) {
      console.error('Quick add product error:', err);
    }
  };

  const handleMoveProducts = async () => {
    if (!viewingVendorDetail || selectedProductIds.size === 0) return;
    if (!moveTargetVendorId && !moveNewVendorName.trim()) return;
    setMoveSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: 'reassign-products',
        itemIds: [...selectedProductIds],
      };
      if (moveTargetVendorId) body.targetVendorId = moveTargetVendorId;
      else body.newVendor = { name: moveNewVendorName.trim() };
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await Promise.all([
          fetchVendorProducts(viewingVendorDetail.id),
          fetchVendors(false),
          fetchInventory(false),
        ]);
        setSelectedProductIds(new Set());
        setShowMoveProducts(false);
        setMoveTargetVendorId('');
        setMoveNewVendorName('');
      }
    } catch (err) {
      console.error('Move products error:', err);
    }
    setMoveSaving(false);
  };

  const toggleTransactionDetail = async (tx: VendorTransaction, vendorId: string) => {
    if (expandedTxId === tx.id) { setExpandedTxId(null); return; }
    setExpandedTxId(tx.id);
    if (txDetails[tx.id]) return; // already cached
    // Reference shape: "order_<uuid>" or "order_pay_<uuid>"
    const ref = tx.reference || '';
    const m = ref.match(/^order(?:_pay)?_([0-9a-fA-F-]{36})$/);
    if (!m) return;
    const orderId = m[1];
    setTxDetailsLoading(tx.id);
    try {
      const res = await fetch(`/api/purchase-orders?id=${orderId}`);
      if (res.ok) {
        const { order } = await res.json();
        const lines = (order?.items || [])
          .filter((it: { vendor_id: string | null }) => (it.vendor_id || order.vendor_id) === vendorId);
        setTxDetails(prev => ({ ...prev, [tx.id]: lines }));
      }
    } catch (err) {
      console.error('tx detail fetch error:', err);
    } finally {
      setTxDetailsLoading(null);
    }
  };

  const fetchVendorTransactions = useCallback(async (vendorId: string) => {
    try {
      const res = await fetch(`/api/vendors?type=transactions&vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendorTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Vendor transactions fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchDashStats(), fetchSales()]);
    };
    loadData();
  }, [fetchDashStats, fetchSales]);

  useEffect(() => {
    const loadTabData = async () => {
      if (activeTab === 'inventory') {
        await fetchInventory();
        await fetchVendors();
      }
      if (activeTab === 'vendors') {
        await fetchVendors();
        await fetchInventory(false);
      }
    };
    loadTabData();
  }, [activeTab, fetchInventory, fetchVendors]);

  const handleAutoImport = async () => {
    setAutoImporting(true);
    setAutoImportResult(null);

    try {
      const res = await fetch('/api/finance/dashboard-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: autoImportDates.startDate,
          endDate: autoImportDates.endDate,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setAutoImportResult({
          success: true,
          totalRows: result.daysSynced || 0,
          insertedRows: result.daysSynced || 0,
          skippedDuplicates: 0,
          message: `CA Réalisé: ${Number(result.kpis?.caRealise || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD · ${result.kpis?.transactions || 0} tickets · ${result.kpis?.couverts || 0} couverts`,
        });
        fetchDashStats();
      } else {
        setAutoImportResult({
          success: false,
          totalRows: 0,
          insertedRows: 0,
          skippedDuplicates: 0,
          message: result.error || 'Sync failed',
        });
      }
    } catch (err) {
      console.error('Dashboard sync error:', err);
      setAutoImportResult({
        success: false,
        totalRows: 0,
        insertedRows: 0,
        skippedDuplicates: 0,
        message: 'Sync failed',
      });
    }

    setAutoImporting(false);
  };

  const handleAddSale = async () => {
    if (!newSale.product_name || !newSale.selling_price) {
      alert(fn.fillRequired);
      return;
    }

    try {
      const res = await fetch('/api/finance/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale)
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewSale({
          product_name: '',
          category: '',
          quantity: 1,
          selling_price: 0,
          sale_date: new Date().toISOString().split('T')[0]
        });
        fetchSales();
      } else {
        const err = await res.json();
        alert(err.error || fn.failedAddSale);
      }
    } catch (err) {
      console.error('Add sale error:', err);
      alert(fn.failedAddSale);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(fn.deleteRecord)) return;

    try {
      const res = await fetch(`/api/finance/sales?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSales();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleAddInventory = async () => {
    if (!newInventory.name) {
      alert(fn.enterItemName);
      return;
    }

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInventory)
      });

      if (res.ok) {
        setShowInventoryModal(false);
        setNewInventory({
          name: '',
          category_id: '',
          quantity: 0,
          unit: 'kg',
          minimum_stock: 0,
          cost_per_unit: 0,
          vendor_id: '',
          notes: ''
        });
        fetchInventory(false);
      } else {
        const err = await res.json();
        alert(err.error || fn.failedAddItem);
      }
    } catch (err) {
      console.error('Add inventory error:', err);
      alert(fn.failedAddItem);
    }
  };

  const handleUpdateInventory = async () => {
    if (!editingInventory) return;

    try {
      const { vendor, supplier, inventory_category, ...inventoryPayload } = editingInventory;
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryPayload)
      });

      if (res.ok) {
        setEditingInventory(null);
        fetchInventory(false);
      } else {
        const err = await res.json();
        alert(err.error || fn.failedUpdateItem);
      }
    } catch (err) {
      console.error('Update inventory error:', err);
      alert(fn.failedUpdateItem);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm(fn.deleteInventoryItem)) return;

    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory(false);
      }
    } catch (err) {
      console.error('Delete inventory error:', err);
    }
  };

  const openProductDetail = async (productId: string) => {
    setDetailProductId(productId);
    setDetailLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`/api/inventory/daily-purchase?itemId=${productId}`),
        fetch(`/api/inventory/daily-usage?itemId=${productId}`),
      ]);
      const [pData, uData] = await Promise.all([pRes.json(), uRes.json()]);
      const all = [...(pData.movements || []), ...(uData.movements || [])].sort(
        (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at)
      );
      setDetailMovements(all);
    } catch { setDetailMovements([]); } finally { setDetailLoading(false); }
  };

  const handleQuickQuantityUpdate = async (item: InventoryItem, delta: number) => {
    const newQuantity = Math.max(0, item.quantity + delta);
    // Optimistic update — no full refetch
    setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i));
    try {
      await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, quantity: newQuantity })
      });
    } catch (err) {
      console.error('Quick update error:', err);
      // Revert on failure
      setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.name) {
      alert(fn.enterVendorName);
      return;
    }

    try {
      const vendorPayload = {
        type: 'vendor',
        name: newVendor.name,
        contact_name: newVendor.contact_name,
        email: newVendor.email,
        phone: newVendor.phone,
        address: newVendor.address,
        category_id: newVendor.category_id || null,
        notes: newVendor.notes,
        invoice_template_url: newVendor.invoice_template_url || null,
        invoice_template_path: newVendor.invoice_template_path || null
      };
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorPayload)
      });

      if (res.ok) {
        setShowVendorModal(false);
        setNewVendor({
          name: '',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          category_id: '',
          notes: '',
          invoice_template_url: '',
          invoice_template_path: ''
        });
        fetchVendors(false);
      } else {
        const err = await res.json();
        alert(err.error || fn.failedAddVendor);
      }
    } catch (err) {
      console.error('Add vendor error:', err);
      alert(fn.failedAddVendor);
    }
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor) return;

    try {
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'vendor',
          id: editingVendor.id,
          name: editingVendor.name,
          contact_name: editingVendor.contact_name,
          email: editingVendor.email,
          phone: editingVendor.phone,
          address: editingVendor.address,
          category_id: editingVendor.category_id || null,
          notes: editingVendor.notes,
          is_active: editingVendor.is_active,
          invoice_template_url: editingVendor.invoice_template_url,
          invoice_template_path: editingVendor.invoice_template_path
        })
      });

      if (res.ok) {
        setEditingVendor(null);
        fetchVendors(false);
      } else {
        const err = await res.json();
        alert(err.error || fn.failedUpdateVendor);
      }
    } catch (err) {
      console.error('Update vendor error:', err);
      alert(fn.failedUpdateVendor);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm(fn.deleteVendorConfirm)) return;

    try {
      const res = await fetch(`/api/vendors?type=vendor&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVendors(false);
      }
    } catch (err) {
      console.error('Delete vendor error:', err);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedVendorForTransaction || !newTransaction.amount) {
      alert(fn.enterAmount);
      return;
    }

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transaction',
          vendor_id: selectedVendorForTransaction.id,
          transaction_type: newTransaction.type,
          amount: newTransaction.amount,
          description: newTransaction.description,
          date: newTransaction.date,
          reference: newTransaction.reference
        })
      });

      if (res.ok) {
        setShowTransactionModal(false);
        setSelectedVendorForTransaction(null);
        setNewTransaction({
          type: 'debt',
          amount: 0,
          description: '',
          date: new Date().toISOString().split('T')[0],
          reference: ''
        });
        fetchVendors(false);
        if (viewingVendorTransactions) {
          fetchVendorTransactions(viewingVendorTransactions.id);
        }
      } else {
        const err = await res.json();
        alert(err.error || fn.failedAddTransaction);
      }
    } catch (err) {
      console.error('Add transaction error:', err);
      alert(fn.failedAddTransaction);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm(fn.deleteTransaction)) return;

    try {
      const res = await fetch(`/api/vendors?type=transaction&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVendors(false);
        if (viewingVendorTransactions) {
          fetchVendorTransactions(viewingVendorTransactions.id);
        }
      }
    } catch (err) {
      console.error('Delete transaction error:', err);
    }
  };

  // Template upload handler
  const handleTemplateUpload = async (
    file: File,
    target: 'new' | 'edit'
  ) => {
    setUploadingTemplate(true);
    try {
      const { uploadFile } = await import('@/lib/client-upload');
      const data = await uploadFile(file, 'vendor-invoices');
      if (target === 'new') {
        setNewVendor({ ...newVendor, invoice_template_url: data.url, invoice_template_path: data.path });
      } else if (editingVendor) {
        setEditingVendor({ ...editingVendor, invoice_template_url: data.url, invoice_template_path: data.path });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : fn.failedUploadTemplate);
    }
    setUploadingTemplate(false);
  };

  const handleRemoveTemplate = async (target: 'new' | 'edit') => {
    const path = target === 'new' ? newVendor.invoice_template_path : editingVendor?.invoice_template_path;
    if (path) {
      try {
        await fetch(`/api/upload?path=${encodeURIComponent(path)}&bucket=vendor-invoices`, { method: 'DELETE' });
      } catch { /* ignore cleanup errors */ }
    }
    if (target === 'new') {
      setNewVendor({ ...newVendor, invoice_template_url: '', invoice_template_path: '' });
    } else if (editingVendor) {
      setEditingVendor({ ...editingVendor, invoice_template_url: null, invoice_template_path: null });
    }
  };

  // Invoice scanner handlers
  const handleScanInvoice = async () => {
    if (!scannerFile || !scannerVendorId) {
      alert(fn.selectVendorAndInvoice);
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', scannerFile);
      formData.append('vendorId', scannerVendorId);

      const res = await fetch('/api/invoices/scan', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setScannedItems(data.extraction.items || []);
        setScannedInvoiceDate(data.extraction.invoice_date || new Date().toISOString().split('T')[0]);
        setScannedTotalAmount(data.extraction.total_amount || 0);
        setScannedInvoiceUrl(data.invoice_url);
        setScannedInvoicePath(data.invoice_path);
        setScannedRawExtraction(data.raw_extraction);
        setScannerInventoryItems(data.inventory_items || []);
        setScannerStage('review');
      } else {
        alert(data.error || fn.scanFailed);
      }
    } catch {
      alert(fn.scanFailed);
    }
    setScanning(false);
  };

  const handleConfirmInvoice = async () => {
    setConfirming(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: scannerVendorId,
          invoice_url: scannedInvoiceUrl,
          invoice_path: scannedInvoicePath,
          invoice_date: scannedInvoiceDate,
          total_amount: scannedTotalAmount,
          items: scannedItems,
          raw_extraction: scannedRawExtraction,
          update_inventory: updateInventoryOnConfirm
        })
      });

      const data = await res.json();
      if (res.ok) {
        setConfirmResult({
          transaction: data.transaction,
          inventory_updates: data.inventory_updates || []
        });
        setScannerStage('success');
        fetchVendors(false);
      } else {
        alert(data.error || fn.confirmFailed);
      }
    } catch {
      alert(fn.confirmFailed);
    }
    setConfirming(false);
  };

  const resetScanner = () => {
    setShowScannerModal(false);
    setScannerStage('upload');
    setScannerVendorId('');
    setScannerFile(null);
    setScannerPreview('');
    setScannedItems([]);
    setScannedInvoiceDate('');
    setScannedTotalAmount(0);
    setScannedInvoiceUrl('');
    setScannedInvoicePath('');
    setScannedRawExtraction(null);
    setScannerInventoryItems([]);
    setConfirmResult(null);
    setUpdateInventoryOnConfirm(true);
  };

  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setScannerPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setScannerPreview('');
    }
  };

  // Fetch invoices for a vendor
  const fetchVendorInvoices = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/invoices?vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendorInvoices(data.invoices || []);
      }
    } catch {
      console.error('Failed to fetch vendor invoices');
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.contact_name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.inventory_category?.name || v.category || '').toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const totalOwedToVendors = vendors.reduce((sum, v) => sum + Math.max(0, v.balance), 0);

  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    setExporting(true);
    try {
      // Export ALL rows matching the current filters (not just the loaded page).
      const params = new URLSearchParams({ limit: '100000', offset: '0' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (category) params.set('category', category);
      if (searchQuery) params.set('product', searchQuery);
      const res = await fetch(`/api/finance/sales?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const rows: SalesItem[] = data.items || [];
      if (!rows.length) return;

      // Excel-friendly: UTF-8 BOM, ';' separator, quoted fields, CRLF.
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const headers = ['Date', 'Heure', 'Ticket', 'Catégorie', 'Produit', 'Qté', 'Prix unitaire', 'Total', 'Bénéfice'];
      const body = rows.map(it => [
        it.sale_date, it.sale_time || '', it.ticket_number || '', it.category || '', it.product_name,
        it.quantity, Number(it.selling_price).toFixed(2),
        (it.selling_price * it.quantity).toFixed(2), ((it.profit || 0) * it.quantity).toFixed(2),
      ].map(esc).join(';'));

      const totQty = rows.reduce((s, it) => s + (it.quantity || 0), 0);
      const totAmount = rows.reduce((s, it) => s + it.selling_price * it.quantity, 0);
      const totProfit = rows.reduce((s, it) => s + (it.profit || 0) * it.quantity, 0);
      const totalRow = ['TOTAL', '', '', '', '', totQty, '', totAmount.toFixed(2), totProfit.toFixed(2)].map(esc).join(';');

      const csv = '﻿' + [headers.join(';'), ...body, totalRow].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const range = startDate || endDate ? `_${startDate || '...'}_${endDate || '...'}` : '';
      a.download = `ventes${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Vendor matching — random inventory item one at a time
  const unlinkedInventory = inventoryItems.filter(i => !i.vendor_id && !vendorMatchSkipped.has(i.id));
  const totalUnlinkedInventory = inventoryItems.filter(i => !i.vendor_id).length;

  useEffect(() => {
    if (showVendorMatch && !vendorMatchSuccess) {
      if (unlinkedInventory.length > 0) {
        setStableMatchInventory(unlinkedInventory[Math.floor(Math.random() * unlinkedInventory.length)]);
      } else {
        setStableMatchInventory(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVendorMatch, vendorMatchSuccess, totalUnlinkedInventory, vendorMatchSkipped.size]);

  const skipInventoryItem = () => {
    if (stableMatchInventory) {
      setVendorMatchSkipped(prev => new Set(prev).add(stableMatchInventory.id));
    }
  };

  const assignVendor = async (vendorId: string) => {
    if (!stableMatchInventory || vendorMatchSaving) return;
    setVendorMatchSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stableMatchInventory.id, vendor_id: vendorId }),
      });
      if (!res.ok) throw new Error('Failed to save');

      const vendorName = vendors.find(v => v.id === vendorId)?.name || '';
      setInventoryItems(prev => prev.map(i => i.id === stableMatchInventory.id ? { ...i, vendor_id: vendorId, vendor: { id: vendorId, name: vendorName } } : i));
      setVendorMatchSaving(false);
      setVendorMatchCount(c => c + 1);
      setVendorMatchSuccess(`${stableMatchInventory.name} → ${vendorName}`);
      setVendorMatchSearch('');

      setTimeout(() => {
        setVendorMatchSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Vendor assign error:', err);
      setVendorMatchSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 2 }).format(value) + ' DH';
  };

  return (
    <PermissionGate
      permission="finance.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">{t.backoffice.shared.noPermission}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{fn.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{fn.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
              <>
                <button
                  onClick={() => setShowAutoImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${autoImporting ? 'animate-spin' : ''}`} />
                  {autoImporting ? fn.syncing : fn.syncLaCaisse}
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> {fn.addSale}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit flex-wrap">
          {[
            { id: 'overview', label: fn.tabs.overview, icon: BarChart3 },
            { id: 'sales', label: fn.tabs.salesList, icon: ShoppingCart },
            { id: 'inventory', label: fn.tabs.inventory, icon: Package },
            { id: 'vendors', label: fn.tabs.vendors, icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setOffset(0); }}
              className="py-2 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
            />
            <span className="text-muted-foreground">{fn.to}</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setOffset(0); }}
              className="py-2 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setOffset(0); }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {fn.clearDates}
            </button>
          )}
          <button
            onClick={() => { fetchDashStats(); fetchSales(); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Tab — fed entirely by lacaisse_daily (matches lacaisse.ma) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-linear-to-br from-green-500/20 to-green-600/10 border border-green-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(dashStats?.summary.revenue ?? 0)}</p>
                <p className="text-muted-foreground text-sm mt-1">{fn.totalRevenue}</p>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#606338]/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#606338]" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(dashStats?.profit.benefice ?? 0)}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-muted-foreground text-sm">{fn.totalProfit}</p>
                  {dashStats?.profit && dashStats.profit.distinctDishes > 0 && (
                    <span
                      title={`${dashStats.profit.mappedDishes}/${dashStats.profit.distinctDishes} produits mappés · marge ${(dashStats.profit.marginOnMapped * 100).toFixed(1)}%`}
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${dashStats.profit.coverage >= 0.8 ? 'bg-emerald-100 text-emerald-700' : dashStats.profit.coverage >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {(dashStats.profit.coverage * 100).toFixed(0)}% mappé
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{(dashStats?.summary.couverts ?? 0).toLocaleString()}</p>
                <p className="text-muted-foreground text-sm mt-1">{fn.itemsSold}</p>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(dashStats?.summary.avgTicket ?? 0)}</p>
                <p className="text-muted-foreground text-sm mt-1">{fn.avgItemValue}</p>
              </div>
            </div>

            {/* Secondary KPIs from the latest sync */}
            {dashStats?.lastSyncRun && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {dashStats.lastSyncRun.best_day && (
                  <div className="bg-secondary border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{fn.bestDay}</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(dashStats.lastSyncRun.best_day_amount ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(dashStats.lastSyncRun.best_day).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                  </div>
                )}
                {dashStats.lastSyncRun.ca_annule > 0 && (
                  <div className="bg-secondary border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{fn.cancelled}</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(dashStats.lastSyncRun.ca_annule)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((dashStats.lastSyncRun.ca_annule / Math.max(dashStats.lastSyncRun.ca_realise, 1)) * 100).toFixed(1)}% du CA
                    </p>
                  </div>
                )}
                {dashStats.summary.last_synced && (
                  <div className="bg-secondary border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{fn.lastSync}</p>
                    <p className="text-sm font-semibold text-foreground">{new Date(dashStats.summary.last_synced).toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{dashStats.summary.days} jours · LaCaisse</p>
                  </div>
                )}
              </div>
            )}

            {/* Sales by Category + Top Products */}
            {dashStats && (dashStats.categoryStats.length > 0 || dashStats.topProducts.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-6">
                {dashStats.categoryStats.length > 0 && (
                  <div className="bg-secondary border border-border rounded-2xl p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{fn.salesByCategory}</h3>
                    <div className="space-y-3">
                      {dashStats.categoryStats.slice(0, 8).map(cat => {
                        const max = dashStats.categoryStats[0]?.revenue || 1;
                        const pct = (cat.revenue / max) * 100;
                        return (
                          <div key={cat.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                              <div className="flex items-center gap-3 ml-3">
                                <span className="text-sm font-semibold text-[#606338]">{formatCurrency(cat.revenue)}</span>
                                <span className="text-xs text-muted-foreground w-20 text-right">{cat.count.toLocaleString()} {fn.items}</span>
                              </div>
                            </div>
                            <div className="h-2 bg-card rounded-full overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-[#606338] to-[#7A7B4E] rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {dashStats.topProducts.length > 0 && (
                  <div className="bg-secondary border border-border rounded-2xl p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{fn.topProducts}</h3>
                    <div className="space-y-2">
                      {dashStats.topProducts.map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3 p-3 bg-card rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-[#606338]/20 flex items-center justify-center text-[#606338] font-bold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium truncate">{p.name.replace(/\s*-\s*$/, '')}</p>
                            <p className="text-xs text-muted-foreground">{p.count.toLocaleString()} {fn.sold}</p>
                          </div>
                          <p className="text-[#606338] font-semibold">{formatCurrency(p.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily revenue bar chart from lacaisse_daily */}
            {dashStats && dashStats.daily.length > 0 && (
              <div className="bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">{fn.dailyRevenue}</h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-2 min-w-max pb-2">
                    {dashStats.daily.slice(-30).map(day => {
                      const maxRevenue = Math.max(...dashStats.daily.map(d => d.revenue)) || 1;
                      const height = (day.revenue / maxRevenue) * 120;
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-2 w-16">
                          <div className="h-32 flex items-end">
                            <div
                              className="w-10 bg-linear-to-t from-[#606338] to-[#7A7B4E] rounded-t-lg"
                              style={{ height: `${Math.max(height, 4)}px` }}
                              title={`${formatCurrency(day.revenue)} · ${day.couverts} couv.`}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(day.date).toLocaleDateString('fr', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sales List Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={fn.searchProducts}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setOffset(0); }}
                  className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setOffset(0); }}
                className="py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">{fn.allCategories}</option>
                {[...new Set(salesItems.map(s => s.category).filter(Boolean) as string[])].sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={exportCSV}
                disabled={exporting || total === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm hover:bg-card disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> {exporting ? '…' : fn.export}
              </button>
            </div>

            {/* Totals for the current filter */}
            {!loading && total > 0 && (
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-card border border-border rounded-xl">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-[#606338]">{totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                  <span className="text-xs text-muted-foreground">MAD</span>
                </div>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-sm text-muted-foreground">{total.toLocaleString('fr-FR')} lignes</span>
                {(startDate || endDate) && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {startDate || '…'} → {endDate || '…'}
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : salesItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <ShoppingCart className="w-12 h-12 text-muted mb-4" />
                  <p className="text-muted-foreground">{fn.noSalesData}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-card">
                          <th className="px-4 py-3"><SortHeader label={fn.date} field="sale_date" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label={fn.product} field="product_name" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label={fn.category} field="category" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label={fn.qty} field="quantity" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label={fn.price} field="selling_price" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label={fn.total} field="total" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                          {canWrite && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">{fn.actions}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...salesItems].sort((a, b) => {
                          if (salesSort === 'total') {
                            const aTotal = a.selling_price * a.quantity;
                            const bTotal = b.selling_price * b.quantity;
                            const cmp = aTotal - bTotal;
                            return salesSortDir === 'asc' ? cmp : -cmp;
                          }
                          return sortCompare(a, b, salesSort, salesSortDir);
                        }).map(item => (
                          <tr key={item.id} className="border-t border-border hover:bg-card/50">
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.sale_date}
                              {item.sale_time && <span className="ml-2 text-muted">{item.sale_time.slice(0, 5)}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                              {item.ticket_number && (
                                <p className="text-xs text-muted">{fn.ticketNum}{item.ticket_number}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.category || '-'}</td>
                            <td className="px-4 py-3 text-sm text-foreground text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">{formatCurrency(item.selling_price)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-[#606338] text-right">
                              {formatCurrency(item.selling_price * item.quantity)}
                            </td>
                            {canWrite && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Infinite-scroll sentinel + loading indicator */}
                  {hasMoreSales && (
                    <div ref={loadMoreRef} className="flex items-center justify-center py-4 border-t border-border">
                      {isLoadingMore ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Chargement...
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {salesItems.length} / {total}
                        </span>
                      )}
                    </div>
                  )}
                  {!hasMoreSales && salesItems.length > 0 && (
                    <div className="flex items-center justify-center py-3 border-t border-border text-xs text-muted-foreground">
                      {salesItems.length} {fn.of} {total}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Inventory Header */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={fn.searchInventory}
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <select
                value={inventoryCategory}
                onChange={e => setInventoryCategory(e.target.value)}
                className="py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">{fn.allCategories}</option>
                {inventoryCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {canWrite && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVendorMatch(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium hover:bg-card transition-colors"
                  >
                    <Users className="w-4 h-4" /> {fn.matchVendors}
                  </button>
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> {fn.addItem}
                  </button>
                </div>
              )}
            </div>

            {/* Low Stock Alert */}
            {inventoryItems.some(item => item.quantity <= item.minimum_stock && item.minimum_stock > 0) && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-500">
                  <span className="font-medium">{fn.lowStockAlert}</span>{' '}
                  {inventoryItems.filter(item => item.quantity <= item.minimum_stock && item.minimum_stock > 0).length} {fn.needRestocking}
                </p>
              </div>
            )}

            {/* Inventory Table */}
            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {inventoryLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Package className="w-12 h-12 text-muted mb-4" />
                  <p className="text-muted-foreground">{fn.noSalesData}</p>
                  {canWrite && (
                    <button
                      onClick={() => setShowInventoryModal(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
                    >
                      <Plus className="w-4 h-4" /> {fn.addItem}
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-card">
                        <th className="px-4 py-3"><SortHeader label={fn.item} field="name" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.category} field="inventory_category.name" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.quantity} field="quantity" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.unit} field="unit" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.costPerUnit} field="cost_per_unit" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.lastPrice} field="last_purchase_price" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label={fn.totalValue} field="totalValue" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                        {canWrite && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">{fn.actions}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {[...inventoryItems].sort((a, b) => {
                        if (invSort === 'totalValue') {
                          const aTotal = a.quantity * a.cost_per_unit;
                          const bTotal = b.quantity * b.cost_per_unit;
                          const cmp = aTotal - bTotal;
                          return invSortDir === 'asc' ? cmp : -cmp;
                        }
                        return sortCompare(a, b, invSort, invSortDir);
                      }).map(item => {
                        const isLowStock = item.quantity <= item.minimum_stock && item.minimum_stock > 0;
                        return (
                          <tr key={item.id} className={`border-t border-border hover:bg-card/50 ${isLowStock ? 'bg-red-500/5' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLowStock ? 'bg-red-500/10' : 'bg-[#606338]/10'}`}>
                                  <Package className={`w-5 h-5 ${isLowStock ? 'text-red-500' : 'text-[#606338]'}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                                  {(item.vendor?.name || item.supplier) && <p className="text-xs text-muted-foreground">{item.vendor?.name || item.supplier}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {item.inventory_category?.name ? (
                                <span className="px-2 py-1 bg-card rounded-md text-xs text-foreground">{item.inventory_category.name}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                {canWrite && (
                                  <button
                                    onClick={() => handleQuickQuantityUpdate(item, -1)}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-card rounded"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                )}
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                                  }}
                                  onBlur={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (val !== item.quantity) {
                                      fetch('/api/inventory', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: item.id, quantity: val })
                                      });
                                    }
                                  }}
                                  className={`w-16 text-sm font-medium text-center bg-transparent border border-transparent hover:border-border focus:border-[#606338] focus:outline-none rounded py-0.5 ${isLowStock ? 'text-red-500' : 'text-foreground'}`}
                                  min="0"
                                  step="0.1"
                                  readOnly={!canWrite}
                                />
                                {canWrite && (
                                  <button
                                    onClick={() => handleQuickQuantityUpdate(item, 1)}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-card rounded"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {isLowStock && (
                                <p className="text-xs text-red-500 text-center mt-1">{fn.minStock} {item.minimum_stock}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-center">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">{formatCurrency(item.cost_per_unit)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="text-foreground">{formatCurrency(item.last_purchase_price || 0)}</span>
                              {item.last_purchase_price > 0 && item.cost_per_unit > 0 && item.last_purchase_price !== item.cost_per_unit && (
                                <span className={`block text-xs mt-0.5 ${item.last_purchase_price > item.cost_per_unit ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {item.last_purchase_price > item.cost_per_unit ? '▲' : '▼'} {Math.abs(Math.round((item.last_purchase_price - item.cost_per_unit) / item.cost_per_unit * 100))}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-[#606338] text-right">
                              {formatCurrency(item.quantity * item.cost_per_unit)}
                            </td>
                            {canWrite && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openProductDetail(item.id)}
                                    className="p-1.5 text-muted-foreground hover:text-[#606338] hover:bg-[#606338]/10 rounded-lg"
                                    title="Détails"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingInventory(item)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInventory(item.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Inventory Summary */}
              {inventoryItems.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-card/50 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {inventoryItems.length} {fn.itemsInInventory}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {fn.totalValue}: <span className="text-[#606338]">{formatCurrency(inventoryItems.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0))}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            {/* Vendors Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{fn.totalVendors}</p>
                <p className="text-2xl font-bold text-foreground">{vendors.length}</p>
              </div>
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{fn.activeVendors}</p>
                <p className="text-2xl font-bold text-foreground">{vendors.filter(v => v.is_active).length}</p>
              </div>
              <div className="bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{fn.totalOwed}</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOwedToVendors)}</p>
              </div>
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{fn.withBalanceDue}</p>
                <p className="text-2xl font-bold text-foreground">{vendors.filter(v => v.balance > 0).length}</p>
              </div>
            </div>

            {/* Vendors Header */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={fn.searchVendors}
                  value={vendorSearch}
                  onChange={e => setVendorSearch(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              {canWrite && (
                <button
                  onClick={() => setShowVendorModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> {fn.addVendor}
                </button>
              )}
            </div>

            {/* Vendors List */}
            <div className="space-y-3">
              {vendorsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="bg-secondary border border-border rounded-xl flex flex-col items-center justify-center h-64">
                  <Users className="w-12 h-12 text-muted mb-4" />
                  <p className="text-muted-foreground">{fn.noVendors}</p>
                  {canWrite && (
                    <button
                      onClick={() => setShowVendorModal(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
                    >
                      <Plus className="w-4 h-4" /> {fn.addFirstVendor}
                    </button>
                  )}
                </div>
              ) : (
                filteredVendors.map(vendor => (
                  <div key={vendor.id} className={`bg-secondary border rounded-xl p-4 ${vendor.balance > 0 ? 'border-red-500/30' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${vendor.balance > 0 ? 'bg-red-500/10' : 'bg-[#606338]/10'}`}>
                          <Users className={`w-6 h-6 ${vendor.balance > 0 ? 'text-red-500' : 'text-[#606338]'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                            {!vendor.is_active && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{fn.inactive}</span>
                            )}
                            <span className="text-xs px-2 py-0.5 bg-card rounded-full text-muted-foreground capitalize">{vendor.inventory_category?.name || vendor.category}</span>
                          </div>
                          {vendor.contact_name && (
                            <p className="text-sm text-muted-foreground mt-1">{vendor.contact_name}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {vendor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {vendor.phone}
                              </span>
                            )}
                            {vendor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {vendor.email}
                              </span>
                            )}
                            {vendor.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {vendor.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">{fn.balance}</p>
                        <p className={`text-xl font-bold ${vendor.balance > 0 ? 'text-red-500' : vendor.balance < 0 ? 'text-green-500' : 'text-foreground'}`}>
                          {vendor.balance > 0 ? '-' : vendor.balance < 0 ? '+' : ''}{formatCurrency(Math.abs(vendor.balance))}
                        </p>
                        {vendor.balance > 0 && (
                          <p className="text-xs text-red-400 mt-0.5">{fn.youOwe}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        {canWrite && (
                          <>
                            <button
                              onClick={() => { setSelectedVendorForTransaction(vendor); setNewTransaction({ ...newTransaction, type: 'debt' }); setShowTransactionModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" /> {fn.addDebt}
                            </button>
                            <button
                              onClick={() => { setSelectedVendorForTransaction(vendor); setNewTransaction({ ...newTransaction, type: 'payment' }); setShowTransactionModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" /> {fn.addPayment}
                            </button>
                            <button
                              onClick={() => { resetScanner(); setScannerVendorId(vendor.id); setShowScannerModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" /> {fn.scanInvoice}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openVendorDetail(vendor)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" /> {fn.details}
                        </button>
                        <button
                          onClick={() => { setViewingVendorTransactions(vendor); fetchVendorTransactions(vendor.id); fetchVendorInvoices(vendor.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> {fn.history}
                        </button>
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingVendor(vendor)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVendor(vendor.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vendor Detail Modal — shows linked products with multi-select + bulk reassign */}
        {viewingVendorDetail && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{viewingVendorDetail.name}</h2>
                  <p className="text-sm text-muted-foreground">{fn.vendorDetails}</p>
                </div>
                <button onClick={closeVendorDetail} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vendor info recap */}
              <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-border text-sm">
                {viewingVendorDetail.contact_name && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" />{viewingVendorDetail.contact_name}</div>
                )}
                {viewingVendorDetail.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{viewingVendorDetail.phone}</div>
                )}
                {viewingVendorDetail.email && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{viewingVendorDetail.email}</div>
                )}
                {viewingVendorDetail.address && (
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{viewingVendorDetail.address}</div>
                )}
                {viewingVendorDetail.category && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Package className="w-4 h-4" />{viewingVendorDetail.category}</div>
                )}
                <div className={`flex items-center gap-2 ${viewingVendorDetail.balance > 0 ? 'text-red-500' : viewingVendorDetail.balance < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(Math.abs(viewingVendorDetail.balance))}
                  {viewingVendorDetail.balance > 0 ? ` (${fn.youOweLabel.trim()})` : viewingVendorDetail.balance < 0 ? ` (${fn.creditLabel.trim()})` : ''}
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border">
                <label className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-card/70 rounded-lg cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    disabled={vendorProducts.length === 0}
                    checked={vendorProducts.length > 0 && selectedProductIds.size === vendorProducts.length}
                    ref={el => {
                      if (el) el.indeterminate = selectedProductIds.size > 0 && selectedProductIds.size < vendorProducts.length;
                    }}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-foreground font-medium">{fn.selectAll}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedProductIds.size}/{vendorProducts.length})
                  </span>
                </label>
                <div className="flex-1" />
                {selectedProductIds.size > 0 && (
                  <button
                    onClick={() => setShowMoveProducts(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> {fn.moveSelected}
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={() => setShowQuickAddProduct(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606338]/20 text-[#606338] rounded-lg text-xs font-medium hover:bg-[#606338]/30"
                  >
                    <Plus className="w-3.5 h-3.5" /> {fn.addProduct}
                  </button>
                )}
              </div>

              {/* Quick add inline form */}
              {showQuickAddProduct && (
                <div className="px-5 py-3 border-b border-border bg-card/40 grid grid-cols-2 lg:grid-cols-5 gap-2">
                  <input
                    type="text"
                    placeholder={fn.productName}
                    value={quickProduct.name}
                    onChange={e => setQuickProduct({ ...quickProduct, name: e.target.value })}
                    className="col-span-2 lg:col-span-2 py-1.5 px-2 bg-card border border-border rounded text-sm text-foreground"
                  />
                  <input
                    type="text"
                    placeholder={fn.category}
                    value={quickProduct.category}
                    onChange={e => setQuickProduct({ ...quickProduct, category: e.target.value })}
                    className="py-1.5 px-2 bg-card border border-border rounded text-sm text-foreground"
                  />
                  <input
                    type="number"
                    placeholder="Coût"
                    value={quickProduct.cost_per_unit || ''}
                    onChange={e => setQuickProduct({ ...quickProduct, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="py-1.5 px-2 bg-card border border-border rounded text-sm text-foreground"
                  />
                  <button
                    onClick={handleQuickAddProduct}
                    disabled={!quickProduct.name.trim()}
                    className="px-3 py-1.5 bg-[#606338] hover:bg-[#525529] disabled:opacity-40 rounded text-white text-sm font-medium"
                  >
                    {fn.add}
                  </button>
                </div>
              )}

              {/* Move-products inline panel */}
              {showMoveProducts && (
                <div className="px-5 py-3 border-b border-border bg-card/40 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {fn.moveTo} {selectedProductIds.size} {fn.itemsSelected}
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <select
                      value={moveTargetVendorId}
                      onChange={e => { setMoveTargetVendorId(e.target.value); if (e.target.value) setMoveNewVendorName(''); }}
                      className="py-1.5 px-2 bg-card border border-border rounded text-sm text-foreground"
                    >
                      <option value="">{fn.selectExisting}</option>
                      {vendors.filter(v => v.id !== viewingVendorDetail.id).map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder={fn.newVendorName}
                      value={moveNewVendorName}
                      onChange={e => { setMoveNewVendorName(e.target.value); if (e.target.value) setMoveTargetVendorId(''); }}
                      className="py-1.5 px-2 bg-card border border-border rounded text-sm text-foreground"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMoveProducts}
                      disabled={moveSaving || (!moveTargetVendorId && !moveNewVendorName.trim())}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-white text-sm font-medium"
                    >
                      {moveSaving ? fn.moving : fn.moveSelected}
                    </button>
                    <button
                      onClick={() => { setShowMoveProducts(false); setMoveTargetVendorId(''); setMoveNewVendorName(''); }}
                      className="px-3 py-1.5 bg-transparent border border-border rounded text-muted-foreground text-sm"
                    >
                      {fn.cancel}
                    </button>
                  </div>
                </div>
              )}

              {/* Product list */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{fn.linkedProducts}</h3>
                  <span className="text-xs text-muted-foreground">({vendorProducts.length})</span>
                </div>
                {vendorProductsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">…</div>
                ) : vendorProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{fn.noLinkedProducts}</div>
                ) : (
                  <div className="space-y-1">
                    {vendorProducts.map(item => {
                      const checked = selectedProductIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-blue-500/10' : 'bg-card hover:bg-card/70'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductSelection(item.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.category || '—'} · {Number(item.quantity)} {item.unit} · {formatCurrency(Number(item.cost_per_unit))}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vendor Transaction History Modal */}
        {viewingVendorTransactions && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{viewingVendorTransactions.name}</h2>
                  <p className="text-sm text-muted-foreground">{fn.transactionHistory}</p>
                </div>
                <button onClick={() => { setViewingVendorTransactions(null); setVendorTransactions([]); setVendorInvoices([]); }} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {vendorTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {fn.noTransactions}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendorTransactions.map(tx => {
                      const isExpandable = !!(tx.reference && /^order(?:_pay)?_[0-9a-fA-F-]{36}$/.test(tx.reference));
                      const isExpanded = expandedTxId === tx.id;
                      const lines = txDetails[tx.id];
                      return (
                        <div key={tx.id} className="bg-card rounded-lg overflow-hidden">
                          <div
                            onClick={() => isExpandable && toggleTransactionDetail(tx, viewingVendorTransactions.id)}
                            className={`flex items-center justify-between p-3 ${isExpandable ? 'cursor-pointer hover:bg-card/70' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {isExpandable && (
                                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'debt' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                {tx.type === 'debt' ? (
                                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {tx.date} {tx.reference && `• ${tx.reference}`}
                                </p>
                                {tx.description && <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                              <p className={`font-semibold ${tx.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                                {tx.type === 'debt' ? '-' : '+'}{formatCurrency(tx.amount)}
                              </p>
                              {canWrite && (
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border px-3 py-2 bg-card/40">
                              {txDetailsLoading === tx.id ? (
                                <p className="text-xs text-muted-foreground py-2">…</p>
                              ) : !lines || lines.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">{fn.noLinkedProducts || 'Aucun produit lié'}</p>
                              ) : (
                                <div className="space-y-1">
                                  {lines.map(it => (
                                    <div key={it.id} className="grid grid-cols-[1fr_80px_80px_100px] gap-3 px-2 py-1 text-xs">
                                      <span className="text-foreground">{it.product_name}</span>
                                      <span className="text-right text-muted-foreground">{Number(it.quantity)} {it.unit}</span>
                                      <span className="text-right text-muted-foreground">{formatCurrency(Number(it.unit_cost))}</span>
                                      <span className="text-right font-medium text-foreground">{formatCurrency(Number(it.quantity) * Number(it.unit_cost))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Scanned Invoices Section */}
              {vendorInvoices.length > 0 && (
                <div className="px-5 pb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {fn.scannedInvoices}
                  </h3>
                  <div className="space-y-2">
                    {vendorInvoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {inv.invoice_date} &mdash; {formatCurrency(inv.total_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.items?.length || 0} {fn.items} &bull;{' '}
                              <span className={inv.status === 'confirmed' ? 'text-green-500' : 'text-yellow-500'}>
                                {inv.status === 'confirmed' ? fn.confirmed : fn.pending}
                              </span>
                            </p>
                          </div>
                        </div>
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-5 py-4 border-t border-border bg-card/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{fn.currentBalance}</span>
                  <span className={`text-lg font-bold ${viewingVendorTransactions.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {viewingVendorTransactions.balance > 0 ? fn.youOweLabel : fn.creditLabel}{formatCurrency(Math.abs(viewingVendorTransactions.balance))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Vendor Modal */}
        {showVendorModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">{fn.addVendor}</h2>
                <button onClick={() => setShowVendorModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.vendorName}</label>
                  <input
                    type="text"
                    value={newVendor.name}
                    onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder={fn.vendorNamePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.contactPerson}</label>
                  <input
                    type="text"
                    value={newVendor.contact_name}
                    onChange={e => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder={fn.contactNamePlaceholder}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{fn.phone}</label>
                    <input
                      type="tel"
                      value={newVendor.phone}
                      onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      placeholder={fn.phonePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{fn.email}</label>
                    <input
                      type="email"
                      value={newVendor.email}
                      onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      placeholder={fn.emailPlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.address}</label>
                  <input
                    type="text"
                    value={newVendor.address}
                    onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder={fn.addressPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.vendorCategory}</label>
                  <select
                    value={newVendor.category_id}
                    onChange={e => setNewVendor({ ...newVendor, category_id: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">{fn.categoryPlaceholder}</option>
                    {inventoryCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.notes}</label>
                  <textarea
                    value={newVendor.notes}
                    onChange={e => setNewVendor({ ...newVendor, notes: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                    placeholder={fn.notesPlaceholder}
                  />
                </div>
                {/* Invoice Template */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.invoiceTemplate}</label>
                  <p className="text-xs text-muted-foreground mb-2">{fn.uploadTemplateTip}</p>
                  {newVendor.invoice_template_url ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-32 bg-card border border-border rounded-lg overflow-hidden">
                        <img src={newVendor.invoice_template_url} alt="Template" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTemplate('new')}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        {fn.removeTemplate}
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:border-[#606338] transition-colors">
                      {uploadingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{fn.uploadTemplate}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingTemplate}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleTemplateUpload(f, 'new');
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                >
                  {fn.cancel}
                </button>
                <button
                  onClick={handleAddVendor}
                  className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
                >
                  {fn.addVendor}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Vendor Modal */}
        {editingVendor && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">{fn.editVendor}</h2>
                <button onClick={() => setEditingVendor(null)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.vendorName}</label>
                  <input
                    type="text"
                    value={editingVendor.name}
                    onChange={e => setEditingVendor({ ...editingVendor, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.contactPerson}</label>
                  <input
                    type="text"
                    value={editingVendor.contact_name || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, contact_name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{fn.phone}</label>
                    <input
                      type="tel"
                      value={editingVendor.phone || ''}
                      onChange={e => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{fn.email}</label>
                    <input
                      type="email"
                      value={editingVendor.email || ''}
                      onChange={e => setEditingVendor({ ...editingVendor, email: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.address}</label>
                  <input
                    type="text"
                    value={editingVendor.address || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, address: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.vendorCategory}</label>
                  <select
                    value={editingVendor.category_id || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, category_id: e.target.value || null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">{fn.categoryPlaceholder}</option>
                    {inventoryCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.notes}</label>
                  <textarea
                    value={editingVendor.notes || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                  />
                </div>
                {/* Invoice Template */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.invoiceTemplate}</label>
                  {editingVendor.invoice_template_url ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-32 bg-card border border-border rounded-lg overflow-hidden">
                        <img src={editingVendor.invoice_template_url} alt="Template" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTemplate('edit')}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        {fn.removeTemplate}
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:border-[#606338] transition-colors">
                      {uploadingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{fn.uploadTemplate}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingTemplate}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleTemplateUpload(f, 'edit');
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vendor_active"
                    checked={editingVendor.is_active}
                    onChange={e => setEditingVendor({ ...editingVendor, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
                  />
                  <label htmlFor="vendor_active" className="text-sm text-foreground">{fn.activeVendor}</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setEditingVendor(null)}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                >
                  {fn.cancel}
                </button>
                <button
                  onClick={handleUpdateVendor}
                  className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
                >
                  {fn.saveChanges}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Transaction Modal */}
        {showTransactionModal && selectedVendorForTransaction && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {newTransaction.type === 'debt' ? fn.addDebt : fn.addPayment}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selectedVendorForTransaction.name}</p>
                </div>
                <button onClick={() => { setShowTransactionModal(false); setSelectedVendorForTransaction(null); }} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTransaction({ ...newTransaction, type: 'debt' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newTransaction.type === 'debt'
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                        : 'bg-card text-muted-foreground border border-border'
                    }`}
                  >
                    {fn.debtYouOwe}
                  </button>
                  <button
                    onClick={() => setNewTransaction({ ...newTransaction, type: 'payment' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newTransaction.type === 'payment'
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-card text-muted-foreground border border-border'
                    }`}
                  >
                    {fn.paymentYouPay}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.amount}</label>
                  <input
                    type="number"
                    value={newTransaction.amount || ''}
                    onChange={e => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.01"
                    placeholder={fn.amountPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.dateLabel}</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.reference}</label>
                  <input
                    type="text"
                    value={newTransaction.reference}
                    onChange={e => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder={fn.referencePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.description}</label>
                  <textarea
                    value={newTransaction.description}
                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                    placeholder={fn.descriptionPlaceholder}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => { setShowTransactionModal(false); setSelectedVendorForTransaction(null); }}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                >
                  {fn.cancel}
                </button>
                <button
                  onClick={handleAddTransaction}
                  className={`px-4 py-2.5 rounded-lg text-white text-sm font-medium ${
                    newTransaction.type === 'debt' ? 'bg-red-500' : 'bg-green-500'
                  }`}
                >
                  {newTransaction.type === 'debt' ? fn.addDebt : fn.addPayment}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Add Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{fn.addInventoryItem}</h2>
              <button onClick={() => setShowInventoryModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.itemName}</label>
                <input
                  type="text"
                  value={newInventory.name}
                  onChange={e => setNewInventory({ ...newInventory, name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder={fn.itemNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.category}</label>
                <select
                  value={newInventory.category_id}
                  onChange={e => setNewInventory({ ...newInventory, category_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">{fn.categoryPlaceholder}</option>
                  {inventoryCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.quantity}</label>
                  <input
                    type="number"
                    value={newInventory.quantity}
                    onChange={e => setNewInventory({ ...newInventory, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.unit}</label>
                  <select
                    value={newInventory.unit}
                    onChange={e => setNewInventory({ ...newInventory, unit: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="kg">{fn.unitKg}</option>
                    <option value="g">{fn.unitG}</option>
                    <option value="L">{fn.unitL}</option>
                    <option value="mL">{fn.unitMl}</option>
                    <option value="pieces">{fn.unitPieces}</option>
                    <option value="boxes">{fn.unitBoxes}</option>
                    <option value="bottles">{fn.unitBottles}</option>
                    <option value="packs">{fn.unitPacks}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.minStockAlert}</label>
                  <input
                    type="number"
                    value={newInventory.minimum_stock}
                    onChange={e => setNewInventory({ ...newInventory, minimum_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.costPerUnit}</label>
                  <input
                    type="number"
                    value={newInventory.cost_per_unit}
                    onChange={e => setNewInventory({ ...newInventory, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.supplier}</label>
                <select
                  value={newInventory.vendor_id}
                  onChange={e => setNewInventory({ ...newInventory, vendor_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">{fn.noSupplier}</option>
                  {vendors.filter(v => v.is_active).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.notes}</label>
                <textarea
                  value={newInventory.notes}
                  onChange={e => setNewInventory({ ...newInventory, notes: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                  placeholder={fn.notesPlaceholder}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {fn.cancel}
              </button>
              <button
                onClick={handleAddInventory}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {fn.addItem}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {editingInventory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{fn.editInventoryItem}</h2>
              <button onClick={() => setEditingInventory(null)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.itemName}</label>
                <input
                  type="text"
                  value={editingInventory.name}
                  onChange={e => setEditingInventory({ ...editingInventory, name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.category}</label>
                <select
                  value={editingInventory.category_id || ''}
                  onChange={e => setEditingInventory({ ...editingInventory, category_id: e.target.value || null })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">{fn.categoryPlaceholder}</option>
                  {inventoryCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.quantity}</label>
                  <input
                    type="number"
                    value={editingInventory.quantity}
                    onChange={e => setEditingInventory({ ...editingInventory, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.unit}</label>
                  <select
                    value={editingInventory.unit}
                    onChange={e => setEditingInventory({ ...editingInventory, unit: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="kg">{fn.unitKg}</option>
                    <option value="g">{fn.unitG}</option>
                    <option value="L">{fn.unitL}</option>
                    <option value="mL">{fn.unitMl}</option>
                    <option value="pieces">{fn.unitPieces}</option>
                    <option value="boxes">{fn.unitBoxes}</option>
                    <option value="bottles">{fn.unitBottles}</option>
                    <option value="packs">{fn.unitPacks}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.minStockAlert}</label>
                  <input
                    type="number"
                    value={editingInventory.minimum_stock}
                    onChange={e => setEditingInventory({ ...editingInventory, minimum_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.costPerUnit}</label>
                  <input
                    type="number"
                    value={editingInventory.cost_per_unit}
                    onChange={e => setEditingInventory({ ...editingInventory, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.supplier}</label>
                <select
                  value={editingInventory.vendor_id || ''}
                  onChange={e => setEditingInventory({ ...editingInventory, vendor_id: e.target.value || null })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">{fn.noSupplier}</option>
                  {vendors.filter(v => v.is_active).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.notes}</label>
                <textarea
                  value={editingInventory.notes || ''}
                  onChange={e => setEditingInventory({ ...editingInventory, notes: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setEditingInventory(null)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {fn.cancel}
              </button>
              <button
                onClick={handleUpdateInventory}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {fn.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      {/* Auto Import Modal */}
      {showAutoImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{fn.syncTitle}</h2>
              <button onClick={() => { setShowAutoImportModal(false); setAutoImportResult(null); }} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {autoImportResult ? (
                <div className={`p-4 rounded-xl ${autoImportResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {autoImportResult.success ? (
                    <>
                      <p className="text-green-500 font-semibold mb-2">{fn.importSuccess}</p>
                      <div className="text-sm text-foreground space-y-1">
                        <p>{fn.totalProcessed} <span className="font-medium">{autoImportResult.totalRows}</span></p>
                        <p>{fn.newRecords} <span className="font-medium text-green-500">{autoImportResult.insertedRows}</span></p>
                        <p>{fn.duplicatesSkipped} <span className="font-medium text-muted-foreground">{autoImportResult.skippedDuplicates}</span></p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-red-500 font-semibold mb-2">{fn.importFailed}</p>
                      <p className="text-sm text-muted-foreground">{autoImportResult.message}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {fn.autoFetchDesc}
                    {' '}{fn.duplicatesNote}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">{fn.startDate}</label>
                      <input
                        type="date"
                        value={autoImportDates.startDate}
                        onChange={e => setAutoImportDates(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">{fn.endDate}</label>
                      <input
                        type="date"
                        value={autoImportDates.endDate}
                        onChange={e => setAutoImportDates(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => { setShowAutoImportModal(false); setAutoImportResult(null); }}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {autoImportResult ? fn.close : fn.cancel}
              </button>
              {!autoImportResult && (
                <button
                  onClick={handleAutoImport}
                  disabled={autoImporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${autoImporting ? 'animate-spin' : ''}`} />
                  {autoImporting ? fn.importing : fn.startImport}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{fn.addSaleTitle}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.productName}</label>
                <input
                  type="text"
                  value={newSale.product_name}
                  onChange={e => setNewSale({ ...newSale, product_name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder={fn.productPlaceholder}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.categoryLabel}</label>
                <input
                  type="text"
                  value={newSale.category}
                  onChange={e => setNewSale({ ...newSale, category: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder={fn.categoryInput}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.quantityLabel}</label>
                  <input
                    type="number"
                    value={newSale.quantity}
                    onChange={e => setNewSale({ ...newSale, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{fn.priceLabel}</label>
                  <input
                    type="number"
                    value={newSale.selling_price}
                    onChange={e => setNewSale({ ...newSale, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{fn.dateLabel}</label>
                <input
                  type="date"
                  value={newSale.sale_date}
                  onChange={e => setNewSale({ ...newSale, sale_date: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {fn.cancel}
              </button>
              <button
                onClick={handleAddSale}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {fn.addSale}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{fn.scanInvoiceTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {scannerStage === 'upload' && `${fn.uploadForVendor} ${vendors.find(v => v.id === scannerVendorId)?.name || 'vendor'}`}
                  {scannerStage === 'review' && fn.reviewItems}
                  {scannerStage === 'success' && fn.invoiceConfirmed}
                </p>
              </div>
              <button onClick={resetScanner} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Stage 1: Upload */}
              {scannerStage === 'upload' && (
                <div className="space-y-4">
                  {/* Vendor is pre-selected from the card */}
                  {scannerVendorId && (
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <Users className="w-5 h-5 text-[#606338]" />
                      <span className="text-sm font-medium text-foreground">
                        {vendors.find(v => v.id === scannerVendorId)?.name}
                      </span>
                      {vendors.find(v => v.id === scannerVendorId)?.invoice_template_url && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">{fn.hasTemplate}</span>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{fn.invoiceImage}</label>
                    <label className="flex flex-col items-center justify-center gap-3 p-8 bg-card border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-[#606338] transition-colors">
                      {scannerPreview ? (
                        <img src={scannerPreview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                      ) : scannerFile ? (
                        <div className="flex items-center gap-2">
                          <FileText className="w-8 h-8 text-[#606338]" />
                          <span className="text-sm text-foreground">{scannerFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Camera className="w-10 h-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm text-foreground font-medium">{fn.uploadOrPhoto}</p>
                            <p className="text-xs text-muted-foreground mt-1">{fn.fileFormats}</p>
                          </div>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                        onChange={handleScannerFileChange}
                      />
                    </label>
                    {scannerFile && (
                      <button
                        onClick={() => { setScannerFile(null); setScannerPreview(''); }}
                        className="mt-2 text-xs text-red-500 hover:text-red-400"
                      >
                        {fn.removeFile}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stage 2: Review */}
              {scannerStage === 'review' && (
                <div className="space-y-4">
                  {/* Invoice date and total */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">{fn.invoiceDate}</label>
                      <input
                        type="date"
                        value={scannedInvoiceDate}
                        onChange={e => setScannedInvoiceDate(e.target.value)}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">{fn.totalAmount}</label>
                      <input
                        type="number"
                        value={scannedTotalAmount || ''}
                        onChange={e => setScannedTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Items table */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      {fn.extractedItems} ({scannedItems.length})
                    </label>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-secondary">
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">{fn.product}</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">{fn.qty}</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">{fn.unit}</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted uppercase">{fn.price}</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted uppercase">{fn.total}</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">{fn.inventoryMatch}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scannedItems.map((item, idx) => (
                              <tr key={idx} className="border-t border-border">
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={item.product_name}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      updated[idx] = { ...updated[idx], product_name: e.target.value };
                                      setScannedItems(updated);
                                    }}
                                    className="w-full py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                                      setScannedItems(updated);
                                    }}
                                    className="w-16 py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs text-center"
                                    min="0"
                                    step="0.1"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={item.unit || ''}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      updated[idx] = { ...updated[idx], unit: e.target.value || null };
                                      setScannedItems(updated);
                                    }}
                                    className="w-14 py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs text-center"
                                    placeholder="-"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      updated[idx] = { ...updated[idx], unit_price: parseFloat(e.target.value) || 0 };
                                      setScannedItems(updated);
                                    }}
                                    className="w-20 py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs text-right"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={item.total_price}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      updated[idx] = { ...updated[idx], total_price: parseFloat(e.target.value) || 0 };
                                      setScannedItems(updated);
                                    }}
                                    className="w-20 py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs text-right"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={item.matched_inventory_id || ''}
                                    onChange={e => {
                                      const updated = [...scannedItems];
                                      const invId = e.target.value || null;
                                      const invName = scannerInventoryItems.find(i => i.id === invId)?.name || null;
                                      updated[idx] = { ...updated[idx], matched_inventory_id: invId, matched_inventory_name: invName };
                                      setScannedItems(updated);
                                    }}
                                    className="w-full py-1 px-2 bg-transparent border border-border rounded text-foreground text-xs"
                                  >
                                    <option value="">{fn.noMatch}</option>
                                    {scannerInventoryItems.map(inv => (
                                      <option key={inv.id} value={inv.id}>{inv.name}</option>
                                    ))}
                                  </select>
                                  {item.match_score > 0 && (
                                    <p className="text-[10px] text-green-500 mt-0.5">
                                      {fn.autoMatched} ({Math.round(item.match_score * 100)}%)
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Update inventory checkbox */}
                  <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                    <input
                      type="checkbox"
                      id="update_inventory"
                      checked={updateInventoryOnConfirm}
                      onChange={e => setUpdateInventoryOnConfirm(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
                    />
                    <label htmlFor="update_inventory" className="text-sm text-foreground">
                      {fn.updateInventoryLabel}
                    </label>
                  </div>
                </div>
              )}

              {/* Stage 3: Success */}
              {scannerStage === 'success' && confirmResult && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{fn.invoiceConfirmedTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fn.debtCreated.replace('{amount}', formatCurrency(confirmResult.transaction.amount))}
                    </p>
                  </div>
                  {confirmResult.inventory_updates.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-4 text-left">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{fn.inventoryUpdated}</p>
                      <div className="space-y-1">
                        {confirmResult.inventory_updates.map((upd, i) => (
                          <p key={i} className="text-sm text-foreground">
                            {upd.name}: <span className="text-green-500">+{upd.added}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              {scannerStage === 'upload' && (
                <>
                  <button
                    onClick={resetScanner}
                    className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                  >
                    {fn.cancel}
                  </button>
                  <button
                    onClick={handleScanInvoice}
                    disabled={!scannerFile || !scannerVendorId || scanning}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> {fn.scanning}
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" /> {fn.scan}
                      </>
                    )}
                  </button>
                </>
              )}
              {scannerStage === 'review' && (
                <>
                  <button
                    onClick={() => setScannerStage('upload')}
                    className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                  >
                    {fn.back}
                  </button>
                  <button
                    onClick={handleConfirmInvoice}
                    disabled={confirming || scannedItems.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> {fn.confirming}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> {fn.confirmCreateDebt}
                      </>
                    )}
                  </button>
                </>
              )}
              {scannerStage === 'success' && (
                <button
                  onClick={resetScanner}
                  className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
                >
                  {fn.done}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Vendor Match Modal */}
      {showVendorMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowVendorMatch(false); setVendorMatchSuccess(null); setVendorMatchSkipped(new Set()); setVendorMatchCount(0); setVendorMatchSearch(''); }}>
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{fn.matchVendorsTitle}</h2>
                <p className="text-xs text-muted-foreground">
                  {totalUnlinkedInventory} {fn.itemsWithoutVendor}{vendorMatchCount > 0 && <> &middot; {vendorMatchCount} {fn.matched}</>}{vendorMatchSkipped.size > 0 && <> &middot; {vendorMatchSkipped.size} {fn.skipped}</>}
                </p>
              </div>
              <button onClick={() => { setShowVendorMatch(false); setVendorMatchSuccess(null); setVendorMatchSkipped(new Set()); setVendorMatchCount(0); setVendorMatchSearch(''); }} className="p-2 bg-transparent border-none rounded-md cursor-pointer text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Progress */}
            {inventoryItems.length > 0 && (
              <div className="h-1.5 bg-card">
                <div className="h-full bg-[#606338] transition-all duration-500" style={{ width: `${((inventoryItems.length - totalUnlinkedInventory) / inventoryItems.length) * 100}%` }} />
              </div>
            )}

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Success toast */}
              {vendorMatchSuccess && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-sm text-green-600 font-medium">{vendorMatchSuccess}</p>
                </div>
              )}

              {!stableMatchInventory || totalUnlinkedInventory === 0 ? (
                /* All done */
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-foreground font-medium">
                    {totalUnlinkedInventory === 0 ? fn.allHaveVendors : fn.allSkipped}
                  </p>
                  {vendorMatchCount > 0 && <p className="text-sm text-muted-foreground">{vendorMatchCount} {fn.matchedThisSession}</p>}
                  {vendorMatchSkipped.size > 0 && totalUnlinkedInventory > 0 && (
                    <button onClick={() => setVendorMatchSkipped(new Set())} className="mt-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-card transition-colors">
                      {fn.showSkippedAgain}
                    </button>
                  )}
                </div>
              ) : (
                /* Current item + vendor list */
                <>
                  {/* Item card */}
                  <div className="mb-4 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">{stableMatchInventory.name}</p>
                            {stableMatchInventory.category && (
                              <p className="text-sm text-muted-foreground">{stableMatchInventory.category}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span>{stableMatchInventory.quantity} {stableMatchInventory.unit}</span>
                              <span>{stableMatchInventory.cost_per_unit.toFixed(2)} DH/{stableMatchInventory.unit}</span>
                              {stableMatchInventory.supplier && <span>ex: {stableMatchInventory.supplier}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={skipInventoryItem}
                          className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                        >
                          {fn.skip}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Saving */}
                  {vendorMatchSaving && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-[#606338] animate-spin" />
                      <p className="text-sm text-muted-foreground">{fn.saving}</p>
                    </div>
                  )}

                  {/* Vendor search */}
                  <p className="text-xs text-muted-foreground mb-2">{fn.selectVendor}</p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={vendorMatchSearch}
                      onChange={e => setVendorMatchSearch(e.target.value)}
                      placeholder={fn.searchVendorsPlaceholder}
                      className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#606338]"
                    />
                  </div>

                  {/* Vendor list */}
                  <div className="grid gap-2">
                    {vendors
                      .filter(v => v.is_active)
                      .filter(v => {
                        if (!vendorMatchSearch) return true;
                        const q = vendorMatchSearch.toLowerCase();
                        return v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || (v.contact_name && v.contact_name.toLowerCase().includes(q));
                      })
                      .map(vendor => (
                        <button
                          key={vendor.id}
                          disabled={vendorMatchSaving}
                          onClick={() => assignVendor(vendor.id)}
                          className="flex items-center justify-between gap-3 px-3 py-3 bg-card border border-border rounded-lg text-left hover:bg-[#606338]/10 hover:border-[#606338]/30 transition-all disabled:opacity-50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{vendor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {vendor.category}{vendor.contact_name && <> &middot; {vendor.contact_name}</>}{vendor.phone && <> &middot; {vendor.phone}</>}
                            </p>
                          </div>
                          {vendor.balance > 0 && (
                            <span className="text-xs text-red-500 shrink-0">{vendor.balance.toFixed(2)} DH</span>
                          )}
                        </button>
                      ))}
                    {vendors.filter(v => v.is_active).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">{fn.noActiveVendors}</p>
                    )}
                    {vendors.filter(v => v.is_active).length > 0 && vendors.filter(v => v.is_active).filter(v => {
                      if (!vendorMatchSearch) return true;
                      const q = vendorMatchSearch.toLowerCase();
                      return v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || (v.contact_name && v.contact_name.toLowerCase().includes(q));
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{fn.noVendorsMatch}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── Product Detail Slide-over ─────────────────────────────── */}
      {detailProductId && (() => {
        const dp = inventoryItems.find(i => i.id === detailProductId);
        const purchases = detailMovements.filter(m => m.reference_type === 'daily_purchase');
        const usages = detailMovements.filter(m => m.reference_type === 'daily_usage');
        const prices = purchases.map(m => Number(m.unit_cost) || 0).filter(p => p > 0);
        const stats = {
          totalPurchased: Math.round(purchases.reduce((s, m) => s + Math.abs(Number(m.quantity_change)), 0) * 100) / 100,
          totalUsed: Math.round(usages.reduce((s, m) => s + Math.abs(Number(m.quantity_change)), 0) * 100) / 100,
          totalSpent: Math.round(purchases.reduce((s, m) => s + Math.abs(Number(m.quantity_change)) * Number(m.unit_cost), 0) * 100) / 100,
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100 : 0,
          minPrice: prices.length > 0 ? Math.min(...prices) : 0,
          maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
          lastPrice: prices.length > 0 ? prices[0] : 0,
          priceVar: prices.length >= 2 ? Math.round((prices[0] - prices[prices.length - 1]) / prices[prices.length - 1] * 100) : 0,
        };
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDetailProductId(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold">{dp?.name || '—'}</h2>
                  <p className="text-xs text-muted-foreground">{dp?.inventory_category?.name || ''} — {dp?.unit} {dp?.vendor?.name ? `— ${dp.vendor.name}` : ''}</p>
                </div>
                <button onClick={() => setDetailProductId(null)} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
              </div>
              {detailLoading ? (
                <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="p-5 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="text-xl font-bold">{dp?.quantity || 0}</p>
                      <p className="text-[10px] text-muted-foreground">{dp?.unit}</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Coût moy.</p>
                      <p className="text-lg font-bold">{formatCurrency(dp?.cost_per_unit || 0)}</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Dernier prix</p>
                      <p className="text-lg font-bold">{formatCurrency(dp?.last_purchase_price || 0)}</p>
                    </div>
                  </div>
                  {purchases.length > 0 && (
                    <div className="bg-secondary rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Analyse des prix</h3>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Prix moyen</span><span className="font-medium">{formatCurrency(stats.avgPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dernier prix</span><span className="font-medium">{formatCurrency(stats.lastPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Min</span><span className="font-medium text-emerald-600">{formatCurrency(stats.minPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span className="font-medium text-red-600">{formatCurrency(stats.maxPrice)}</span></div>
                      </div>
                      {stats.priceVar !== 0 && (
                        <div className={`text-xs px-2 py-1 rounded-lg inline-block ${stats.priceVar > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {stats.priceVar > 0 ? '▲' : '▼'} {Math.abs(stats.priceVar)}% depuis le 1er achat
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs text-emerald-700">Total acheté</p>
                      <p className="text-lg font-bold text-emerald-700">{stats.totalPurchased} {dp?.unit}</p>
                      <p className="text-[10px] text-emerald-600">{purchases.length} achats — {formatCurrency(stats.totalSpent)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700">Total sorti</p>
                      <p className="text-lg font-bold text-red-700">{stats.totalUsed} {dp?.unit}</p>
                      <p className="text-[10px] text-red-600">{usages.length} sorties</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Historique ({detailMovements.length})</h3>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {detailMovements.map(m => {
                        const isOut = m.reference_type === 'daily_usage';
                        return (
                          <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium min-w-[40px] text-center ${isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {isOut ? '-' : '+'}{Math.abs(Number(m.quantity_change))}
                            </span>
                            <span className="text-muted-foreground text-xs flex-1">{m.reference_id}</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(Number(m.unit_cost))}/{dp?.unit}</span>
                            <span className={`text-xs font-medium ${isOut ? 'text-red-600' : 'text-[#606338]'}`}>
                              {formatCurrency(Math.abs(Number(m.quantity_change)) * Number(m.unit_cost))}
                            </span>
                          </div>
                        );
                      })}
                      {detailMovements.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">Aucun mouvement</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}
    </PermissionGate>
  );
}
