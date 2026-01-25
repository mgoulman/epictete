'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, MenuItem, MenuCategory } from '@/lib/supabase';
import { PermissionGate, CanEditMenu } from '@/components/backoffice/auth/PermissionGate';
import { usePermissions } from '@/lib/auth/hooks';
import {
  Plus, Pencil, Trash2, X, UtensilsCrossed, Search, Image,
  LayoutGrid, List, Star, Eye, EyeOff, MoreVertical, Filter
} from 'lucide-react';

interface MenuItemForm {
  name: string;
  name_fr: string;
  price: string;
  price_small: string;
  price_large: string;
  description: string;
  description_en: string;
  category_id: string;
  is_signature: boolean;
  is_available: boolean;
  chef_note: string;
}

const emptyForm: MenuItemForm = {
  name: '', name_fr: '', price: '', price_small: '', price_large: '',
  description: '', description_en: '', category_id: '',
  is_signature: false, is_available: true, chef_note: ''
};

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');
  const [filterSignature, setFilterSignature] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('menu.write');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*').order('sort_order')
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [activeDropdown]);

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, name_fr: item.name_fr,
        price: item.price?.toString() || '', price_small: item.price_small?.toString() || '',
        price_large: item.price_large?.toString() || '', description: item.description || '',
        description_en: item.description_en || '', category_id: item.category_id || '',
        is_signature: item.is_signature || false, is_available: item.is_available !== false,
        chef_note: item.chef_note || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ ...emptyForm, category_id: selectedCategory || '' });
    }
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name_fr || !formData.price) {
      alert('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const itemData = {
        name: formData.name, name_fr: formData.name_fr,
        price: parseFloat(formData.price),
        price_small: formData.price_small ? parseFloat(formData.price_small) : null,
        price_large: formData.price_large ? parseFloat(formData.price_large) : null,
        description: formData.description || null, description_en: formData.description_en || null,
        category_id: formData.category_id || null, is_signature: formData.is_signature,
        is_available: formData.is_available, chef_note: formData.chef_note || null,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
        if (error) throw error;
        setMenuItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...itemData } : item));
      } else {
        const newId = `item-${Date.now()}`;
        const { error } = await supabase.from('menu_items').insert({ ...itemData, id: newId, created_at: new Date().toISOString() });
        if (error) throw error;
        setMenuItems(prev => [...prev, { ...itemData, id: newId } as MenuItem]);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving item');
    }
    setSaving(false);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    setDeleting(itemId);
    setActiveDropdown(null);
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting item');
    }
    setDeleting(null);
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const newValue = !item.is_available;
      const { error } = await supabase.from('menu_items').update({ is_available: newValue, updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newValue } : i));
    } catch (err) { console.error('Toggle error:', err); }
    setActiveDropdown(null);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesAvailable = filterAvailable === 'all' || (filterAvailable === 'available' && item.is_available) || (filterAvailable === 'unavailable' && !item.is_available);
    const matchesSignature = !filterSignature || item.is_signature;
    return matchesSearch && matchesCategory && matchesAvailable && matchesSignature;
  });

  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(i => i.is_available).length;
  const signatureItems = menuItems.filter(i => i.is_signature).length;
  const itemsWithImages = menuItems.filter(i => i.image_url).length;

  const getCategoryName = (id: string | null) => id ? categories.find(c => c.id === id)?.name_fr || 'Unknown' : 'Uncategorized';
  const getCategoryIcon = (id: string | null) => id ? categories.find(c => c.id === id)?.icon || '🍽️' : '📦';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PermissionGate permission="menu.read" fallback={<div className="flex items-center justify-center h-[50vh]"><p className="text-gray-500">No permission</p></div>}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white">Menu</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your restaurant menu items</p>
          </div>
          <CanEditMenu>
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg text-white text-sm font-medium">
              <Plus className="w-4 h-4" />Add Item
            </button>
          </CanEditMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Items', value: totalItems, colorClass: 'text-amber-600' },
            { label: 'Available', value: availableItems, colorClass: 'text-green-500' },
            { label: 'Signature', value: signatureItems, colorClass: 'text-yellow-500' },
            { label: 'With Images', value: itemsWithImages, colorClass: 'text-blue-500' }
          ].map(stat => (
            <div key={stat.label} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.colorClass} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${!selectedCategory ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#1a1a1a] border-[#252525] text-gray-400'}`}>
            All ({menuItems.length})
          </button>
          {categories.map(cat => {
            const count = menuItems.filter(i => i.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#1a1a1a] border-[#252525] text-gray-400'}`}>
                <span>{cat.icon}</span>{cat.name_fr} ({count})
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search items..." className="w-full py-2.5 pl-10 pr-3 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none focus:border-amber-600/40" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm border ${showFilters ? 'bg-amber-600/15 border-amber-600 text-amber-600' : 'bg-[#111] border-[#1a1a1a] text-gray-400'}`}>
            <Filter className="w-4 h-4" />Filters
          </button>
          <div className="flex bg-[#111] border border-[#1a1a1a] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 border-none ${viewMode === 'grid' ? 'bg-[#1a1a1a] text-amber-600' : 'bg-transparent text-gray-500'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 border-none ${viewMode === 'list' ? 'bg-[#1a1a1a] text-amber-600' : 'bg-transparent text-gray-500'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex gap-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg flex-wrap">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Availability</label>
              <select value={filterAvailable} onChange={(e) => setFilterAvailable(e.target.value as 'all' | 'available' | 'unavailable')} className="py-2 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md text-white text-[13px]">
                <option value="all">All</option>
                <option value="available">Available only</option>
                <option value="unavailable">Unavailable only</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-5">
              <input type="checkbox" checked={filterSignature} onChange={(e) => setFilterSignature(e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px] text-white">Signature dishes only</span>
            </label>
          </div>
        )}

        {/* Results Count */}
        <p className="text-[13px] text-gray-500">Showing {filteredItems.length} of {menuItems.length} items</p>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className={`bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden transition-all ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="h-40 bg-[#0a0a0a] relative flex items-center justify-center">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Image className="w-8 h-8 text-gray-700" />}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    {item.is_signature && <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/90 rounded-md text-[11px] font-semibold text-black"><Star className="w-3 h-3" />Signature</span>}
                    {!item.is_available && <span className="px-2 py-1 bg-red-500/90 rounded-md text-[11px] font-semibold text-white">Unavailable</span>}
                  </div>
                  {canEdit && (
                    <div className="absolute top-2.5 right-2.5">
                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }} className="p-1.5 bg-black/60 border-none rounded-md cursor-pointer text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === item.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-[#252525] rounded-lg overflow-hidden z-10 min-w-[150px] shadow-2xl">
                          <button onClick={() => handleOpenModal(item)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-white text-[13px] cursor-pointer text-left hover:bg-[#222]"><Pencil className="w-3.5 h-3.5" />Edit</button>
                          <button onClick={() => toggleAvailability(item)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-white text-[13px] cursor-pointer text-left hover:bg-[#222]">{item.is_available ? <><EyeOff className="w-3.5 h-3.5" />Mark Unavailable</> : <><Eye className="w-3.5 h-3.5" />Mark Available</>}</button>
                          <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-red-500 text-[13px] cursor-pointer text-left hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" />{deleting === item.id ? 'Deleting...' : 'Delete'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-white truncate">{item.name_fr}</h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{item.name}</p>
                    </div>
                    <span className="text-base font-bold text-amber-600 whitespace-nowrap">{item.price} DH</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="text-sm">{getCategoryIcon(item.category_id)}</span>
                    <span className="text-xs text-gray-400">{getCategoryName(item.category_id)}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-500 mt-2.5 line-clamp-2">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px] gap-4 px-4 py-3 border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="text-xs font-semibold text-gray-500 uppercase">Item</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Category</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Status</span>
              <span className="text-xs font-semibold text-gray-500 uppercase text-right">Price</span>
            </div>
            {filteredItems.map((item, index) => (
              <div key={item.id} className={`grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px] gap-4 px-4 py-3 items-center ${index > 0 ? 'border-t border-[#1a1a1a]' : ''} ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <Image className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{item.name_fr}</span>
                      {item.is_signature && <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getCategoryIcon(item.category_id)}</span>
                  <span className="text-xs text-gray-400">{getCategoryName(item.category_id)}</span>
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${item.is_available ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-sm font-semibold text-amber-600">{item.price} DH</span>
                  {canEdit && (
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }} className="p-1.5 bg-transparent border-none rounded-md cursor-pointer text-gray-500 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === item.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-[#252525] rounded-lg overflow-hidden z-10 min-w-[150px] shadow-2xl">
                          <button onClick={() => handleOpenModal(item)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-white text-[13px] cursor-pointer text-left hover:bg-[#222]"><Pencil className="w-3.5 h-3.5" />Edit</button>
                          <button onClick={() => toggleAvailability(item)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-white text-[13px] cursor-pointer text-left hover:bg-[#222]">{item.is_available ? <><EyeOff className="w-3.5 h-3.5" />Mark Unavailable</> : <><Eye className="w-3.5 h-3.5" />Mark Available</>}</button>
                          <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-red-500 text-[13px] cursor-pointer text-left hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" />{deleting === item.id ? 'Deleting...' : 'Delete'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <div className="py-12 px-6 text-center"><p className="text-gray-500">No items found</p></div>}
          </div>
        )}

        {/* Empty State */}
        {menuItems.length === 0 && (
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl py-16 px-6 flex flex-col items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500">No menu items yet</p>
            <CanEditMenu><button onClick={() => handleOpenModal()} className="mt-4 px-5 py-2.5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg text-white text-sm font-medium">Add your first item</button></CanEditMenu>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#111] z-10">
              <h2 className="text-lg font-semibold text-white">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={handleCloseModal} className="p-2 bg-transparent border-none rounded-md cursor-pointer text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Name (French) *</label>
                  <input type="text" value={formData.name_fr} onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="Saumon Grillé" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Name (English) *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="Grilled Salmon" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Category</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none">
                  <option value="">Select category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name_fr}</option>)}
                </select>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Price (DH) *</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Small</label>
                  <input type="number" value={formData.price_small} onChange={(e) => setFormData({ ...formData, price_small: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Large</label>
                  <input type="number" value={formData.price_large} onChange={(e) => setFormData({ ...formData, price_large: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="0" />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Description (French)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none resize-y" placeholder="Description en français..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Description (English)</label>
                <textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={2} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none resize-y" placeholder="Description in English..." />
              </div>

              {/* Chef Note */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Chef Note</label>
                <input type="text" value={formData.chef_note} onChange={(e) => setFormData({ ...formData, chef_note: e.target.value })} className="w-full py-2.5 px-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white text-sm outline-none" placeholder="Special note from chef..." />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_signature} onChange={(e) => setFormData({ ...formData, is_signature: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-white">Signature dish</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-white">Available</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#1a1a1a] sticky bottom-0 bg-[#111]">
              <button onClick={handleCloseModal} className="px-5 py-2.5 bg-transparent border border-[#1a1a1a] rounded-lg text-white text-sm cursor-pointer hover:bg-[#1a1a1a]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-gradient-to-br from-amber-600 to-amber-700 border-none rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-70">
                {saving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Item')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}
