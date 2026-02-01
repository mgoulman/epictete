'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/lib/auth/hooks';
import {
  BookOpen, Plus, Search, Edit2, Trash2, X,
  Package, DollarSign, Link2, Unlink, Eye, ChefHat,
  Clock, Timer, Gauge
} from 'lucide-react';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';

interface Recipe {
  id: string;
  name: string;
  name_fr: string | null;
  category: string | null;
  portions: number;
  cost_price: number;
  selling_price: number | null;
  preparation_time: number | null;
  cooking_time: number | null;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  instructions: string | null;
  notes: string | null;
  ingredient_count: number;
  created_at: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  inventory_item?: {
    id: string;
    name: string;
    unit: string;
    cost_per_unit: number;
  };
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface RecipeDetail extends Omit<Recipe, 'ingredient_count'> {
  ingredients: RecipeIngredient[];
}

export default function RecipesPage() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('menu.write');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Modal states
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);

  // Ingredient modal
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredient | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Form states
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    name_fr: '',
    category: '',
    portions: 1,
    selling_price: '',
    preparation_time: '',
    cooking_time: '',
    difficulty: '' as '' | 'facile' | 'moyen' | 'difficile',
    instructions: '',
    notes: ''
  });

  const [newIngredient, setNewIngredient] = useState({
    ingredient_name: '',
    inventory_item_id: '',
    quantity: 0,
    unit: 'kg',
    unit_cost: 0
  });

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes?type=list');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      console.error('Fetch recipes error:', err);
    }
    setLoading(false);
  }, []);

  const fetchRecipeDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRecipe(data.recipe);
      }
    } catch (err) {
      console.error('Fetch recipe detail error:', err);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data.items || []);
      }
    } catch (err) {
      console.error('Fetch inventory error:', err);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchInventoryItems();
  }, [fetchRecipes]);

  const handleCreateRecipe = async () => {
    if (!newRecipe.name) {
      alert('Veuillez entrer un nom de recette');
      return;
    }

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recipe',
          ...newRecipe,
          selling_price: newRecipe.selling_price ? parseFloat(newRecipe.selling_price) : null,
          preparation_time: newRecipe.preparation_time ? parseInt(newRecipe.preparation_time) : null,
          cooking_time: newRecipe.cooking_time ? parseInt(newRecipe.cooking_time) : null,
          difficulty: newRecipe.difficulty || null
        })
      });

      if (res.ok) {
        setShowRecipeModal(false);
        setNewRecipe({
          name: '', name_fr: '', category: '', portions: 1, selling_price: '',
          preparation_time: '', cooking_time: '', difficulty: '', instructions: '', notes: ''
        });
        fetchRecipes();
      }
    } catch (err) {
      console.error('Create recipe error:', err);
    }
  };

  const handleUpdateRecipe = async () => {
    if (!editingRecipe) return;

    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recipe',
          id: editingRecipe.id,
          name: editingRecipe.name,
          name_fr: editingRecipe.name_fr,
          category: editingRecipe.category,
          portions: editingRecipe.portions,
          selling_price: editingRecipe.selling_price,
          preparation_time: editingRecipe.preparation_time,
          cooking_time: editingRecipe.cooking_time,
          difficulty: editingRecipe.difficulty,
          instructions: editingRecipe.instructions,
          notes: editingRecipe.notes
        })
      });

      if (res.ok) {
        setEditingRecipe(null);
        fetchRecipes();
      }
    } catch (err) {
      console.error('Update recipe error:', err);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Supprimer cette recette?')) return;

    try {
      await fetch(`/api/recipes?type=recipe&id=${id}`, { method: 'DELETE' });
      fetchRecipes();
    } catch (err) {
      console.error('Delete recipe error:', err);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedRecipe || !newIngredient.ingredient_name) {
      alert('Veuillez entrer un nom d\'ingrédient');
      return;
    }

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ingredient',
          recipe_id: selectedRecipe.id,
          ...newIngredient,
          inventory_item_id: newIngredient.inventory_item_id || null
        })
      });

      if (res.ok) {
        setShowIngredientModal(false);
        setNewIngredient({ ingredient_name: '', inventory_item_id: '', quantity: 0, unit: 'kg', unit_cost: 0 });
        fetchRecipeDetail(selectedRecipe.id);
        fetchRecipes();
      }
    } catch (err) {
      console.error('Add ingredient error:', err);
    }
  };

  const handleUpdateIngredient = async () => {
    if (!editingIngredient) return;

    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ingredient',
          id: editingIngredient.id,
          ingredient_name: editingIngredient.ingredient_name,
          inventory_item_id: editingIngredient.inventory_item_id,
          quantity: editingIngredient.quantity,
          unit: editingIngredient.unit,
          unit_cost: editingIngredient.unit_cost
        })
      });

      if (res.ok) {
        setEditingIngredient(null);
        if (selectedRecipe) {
          fetchRecipeDetail(selectedRecipe.id);
        }
        fetchRecipes();
      }
    } catch (err) {
      console.error('Update ingredient error:', err);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('Supprimer cet ingrédient?')) return;

    try {
      await fetch(`/api/recipes?type=ingredient&id=${id}`, { method: 'DELETE' });
      if (selectedRecipe) {
        fetchRecipeDetail(selectedRecipe.id);
      }
      fetchRecipes();
    } catch (err) {
      console.error('Delete ingredient error:', err);
    }
  };

  const handleLinkInventory = (ingredient: RecipeIngredient) => {
    setEditingIngredient(ingredient);
  };

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedRecipes = [...filteredRecipes].sort((a, b) => sortField ? sortCompare(a, b, sortField, sortDir) : 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(value) + ' DH';
  };

  const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fiches Techniques</h1>
          <p className="text-muted-foreground mt-1">Gérer les recettes et leurs ingrédients</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowRecipeModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Recette
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher une recette..."
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
              <p className="text-2xl font-bold text-foreground">{recipes.length}</p>
              <p className="text-xs text-muted-foreground">Recettes</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Catégories</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {recipes.reduce((sum, r) => sum + r.ingredient_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Ingrédients Total</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(recipes.reduce((sum, r) => sum + r.cost_price, 0) / (recipes.length || 1))}
              </p>
              <p className="text-xs text-muted-foreground">Coût Moyen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes List */}
      <div className="bg-secondary border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <BookOpen className="w-12 h-12 text-muted mb-4" />
            <p className="text-muted-foreground">Aucune recette trouvée</p>
            {canWrite && (
              <button
                onClick={() => setShowRecipeModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm"
              >
                <Plus className="w-4 h-4" /> Ajouter une recette
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-4 py-3 text-left"><SortHeader label="Recette" field="name" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                <th className="px-4 py-3 text-left"><SortHeader label="Catégorie" field="category" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="left" className="text-xs font-medium text-muted uppercase" /></th>
                <th className="px-4 py-3 text-center"><SortHeader label="Portions" field="portions" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                <th className="px-4 py-3 text-center"><SortHeader label="Ingrédients" field="ingredient_count" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="center" className="text-xs font-medium text-muted uppercase" /></th>
                <th className="px-4 py-3 text-right"><SortHeader label="Coût" field="cost_price" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="right" className="text-xs font-medium text-muted uppercase" /></th>
                {canWrite && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedRecipes.map(recipe => (
                <tr key={recipe.id} className="border-t border-border hover:bg-card/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { fetchRecipeDetail(recipe.id); setShowDetailModal(true); }}
                      className="flex items-center gap-3 text-left hover:text-[#606338] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[#606338]" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{recipe.name}</p>
                        {recipe.name_fr && recipe.name_fr !== recipe.name && (
                          <p className="text-xs text-muted-foreground">{recipe.name_fr}</p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {recipe.category && (
                      <span className="px-2 py-1 bg-card rounded-md text-xs text-foreground capitalize">
                        {recipe.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground">{recipe.portions}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-medium">
                      {recipe.ingredient_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#606338]">
                    {formatCurrency(recipe.cost_price)}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { fetchRecipeDetail(recipe.id); setShowDetailModal(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRecipe(recipe)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Nouvelle Fiche Technique</h2>
              <button onClick={() => setShowRecipeModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nom de la recette *</label>
                  <input
                    type="text"
                    value={newRecipe.name}
                    onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="ex: Tiramisu Classique"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nom français</label>
                  <input
                    type="text"
                    value={newRecipe.name_fr}
                    onChange={e => setNewRecipe({ ...newRecipe, name_fr: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="ex: Tiramisu Classique"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Catégorie</label>
                  <input
                    type="text"
                    value={newRecipe.category}
                    onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="ex: dessert, entrée, pâtes"
                    list="recipe-categories"
                  />
                  <datalist id="recipe-categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat || ''} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Difficulté</label>
                  <select
                    value={newRecipe.difficulty}
                    onChange={e => setNewRecipe({ ...newRecipe, difficulty: e.target.value as '' | 'facile' | 'moyen' | 'difficile' })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>

              {/* Portions & Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nombre de portions</label>
                  <input
                    type="number"
                    value={newRecipe.portions}
                    onChange={e => setNewRecipe({ ...newRecipe, portions: parseInt(e.target.value) || 1 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Prix de vente (DH)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRecipe.selling_price}
                    onChange={e => setNewRecipe({ ...newRecipe, selling_price: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Temps de préparation (min)</span>
                  </label>
                  <input
                    type="number"
                    value={newRecipe.preparation_time}
                    onChange={e => setNewRecipe({ ...newRecipe, preparation_time: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="30"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Temps de cuisson (min)</span>
                  </label>
                  <input
                    type="number"
                    value={newRecipe.cooking_time}
                    onChange={e => setNewRecipe({ ...newRecipe, cooking_time: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="45"
                    min="0"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Instructions de préparation</label>
                <textarea
                  value={newRecipe.instructions}
                  onChange={e => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={4}
                  placeholder="1. Préparer les ingrédients...&#10;2. Mélanger...&#10;3. Cuire..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={newRecipe.notes}
                  onChange={e => setNewRecipe({ ...newRecipe, notes: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                  placeholder="Conseils, variantes, allergènes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowRecipeModal(false)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateRecipe}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recipe Modal */}
      {editingRecipe && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Modifier Fiche Technique</h2>
              <button onClick={() => setEditingRecipe(null)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nom de la recette *</label>
                  <input
                    type="text"
                    value={editingRecipe.name}
                    onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nom français</label>
                  <input
                    type="text"
                    value={editingRecipe.name_fr || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, name_fr: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Catégorie</label>
                  <input
                    type="text"
                    value={editingRecipe.category || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, category: e.target.value })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    list="recipe-categories-edit"
                  />
                  <datalist id="recipe-categories-edit">
                    {categories.map(cat => (
                      <option key={cat} value={cat || ''} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Difficulté</label>
                  <select
                    value={editingRecipe.difficulty || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, difficulty: (e.target.value || null) as 'facile' | 'moyen' | 'difficile' | null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>

              {/* Portions & Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nombre de portions</label>
                  <input
                    type="number"
                    value={editingRecipe.portions}
                    onChange={e => setEditingRecipe({ ...editingRecipe, portions: parseInt(e.target.value) || 1 })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Prix de vente (DH)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecipe.selling_price || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, selling_price: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Coût (calculé)</label>
                  <div className="py-2.5 px-3 bg-card/50 border border-border rounded-lg text-foreground text-sm font-medium">
                    {formatCurrency(editingRecipe.cost_price)}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Temps de préparation (min)</span>
                  </label>
                  <input
                    type="number"
                    value={editingRecipe.preparation_time || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, preparation_time: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="30"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Temps de cuisson (min)</span>
                  </label>
                  <input
                    type="number"
                    value={editingRecipe.cooking_time || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, cooking_time: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                    placeholder="45"
                    min="0"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Instructions de préparation</label>
                <textarea
                  value={editingRecipe.instructions || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, instructions: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={4}
                  placeholder="1. Préparer les ingrédients...&#10;2. Mélanger...&#10;3. Cuire..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={editingRecipe.notes || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, notes: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none"
                  rows={2}
                  placeholder="Conseils, variantes, allergènes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setEditingRecipe(null)}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateRecipe}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {showDetailModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedRecipe.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedRecipe.category && <span className="capitalize">{selectedRecipe.category}</span>}
                  {selectedRecipe.category && ' • '}
                  {selectedRecipe.portions} portion(s)
                  {selectedRecipe.difficulty && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs capitalize ${
                      selectedRecipe.difficulty === 'facile' ? 'bg-green-500/10 text-green-600' :
                      selectedRecipe.difficulty === 'moyen' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {selectedRecipe.difficulty}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedRecipe(null); }} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Recipe Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {selectedRecipe.preparation_time && (
                  <div className="bg-card rounded-lg p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-medium text-foreground">{selectedRecipe.preparation_time} min</p>
                    <p className="text-xs text-muted-foreground">Préparation</p>
                  </div>
                )}
                {selectedRecipe.cooking_time && (
                  <div className="bg-card rounded-lg p-3 text-center">
                    <Timer className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-medium text-foreground">{selectedRecipe.cooking_time} min</p>
                    <p className="text-xs text-muted-foreground">Cuisson</p>
                  </div>
                )}
                {(selectedRecipe.preparation_time || selectedRecipe.cooking_time) && (
                  <div className="bg-card rounded-lg p-3 text-center">
                    <Gauge className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-medium text-foreground">
                      {(selectedRecipe.preparation_time || 0) + (selectedRecipe.cooking_time || 0)} min
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                )}
                {selectedRecipe.selling_price && (
                  <div className="bg-card rounded-lg p-3 text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-green-500 mb-1" />
                    <p className="text-sm font-medium text-green-600">{formatCurrency(selectedRecipe.selling_price)}</p>
                    <p className="text-xs text-muted-foreground">Prix de vente</p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {selectedRecipe.instructions && (
                <div className="mb-5">
                  <h3 className="font-medium text-foreground mb-2">Instructions</h3>
                  <div className="bg-card rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-line">
                    {selectedRecipe.instructions}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRecipe.notes && (
                <div className="mb-5">
                  <h3 className="font-medium text-foreground mb-2">Notes</h3>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-foreground">
                    {selectedRecipe.notes}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Ingrédients</h3>
                {canWrite && (
                  <button
                    onClick={() => setShowIngredientModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606338] text-white rounded-lg text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                )}
              </div>

              {selectedRecipe.ingredients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun ingrédient ajouté
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRecipe.ingredients.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ing.inventory_item_id ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                          {ing.inventory_item_id ? (
                            <Link2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Unlink className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ing.ingredient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ing.quantity} {ing.unit} × {formatCurrency(ing.unit_cost)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-[#606338]">{formatCurrency(ing.total_cost)}</p>
                        {canWrite && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleLinkInventory(ing)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                              title="Modifier / Lier à l'inventaire"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border bg-card/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coût total</span>
                    <span className="text-lg font-bold text-[#606338]">{formatCurrency(selectedRecipe.cost_price)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Coût par portion</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(selectedRecipe.cost_price / (selectedRecipe.portions || 1))}
                    </span>
                  </div>
                </div>
                {selectedRecipe.selling_price && selectedRecipe.selling_price > 0 && (
                  <div className="border-l border-border pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Prix de vente</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(selectedRecipe.selling_price)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">Marge</span>
                      <span className={`text-sm font-medium ${
                        selectedRecipe.selling_price > selectedRecipe.cost_price ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {formatCurrency(selectedRecipe.selling_price - selectedRecipe.cost_price)}
                        ({((selectedRecipe.selling_price - selectedRecipe.cost_price) / selectedRecipe.selling_price * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Ingredient Modal */}
      {(showIngredientModal || editingIngredient) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingIngredient ? 'Modifier Ingrédient' : 'Ajouter Ingrédient'}
              </h2>
              <button
                onClick={() => { setShowIngredientModal(false); setEditingIngredient(null); }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Nom de l'ingrédient *</label>
                <input
                  type="text"
                  value={editingIngredient ? editingIngredient.ingredient_name : newIngredient.ingredient_name}
                  onChange={e => editingIngredient
                    ? setEditingIngredient({ ...editingIngredient, ingredient_name: e.target.value })
                    : setNewIngredient({ ...newIngredient, ingredient_name: e.target.value })
                  }
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  placeholder="ex: mascarpone, crème, sucre"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Lier à l'inventaire (optionnel)</label>
                <select
                  value={editingIngredient ? (editingIngredient.inventory_item_id || '') : newIngredient.inventory_item_id}
                  onChange={e => {
                    const item = inventoryItems.find(i => i.id === e.target.value);
                    if (editingIngredient) {
                      setEditingIngredient({
                        ...editingIngredient,
                        inventory_item_id: e.target.value || null,
                        unit: item?.unit || editingIngredient.unit,
                        unit_cost: item?.cost_per_unit || editingIngredient.unit_cost
                      });
                    } else {
                      setNewIngredient({
                        ...newIngredient,
                        inventory_item_id: e.target.value,
                        unit: item?.unit || newIngredient.unit,
                        unit_cost: item?.cost_per_unit || newIngredient.unit_cost
                      });
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">-- Non lié --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit} - {formatCurrency(item.cost_per_unit)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quantité</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingIngredient ? editingIngredient.quantity : newIngredient.quantity}
                    onChange={e => editingIngredient
                      ? setEditingIngredient({ ...editingIngredient, quantity: parseFloat(e.target.value) || 0 })
                      : setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Unité</label>
                  <select
                    value={editingIngredient ? editingIngredient.unit : newIngredient.unit}
                    onChange={e => editingIngredient
                      ? setEditingIngredient({ ...editingIngredient, unit: e.target.value })
                      : setNewIngredient({ ...newIngredient, unit: e.target.value })
                    }
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="pc">pc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Prix/Unité</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingIngredient ? editingIngredient.unit_cost : newIngredient.unit_cost}
                    onChange={e => editingIngredient
                      ? setEditingIngredient({ ...editingIngredient, unit_cost: parseFloat(e.target.value) || 0 })
                      : setNewIngredient({ ...newIngredient, unit_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-card rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-[#606338]">
                    {formatCurrency(
                      (editingIngredient ? editingIngredient.quantity : newIngredient.quantity) *
                      (editingIngredient ? editingIngredient.unit_cost : newIngredient.unit_cost)
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => { setShowIngredientModal(false); setEditingIngredient(null); }}
                className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm"
              >
                Annuler
              </button>
              <button
                onClick={editingIngredient ? handleUpdateIngredient : handleAddIngredient}
                className="px-4 py-2.5 bg-[#606338] rounded-lg text-white text-sm font-medium"
              >
                {editingIngredient ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
