'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { MenuCategory } from '@/lib/supabase';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';

const slugify = (s: string) => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

interface CategoryForm {
  name_fr: string;
  name: string;
  icon: string;
  description: string;
}

const emptyForm: CategoryForm = { name_fr: '', name: '', icon: '🍽️', description: '' };

export function CategoriesSettings() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('id, category_id'),
    ]);
    if (catsRes.data) setCategories(catsRes.data as MenuCategory[]);
    if (itemsRes.data) {
      const counts: Record<string, number> = {};
      for (const item of itemsRes.data as { category_id: string | null }[]) {
        if (item.category_id) counts[item.category_id] = (counts[item.category_id] || 0) + 1;
      }
      setItemCounts(counts);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat: MenuCategory) => {
    setEditingId(cat.id);
    setForm({
      name_fr: cat.name_fr,
      name: cat.name,
      icon: cat.icon || '🍽️',
      description: cat.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name_fr.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('menu_categories').update({
          name_fr: form.name_fr,
          name: form.name || form.name_fr,
          icon: form.icon || '🍽️',
          description: form.description || null,
        }).eq('id', editingId);
        if (error) {
          alert(`Erreur: ${error.message}`);
          return;
        }
      } else {
        const id = slugify(form.name_fr);
        if (!id) {
          alert('Le nom est invalide.');
          return;
        }
        if (categories.some(c => c.id === id)) {
          alert(`Une catégorie avec l'identifiant "${id}" existe déjà.`);
          return;
        }
        const nextSort = Math.max(0, ...categories.map(c => c.sort_order || 0)) + 1;
        const { error } = await supabase.from('menu_categories').insert({
          id,
          name: form.name || form.name_fr,
          name_fr: form.name_fr,
          icon: form.icon || '🍽️',
          description: form.description || null,
          sort_order: nextSort,
          availability_type: 'always',
        });
        if (error) {
          alert(`Erreur: ${error.message}`);
          return;
        }
      }
      await refresh();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: MenuCategory) => {
    const count = itemCounts[cat.id] || 0;
    if (count > 0) {
      alert(`Impossible de supprimer "${cat.name_fr}" : ${count} article(s) sont rattaché(s) à cette catégorie.`);
      return;
    }
    if (!confirm(`Supprimer la catégorie "${cat.name_fr}" ?`)) return;
    setDeleting(cat.id);
    try {
      const { error } = await supabase.from('menu_categories').delete().eq('id', cat.id);
      if (error) {
        alert(`Erreur: ${error.message}`);
        return;
      }
      await refresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PermissionGate permission="menu.write" fallback={<p className="text-muted-foreground">Vous n&apos;avez pas la permission de gérer les catégories.</p>}>
      <div className="bg-secondary border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Catégories du menu</h2>
            <p className="text-sm text-muted-foreground mt-1">Créer, renommer ou supprimer les catégories utilisées dans la carte.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium">
            <Plus className="w-4 h-4" />Nouvelle catégorie
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(cat => {
              const count = itemCounts[cat.id] || 0;
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <span className="text-2xl shrink-0">{cat.icon || '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cat.name_fr}</p>
                    <p className="text-xs text-muted-foreground truncate">{count} article{count !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                    aria-label="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={deleting === cat.id || count > 0}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Supprimer"
                    title={count > 0 ? `${count} article(s) doivent être déplacés d'abord` : 'Supprimer'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Nom (FR) *</label>
                <input
                  type="text"
                  value={form.name_fr}
                  onChange={(e) => setForm({ ...form, name_fr: e.target.value })}
                  className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                  placeholder="ex: Jus Pressés à Froid"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Nom (EN)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                  placeholder="ex: Cold-Pressed Juices"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Icône (emoji)</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                  placeholder="🍹"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Description (optionnel)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/50"
                  placeholder="ex: Fruits pressés à la demande"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name_fr.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#606338] to-[#4d4f2e] text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}
