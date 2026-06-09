'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { MenuItem, MenuCategory, Recipe, RecipeIngredient } from '@/lib/supabase';
import { PermissionGate, CanEditMenu } from '@/components/backoffice/auth/PermissionGate';
import { usePermissions } from '@/lib/auth/hooks';
import {
  Plus, Pencil, Trash2, X, UtensilsCrossed, Search, Image, Images,
  LayoutGrid, List, Star, Eye, EyeOff, Filter,
  Upload, Loader2, BookOpen, ChevronDown, ChevronUp, Flame, ArrowLeft, Check
} from 'lucide-react';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';
import { RowMenu } from '@/components/backoffice/shared/RowMenu';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface MenuItemForm {
  name: string;
  name_fr: string;
  price: string;
  description: string;
  description_en: string;
  category_id: string;
  extra_category_ids: string[];
  is_signature: boolean;
  is_featured: boolean;
  is_available: boolean;
  chef_note: string;
  image_url: string;
  recipe_id: string;
  recipe_mode: 'none' | 'existing' | 'new';
  new_recipe_name: string;
  new_recipe_portions: string;
  new_recipe_ingredients: {
    ingredient_name: string;
    unit: string;
    quantity: string;
    unit_cost: string;
  }[];
}

interface RecipeWithIngredients extends Recipe {
  ingredients?: RecipeIngredient[];
}

const emptyForm: MenuItemForm = {
  name: '', name_fr: '', price: '',
  description: '', description_en: '', category_id: '', extra_category_ids: [],
  is_signature: false, is_featured: false, is_available: true, chef_note: '', image_url: '',
  recipe_id: '', recipe_mode: 'none', new_recipe_name: '', new_recipe_portions: '1',
  new_recipe_ingredients: []
};

export default function MenuPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');
  const [filterSignature, setFilterSignature] = useState(false);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showRecipeSection, setShowRecipeSection] = useState(false);
  const [showRecipeMatch, setShowRecipeMatch] = useState(false);
  const [recipeMatchSaving, setRecipeMatchSaving] = useState(false);
  const [recipeMatchSuccess, setRecipeMatchSuccess] = useState<string | null>(null);
  const [recipeMatchSkipped, setRecipeMatchSkipped] = useState<Set<string>>(new Set());
  const [recipeMatchCount, setRecipeMatchCount] = useState(0);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');

  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('menu.write');
  const { t } = useTranslation();
  const mp = t.backoffice.menuPage;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemsRes, recipesRes] = await Promise.all([
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*').order('created_at', { ascending: false }),
        supabase.from('recipes').select('*, ingredients:recipe_ingredients(*)').order('name')
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (recipesRes.data) setRecipes(recipesRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, name_fr: item.name_fr,
        price: item.price?.toString() || '',
        description: item.description || '',
        description_en: item.description_en || '', category_id: item.category_id || '',
        extra_category_ids: Array.isArray((item as MenuItem & { extra_category_ids?: string[] }).extra_category_ids) ? (item as MenuItem & { extra_category_ids?: string[] }).extra_category_ids! : [],
        is_signature: item.is_signature || false, is_featured: item.is_featured || false, is_available: item.is_available !== false,
        chef_note: item.chef_note || '', image_url: item.image_url || '',
        recipe_id: item.recipe_id || '',
        recipe_mode: item.recipe_id ? 'existing' : 'none',
        new_recipe_name: '', new_recipe_portions: '1', new_recipe_ingredients: []
      });
      setShowRecipeSection(!!item.recipe_id);
    } else {
      setEditingItem(null);
      setFormData({ ...emptyForm, category_id: selectedCategory || '' });
      setShowRecipeSection(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
    setShowRecipeSection(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const { uploadFile } = await import('@/lib/client-upload');
      const result = await uploadFile(file, 'menu-images');
      setFormData(prev => ({ ...prev, image_url: result.url }));
    } catch (err) {
      console.error('Image upload error:', err);
      alert(err instanceof Error ? err.message : mp.failedUpload);
    }
    setUploadingImage(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeImage = async () => {
    const currentUrl = formData.image_url;
    setFormData(prev => ({ ...prev, image_url: '' }));
    // Also delete from storage if it's a Supabase storage URL
    if (currentUrl && currentUrl.includes('supabase.co/storage')) {
      try {
        const path = currentUrl.split('/menu-images/').pop();
        if (path) {
          await fetch(`/api/upload?path=${encodeURIComponent(path)}&bucket=menu-images`, { method: 'DELETE' });
        }
      } catch (err) {
        console.error('Failed to delete image from storage:', err);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name_fr || !formData.price) {
      alert(mp.fillRequired);
      return;
    }
    setSaving(true);
    try {
      let recipeId: string | null = null;

      // Handle recipe creation if mode is 'new'
      if (formData.recipe_mode === 'new' && formData.new_recipe_name) {
        const validIngredients = formData.new_recipe_ingredients.filter(
          ing => ing.ingredient_name && (parseFloat(ing.quantity) > 0 || parseFloat(ing.unit_cost) > 0)
        );

        const totalCost = validIngredients.reduce((sum, ing) => {
          return sum + (parseFloat(ing.quantity) || 0) * (parseFloat(ing.unit_cost) || 0);
        }, 0);

        // Create recipe via API
        const recipeRes = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'import',
            name: formData.new_recipe_name,
            name_fr: formData.new_recipe_name,
            category: categories.find(c => c.id === formData.category_id)?.name || 'general',
            portions: parseInt(formData.new_recipe_portions) || 1,
            cost_price: totalCost,
            ingredients: validIngredients.map(ing => ({
              ingredient_name: ing.ingredient_name,
              unit: ing.unit || 'kg',
              quantity: parseFloat(ing.quantity) || 0,
              unit_cost: parseFloat(ing.unit_cost) || 0
            }))
          })
        });

        if (!recipeRes.ok) throw new Error('Failed to create recipe');
        const { recipe: newRecipe } = await recipeRes.json();
        recipeId = newRecipe.id;

        // Reload recipes to include the new one
        const { data: updatedRecipes } = await supabase
          .from('recipes')
          .select('*, ingredients:recipe_ingredients(*)')
          .order('name');
        if (updatedRecipes) setRecipes(updatedRecipes);
      } else if (formData.recipe_mode === 'existing' && formData.recipe_id) {
        recipeId = formData.recipe_id;
      }

      const extraIds = (formData.extra_category_ids || []).filter(id => id && id !== formData.category_id);
      const itemData = {
        name: formData.name, name_fr: formData.name_fr,
        price: parseFloat(formData.price),
        description: formData.description || null, description_en: formData.description_en || null,
        category_id: formData.category_id || null,
        extra_category_ids: extraIds,
        is_signature: formData.is_signature,
        is_featured: formData.is_featured, is_available: formData.is_available, chef_note: formData.chef_note || null,
        image_url: formData.image_url || null,
        recipe_id: recipeId,
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
    } catch (err: unknown) {
      console.error('Save error:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : mp.saving;
      alert(message);
    }
    setSaving(false);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm(mp.deleteItemConfirm)) return;
    setDeleting(itemId);
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Delete error:', err);
      alert(mp.errorDeleting);
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
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesAvailable = filterAvailable === 'all' || (filterAvailable === 'available' && item.is_available) || (filterAvailable === 'unavailable' && !item.is_available);
    const matchesSignature = !filterSignature || item.is_signature;
    return matchesSearch && matchesCategory && matchesAvailable && matchesSignature;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedItems = [...filteredItems].sort((a, b) =>
    sortField ? sortCompare(a, b, sortField, sortDir) : 0
  );

  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(i => i.is_available).length;
  const signatureItems = menuItems.filter(i => i.is_signature).length;
  const featuredItems = menuItems.filter(i => i.is_featured).length;
  const itemsWithImages = menuItems.filter(i => i.image_url).length;

  const getCategoryName = (id: string | null) => id ? categories.find(c => c.id === id)?.name_fr || 'Unknown' : 'Uncategorized';
  const getCategoryIcon = (id: string | null) => id ? categories.find(c => c.id === id)?.icon || '🍽️' : '📦';

  const getRecipeForItem = (item: MenuItem) => recipes.find(r => r.id === item.recipe_id);

  const addIngredientRow = () => {
    setFormData(prev => ({
      ...prev,
      new_recipe_ingredients: [
        ...prev.new_recipe_ingredients,
        { ingredient_name: '', unit: 'kg', quantity: '', unit_cost: '' }
      ]
    }));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      new_recipe_ingredients: prev.new_recipe_ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      new_recipe_ingredients: prev.new_recipe_ingredients.filter((_, i) => i !== index)
    }));
  };

  const calculateNewRecipeCost = () => {
    return formData.new_recipe_ingredients.reduce((sum, ing) => {
      return sum + (parseFloat(ing.quantity) || 0) * (parseFloat(ing.unit_cost) || 0);
    }, 0);
  };

  const loadRecipeForView = async (item: MenuItem) => {
    if (item.recipe_id) {
      const recipe = recipes.find(r => r.id === item.recipe_id);
      setViewingRecipe(recipe || null);
    } else {
      setViewingRecipe(null);
    }
  };

  // Recipe matching — random dish one at a time
  const unlinkedItems = menuItems.filter(i => !i.recipe_id && !recipeMatchSkipped.has(i.id));
  const totalUnlinked = menuItems.filter(i => !i.recipe_id).length;

  // Pick a random dish from unlinked (stable until state changes)
  const currentMatchDish = unlinkedItems.length > 0
    ? unlinkedItems[Math.floor(Math.random() * unlinkedItems.length)]
    : null;
  // Store it in a ref-like pattern via state to keep it stable
  const [stableMatchDish, setStableMatchDish] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (showRecipeMatch && !recipeMatchSuccess) {
      if (unlinkedItems.length > 0) {
        setStableMatchDish(unlinkedItems[Math.floor(Math.random() * unlinkedItems.length)]);
      } else {
        setStableMatchDish(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecipeMatch, recipeMatchSuccess, totalUnlinked, recipeMatchSkipped.size]);

  const skipDish = () => {
    if (stableMatchDish) {
      setRecipeMatchSkipped(prev => new Set(prev).add(stableMatchDish.id));
    }
  };

  const assignRecipe = async (recipeId: string) => {
    if (!stableMatchDish || recipeMatchSaving) return;
    setRecipeMatchSaving(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ recipe_id: recipeId, updated_at: new Date().toISOString() })
        .eq('id', stableMatchDish.id);
      if (error) throw error;

      const recipeName = recipes.find(r => r.id === recipeId)?.name || '';
      setMenuItems(prev => prev.map(i => i.id === stableMatchDish.id ? { ...i, recipe_id: recipeId } : i));
      setRecipeMatchSaving(false);
      setRecipeMatchCount(c => c + 1);
      setRecipeMatchSuccess(`${stableMatchDish.name_fr} → ${recipeName}`);

      setTimeout(() => {
        setRecipeMatchSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Recipe assign error:', err);
      setRecipeMatchSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PermissionGate permission="menu.read" fallback={<div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">{mp.noPermission}</p></div>}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{mp.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{mp.subtitle}</p>
          </div>
          <CanEditMenu>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowRecipeMatch(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium hover:bg-card transition-colors">
                <BookOpen className="w-4 h-4" />{mp.matchRecipes}
              </button>
              <Link href="/admin/menu/match-images" className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-medium hover:bg-card transition-colors">
                <Images className="w-4 h-4" />{mp.matchImages}
              </Link>
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium">
                <Plus className="w-4 h-4" />{mp.addItem}
              </button>
            </div>
          </CanEditMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: mp.totalItems, value: totalItems, colorClass: 'text-[#606338]' },
            { label: mp.available, value: availableItems, colorClass: 'text-green-500' },
            { label: mp.signatureDish, value: signatureItems, colorClass: 'text-yellow-500' },
            { label: mp.featured, value: featuredItems, colorClass: 'text-orange-500' },
            { label: mp.withImages, value: itemsWithImages, colorClass: 'text-blue-500' }
          ].map(stat => (
            <div key={stat.label} className="bg-secondary border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.colorClass} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${!selectedCategory ? 'bg-[#606338] border-[#606338] text-white' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
            {mp.all} ({menuItems.length})
          </button>
          {categories.map(cat => {
            const count = menuItems.filter(i => i.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${isSelected ? 'bg-[#606338] border-[#606338] text-white' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                <span>{cat.icon}</span>{cat.name_fr} ({count})
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={mp.searchItems} className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm border ${showFilters ? 'bg-[#606338]/15 border-[#606338] text-[#606338]' : 'bg-secondary border-border text-muted-foreground'}`}>
            <Filter className="w-4 h-4" />{mp.filters}
          </button>
          <div className="flex bg-secondary border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 border-none cursor-pointer ${viewMode === 'grid' ? 'bg-card text-[#606338]' : 'bg-transparent text-muted-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 border-none cursor-pointer ${viewMode === 'list' ? 'bg-card text-[#606338]' : 'bg-transparent text-muted-foreground'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex gap-4 p-4 bg-secondary border border-border rounded-lg flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">{mp.availability}</label>
              <select value={filterAvailable} onChange={(e) => setFilterAvailable(e.target.value as 'all' | 'available' | 'unavailable')} className="py-2 px-3 bg-card border border-border rounded-md text-foreground text-[13px]">
                <option value="all">{mp.all}</option>
                <option value="available">{mp.availableOnly}</option>
                <option value="unavailable">{mp.unavailableOnly}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-5">
              <input type="checkbox" checked={filterSignature} onChange={(e) => setFilterSignature(e.target.checked)} className="w-4 h-4 accent-[#606338]" />
              <span className="text-[13px] text-foreground">{mp.signatureOnly}</span>
            </label>
          </div>
        )}

        {/* Results Count */}
        <p className="text-[13px] text-muted-foreground">{mp.showingOf.replace('{count}', String(filteredItems.length)).replace('{total}', String(menuItems.length))}</p>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedItems.map(item => (
              <div key={item.id} onClick={() => { setViewingItem(item); loadRecipeForView(item); }} className={`bg-secondary border border-border rounded-xl overflow-hidden transition-all hover:border-[#606338]/30 cursor-pointer flex flex-col ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="h-40 shrink-0 bg-card relative flex items-center justify-center overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" /> : <Image className="w-8 h-8 text-muted" />}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    {item.is_signature && <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/90 rounded-md text-[11px] font-semibold text-black"><Star className="w-3 h-3" />{mp.signatureDish}</span>}
                    {item.is_featured && <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/90 rounded-md text-[11px] font-semibold text-white"><Flame className="w-3 h-3" />{mp.featured}</span>}
                    {!item.is_available && <span className="px-2 py-1 bg-red-500/90 rounded-md text-[11px] font-semibold text-white">{mp.unavailable}</span>}
                    {item.recipe_id && <span className="flex items-center gap-1 px-2 py-1 bg-[#606338]/90 rounded-md text-[11px] font-semibold text-white"><BookOpen className="w-3 h-3" /></span>}
                  </div>
                  {canEdit && (
                    <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
                      <RowMenu width={160} buttonClassName="p-1.5 bg-black/60 border-none rounded-md cursor-pointer text-white">
                        {(close) => (
                          <>
                            <button onClick={() => { handleOpenModal(item); close(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary"><Pencil className="w-3.5 h-3.5" />{mp.edit}</button>
                            <button onClick={() => { toggleAvailability(item); close(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary">{item.is_available ? <><EyeOff className="w-3.5 h-3.5" />{mp.markUnavailable}</> : <><Eye className="w-3.5 h-3.5" />{mp.markAvailable}</>}</button>
                            <button onClick={() => { handleDelete(item.id); close(); }} disabled={deleting === item.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-red-500 text-[13px] cursor-pointer text-left hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" />{deleting === item.id ? mp.deleting : mp.delete}</button>
                          </>
                        )}
                      </RowMenu>
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-foreground truncate">{item.name_fr}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.name}</p>
                    </div>
                    <span className="text-base font-bold text-[#606338] whitespace-nowrap">{item.price} DH</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="text-sm">{getCategoryIcon(item.category_id)}</span>
                    <span className="text-xs text-muted-foreground">{getCategoryName(item.category_id)}</span>
                  </div>
                  {item.description && <p className="text-xs text-muted mt-2.5 line-clamp-2">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px] gap-4 px-4 py-3 border-b border-border bg-card">
              <SortHeader label={mp.itemLabel} field="name_fr" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
              <SortHeader label={mp.categoryLabel} field="category_id" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
              <SortHeader label={mp.statusLabel} field="is_available" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
              <SortHeader label={mp.priceLabel} field="price" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="right" className="text-xs font-semibold text-muted uppercase" />
            </div>
            {sortedItems.map((item, index) => (
              <div key={item.id} onClick={() => { setViewingItem(item); loadRecipeForView(item); }} className={`grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px] gap-4 px-4 py-3 items-center cursor-pointer hover:bg-card transition-colors ${index > 0 ? 'border-t border-border' : ''} ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-card overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <Image className="w-4 h-4 text-muted" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{item.name_fr}</span>
                      {item.is_signature && <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      {item.is_featured && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                      {item.recipe_id && <BookOpen className="w-3.5 h-3.5 text-[#606338] shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getCategoryIcon(item.category_id)}</span>
                  <span className="text-xs text-muted-foreground">{getCategoryName(item.category_id)}</span>
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${item.is_available ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
                    {item.is_available ? mp.available : mp.unavailable}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-sm font-semibold text-[#606338]">{item.price} DH</span>
                  {canEdit && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <RowMenu width={160}>
                        {(close) => (
                          <>
                            <button onClick={() => { handleOpenModal(item); close(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary"><Pencil className="w-3.5 h-3.5" />{mp.edit}</button>
                            <button onClick={() => { toggleAvailability(item); close(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary">{item.is_available ? <><EyeOff className="w-3.5 h-3.5" />{mp.markUnavailable}</> : <><Eye className="w-3.5 h-3.5" />{mp.markAvailable}</>}</button>
                            <button onClick={() => { handleDelete(item.id); close(); }} disabled={deleting === item.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-red-500 text-[13px] cursor-pointer text-left hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" />{deleting === item.id ? mp.deleting : mp.delete}</button>
                          </>
                        )}
                      </RowMenu>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <div className="py-12 px-6 text-center"><p className="text-muted-foreground">{mp.noItemsFound}</p></div>}
          </div>
        )}

        {/* Empty State */}
        {menuItems.length === 0 && (
          <div className="bg-secondary border border-border rounded-xl py-16 px-6 flex flex-col items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 text-muted mb-4" />
            <p className="text-muted-foreground">{mp.noMenuItems}</p>
            <CanEditMenu><button onClick={() => handleOpenModal()} className="mt-4 px-5 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium cursor-pointer">{mp.addFirstItem}</button></CanEditMenu>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-secondary z-10">
              <h2 className="text-lg font-semibold text-foreground">{editingItem ? mp.editItem : mp.addItem}</h2>
              <button onClick={handleCloseModal} className="p-2 bg-transparent border-none rounded-md cursor-pointer text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Image Upload */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.dishImage}</label>
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/90 border-none rounded-md cursor-pointer text-white text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {mp.remove}
                      </button>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <input
                        id="image-change-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('image-change-input')?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 border-none rounded-md cursor-pointer text-white text-xs font-medium hover:bg-black/90 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {mp.changeImage}
                      </button>
                    </div>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                      dragActive
                        ? 'border-[#606338] bg-[#606338]/5'
                        : 'border-border hover:border-[#606338]/50 hover:bg-secondary'
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-8 h-8 text-[#606338] animate-spin" />
                        <p className="text-sm text-muted-foreground">{mp.uploading}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted" />
                        <div className="text-center">
                          <p className="text-sm text-foreground">
                            {mp.dragDrop}{' '}
                            <span className="text-[#606338]">{mp.browse}</span>
                          </p>
                          <p className="text-xs text-muted mt-1">{mp.imageFormats}</p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mp.nameFr}</label>
                  <input type="text" value={formData.name_fr} onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50" placeholder={mp.nameFrPlaceholder} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{mp.nameEn}</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50" placeholder={mp.nameEnPlaceholder} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.categoryLabel}</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50">
                  <option value="">{mp.selectCategory}</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name_fr}</option>)}
                </select>
              </div>

              {/* Extra categories — item also appears in these */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Catégories supplémentaires <span className="text-muted">(l&apos;article apparaîtra aussi dans ces catégories)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-card border border-border rounded-lg max-h-32 overflow-y-auto">
                  {categories.filter(c => c.id !== formData.category_id).map(cat => {
                    const checked = formData.extra_category_ids.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          extra_category_ids: checked
                            ? prev.extra_category_ids.filter(id => id !== cat.id)
                            : [...prev.extra_category_ids, cat.id],
                        }))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          checked
                            ? 'bg-[#606338]/15 border-[#606338] text-[#606338]'
                            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{cat.icon}</span>{cat.name_fr}
                      </button>
                    );
                  })}
                  {categories.filter(c => c.id !== formData.category_id).length === 0 && (
                    <span className="text-xs text-muted">Aucune autre catégorie disponible</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.priceDH}</label>
                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50" placeholder="0" />
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.descFr}</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none resize-y focus:border-[#606338]/50" placeholder={mp.descFrPlaceholder} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.descEn}</label>
                <textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={2} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none resize-y focus:border-[#606338]/50" placeholder={mp.descEnPlaceholder} />
              </div>

              {/* Chef Note */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{mp.chefNote}</label>
                <input type="text" value={formData.chef_note} onChange={(e) => setFormData({ ...formData, chef_note: e.target.value })} className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50" placeholder={mp.chefNotePlaceholder} />
              </div>

              {/* Recipe Section */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRecipeSection(!showRecipeSection)}
                  className="w-full flex items-center justify-between p-3 bg-card hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#606338]" />
                    <span className="text-sm font-medium text-foreground">{mp.ficheTechnique}</span>
                    {formData.recipe_mode === 'existing' && formData.recipe_id && (
                      <span className="px-2 py-0.5 bg-[#606338]/10 text-[#606338] text-xs rounded-full">
                        {recipes.find(r => r.id === formData.recipe_id)?.name}
                      </span>
                    )}
                    {formData.recipe_mode === 'new' && formData.new_recipe_name && (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full">{mp.newRecipe}</span>
                    )}
                  </div>
                  {showRecipeSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showRecipeSection && (
                  <div className="p-3 border-t border-border space-y-4">
                    {/* Recipe Mode Selection */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, recipe_mode: 'none', recipe_id: '', new_recipe_name: '', new_recipe_ingredients: [] }))}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          formData.recipe_mode === 'none'
                            ? 'bg-[#606338] border-[#606338] text-white'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {mp.noRecipe}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, recipe_mode: 'existing', new_recipe_name: '', new_recipe_ingredients: [] }))}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          formData.recipe_mode === 'existing'
                            ? 'bg-[#606338] border-[#606338] text-white'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {mp.selectExisting}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            recipe_mode: 'new',
                            recipe_id: '',
                            new_recipe_name: prev.name_fr || prev.name,
                            new_recipe_ingredients: prev.new_recipe_ingredients.length ? prev.new_recipe_ingredients : [{ ingredient_name: '', unit: 'kg', quantity: '', unit_cost: '' }]
                          }));
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          formData.recipe_mode === 'new'
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {mp.createNew}
                      </button>
                    </div>

                    {/* Existing Recipe Selection */}
                    {formData.recipe_mode === 'existing' && (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">{mp.selectRecipe}</label>
                        <select
                          value={formData.recipe_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, recipe_id: e.target.value }))}
                          className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                        >
                          <option value="">{mp.chooseRecipe}</option>
                          {recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name} - {recipe.cost_price?.toFixed(2)} DH ({recipe.ingredients?.length || 0} ingredients)
                            </option>
                          ))}
                        </select>
                        {formData.recipe_id && (
                          <div className="mt-2 p-2 bg-secondary rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              {mp.cost}: <span className="text-foreground font-medium">{recipes.find(r => r.id === formData.recipe_id)?.cost_price?.toFixed(2)} DH</span>
                              {' · '}
                              {mp.portions}: <span className="text-foreground font-medium">{recipes.find(r => r.id === formData.recipe_id)?.portions}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* New Recipe Form */}
                    {formData.recipe_mode === 'new' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1.5">{mp.recipeName}</label>
                            <input
                              type="text"
                              value={formData.new_recipe_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, new_recipe_name: e.target.value }))}
                              className="w-full py-2 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                              placeholder={mp.recipeNamePlaceholder}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1.5">{mp.portions}</label>
                            <input
                              type="number"
                              value={formData.new_recipe_portions}
                              onChange={(e) => setFormData(prev => ({ ...prev, new_recipe_portions: e.target.value }))}
                              className="w-full py-2 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                              min="1"
                            />
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-muted-foreground">{mp.ingredients}</label>
                            <button
                              type="button"
                              onClick={addIngredientRow}
                              className="flex items-center gap-1 text-xs text-[#606338] hover:text-[#4d4f2e]"
                            >
                              <Plus className="w-3 h-3" /> {mp.add}
                            </button>
                          </div>

                          {formData.new_recipe_ingredients.length === 0 ? (
                            <button
                              type="button"
                              onClick={addIngredientRow}
                              className="w-full py-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm hover:border-[#606338]/50 hover:text-foreground transition-colors"
                            >
                              {mp.addFirstIngredient}
                            </button>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {formData.new_recipe_ingredients.map((ing, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                  <input
                                    type="text"
                                    value={ing.ingredient_name}
                                    onChange={(e) => updateIngredient(idx, 'ingredient_name', e.target.value)}
                                    placeholder={mp.ingredient}
                                    className="flex-1 py-1.5 px-2 bg-card border border-border rounded text-foreground text-xs outline-none focus:border-[#606338]/50"
                                  />
                                  <input
                                    type="number"
                                    value={ing.quantity}
                                    onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                                    placeholder={mp.qty}
                                    className="w-16 py-1.5 px-2 bg-card border border-border rounded text-foreground text-xs outline-none focus:border-[#606338]/50"
                                    step="0.001"
                                  />
                                  <select
                                    value={ing.unit}
                                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                                    className="w-16 py-1.5 px-1 bg-card border border-border rounded text-foreground text-xs outline-none"
                                  >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="L">L</option>
                                    <option value="ml">ml</option>
                                    <option value="pc">pc</option>
                                  </select>
                                  <input
                                    type="number"
                                    value={ing.unit_cost}
                                    onChange={(e) => updateIngredient(idx, 'unit_cost', e.target.value)}
                                    placeholder={mp.costUnit}
                                    className="w-20 py-1.5 px-2 bg-card border border-border rounded text-foreground text-xs outline-none focus:border-[#606338]/50"
                                    step="0.01"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeIngredient(idx)}
                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {formData.new_recipe_ingredients.length > 0 && (
                            <div className="mt-2 p-2 bg-[#606338]/10 rounded-lg flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{mp.totalRecipeCost}</span>
                              <span className="text-sm font-semibold text-[#606338]">{calculateNewRecipeCost().toFixed(2)} DH</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_signature} onChange={(e) => setFormData({ ...formData, is_signature: e.target.checked })} className="w-4 h-4 accent-[#606338]" />
                    <span className="text-sm text-foreground">{mp.signatureLabel}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} className="w-4 h-4 accent-[#606338]" />
                    <span className="text-sm text-foreground">{mp.availableLabel}</span>
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                  <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="w-4 h-4 accent-orange-500" />
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-foreground">{mp.showOnLanding}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-secondary">
              <button onClick={handleCloseModal} className="px-5 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm cursor-pointer hover:bg-card">{mp.cancel}</button>
              <button onClick={handleSave} disabled={saving || uploadingImage} className="px-5 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] border-none rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-70">
                {saving ? mp.saving : (editingItem ? mp.saveChanges : mp.addItem)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6" onClick={() => { setViewingItem(null); setViewingRecipe(null); }}>
          <div className="bg-background border border-border rounded-3xl w-full max-w-[520px] max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Image Header */}
            <div className="relative h-56 md:h-72 bg-card overflow-hidden group/image">
              {viewingItem.image_url ? (
                <div
                  className="w-full h-full cursor-zoom-in"
                  onClick={(e) => { e.stopPropagation(); setFullscreenImage(viewingItem.image_url); }}
                >
                  <img
                    src={viewingItem.image_url}
                    alt={viewingItem.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/image:scale-110"
                  />
                  {/* Zoom hint */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      Click to expand
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-secondary">
                  <div className="w-20 h-20 rounded-full bg-secondary/80 flex items-center justify-center">
                    <Image className="w-10 h-10 text-muted" />
                  </div>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Close button */}
              <button
                onClick={() => { setViewingItem(null); setViewingRecipe(null); }}
                className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full cursor-pointer text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {viewingItem.is_signature && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 rounded-full text-xs font-bold text-black shadow-lg">
                    <Star className="w-3.5 h-3.5 fill-current" /> {mp.signatureDish}
                  </span>
                )}
                {viewingItem.is_featured && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 rounded-full text-xs font-bold text-white shadow-lg">
                    <Flame className="w-3.5 h-3.5" /> {mp.featured}
                  </span>
                )}
              </div>

              {/* Price tag - positioned at bottom of image */}
              <div className="absolute bottom-4 right-4">
                <div className="px-4 py-2 bg-[#606338] rounded-xl shadow-lg">
                  <p className="text-2xl font-bold text-white">{viewingItem.price} <span className="text-base font-medium">DH</span></p>
                </div>
              </div>

              {/* Status badge */}
              <div className="absolute bottom-4 left-4">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${viewingItem.is_available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  <span className={`w-2 h-2 rounded-full ${viewingItem.is_available ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
                  {viewingItem.is_available ? mp.available : mp.unavailable}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6 overflow-y-auto max-h-[calc(90vh-20rem)]">
              {/* Title */}
              <div className="mb-5">
                <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{viewingItem.name_fr}</h2>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">{viewingItem.name}</p>
              </div>

              {/* Category pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full mb-5">
                <span className="text-lg">{getCategoryIcon(viewingItem.category_id)}</span>
                <span className="text-sm font-medium text-foreground">{getCategoryName(viewingItem.category_id)}</span>
              </div>

              {/* Descriptions */}
              {(viewingItem.description || viewingItem.description_en) && (
                <div className="space-y-4 mb-5">
                  {viewingItem.description && (
                    <div className="p-4 bg-secondary/50 rounded-xl">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{mp.descriptionLabel}</p>
                      <p className="text-foreground text-sm leading-relaxed">{viewingItem.description}</p>
                    </div>
                  )}
                  {viewingItem.description_en && (
                    <div className="p-4 bg-secondary/50 rounded-xl">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{mp.descriptionEn}</p>
                      <p className="text-foreground text-sm leading-relaxed">{viewingItem.description_en}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chef Note */}
              {viewingItem.chef_note && (
                <div className="mb-5 p-4 bg-gradient-to-br from-[#606338]/10 to-[#606338]/5 border border-[#606338]/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👨‍🍳</span>
                    <p className="text-sm font-semibold text-[#606338]">{mp.chefsNote}</p>
                  </div>
                  <p className="text-foreground text-sm italic leading-relaxed">&ldquo;{viewingItem.chef_note}&rdquo;</p>
                </div>
              )}

              {/* Recipe / Fiche Technique */}
              {viewingRecipe && (
                <div className="mb-5 p-4 bg-secondary/80 border border-border rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#606338]" />
                      <p className="text-sm font-semibold text-foreground">{mp.ficheTechnique}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {mp.cost}: <span className="font-medium text-[#606338]">{viewingRecipe.cost_price?.toFixed(2)} DH</span>
                      </span>
                      <span className="text-muted-foreground">
                        {mp.portions}: <span className="font-medium text-foreground">{viewingRecipe.portions}</span>
                      </span>
                    </div>
                  </div>

                  {viewingRecipe.ingredients && viewingRecipe.ingredients.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground mb-2">{mp.ingredients} ({viewingRecipe.ingredients.length})</p>
                      <div className="max-h-[150px] overflow-y-auto space-y-1">
                        {viewingRecipe.ingredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 px-2 bg-card/50 rounded text-xs">
                            <span className="text-foreground">{ing.ingredient_name}</span>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>{ing.quantity} {ing.unit}</span>
                              <span className="text-[#606338]">{ing.total_cost?.toFixed(2)} DH</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">{mp.totalCost}</span>
                        <span className="text-sm font-semibold text-[#606338]">{viewingRecipe.cost_price?.toFixed(2)} DH</span>
                      </div>
                      {viewingItem.price > 0 && (
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs text-muted-foreground">{mp.margin}</span>
                          <span className="text-sm font-medium text-green-600">
                            {(viewingItem.price - (viewingRecipe.cost_price || 0)).toFixed(2)} DH
                            ({(((viewingItem.price - (viewingRecipe.cost_price || 0)) / viewingItem.price) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!viewingRecipe && viewingItem.recipe_id === null && (
                <div className="mb-5 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-700">{mp.noRecipeAssigned}</p>
                  </div>
                </div>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                  {mp.added} {new Date(viewingItem.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                  {mp.updated} {new Date(viewingItem.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="flex gap-2 p-4 border-t border-border bg-secondary/50">
                <button
                  onClick={() => { setViewingItem(null); setViewingRecipe(null); handleOpenModal(viewingItem); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-[#606338] to-[#4d4f2e] border-none rounded-xl text-white text-sm font-semibold cursor-pointer hover:from-[#7A7B4E] hover:to-[#606338] transition-all shadow-lg shadow-[#606338]/20"
                >
                  <Pencil className="w-4 h-4" /> {mp.editItemBtn}
                </button>
                <button
                  onClick={() => toggleAvailability(viewingItem)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-foreground text-sm font-medium cursor-pointer hover:bg-secondary transition-colors"
                >
                  {viewingItem.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { handleDelete(viewingItem.id); setViewingItem(null); setViewingRecipe(null); }}
                  disabled={deleting === viewingItem.id}
                  className="flex items-center justify-center px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Recipe Match Modal */}
      {showRecipeMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowRecipeMatch(false); setRecipeMatchSuccess(null); setRecipeMatchSkipped(new Set()); setRecipeMatchCount(0); setRecipeSearchQuery(''); }}>
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{mp.matchRecipesTitle}</h2>
                <p className="text-xs text-muted-foreground">
                  {totalUnlinked} {mp.dishesWithoutRecipe}{recipeMatchCount > 0 && <> &middot; {recipeMatchCount} matched</>}{recipeMatchSkipped.size > 0 && <> &middot; {recipeMatchSkipped.size} skipped</>}
                </p>
              </div>
              <button onClick={() => { setShowRecipeMatch(false); setRecipeMatchSuccess(null); setRecipeMatchSkipped(new Set()); setRecipeMatchCount(0); setRecipeSearchQuery(''); }} className="p-2 bg-transparent border-none rounded-md cursor-pointer text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Progress */}
            {menuItems.length > 0 && (
              <div className="h-1.5 bg-card">
                <div className="h-full bg-[#606338] transition-all duration-500" style={{ width: `${((menuItems.length - totalUnlinked) / menuItems.length) * 100}%` }} />
              </div>
            )}

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Success toast */}
              {recipeMatchSuccess && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-sm text-green-600 font-medium">{recipeMatchSuccess}</p>
                </div>
              )}

              {!stableMatchDish || totalUnlinked === 0 ? (
                /* All done */
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-foreground font-medium">
                    {totalUnlinked === 0 ? mp.allHaveRecipes : mp.allSkipped}
                  </p>
                  {recipeMatchCount > 0 && <p className="text-sm text-muted-foreground">{recipeMatchCount} {mp.matchedThisSession}</p>}
                  {recipeMatchSkipped.size > 0 && totalUnlinked > 0 && (
                    <button onClick={() => setRecipeMatchSkipped(new Set())} className="mt-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-card transition-colors">
                      {mp.showSkippedAgain}
                    </button>
                  )}
                </div>
              ) : (
                /* Current dish + recipe list */
                <>
                  {/* Dish card with image or placeholder */}
                  <div className="mb-4 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-44 overflow-hidden">
                      {stableMatchDish.image_url ? (
                        <img src={stableMatchDish.image_url} alt={stableMatchDish.name_fr} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-card to-secondary flex flex-col items-center justify-center gap-2">
                          <Image className="w-10 h-10 text-muted" />
                          <p className="text-xs text-muted-foreground">{mp.noImage}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{stableMatchDish.name_fr}</p>
                          <p className="text-sm text-muted-foreground">{stableMatchDish.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getCategoryIcon(stableMatchDish.category_id)} {getCategoryName(stableMatchDish.category_id)} &middot; {stableMatchDish.price} DH
                          </p>
                        </div>
                        <button
                          onClick={skipDish}
                          className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                        >
                          {mp.skipBtn}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Saving */}
                  {recipeMatchSaving && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-[#606338] animate-spin" />
                      <p className="text-sm text-muted-foreground">{mp.saving}</p>
                    </div>
                  )}

                  {/* Recipe search */}
                  <p className="text-xs text-muted-foreground mb-2">{mp.selectFiche}</p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={recipeSearchQuery}
                      onChange={e => setRecipeSearchQuery(e.target.value)}
                      placeholder={mp.searchRecipes}
                      className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#606338]"
                    />
                  </div>

                  {/* Recipe list */}
                  <div className="grid gap-2">
                    {recipes
                      .filter(r => {
                        if (!recipeSearchQuery) return true;
                        const q = recipeSearchQuery.toLowerCase();
                        return r.name.toLowerCase().includes(q) || (r.name_fr && r.name_fr.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q));
                      })
                      .map(recipe => (
                      <button
                        key={recipe.id}
                        disabled={recipeMatchSaving}
                        onClick={() => { assignRecipe(recipe.id); setRecipeSearchQuery(''); }}
                        className="flex items-center justify-between gap-3 px-3 py-3 bg-card border border-border rounded-lg text-left hover:bg-[#606338]/10 hover:border-[#606338]/30 transition-all disabled:opacity-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{recipe.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {recipe.category} &middot; {recipe.ingredients?.length || 0} ingredients &middot; {recipe.portions} portions
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#606338] shrink-0">{recipe.cost_price?.toFixed(2)} DH</span>
                      </button>
                    ))}
                    {recipes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">{mp.noRecipesAvailable}</p>
                    )}
                    {recipes.length > 0 && recipes.filter(r => {
                      if (!recipeSearchQuery) return true;
                      const q = recipeSearchQuery.toLowerCase();
                      return r.name.toLowerCase().includes(q) || (r.name_fr && r.name_fr.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q));
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{mp.noRecipesMatch}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-4 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full cursor-pointer text-white hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image */}
          <img
            src={fullscreenImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </PermissionGate>
  );
}
