'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

const SEVERITY_ICON: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};
const SEVERITY_COLOR: Record<string, string> = {
  warning: 'text-amber-500',
  success: 'text-green-500',
  info: 'text-[#606338]',
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch { /* ignore */ }
  }, []);

  // Initial + polling every 60s
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Refresh when opening
  useEffect(() => { if (open) load(); }, [open, load]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const openNotification = async (n: Notification) => {
    if (!n.is_read) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).then(load).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-card hover:border-muted hover:text-foreground transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-foreground text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-[12px] text-[#606338] hover:underline"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Aucune notification
              </div>
            ) : (
              items.map(n => {
                const Icon = SEVERITY_ICON[n.severity] || Info;
                return (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/60 hover:bg-secondary transition-colors ${n.is_read ? '' : 'bg-[#606338]/5'}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${SEVERITY_COLOR[n.severity] || 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                      {n.message && <p className="text-[12px] text-muted-foreground mt-0.5">{n.message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#606338] mt-1.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
