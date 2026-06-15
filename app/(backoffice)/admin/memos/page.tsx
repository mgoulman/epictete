'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Send, Inbox, Plus, X, Loader2, Clock, Bell, Trash2,
  CheckCircle2, Circle, AlertTriangle, User as UserIcon, Users as UsersIcon,
} from 'lucide-react';
import { usePermissions } from '@/lib/auth/hooks';

interface InboxMemo { id: string; title: string; priority: string; author_name: string | null; created_at: string; read: boolean }
interface SentMemo { id: string; title: string; priority: string; created_at: string; recipients_count: number; read_count: number }
interface ReadEntry { id: string; name: string; read: boolean; read_at: string | null }
interface FullMemo { id: string; title: string; body: string; priority: string; author_name: string | null; created_at: string }
interface PickUser { id: string; full_name: string | null; email: string | null; role: string | null }
interface PickRole { name: string; display_name: string }
type Recipient = { type: 'user' | 'role'; value: string; label: string };

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function MemosPage() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('memos.write');
  const sp = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [inbox, setInbox] = useState<InboxMemo[]>([]);
  const [sent, setSent] = useState<SentMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const loadInbox = useCallback(async () => {
    const r = await fetch('/api/memos?box=inbox');
    const d = await r.json();
    setInbox(d.memos || []);
  }, []);
  const loadSent = useCallback(async () => {
    const r = await fetch('/api/memos?box=sent');
    const d = await r.json();
    setSent(d.memos || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadInbox(), canWrite ? loadSent() : Promise.resolve()]);
    setLoading(false);
  }, [loadInbox, loadSent, canWrite]);

  useEffect(() => { refresh(); }, [refresh]);

  // Deep-link from a notification (?id=...)
  useEffect(() => {
    const id = sp.get('id');
    if (id) setOpenId(id);
  }, [sp]);

  const unreadCount = inbox.filter(m => !m.read).length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Send className="w-6 h-6 text-[#606338]" /> Rapports
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rédigez un rapport et publiez-le à des personnes ou des rôles. Le suivi de lecture indique qui l&apos;a consulté.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e]"
          >
            <Plus className="w-4 h-4" /> Nouveau rapport
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${tab === 'inbox' ? 'bg-[#606338] text-white' : 'text-muted-foreground hover:text-foreground hover:bg-card'}`}
        >
          <Inbox className="w-4 h-4" /> Reçus
          {unreadCount > 0 && <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">{unreadCount}</span>}
        </button>
        {canWrite && (
          <button
            onClick={() => setTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${tab === 'sent' ? 'bg-[#606338] text-white' : 'text-muted-foreground hover:text-foreground hover:bg-card'}`}
          >
            <Send className="w-4 h-4" /> Envoyés
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>
      ) : tab === 'inbox' ? (
        inbox.length === 0 ? (
          <Empty icon={<Inbox className="w-8 h-8" />} text="Aucun rapport reçu." />
        ) : (
          <div className="flex flex-col gap-2">
            {inbox.map(m => (
              <button key={m.id} onClick={() => setOpenId(m.id)}
                className="text-left bg-secondary border border-border rounded-xl p-4 hover:border-[#606338]/40 transition-colors flex items-center gap-3">
                {m.read ? <Circle className="w-2.5 h-2.5 text-transparent shrink-0" /> : <span className="w-2.5 h-2.5 rounded-full bg-[#606338] shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm truncate ${m.read ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>{m.title}</p>
                    {m.priority === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Important</span>}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{m.author_name || '—'} · {fmt(m.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        sent.length === 0 ? (
          <Empty icon={<Send className="w-8 h-8" />} text="Aucun rapport envoyé." />
        ) : (
          <div className="flex flex-col gap-2">
            {sent.map(m => (
              <button key={m.id} onClick={() => setOpenId(m.id)}
                className="text-left bg-secondary border border-border rounded-xl p-4 hover:border-[#606338]/40 transition-colors flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    {m.priority === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium">Important</span>}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{fmt(m.created_at)}</p>
                </div>
                <span className="text-[12px] px-2 py-1 rounded-full bg-card border border-border text-muted-foreground shrink-0">
                  {m.read_count}/{m.recipients_count} lus
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {openId && <MemoViewer id={openId} onClose={() => { setOpenId(null); if (sp.get('id')) router.replace('/admin/memos'); refresh(); }} />}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSent={() => { setShowCompose(false); setTab('sent'); refresh(); }} />}
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-secondary border border-border rounded-xl py-16 text-center text-muted-foreground">
      <div className="mx-auto mb-3 opacity-40 w-fit">{icon}</div>
      {text}
    </div>
  );
}

function MemoViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<{ memo: FullMemo; isAuthor: boolean; readTrack: ReadEntry[] | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reminded, setReminded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/memos?id=${id}`).then(r => r.json()).then(setData);
  }, [id]);

  const remind = async () => {
    setBusy(true);
    const r = await fetch('/api/memos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remind', id }) });
    const d = await r.json();
    setReminded(d.reminded ?? 0);
    setBusy(false);
  };
  const del = async () => {
    if (!confirm('Supprimer ce rapport ?')) return;
    setBusy(true);
    await fetch(`/api/memos?id=${id}`, { method: 'DELETE' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {!data ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>
        ) : (
          <>
            <div className="p-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-background">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">{data.memo.title}</h2>
                  {data.memo.priority === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium">Important</span>}
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">{data.memo.author_name || '—'} · {fmt(data.memo.created_at)}</p>
              </div>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.memo.body || <span className="text-muted-foreground italic">(Aucun contenu)</span>}</p>
            </div>

            {data.isAuthor && data.readTrack && (
              <div className="p-5 border-t border-border">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Suivi de lecture — {data.readTrack.filter(t => t.read).length}/{data.readTrack.length} lus
                  </h3>
                  <div className="flex items-center gap-2">
                    {reminded !== null && <span className="text-[12px] text-[#606338]">{reminded} rappel(s) envoyé(s)</span>}
                    <button onClick={remind} disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-card disabled:opacity-50">
                      <Bell className="w-4 h-4" /> Rappeler les non-lus
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.readTrack.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex items-center gap-2 min-w-0">
                        {t.read ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className="truncate text-foreground">{t.name}</span>
                      </span>
                      <span className="text-muted-foreground text-[12px] shrink-0 flex items-center gap-1">
                        {t.read ? <>{t.read_at && fmt(t.read_at)}</> : <><Clock className="w-3 h-3" /> Non lu</>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <button onClick={del} disabled={busy} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> Supprimer le rapport
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [users, setUsers] = useState<PickUser[]>([]);
  const [roles, setRoles] = useState<PickRole[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [recips, setRecips] = useState<Recipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/memos?meta=1').then(r => r.json()).then(d => { setUsers(d.users || []); setRoles(d.roles || []); });
  }, []);

  const has = (type: 'user' | 'role', value: string) => recips.some(r => r.type === type && r.value === value);
  const toggle = (type: 'user' | 'role', value: string, label: string) => {
    setRecips(prev => has(type, value) ? prev.filter(r => !(r.type === type && r.value === value)) : [...prev, { type, value, label }]);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (recips.length === 0) { setError('Choisissez au moins un destinataire.'); return; }
    setBusy(true);
    const r = await fetch('/api/memos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body, priority, recipients: recips.map(({ type, value }) => ({ type, value })) }),
    });
    if (!r.ok) { setError((await r.json()).error || 'Échec de la publication.'); setBusy(false); return; }
    onSent();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-background">
          <h2 className="text-lg font-semibold text-foreground">Nouveau rapport</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[13px] text-red-500">{error}</div>}

          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Objet du rapport"
              className="w-full py-2.5 px-3.5 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Contenu</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Rédigez votre rapport…"
              className="w-full py-2.5 px-3.5 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40 resize-y" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Priorité</label>
            <div className="flex gap-2">
              {(['normal', 'high'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${priority === p ? 'border-[#606338] bg-[#606338]/10 text-[#606338]' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {p === 'normal' ? 'Normal' : 'Important'}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Destinataires</label>
            {recips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recips.map(r => (
                  <span key={`${r.type}:${r.value}`} className="text-[12px] px-2 py-1 rounded-full bg-[#606338]/15 text-[#606338] flex items-center gap-1">
                    {r.type === 'role' ? <UsersIcon className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {r.label}
                    <button onClick={() => toggle(r.type, r.value, r.label)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-2 max-h-48 overflow-y-auto">
                <p className="text-[11px] uppercase text-muted-foreground px-1 pb-1 flex items-center gap-1"><UsersIcon className="w-3 h-3" /> Rôles</p>
                {roles.map(role => (
                  <label key={role.name} className="flex items-center gap-2 px-1 py-1 text-[13px] cursor-pointer hover:bg-secondary rounded">
                    <input type="checkbox" checked={has('role', role.name)} onChange={() => toggle('role', role.name, role.display_name)} />
                    <span className="text-foreground">{role.display_name}</span>
                  </label>
                ))}
              </div>
              <div className="border border-border rounded-lg p-2 max-h-48 overflow-y-auto">
                <p className="text-[11px] uppercase text-muted-foreground px-1 pb-1 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Personnes</p>
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 px-1 py-1 text-[13px] cursor-pointer hover:bg-secondary rounded">
                    <input type="checkbox" checked={has('user', u.id)} onChange={() => toggle('user', u.id, u.full_name || u.email || '—')} />
                    <span className="text-foreground truncate">{u.full_name || u.email}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-background">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-card">Annuler</button>
          <button onClick={submit} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e] disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publier
          </button>
        </div>
      </div>
    </div>
  );
}
