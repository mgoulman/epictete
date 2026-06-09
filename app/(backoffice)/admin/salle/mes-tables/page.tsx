'use client';

import { useState, useEffect, useCallback } from 'react';
import { Armchair, Loader2, X, CalendarPlus, Plus, Minus, Receipt, Check } from 'lucide-react';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';

interface Table {
  id: string;
  table_number: number | null;
  seats: number;
  status: string;
  reserved_name: string | null;
  reserved_time: string | null;
  reserved_guests: number | null;
}
interface MenuItem { id: string; name: string; name_fr: string; price: number; }
interface Order { id: string; menu_item_id: string; quantity: number; unit_price: number; status: string; menu_item?: { name_fr?: string; name?: string } | null; }
interface Session { id: string; status: string; }

const STATUS = {
  available: { label: 'Libre', cls: 'bg-green-500/15 text-green-500 border-green-500/30' },
  occupied: { label: 'Occupée', cls: 'bg-red-500/15 text-red-500 border-red-500/30' },
  reserved: { label: 'Réservée', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  cleaning: { label: 'Nettoyage', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
} as Record<string, { label: string; cls: string }>;

export default function MesTablesPage() {
  return (
    <PermissionGate permission="salle.serve" fallback={<p className="text-muted-foreground">Accès réservé au service en salle.</p>}>
      <MesTablesView />
    </PermissionGate>
  );
}

function MesTablesView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserveFor, setReserveFor] = useState<Table | null>(null);
  const [orderFor, setOrderFor] = useState<Table | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/salle?type=my-tables');
      const data = await res.json();
      setTables(data.tables || []);
      setStaffId(data.staffId ?? null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const release = async (t: Table) => {
    await fetch(`/api/salle/reserve?id=${t.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Armchair className="w-6 h-6 text-[#606338]" /> Mes tables
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Gérez vos tables, prenez les commandes et réservez.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>
      ) : tables.length === 0 ? (
        <div className="bg-secondary border border-border rounded-xl py-16 text-center text-muted-foreground">
          <Armchair className="w-8 h-8 mx-auto mb-3 opacity-40" />
          Aucune table assignée. Demandez à un manager de configurer le plan de salle.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map(t => {
            const st = STATUS[t.status] || STATUS.available;
            return (
              <div key={t.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${st.cls}`}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">Table {t.table_number ?? '—'}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-current">{st.label}</span>
                </div>
                <span className="text-[12px] text-muted-foreground">{t.seats} places</span>
                {t.status === 'reserved' && (
                  <div className="text-[12px] text-foreground bg-card rounded-md p-2">
                    <div className="font-medium">{t.reserved_name || 'Réservé'}</div>
                    <div className="text-muted-foreground">{[t.reserved_time, t.reserved_guests ? `${t.reserved_guests} pers.` : null].filter(Boolean).join(' · ')}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button onClick={() => setOrderFor(t)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#606338] text-white rounded-md text-[12px] font-medium hover:bg-[#4d4f2e]">
                    <Receipt className="w-3.5 h-3.5" /> Commande
                  </button>
                  {t.status === 'reserved' ? (
                    <button onClick={() => release(t)} className="px-2 py-1.5 border border-border bg-card text-foreground rounded-md text-[12px]">Libérer</button>
                  ) : (
                    <button onClick={() => setReserveFor(t)} className="flex items-center justify-center gap-1 px-2 py-1.5 border border-border bg-card text-foreground rounded-md text-[12px]">
                      <CalendarPlus className="w-3.5 h-3.5" /> Réserver
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reserveFor && <ReserveModal table={reserveFor} onClose={() => setReserveFor(null)} onSaved={() => { setReserveFor(null); load(); }} />}
      {orderFor && <OrderModal table={orderFor} staffId={staffId} onClose={() => setOrderFor(null)} onChanged={load} />}
    </div>
  );
}

function ReserveModal({ table, onClose, onSaved }: { table: Table; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/salle/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: table.id, reserved_name: name, reserved_time: time, reserved_guests: guests ? Number(guests) : null }),
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Réserver — Table {table.table_number}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du client" className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50" autoFocus />
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="Heure (ex: 20:30)" className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50" />
          <input type="number" min="1" value={guests} onChange={e => setGuests(e.target.value)} placeholder="Nombre de personnes" className="w-full py-2.5 px-3 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-[#606338]/50" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#606338] text-white text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Réserver
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ table, staffId, onClose, onChanged }: { table: Table; staffId: string | null; onClose: () => void; onChanged: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`/api/salle/sessions?table_id=${table.id}&status=active`),
        fetch('/api/salle?type=menu-items'),
      ]);
      const sData = await sRes.json();
      const mData = await mRes.json();
      setMenu(mData.items || []);
      const active = (sData.sessions || [])[0] || null;
      setSession(active);
      if (active) {
        const oRes = await fetch(`/api/salle/orders?session_id=${active.id}`);
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      } else {
        setOrders([]);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [table.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const openSession = async () => {
    if (!staffId) { setError("Votre compte n'est pas lié à un membre du personnel."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/salle/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: table.id, waiter_id: staffId, guests_count: table.reserved_guests || 1 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Échec'); }
      await refresh(); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec'); } finally { setBusy(false); }
  };

  const addItem = async (m: MenuItem) => {
    if (!session) return;
    setBusy(true);
    try {
      await fetch('/api/salle/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, menu_item_id: m.id, quantity: 1 }),
      });
      await refresh();
    } finally { setBusy(false); }
  };

  const changeQty = async (o: Order, delta: number) => {
    const q = o.quantity + delta;
    setBusy(true);
    try {
      if (q <= 0) await fetch(`/api/salle/orders?id=${o.id}`, { method: 'DELETE' });
      else await fetch('/api/salle/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, quantity: q }) });
      await refresh();
    } finally { setBusy(false); }
  };

  const closeSession = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await fetch('/api/salle/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session.id, status: 'closed' }) });
      onChanged(); onClose();
    } finally { setBusy(false); }
  };

  const total = orders.reduce((s, o) => s + o.quantity * Number(o.unit_price), 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Table {table.table_number}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#606338]" /></div>
        ) : !session ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">Aucune commande en cours pour cette table.</p>
            <button onClick={openSession} disabled={busy} className="px-5 py-2.5 bg-[#606338] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {busy ? 'Ouverture…' : 'Ouvrir la table'}
            </button>
          </div>
        ) : (
          <>
            {/* Current order */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Commande</p>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Vide — ajoutez des articles ci-dessous.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                      <span className="text-sm text-foreground truncate">{o.menu_item?.name_fr || o.menu_item?.name || 'Article'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => changeQty(o, -1)} disabled={busy} className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm w-5 text-center">{o.quantity}</span>
                        <button onClick={() => changeQty(o, 1)} disabled={busy} className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        <span className="text-sm font-medium w-16 text-right">{o.quantity * Number(o.unit_price)} DH</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 font-semibold text-foreground">
                    <span>Total</span><span>{total} DH</span>
                  </div>
                </div>
              )}
            </div>

            {/* Add items */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Ajouter</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {menu.map(m => (
                  <button key={m.id} onClick={() => addItem(m)} disabled={busy} className="flex items-center justify-between px-3 py-2 bg-secondary rounded-lg text-left hover:bg-[#606338]/10 disabled:opacity-50">
                    <span className="text-[13px] text-foreground truncate">{m.name_fr || m.name}</span>
                    <span className="text-[12px] text-muted-foreground shrink-0">{m.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={closeSession} disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#606338] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Receipt className="w-4 h-4" /> Clôturer la table
            </button>
          </>
        )}
      </div>
    </div>
  );
}
