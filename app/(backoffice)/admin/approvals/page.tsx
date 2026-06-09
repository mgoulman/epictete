'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Check, X, Loader2, Clock, User } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  module: string;
  action: string;
  summary: string | null;
  requested_by_name: string | null;
  created_at: string;
}

const MODULE_LABEL: Record<string, string> = {
  inventory: 'Inventaire', menu: 'Menu', finance: 'Finance',
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    const note = decision === 'rejected' ? (prompt('Motif du refus (optionnel) :') ?? '') : '';
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec');
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#606338]" /> Approbations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Validez ou refusez les changements en attente. Une fois approuvés, ils sont appliqués automatiquement.
        </p>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[13px] text-red-500">{error}</div>}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-secondary border border-border rounded-xl py-16 text-center text-muted-foreground">
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3 opacity-40" />
          Aucune demande en attente.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map(r => (
            <div key={r.id} className="bg-secondary border border-border rounded-xl p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#606338]/15 text-[#606338] font-medium uppercase">
                    {MODULE_LABEL[r.module] || r.module}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{r.summary || r.action}</p>
                <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {r.requested_by_name || 'Inconnu'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(r.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => review(r.id, 'approved')}
                  disabled={busy === r.id}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e] disabled:opacity-50"
                >
                  {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approuver
                </button>
                <button
                  onClick={() => review(r.id, 'rejected')}
                  disabled={busy === r.id}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-card disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
