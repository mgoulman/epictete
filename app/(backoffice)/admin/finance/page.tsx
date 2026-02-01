'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Stats {
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalItems: number;
    averageOrderValue: number;
  };
  categoryStats: Array<{ name: string; revenue: number; count: number; profit: number }>;
  dailyStats: Array<{ date: string; revenue: number; count: number; profit: number }>;
  topProducts: Array<{ name: string; revenue: number; count: number }>;
  categories: string[];
  recentImports: Array<{
    id: string;
    filename: string;
    records_count: number;
    total_amount: number;
    date_range_start: string;
    date_range_end: string;
    created_at: string;
  }>;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  minimum_stock: number;
  cost_per_unit: number;
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

type TabType = 'overview' | 'sales' | 'import' | 'inventory' | 'vendors';

export default function FinancePage() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('finance.write');
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get tab from URL or default to 'overview'
  const tabParam = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['overview', 'sales', 'import', 'inventory', 'vendors'];
  const activeTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : 'overview';

  const setActiveTab = (tab: TabType) => {
    router.push(`/admin/finance?tab=${tab}`, { scroll: false });
  };
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
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
  const [importSort, setImportSort] = useState('created_at');
  const [importSortDir, setImportSortDir] = useState<SortDir>('asc');
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

  const handleImportSort = (field: string) => {
    if (importSort === field) {
      setImportSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setImportSort(field);
      setImportSortDir('asc');
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
  const [inventoryCategories, setInventoryCategories] = useState<string[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [newInventory, setNewInventory] = useState({
    name: '',
    category: '',
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
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    category: 'general',
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

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/finance/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, [startDate, endDate]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
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
        setSalesItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Sales fetch error:', err);
    }
    setLoading(false);
  }, [offset, startDate, endDate, category, searchQuery]);

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
      await fetchStats();
      await fetchSales();
    };
    loadData();
  }, [fetchStats, fetchSales]);

  useEffect(() => {
    const loadTabData = async () => {
      if (activeTab === 'inventory') {
        await fetchInventory();
        await fetchVendors();
      }
      if (activeTab === 'vendors') {
        await fetchVendors();
      }
    };
    loadTabData();
  }, [activeTab, fetchInventory, fetchVendors]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/finance/import', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Import successful! ${result.recordsImported} records imported.`);
        fetchStats();
        fetchSales();
      } else {
        alert(result.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Import failed');
    }
    setImporting(false);
    e.target.value = '';
  };

  const handleAutoImport = async () => {
    setAutoImporting(true);
    setAutoImportResult(null);
    
    try {
      const res = await fetch('/api/finance/auto-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: autoImportDates.startDate,
          endDate: autoImportDates.endDate
        })
      });

      const result = await res.json();
      
      if (res.ok) {
        setAutoImportResult({
          success: true,
          totalRows: result.totalRows,
          insertedRows: result.insertedRows,
          skippedDuplicates: result.skippedDuplicates
        });
        fetchStats();
        fetchSales();
      } else {
        setAutoImportResult({
          success: false,
          totalRows: 0,
          insertedRows: 0,
          skippedDuplicates: 0,
          message: result.error || 'Auto-import failed'
        });
      }
    } catch (err) {
      console.error('Auto-import error:', err);
      setAutoImportResult({
        success: false,
        totalRows: 0,
        insertedRows: 0,
        skippedDuplicates: 0,
        message: 'Auto-import failed'
      });
    }
    
    setAutoImporting(false);
  };

  const handleAddSale = async () => {
    if (!newSale.product_name || !newSale.selling_price) {
      alert('Please fill required fields');
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
        fetchStats();
        fetchSales();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add sale');
      }
    } catch (err) {
      console.error('Add sale error:', err);
      alert('Failed to add sale');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;

    try {
      const res = await fetch(`/api/finance/sales?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStats();
        fetchSales();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleAddInventory = async () => {
    if (!newInventory.name) {
      alert('Please enter item name');
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
          category: '',
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
        alert(err.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Add inventory error:', err);
      alert('Failed to add item');
    }
  };

  const handleUpdateInventory = async () => {
    if (!editingInventory) return;

    try {
      const { vendor, supplier, ...inventoryPayload } = editingInventory;
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
        alert(err.error || 'Failed to update item');
      }
    } catch (err) {
      console.error('Update inventory error:', err);
      alert('Failed to update item');
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Delete this inventory item?')) return;

    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory(false);
      }
    } catch (err) {
      console.error('Delete inventory error:', err);
    }
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
      alert('Please enter vendor name');
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
        category: newVendor.category,
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
          category: 'general',
          notes: '',
          invoice_template_url: '',
          invoice_template_path: ''
        });
        fetchVendors(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add vendor');
      }
    } catch (err) {
      console.error('Add vendor error:', err);
      alert('Failed to add vendor');
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
          category: editingVendor.category,
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
        alert(err.error || 'Failed to update vendor');
      }
    } catch (err) {
      console.error('Update vendor error:', err);
      alert('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Delete this vendor? This will also delete all transaction history.')) return;

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
      alert('Please enter amount');
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
        alert(err.error || 'Failed to add transaction');
      }
    } catch (err) {
      console.error('Add transaction error:', err);
      alert('Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'vendor-invoices');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        if (target === 'new') {
          setNewVendor({ ...newVendor, invoice_template_url: data.url, invoice_template_path: data.path });
        } else if (editingVendor) {
          setEditingVendor({ ...editingVendor, invoice_template_url: data.url, invoice_template_path: data.path });
        }
      } else {
        alert(data.error || 'Failed to upload template');
      }
    } catch {
      alert('Failed to upload template');
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
      alert('Please select a vendor and upload an invoice');
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
        alert(data.error || 'Scan failed');
      }
    } catch {
      alert('Scan failed');
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
        alert(data.error || 'Confirm failed');
      }
    } catch {
      alert('Confirm failed');
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
    v.category.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const totalOwedToVendors = vendors.reduce((sum, v) => sum + Math.max(0, v.balance), 0);

  const exportCSV = () => {
    if (!salesItems.length) return;

    const headers = ['Date', 'Time', 'Ticket', 'Category', 'Product', 'Qty', 'Price', 'Total', 'Profit'];
    const rows = salesItems.map(item => [
      item.sale_date,
      item.sale_time || '',
      item.ticket_number || '',
      item.category || '',
      item.product_name,
      item.quantity,
      item.selling_price,
      item.selling_price * item.quantity,
      item.profit * item.quantity
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <PermissionGate
      permission="finance.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sales reports, analytics and financial data</p>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
              <>
                <button
                  onClick={() => setShowAutoImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${autoImporting ? 'animate-spin' : ''}`} />
                  {autoImporting ? 'Syncing...' : 'Sync LaCaisse'}
                </button>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm cursor-pointer hover:bg-card transition-colors">
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : 'Import'}
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleImport}
                    disabled={importing}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Sale
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit flex-wrap">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sales', label: 'Sales List', icon: ShoppingCart },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'vendors', label: 'Vendors', icon: Users },
            { id: 'import', label: 'Import History', icon: FileSpreadsheet }
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
            <span className="text-muted-foreground">to</span>
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
              Clear dates
            </button>
          )}
          <button
            onClick={() => { fetchStats(); fetchSales(); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-linear-to-br from-green-500/20 to-green-600/10 border border-green-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.summary.totalRevenue)}</p>
                <p className="text-muted-foreground text-sm mt-1">Total Revenue</p>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#606338]/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#606338]" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.summary.totalProfit)}</p>
                <p className="text-muted-foreground text-sm mt-1">Total Profit</p>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.summary.totalItems.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm mt-1">Items Sold</p>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.summary.averageOrderValue)}</p>
                <p className="text-muted-foreground text-sm mt-1">Avg. Item Value</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">Sales by Category</h3>
                <div className="space-y-4">
                  {stats.categoryStats.slice(0, 8).map((cat) => {
                    const maxRevenue = stats.categoryStats[0]?.revenue || 1;
                    const percentage = (cat.revenue / maxRevenue) * 100;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{cat.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#606338]">{formatCurrency(cat.revenue)}</span>
                            <span className="text-xs text-muted-foreground w-16 text-right">{cat.count} items</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-card rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-[#606338] to-[#7A7B4E] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">Top Products</h3>
                <div className="space-y-2">
                  {stats.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center gap-3 p-3 bg-card rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-[#606338]/20 flex items-center justify-center text-[#606338] font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.count} sold</p>
                      </div>
                      <p className="text-[#606338] font-semibold">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Stats */}
            {stats.dailyStats.length > 0 && (
              <div className="bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">Daily Revenue</h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-2 min-w-max pb-2">
                    {stats.dailyStats.slice(-14).map(day => {
                      const maxRevenue = Math.max(...stats.dailyStats.map(d => d.revenue)) || 1;
                      const height = (day.revenue / maxRevenue) * 120;
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-2 w-16">
                          <div className="h-32 flex items-end">
                            <div
                              className="w-10 bg-linear-to-t from-[#606338] to-[#7A7B4E] rounded-t-lg"
                              style={{ height: `${Math.max(height, 4)}px` }}
                              title={formatCurrency(day.revenue)}
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
                  placeholder="Search products..."
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
                <option value="">All Categories</option>
                {stats?.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm hover:bg-card"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            {/* Table */}
            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : salesItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <ShoppingCart className="w-12 h-12 text-muted mb-4" />
                  <p className="text-muted-foreground">No sales data found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-card">
                          <th className="px-4 py-3"><SortHeader label="Date" field="sale_date" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label="Product" field="product_name" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label="Category" field="category" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label="Qty" field="quantity" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label="Price" field="selling_price" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                          <th className="px-4 py-3"><SortHeader label="Total" field="total" currentSort={salesSort} currentDir={salesSortDir} onSort={handleSalesSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                          {canWrite && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>}
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
                                <p className="text-xs text-muted">Ticket #{item.ticket_number}</p>
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOffset(Math.max(0, offset - limit))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg text-foreground disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-foreground">Page {currentPage} of {totalPages}</span>
                        <button
                          onClick={() => setOffset(offset + limit)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg text-foreground disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Import History Tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-secondary border border-border rounded-xl overflow-hidden">
              {!stats?.recentImports?.length ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <FileSpreadsheet className="w-12 h-12 text-muted mb-4" />
                  <p className="text-muted-foreground">No imports yet</p>
                  {canWrite && (
                    <label className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm cursor-pointer">
                      <Upload className="w-4 h-4" /> Import your first file
                      <input
                        type="file"
                        accept=".xls,.xlsx,.csv"
                        onChange={handleImport}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-card">
                      <th className="px-4 py-3"><SortHeader label="File" field="filename" currentSort={importSort} currentDir={importSortDir} onSort={handleImportSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                      <th className="px-4 py-3"><SortHeader label="Date Range" field="date_range_start" currentSort={importSort} currentDir={importSortDir} onSort={handleImportSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                      <th className="px-4 py-3"><SortHeader label="Records" field="records_count" currentSort={importSort} currentDir={importSortDir} onSort={handleImportSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                      <th className="px-4 py-3"><SortHeader label="Total" field="total_amount" currentSort={importSort} currentDir={importSortDir} onSort={handleImportSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                      <th className="px-4 py-3"><SortHeader label="Imported" field="created_at" currentSort={importSort} currentDir={importSortDir} onSort={handleImportSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.recentImports].sort((a, b) => sortCompare(a, b, importSort, importSortDir)).map(imp => (
                      <tr key={imp.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <FileSpreadsheet className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground">{imp.filename}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {imp.date_range_start && imp.date_range_end
                            ? `${imp.date_range_start} - ${imp.date_range_end}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground text-center">{imp.records_count}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#606338] text-right">
                          {formatCurrency(imp.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                          {new Date(imp.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  placeholder="Search inventory..."
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
                <option value="">All Categories</option>
                {inventoryCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {canWrite && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVendorMatch(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium hover:bg-card transition-colors"
                  >
                    <Users className="w-4 h-4" /> Match Vendors
                  </button>
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              )}
            </div>

            {/* Low Stock Alert */}
            {inventoryItems.some(item => item.quantity <= item.minimum_stock && item.minimum_stock > 0) && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-500">
                  <span className="font-medium">Low Stock Alert:</span>{' '}
                  {inventoryItems.filter(item => item.quantity <= item.minimum_stock && item.minimum_stock > 0).length} items need restocking
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
                  <p className="text-muted-foreground">No inventory items yet</p>
                  {canWrite && (
                    <button
                      onClick={() => setShowInventoryModal(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add your first item
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-card">
                        <th className="px-4 py-3"><SortHeader label="Item" field="name" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label="Category" field="category" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label="Quantity" field="quantity" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label="Unit" field="unit" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label="Cost/Unit" field="cost_per_unit" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                        <th className="px-4 py-3"><SortHeader label="Total Value" field="totalValue" currentSort={invSort} currentDir={invSortDir} onSort={handleInvSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                        {canWrite && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>}
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
                              {item.category ? (
                                <span className="px-2 py-1 bg-card rounded-md text-xs text-foreground">{item.category}</span>
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
                                <p className="text-xs text-red-500 text-center mt-1">Min: {item.minimum_stock}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-center">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">{formatCurrency(item.cost_per_unit)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-[#606338] text-right">
                              {formatCurrency(item.quantity * item.cost_per_unit)}
                            </td>
                            {canWrite && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
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
                    {inventoryItems.length} items in inventory
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Total Value: <span className="text-[#606338]">{formatCurrency(inventoryItems.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0))}</span>
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
                <p className="text-muted-foreground text-sm">Total Vendors</p>
                <p className="text-2xl font-bold text-foreground">{vendors.length}</p>
              </div>
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm">Active Vendors</p>
                <p className="text-2xl font-bold text-foreground">{vendors.filter(v => v.is_active).length}</p>
              </div>
              <div className="bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">Total Owed</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOwedToVendors)}</p>
              </div>
              <div className="bg-secondary border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm">With Balance Due</p>
                <p className="text-2xl font-bold text-foreground">{vendors.filter(v => v.balance > 0).length}</p>
              </div>
            </div>

            {/* Vendors Header */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search vendors..."
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
                  <Plus className="w-4 h-4" /> Add Vendor
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
                  <p className="text-muted-foreground">No vendors yet</p>
                  {canWrite && (
                    <button
                      onClick={() => setShowVendorModal(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add your first vendor
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
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">Inactive</span>
                            )}
                            <span className="text-xs px-2 py-0.5 bg-card rounded-full text-muted-foreground capitalize">{vendor.category}</span>
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
                        <p className="text-xs text-muted-foreground mb-1">Balance</p>
                        <p className={`text-xl font-bold ${vendor.balance > 0 ? 'text-red-500' : vendor.balance < 0 ? 'text-green-500' : 'text-foreground'}`}>
                          {vendor.balance > 0 ? '-' : vendor.balance < 0 ? '+' : ''}{formatCurrency(Math.abs(vendor.balance))}
                        </p>
                        {vendor.balance > 0 && (
                          <p className="text-xs text-red-400 mt-0.5">You owe</p>
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
                              <ArrowUpRight className="w-3.5 h-3.5" /> Add Debt
                            </button>
                            <button
                              onClick={() => { setSelectedVendorForTransaction(vendor); setNewTransaction({ ...newTransaction, type: 'payment' }); setShowTransactionModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" /> Add Payment
                            </button>
                            <button
                              onClick={() => { resetScanner(); setScannerVendorId(vendor.id); setShowScannerModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" /> Scan Invoice
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setViewingVendorTransactions(vendor); fetchVendorTransactions(vendor.id); fetchVendorInvoices(vendor.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> History
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

        {/* Vendor Transaction History Modal */}
        {viewingVendorTransactions && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{viewingVendorTransactions.name}</h2>
                  <p className="text-sm text-muted-foreground">Transaction History</p>
                </div>
                <button onClick={() => { setViewingVendorTransactions(null); setVendorTransactions([]); setVendorInvoices([]); }} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {vendorTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendorTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-3">
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
                    ))}
                  </div>
                )}
              </div>
              {/* Scanned Invoices Section */}
              {vendorInvoices.length > 0 && (
                <div className="px-5 pb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Scanned Invoices
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
                              {inv.items?.length || 0} items &bull;{' '}
                              <span className={inv.status === 'confirmed' ? 'text-green-500' : 'text-yellow-500'}>
                                {inv.status}
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
                  <span className="text-sm text-muted-foreground">Current Balance</span>
                  <span className={`text-lg font-bold ${viewingVendorTransactions.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {viewingVendorTransactions.balance > 0 ? 'You owe: ' : 'Credit: '}{formatCurrency(Math.abs(viewingVendorTransactions.balance))}
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
                <h2 className="text-lg font-semibold text-foreground">Add Vendor</h2>
                <button onClick={() => setShowVendorModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Vendor Name *</label>
                  <input
                    type="text"
                    value={newVendor.name}
                    onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g., Fresh Produce Co."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    value={newVendor.contact_name}
                    onChange={e => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="Contact name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={newVendor.phone}
                      onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      placeholder="+212 6XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      value={newVendor.email}
                      onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      placeholder="vendor@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Address</label>
                  <input
                    type="text"
                    value={newVendor.address}
                    onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
                  <select
                    value={newVendor.category}
                    onChange={e => setNewVendor({ ...newVendor, category: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="general">General</option>
                    <option value="food">Food & Produce</option>
                    <option value="beverages">Beverages</option>
                    <option value="equipment">Equipment</option>
                    <option value="supplies">Supplies</option>
                    <option value="services">Services</option>
                    <option value="utilities">Utilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
                  <textarea
                    value={newVendor.notes}
                    onChange={e => setNewVendor({ ...newVendor, notes: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
                {/* Invoice Template */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Invoice Template</label>
                  <p className="text-xs text-muted-foreground mb-2">Upload a sample invoice to help AI extract line items accurately</p>
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
                        Remove template
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:border-[#606338] transition-colors">
                      {uploadingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload template image</span>
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
                  Cancel
                </button>
                <button
                  onClick={handleAddVendor}
                  className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
                >
                  Add Vendor
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
                <h2 className="text-lg font-semibold text-foreground">Edit Vendor</h2>
                <button onClick={() => setEditingVendor(null)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Vendor Name *</label>
                  <input
                    type="text"
                    value={editingVendor.name}
                    onChange={e => setEditingVendor({ ...editingVendor, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    value={editingVendor.contact_name || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, contact_name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={editingVendor.phone || ''}
                      onChange={e => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editingVendor.email || ''}
                      onChange={e => setEditingVendor({ ...editingVendor, email: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Address</label>
                  <input
                    type="text"
                    value={editingVendor.address || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, address: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
                  <select
                    value={editingVendor.category}
                    onChange={e => setEditingVendor({ ...editingVendor, category: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="general">General</option>
                    <option value="food">Food & Produce</option>
                    <option value="beverages">Beverages</option>
                    <option value="equipment">Equipment</option>
                    <option value="supplies">Supplies</option>
                    <option value="services">Services</option>
                    <option value="utilities">Utilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
                  <textarea
                    value={editingVendor.notes || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                  />
                </div>
                {/* Invoice Template */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Invoice Template</label>
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
                        Remove template
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 bg-card border border-dashed border-border rounded-lg cursor-pointer hover:border-[#606338] transition-colors">
                      {uploadingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload template image</span>
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
                  <label htmlFor="vendor_active" className="text-sm text-foreground">Active vendor</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setEditingVendor(null)}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVendor}
                  className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
                >
                  Save Changes
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
                    {newTransaction.type === 'debt' ? 'Add Debt' : 'Add Payment'}
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
                    Debt (You Owe)
                  </button>
                  <button
                    onClick={() => setNewTransaction({ ...newTransaction, type: 'payment' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newTransaction.type === 'payment'
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-card text-muted-foreground border border-border'
                    }`}
                  >
                    Payment (You Pay)
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Amount (DH) *</label>
                  <input
                    type="number"
                    value={newTransaction.amount || ''}
                    onChange={e => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Reference / Invoice #</label>
                  <input
                    type="text"
                    value={newTransaction.reference}
                    onChange={e => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g., INV-001, Receipt #123"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
                  <textarea
                    value={newTransaction.description}
                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                    rows={2}
                    placeholder="What is this transaction for?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => { setShowTransactionModal(false); setSelectedVendorForTransaction(null); }}
                  className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransaction}
                  className={`px-4 py-2.5 rounded-lg text-white text-sm font-medium ${
                    newTransaction.type === 'debt' ? 'bg-red-500' : 'bg-green-500'
                  }`}
                >
                  {newTransaction.type === 'debt' ? 'Add Debt' : 'Add Payment'}
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
              <h2 className="text-lg font-semibold text-foreground">Add Inventory Item</h2>
              <button onClick={() => setShowInventoryModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Item Name *</label>
                <input
                  type="text"
                  value={newInventory.name}
                  onChange={e => setNewInventory({ ...newInventory, name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g., Tomatoes, Pasta, Olive Oil"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
                <input
                  type="text"
                  value={newInventory.category}
                  onChange={e => setNewInventory({ ...newInventory, category: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g., Fruits, Légumes, Pâtes, Viandes"
                  list="inventory-categories"
                />
                <datalist id="inventory-categories">
                  {inventoryCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quantity</label>
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
                  <label className="block text-xs text-muted-foreground mb-1.5">Unit</label>
                  <select
                    value={newInventory.unit}
                    onChange={e => setNewInventory({ ...newInventory, unit: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="pieces">pieces</option>
                    <option value="boxes">boxes</option>
                    <option value="bottles">bottles</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Min Stock Alert</label>
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
                  <label className="block text-xs text-muted-foreground mb-1.5">Cost/Unit (DH)</label>
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
                <label className="block text-xs text-muted-foreground mb-1.5">Supplier</label>
                <select
                  value={newInventory.vendor_id}
                  onChange={e => setNewInventory({ ...newInventory, vendor_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">No supplier</option>
                  {vendors.filter(v => v.is_active).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={newInventory.notes}
                  onChange={e => setNewInventory({ ...newInventory, notes: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInventory}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                Add Item
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
              <h2 className="text-lg font-semibold text-foreground">Edit Inventory Item</h2>
              <button onClick={() => setEditingInventory(null)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Item Name *</label>
                <input
                  type="text"
                  value={editingInventory.name}
                  onChange={e => setEditingInventory({ ...editingInventory, name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
                <input
                  type="text"
                  value={editingInventory.category || ''}
                  onChange={e => setEditingInventory({ ...editingInventory, category: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  list="inventory-categories-edit"
                />
                <datalist id="inventory-categories-edit">
                  {inventoryCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quantity</label>
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
                  <label className="block text-xs text-muted-foreground mb-1.5">Unit</label>
                  <select
                    value={editingInventory.unit}
                    onChange={e => setEditingInventory({ ...editingInventory, unit: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="pieces">pieces</option>
                    <option value="boxes">boxes</option>
                    <option value="bottles">bottles</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Min Stock Alert</label>
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
                  <label className="block text-xs text-muted-foreground mb-1.5">Cost/Unit (DH)</label>
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
                <label className="block text-xs text-muted-foreground mb-1.5">Supplier</label>
                <select
                  value={editingInventory.vendor_id || ''}
                  onChange={e => setEditingInventory({ ...editingInventory, vendor_id: e.target.value || null })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">No supplier</option>
                  {vendors.filter(v => v.is_active).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
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
                Cancel
              </button>
              <button
                onClick={handleUpdateInventory}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                Save Changes
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
              <h2 className="text-lg font-semibold text-foreground">Sync from LaCaisse</h2>
              <button onClick={() => { setShowAutoImportModal(false); setAutoImportResult(null); }} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {autoImportResult ? (
                <div className={`p-4 rounded-xl ${autoImportResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {autoImportResult.success ? (
                    <>
                      <p className="text-green-500 font-semibold mb-2">Import Successful!</p>
                      <div className="text-sm text-foreground space-y-1">
                        <p>Total rows processed: <span className="font-medium">{autoImportResult.totalRows}</span></p>
                        <p>New records inserted: <span className="font-medium text-green-500">{autoImportResult.insertedRows}</span></p>
                        <p>Duplicates skipped: <span className="font-medium text-muted-foreground">{autoImportResult.skippedDuplicates}</span></p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-red-500 font-semibold mb-2">Import Failed</p>
                      <p className="text-sm text-muted-foreground">{autoImportResult.message}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Automatically fetch and import sales data from LaCaisse.ma for the selected date range.
                    Duplicate records will be automatically skipped.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={autoImportDates.startDate}
                        onChange={e => setAutoImportDates(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">End Date</label>
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
                {autoImportResult ? 'Close' : 'Cancel'}
              </button>
              {!autoImportResult && (
                <button
                  onClick={handleAutoImport}
                  disabled={autoImporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${autoImporting ? 'animate-spin' : ''}`} />
                  {autoImporting ? 'Importing...' : 'Start Import'}
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
              <h2 className="text-lg font-semibold text-foreground">Add Sale</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={newSale.product_name}
                  onChange={e => setNewSale({ ...newSale, product_name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
                <input
                  type="text"
                  value={newSale.category}
                  onChange={e => setNewSale({ ...newSale, category: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder="Enter category"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={newSale.quantity}
                    onChange={e => setNewSale({ ...newSale, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Price (DH) *</label>
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
                <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
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
                Cancel
              </button>
              <button
                onClick={handleAddSale}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                Add Sale
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
                <h2 className="text-lg font-semibold text-foreground">Scan Invoice</h2>
                <p className="text-sm text-muted-foreground">
                  {scannerStage === 'upload' && `Upload an invoice for ${vendors.find(v => v.id === scannerVendorId)?.name || 'vendor'}`}
                  {scannerStage === 'review' && 'Review extracted items before confirming'}
                  {scannerStage === 'success' && 'Invoice confirmed successfully'}
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
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">Has template</span>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Invoice Image or PDF *</label>
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
                            <p className="text-sm text-foreground font-medium">Upload or take photo</p>
                            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF, or PDF up to 10MB</p>
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
                        Remove file
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
                      <label className="block text-xs text-muted-foreground mb-1.5">Invoice Date</label>
                      <input
                        type="date"
                        value={scannedInvoiceDate}
                        onChange={e => setScannedInvoiceDate(e.target.value)}
                        className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Total Amount (DH)</label>
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
                      Extracted Items ({scannedItems.length})
                    </label>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-secondary">
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">Product</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Unit</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted uppercase">Price</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-muted uppercase">Total</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase">Inventory Match</th>
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
                                    <option value="">No match</option>
                                    {scannerInventoryItems.map(inv => (
                                      <option key={inv.id} value={inv.id}>{inv.name}</option>
                                    ))}
                                  </select>
                                  {item.match_score > 0 && (
                                    <p className="text-[10px] text-green-500 mt-0.5">
                                      Auto-matched ({Math.round(item.match_score * 100)}%)
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
                      Update inventory quantities for matched items
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
                    <h3 className="text-lg font-semibold text-foreground">Invoice Confirmed</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Debt transaction of {formatCurrency(confirmResult.transaction.amount)} created
                    </p>
                  </div>
                  {confirmResult.inventory_updates.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-4 text-left">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Inventory Updated:</p>
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
                    Cancel
                  </button>
                  <button
                    onClick={handleScanInvoice}
                    disabled={!scannerFile || !scannerVendorId || scanning}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" /> Scan
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
                    Back
                  </button>
                  <button
                    onClick={handleConfirmInvoice}
                    disabled={confirming || scannedItems.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirm &amp; Create Debt
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
                  Done
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
                <h2 className="text-lg font-semibold text-foreground">Match Vendors</h2>
                <p className="text-xs text-muted-foreground">
                  {totalUnlinkedInventory} items without vendor{vendorMatchCount > 0 && <> &middot; {vendorMatchCount} matched</>}{vendorMatchSkipped.size > 0 && <> &middot; {vendorMatchSkipped.size} skipped</>}
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
                    {totalUnlinkedInventory === 0 ? 'All items have vendors!' : 'All remaining items skipped'}
                  </p>
                  {vendorMatchCount > 0 && <p className="text-sm text-muted-foreground">{vendorMatchCount} matched this session</p>}
                  {vendorMatchSkipped.size > 0 && totalUnlinkedInventory > 0 && (
                    <button onClick={() => setVendorMatchSkipped(new Set())} className="mt-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-card transition-colors">
                      Show skipped items again
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
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Saving */}
                  {vendorMatchSaving && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-[#606338] animate-spin" />
                      <p className="text-sm text-muted-foreground">Saving...</p>
                    </div>
                  )}

                  {/* Vendor search */}
                  <p className="text-xs text-muted-foreground mb-2">Select a vendor:</p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={vendorMatchSearch}
                      onChange={e => setVendorMatchSearch(e.target.value)}
                      placeholder="Search vendors..."
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
                      <p className="text-sm text-muted-foreground text-center py-8">No active vendors. Create vendors first in the Vendors tab.</p>
                    )}
                    {vendors.filter(v => v.is_active).length > 0 && vendors.filter(v => v.is_active).filter(v => {
                      if (!vendorMatchSearch) return true;
                      const q = vendorMatchSearch.toLowerCase();
                      return v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || (v.contact_name && v.contact_name.toLowerCase().includes(q));
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No vendors match your search</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}
