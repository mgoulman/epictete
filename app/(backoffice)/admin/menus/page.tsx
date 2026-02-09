'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/lib/auth/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  BookOpen, Plus, Search, Edit2, Trash2, X, Eye,
  GripVertical, Check, Calendar, Tag, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Menu {
  id: string;
  name: string;
  name_fr: string | null;
  description: string | null;
  type: 'standard' | 'lunch' | 'dinner' | 'tasting' | 'seasonal' | 'special';
  is_active: boolean;
  display_order: number;
  valid_from: string | null;
  valid_until: string | null;
  item_count: number;
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  name_fr: string | null;
  price: number | null;
  price_small: number | null;
  price_large: number | null;
  description: string | null;
  category_id: string | null;
  is_available: boolean;
  is_signature: boolean;
  image_url: string | null;
}

interface MenuItemLink {
  id: string;
  display_order: number;
  price_override: number | null;
  menu_item: MenuItem;
}

interface MenuDetail extends Omit<Menu, 'item_count'> {
  items: MenuItemLink[];
}

export default function MenusPage() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('menu.write');
  const { t } = useTranslation();
  const mn = t.backoffice.menusPage;

  const MENU_TYPES = [
    { value: 'standard', label: mn.menuTypes.standard },
    { value: 'lunch', label: mn.menuTypes.lunch },
    { value: 'dinner', label: mn.menuTypes.dinner },
    { value: 'tasting', label: mn.menuTypes.tasting },
    { value: 'seasonal', label: mn.menuTypes.seasonal },
    { value: 'special', label: mn.menuTypes.special }
  ];

  const [menus, setMenus] = useState<Menu[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuDetail | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Form state
  const [newMenu, setNewMenu] = useState({
    name: '',
    name_fr: '',
    description: '',
    type: 'standard' as Menu['type'],
    is_active: true,
    display_order: 0,
    valid_from: '',
    valid_until: ''
  });

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menus?type=list');
      if (res.ok) {
        const data = await res.json();
        setMenus(data.menus || []);
      }
    } catch (err) {
      console.error('Fetch menus error:', err);
    }
    setLoading(false);
  }, []);

  const fetchMenuDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/menus?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMenu(data.menu);
      }
    } catch (err) {
      console.error('Fetch menu detail error:', err);
    }
  };

  const fetchAllMenuItems = async () => {
    try {
      const res = await fetch('/api/menu-items');
      if (res.ok) {
        const data = await res.json();
        setAllMenuItems(data.items || []);
      }
    } catch (err) {
      console.error('Fetch menu items error:', err);
    }
  };

  useEffect(() => {
    fetchMenus();
    fetchAllMenuItems();
  }, [fetchMenus]);

  const handleCreateMenu = async () => {
    if (!newMenu.name) {
      alert(mn.nameRequired);
      return;
    }

    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu',
          name: newMenu.name,
          name_fr: newMenu.name_fr,
          description: newMenu.description,
          menu_type: newMenu.type,
          is_active: newMenu.is_active,
          display_order: newMenu.display_order,
          valid_from: newMenu.valid_from || null,
          valid_until: newMenu.valid_until || null
        })
      });

      if (res.ok) {
        setShowMenuModal(false);
        setNewMenu({
          name: '', name_fr: '', description: '', type: 'standard',
          is_active: true, display_order: 0, valid_from: '', valid_until: ''
        });
        fetchMenus();
      }
    } catch (err) {
      console.error('Create menu error:', err);
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu) return;

    try {
      const res = await fetch('/api/menus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu',
          id: editingMenu.id,
          name: editingMenu.name,
          name_fr: editingMenu.name_fr,
          description: editingMenu.description,
          menu_type: editingMenu.type,
          is_active: editingMenu.is_active,
          display_order: editingMenu.display_order,
          valid_from: editingMenu.valid_from,
          valid_until: editingMenu.valid_until
        })
      });

      if (res.ok) {
        setEditingMenu(null);
        fetchMenus();
      }
    } catch (err) {
      console.error('Update menu error:', err);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm(mn.deleteMenu)) return;

    try {
      await fetch(`/api/menus?type=menu&id=${id}`, { method: 'DELETE' });
      fetchMenus();
    } catch (err) {
      console.error('Delete menu error:', err);
    }
  };

  const handleToggleActive = async (menu: Menu) => {
    try {
      await fetch('/api/menus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu',
          id: menu.id,
          name: menu.name,
          menu_type: menu.type,
          is_active: !menu.is_active
        })
      });
      fetchMenus();
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleAddItems = async () => {
    if (!selectedMenu || selectedItems.length === 0) return;

    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'add-items',
          menu_id: selectedMenu.id,
          menu_item_ids: selectedItems
        })
      });

      if (res.ok) {
        setShowAddItemsModal(false);
        setSelectedItems([]);
        setItemSearchTerm('');
        fetchMenuDetail(selectedMenu.id);
        fetchMenus();
      }
    } catch (err) {
      console.error('Add items error:', err);
    }
  };

  const handleRemoveItem = async (linkId: string) => {
    if (!confirm(mn.removeItem)) return;

    try {
      await fetch(`/api/menus?type=menu-item&id=${linkId}`, { method: 'DELETE' });
      if (selectedMenu) {
        fetchMenuDetail(selectedMenu.id);
      }
      fetchMenus();
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  const filteredMenus = menus.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter available items (not already in menu)
  const availableItems = allMenuItems.filter(item => {
    if (!selectedMenu) return true;
    const existingIds = selectedMenu.items.map(i => i.menu_item.id);
    return !existingIds.includes(item.id);
  }).filter(item =>
    item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(value) + ' DH';
  };

  const getTypeLabel = (type: string) => {
    return MENU_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{mn.title}</h1>
          <p className="text-muted-foreground mt-1">{mn.subtitle}</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowMenuModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {mn.newMenu}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={mn.searchMenu}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#606338]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{menus.length}</p>
              <p className="text-xs text-muted-foreground">{mn.menusTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {menus.filter(m => m.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">{mn.activeMenus}</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {menus.reduce((sum, m) => sum + m.item_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">{mn.totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {menus.filter(m => m.type === 'seasonal').length}
              </p>
              <p className="text-xs text-muted-foreground">{mn.seasonal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menus Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMenus.length === 0 ? (
        <div className="bg-secondary border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-muted mb-4" />
          <p className="text-muted-foreground">{mn.noMenuFound}</p>
          {canWrite && (
            <button
              onClick={() => setShowMenuModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
            >
              <Plus className="w-4 h-4" /> {mn.createMenu}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenus.map(menu => (
            <div
              key={menu.id}
              className="bg-secondary border border-border rounded-xl p-5 hover:border-[#606338]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{menu.name}</h3>
                  {menu.name_fr && menu.name_fr !== menu.name && (
                    <p className="text-sm text-muted-foreground truncate">{menu.name_fr}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleActive(menu)}
                  className={`p-1 rounded ${menu.is_active ? 'text-green-500' : 'text-muted-foreground'}`}
                  title={menu.is_active ? mn.active : mn.inactive}
                >
                  {menu.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-[#606338]/10 text-[#606338] rounded text-xs font-medium">
                  {getTypeLabel(menu.type)}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs font-medium">
                  {menu.item_count} {mn.items}
                </span>
              </div>

              {menu.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{menu.description}</p>
              )}

              {(menu.valid_from || menu.valid_until) && (
                <p className="text-xs text-muted-foreground mb-3">
                  {menu.valid_from && `${mn.from} ${new Date(menu.valid_from).toLocaleDateString('fr-FR')}`}
                  {menu.valid_from && menu.valid_until && ' '}
                  {menu.valid_until && `${mn.until} ${new Date(menu.valid_until).toLocaleDateString('fr-FR')}`}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => { fetchMenuDetail(menu.id); setShowDetailModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-card hover:bg-primary/10 rounded-lg text-sm text-foreground transition-colors"
                >
                  <Eye className="w-4 h-4" /> {mn.view}
                </button>
                {canWrite && (
                  <>
                    <button
                      onClick={() => setEditingMenu(menu)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
                      title={mn.edit}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(menu.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      title={mn.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{mn.newMenu}</h2>
              <button onClick={() => setShowMenuModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.name} *</label>
                  <input
                    type="text"
                    value={newMenu.name}
                    onChange={e => setNewMenu({ ...newMenu, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder={mn.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.nameFr}</label>
                  <input
                    type="text"
                    value={newMenu.name_fr}
                    onChange={e => setNewMenu({ ...newMenu, name_fr: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mn.menuType}</label>
                <select
                  value={newMenu.type}
                  onChange={e => setNewMenu({ ...newMenu, type: e.target.value as Menu['type'] })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  {MENU_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mn.description}</label>
                <textarea
                  value={newMenu.description}
                  onChange={e => setNewMenu({ ...newMenu, description: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.validFrom}</label>
                  <input
                    type="date"
                    value={newMenu.valid_from}
                    onChange={e => setNewMenu({ ...newMenu, valid_from: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.validUntil}</label>
                  <input
                    type="date"
                    value={newMenu.valid_until}
                    onChange={e => setNewMenu({ ...newMenu, valid_until: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newMenu.is_active}
                  onChange={e => setNewMenu({ ...newMenu, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="is_active" className="text-sm text-foreground">{mn.menuActive}</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowMenuModal(false)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {mn.cancel}
              </button>
              <button
                onClick={handleCreateMenu}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {mn.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {editingMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{mn.editMenu}</h2>
              <button onClick={() => setEditingMenu(null)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.name} *</label>
                  <input
                    type="text"
                    value={editingMenu.name}
                    onChange={e => setEditingMenu({ ...editingMenu, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.nameFr}</label>
                  <input
                    type="text"
                    value={editingMenu.name_fr || ''}
                    onChange={e => setEditingMenu({ ...editingMenu, name_fr: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mn.menuType}</label>
                <select
                  value={editingMenu.type}
                  onChange={e => setEditingMenu({ ...editingMenu, type: e.target.value as Menu['type'] })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  {MENU_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mn.description}</label>
                <textarea
                  value={editingMenu.description || ''}
                  onChange={e => setEditingMenu({ ...editingMenu, description: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.validFrom}</label>
                  <input
                    type="date"
                    value={editingMenu.valid_from || ''}
                    onChange={e => setEditingMenu({ ...editingMenu, valid_from: e.target.value || null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mn.validUntil}</label>
                  <input
                    type="date"
                    value={editingMenu.valid_until || ''}
                    onChange={e => setEditingMenu({ ...editingMenu, valid_until: e.target.value || null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editingMenu.is_active}
                  onChange={e => setEditingMenu({ ...editingMenu, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="edit_is_active" className="text-sm text-foreground">{mn.menuActive}</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {mn.cancel}
              </button>
              <button
                onClick={handleUpdateMenu}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {mn.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Detail Modal */}
      {showDetailModal && selectedMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedMenu.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {getTypeLabel(selectedMenu.type)} • {selectedMenu.items.length} {mn.items}
                </p>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedMenu(null); }} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">{mn.menuItems}</h3>
                {canWrite && (
                  <button
                    onClick={() => setShowAddItemsModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606338] text-white rounded-lg text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> {mn.add}
                  </button>
                )}
              </div>

              {selectedMenu.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {mn.noItemsInMenu}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedMenu.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {canWrite && (
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.menu_item.name}
                            {item.menu_item.is_signature && (
                              <span className="ml-2 text-xs text-accent">★</span>
                            )}
                          </p>
                          {item.menu_item.name_fr && item.menu_item.name_fr !== item.menu_item.name && (
                            <p className="text-xs text-muted-foreground truncate">{item.menu_item.name_fr}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-[#606338]">
                          {item.price_override
                            ? formatCurrency(item.price_override)
                            : formatCurrency(item.menu_item.price)}
                        </p>
                        {canWrite && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
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
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && selectedMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{mn.addItems}</h2>
              <button
                onClick={() => { setShowAddItemsModal(false); setSelectedItems([]); setItemSearchTerm(''); }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={mn.searchItem}
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              {selectedItems.length > 0 && (
                <p className="mt-2 text-sm text-[#606338] font-medium">
                  {selectedItems.length} {mn.selectedItems}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {availableItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {mn.noAvailableItems}
                </p>
              ) : (
                <div className="space-y-2">
                  {availableItems.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedItems.includes(item.id)
                          ? 'bg-[#606338]/10 border border-[#606338]/30'
                          : 'bg-card hover:bg-card/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#606338]">
                        {formatCurrency(item.price)}
                      </p>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => { setShowAddItemsModal(false); setSelectedItems([]); setItemSearchTerm(''); }}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                {mn.cancel}
              </button>
              <button
                onClick={handleAddItems}
                disabled={selectedItems.length === 0}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium disabled:opacity-50"
              >
                {mn.add} ({selectedItems.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
