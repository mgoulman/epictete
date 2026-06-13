'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChefHat, Search, AlertTriangle, Loader2, Minus, X, Package } from 'lucide-react';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { usePermissions } from '@/lib/auth/hooks';

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimum_stock: number;
  category: string | null;
  inventory_category?: { id: string; name: string } | null;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function CuisinePage() {
  return (
    <PermissionGate permission="inventory.read" fallback={<p className="text-muted-foreground">Accès réservé à la cuisine.</p>}>
      <CuisineView />
    </PermissionGate>
  );
}

function CuisineView() {
  const { hasPermission } = usePermissions();
  const canRecord = hasPermission('inventory.write');

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUsage, setShowUsage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setItems(data.items || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowStock = useMemo(
    () => items.filter(i => Number(i.minimum_stock) > 0 && Number(i.quantity) <= Number(i.minimum_stock)),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of filtered) {
      const cat = i.inventory_category?.name || i.category || 'Autres';
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(i);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-[#606338]" /> Cuisine
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Stock disponible et consommation.</p>
        </div>
        {canRecord && (
          <button onClick={() => setShowUsage(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e]">
            <Minus className="w-4 h-4" /> Sortie stock
          </button>
        )}
      </div>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-500 font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Stock bas ({lowStock.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-[12px] px-2 py-1 rounded-md bg-card border border-border text-foreground">
                {i.name} — {Number(i.quantity)} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/40"
        />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#606338]" /> {cat} <span className="text-muted-foreground font-normal">({list.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map(i => {
                  const low = Number(i.minimum_stock) > 0 && Number(i.quantity) <= Number(i.minimum_stock);
                  return (
                    <div key={i.id} className={`flex items-center justify-between p-3 rounded-lg border ${low ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
                      <span className="text-sm text-foreground truncate">{i.name}</span>
                      <span className={`text-sm font-semibold shrink-0 ${low ? 'text-amber-500' : 'text-foreground'}`}>
                        {Number(i.quantity)} {i.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <p className="text-muted-foreground text-sm">Aucun produit.</p>}
        </div>
      )}

      {showUsage && canRecord && (
        <UsageModal items={items} onClose={() => setShowUsage(false)} onSaved={() => { setShowUsage(false); load(); }} />
      )}
    </div>
  );
}

function UsageModal({ items, onClose, onSaved }: { items: Item[]; onClose: () => void; onSaved: () => void }) {
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('usage');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!itemId || !qty || Number(qty) <= 0) { setError('Choisissez un produit et une quantité.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/inventory/daily-usage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayISO(), items: [{ inventory_item_id: itemId, quantity: Number(qty), reason }] }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Échec'); }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Sortie de stock</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Produit *</label>
            <select value={itemId} onChange={e => setItemId(e.target.value)} className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50">
              <option value="">— Choisir —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({Number(i.quantity)} {i.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Quantité *</label>
            <input type="number" min="0" step="any" value={qty} onChange={e => setQty(e.target.value)} className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Motif</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50">
              <option value="usage">Consommation</option>
              <option value="waste">Perte / gaspillage</option>
            </select>
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#606338] text-white text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
