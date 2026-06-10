'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface CheckinResult {
  linked: boolean;
  scheduled?: boolean;
  planned?: { start_time: string; end_time: string };
  checkInTime?: string;
  attendance?: { status: string; scheduled_start?: string; check_in_time?: string };
}

// Auto-records the logged-in staff member's presence on load (validated against
// the planning) and shows the result. Renders nothing for accounts that aren't
// linked to a staff member or that aren't scheduled today.
export function PresenceCard() {
  const [res, setRes] = useState<CheckinResult | null>(null);

  useEffect(() => {
    fetch('/api/presence/checkin', { method: 'POST' })
      .then(r => r.json())
      .then(setRes)
      .catch(() => {});
  }, []);

  if (!res || !res.linked || !res.scheduled || !res.planned) return null;

  const status = res.attendance?.status === 'late' ? 'late' : 'present';
  const arrival = (res.checkInTime || res.attendance?.check_in_time || '').slice(0, 5);

  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
      status === 'late' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status === 'late' ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
        {status === 'late' ? <Clock className="w-6 h-6 text-amber-500" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
      </div>
      <div>
        <p className="font-semibold text-foreground">
          Présence validée {status === 'late' ? '— en retard' : '— à l’heure'}
        </p>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Service prévu {res.planned.start_time.slice(0, 5)}–{res.planned.end_time.slice(0, 5)}
          {arrival ? ` · pointé à ${arrival}` : ''}
        </p>
      </div>
    </div>
  );
}
