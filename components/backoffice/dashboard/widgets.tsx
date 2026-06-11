'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Package, CreditCard, CalendarCheck, Clock, ClipboardList, Armchair, ArrowRight, Loader2,
} from 'lucide-react';
import { usePermissions } from '@/lib/auth/hooks';
import type { PermissionName } from '@/lib/types/auth';

const todayISO = () => new Date().toLocaleDateString('en-CA');
const mad = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

function Card({ children, accent = 'border-border', href }: { children: React.ReactNode; accent?: string; href?: string }) {
  const inner = <div className={`bg-secondary border rounded-2xl p-5 h-full ${accent}`}>{children}</div>;
  return href ? <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

function Stat({ icon: Icon, color, label, value, sub }: { icon: React.ElementType; color: string; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-muted-foreground mt-1.5 text-sm">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </>
  );
}

function useGate(perm: PermissionName) {
  const { hasPermission } = usePermissions();
  return hasPermission(perm);
}

// ── Revenue (finance.read) ───────────────────────────────────────────────────
export function RevenueWidget() {
  const ok = useGate('finance.read');
  const [data, setData] = useState<{ revenue: number; transactions: number; avgTicket: number } | null>(null);
  useEffect(() => {
    if (!ok) return;
    const d = todayISO();
    fetch(`/api/finance/dashboard-stats?startDate=${d}&endDate=${d}`).then(r => r.json())
      .then(j => setData({ revenue: j.summary?.revenue || 0, transactions: j.summary?.transactions || 0, avgTicket: j.summary?.avgTicket || 0 }))
      .catch(() => {});
  }, [ok]);
  if (!ok) return null;
  return (
    <Card accent="border-[#606338]/30 bg-gradient-to-br from-[#606338]/15 to-transparent" href="/admin/finance?tab=sales">
      <Stat icon={TrendingUp} color="bg-[#606338]/20 text-[#606338]" label="Ventes aujourd’hui"
        value={data ? `${mad(data.revenue)}` : <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />}
        sub={data ? `${data.transactions} tickets · ticket moyen ${mad(data.avgTicket)} MAD` : null} />
    </Card>
  );
}

// ── Vendors owed (finance.read) ──────────────────────────────────────────────
export function VendorsOwedWidget() {
  const ok = useGate('finance.read');
  const [owed, setOwed] = useState<number | null>(null);
  useEffect(() => {
    if (!ok) return;
    fetch('/api/vendors?type=vendors').then(r => r.json())
      .then(j => setOwed((j.vendors || []).reduce((s: number, v: { balance?: number }) => s + Math.max(0, v.balance || 0), 0)))
      .catch(() => {});
  }, [ok]);
  if (!ok) return null;
  return (
    <Card accent={(owed || 0) > 0 ? 'border-red-500/30' : 'border-border'} href="/admin/finance?tab=vendors">
      <Stat icon={CreditCard} color={(owed || 0) > 0 ? 'bg-red-500/15 text-red-500' : 'bg-green-500/10 text-green-500'}
        label="Dû aux fournisseurs"
        value={owed === null ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : `${mad(owed)} MAD`} />
    </Card>
  );
}

// ── Low stock (inventory.read) ───────────────────────────────────────────────
export function LowStockWidget() {
  const ok = useGate('inventory.read');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!ok) return;
    fetch('/api/inventory').then(r => r.json())
      .then(j => setCount((j.items || []).filter((i: { quantity: number; minimum_stock: number }) => i.minimum_stock > 0 && i.quantity <= i.minimum_stock).length))
      .catch(() => {});
  }, [ok]);
  if (!ok) return null;
  return (
    <Card accent={(count || 0) > 0 ? 'border-amber-500/30' : 'border-border'} href="/admin/inventory">
      <Stat icon={Package} color={(count || 0) > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-green-500/10 text-green-500'}
        label="Produits en stock bas"
        value={count === null ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : count} />
    </Card>
  );
}

// ── Presence today (personnel.read) ──────────────────────────────────────────
export function PresenceWidget() {
  const ok = useGate('personnel.read');
  const [d, setD] = useState<{ scheduled: number; present: number; late: number; absent: number } | null>(null);
  useEffect(() => {
    if (!ok) return;
    fetch('/api/presence/summary').then(r => r.json()).then(setD).catch(() => {});
  }, [ok]);
  if (!ok) return null;
  return (
    <Card href="/admin/personnel">
      <Stat icon={CalendarCheck} color="bg-green-500/10 text-green-500" label="Présence aujourd’hui"
        value={d ? `${d.present + d.late}/${d.scheduled}` : <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        sub={d ? <>{d.late > 0 && <span className="text-amber-500">{d.late} en retard</span>}{d.late > 0 && d.absent > 0 && ' · '}{d.absent > 0 && <span className="text-red-500">{d.absent} absent</span>}{d.late === 0 && d.absent === 0 && 'Tous présents'}</> : null} />
    </Card>
  );
}

// ── Pending time-off (personnel.read) ────────────────────────────────────────
export function TimeOffWidget() {
  const ok = useGate('personnel.read');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!ok) return;
    fetch('/api/personnel?type=time-off&status=pending').then(r => r.json())
      .then(j => setCount((j.timeOff || []).length)).catch(() => {});
  }, [ok]);
  if (!ok || count === 0) return null;
  return (
    <Card accent="border-blue-500/30" href="/admin/personnel">
      <Stat icon={Clock} color="bg-blue-500/15 text-blue-500" label="Congés en attente"
        value={count === null ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : count} />
    </Card>
  );
}

// ── Pending approvals (any approver — gated by count) ────────────────────────
export function ApprovalsWidget() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/approvals').then(r => r.json()).then(j => setCount((j.requests || []).length)).catch(() => {});
  }, []);
  if (!count) return null;
  return (
    <Card accent="border-amber-500/30" href="/admin/approvals">
      <Stat icon={ClipboardList} color="bg-amber-500/15 text-amber-500" label="Approbations en attente" value={count} />
    </Card>
  );
}

// ── My tables (salle.serve) ──────────────────────────────────────────────────
export function MyTablesWidget() {
  const ok = useGate('salle.serve');
  const [d, setD] = useState<{ total: number; occupied: number; reserved: number } | null>(null);
  useEffect(() => {
    if (!ok) return;
    fetch('/api/salle?type=my-tables').then(r => r.json()).then(j => {
      const t = j.tables || [];
      setD({ total: t.length, occupied: t.filter((x: { status: string }) => x.status === 'occupied').length, reserved: t.filter((x: { status: string }) => x.status === 'reserved').length });
    }).catch(() => {});
  }, [ok]);
  if (!ok) return null;
  return (
    <Card accent="border-[#606338]/30" href="/admin/salle/mes-tables">
      <Stat icon={Armchair} color="bg-[#606338]/15 text-[#606338]" label="Mes tables"
        value={d ? d.total : <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        sub={d ? `${d.occupied} occupée(s) · ${d.reserved} réservée(s)` : null} />
      <span className="inline-flex items-center gap-1 text-[13px] text-[#606338] font-medium mt-3">
        Ouvrir Mes tables <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Card>
  );
}
