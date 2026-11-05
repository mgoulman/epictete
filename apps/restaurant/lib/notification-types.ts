// Single source of truth for configurable notification types.
// Drives: notification_settings seeding, the settings API + UI, and the
// data-driven/scheduled generators. Server-safe (no React imports) — the UI
// maps `icon` (a lucide-react name) to a component.

export type NotifParamKind = 'currency' | 'days' | 'day_of_month';

export interface NotifParam {
  key: string;
  label: string;
  kind: NotifParamKind;
  default: number;
}

export interface NotifTypeDef {
  type: string;
  label: string;                 // FR label shown in settings
  desc: string;                  // FR one-liner
  icon: string;                  // lucide-react icon name
  severity: 'info' | 'warning' | 'success' | 'danger';
  link: string | null;
  requiredPermission: string | null;
  scheduled?: boolean;           // produced by the /api/cron/alerts run
  dynamicRecipients?: boolean;   // recipients resolved at runtime (hide the picker)
  defaultConfig: Record<string, unknown>;
  params: NotifParam[];          // editable numeric/scheduling params
}

const channels = { in_app: true };

export const NOTIFICATION_TYPES: NotifTypeDef[] = [
  {
    type: 'new_reservation',
    label: 'Nouvelles réservations',
    desc: 'Quand une réservation est reçue.',
    icon: 'CalendarCheck',
    severity: 'info',
    link: '/admin',
    requiredPermission: null,
    defaultConfig: { recipient_roles: ['manager'], channels },
    params: [],
  },
];

export const NOTIFICATION_TYPE_MAP: Record<string, NotifTypeDef> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.type, t]),
);

// Types whose enabled/recipients/channels are configured via notification_settings.
export const CONFIGURABLE_TYPES: string[] = NOTIFICATION_TYPES.map((t) => t.type);
