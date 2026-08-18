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

const channels = { in_app: true, push: true };

export const NOTIFICATION_TYPES: NotifTypeDef[] = [
  {
    type: 'low_stock',
    label: 'Alertes de stock bas',
    desc: 'Quand un produit passe sous son seuil minimum.',
    icon: 'Package',
    severity: 'warning',
    link: '/admin/inventory',
    requiredPermission: 'inventory.read',
    defaultConfig: { recipient_roles: ['manager', 'finance', 'cuisine'], channels, only_with_threshold: true },
    params: [],
  },
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
  {
    type: 'daily_summary',
    label: 'Résumé quotidien des ventes',
    desc: 'Un récapitulatif des ventes chaque matin.',
    icon: 'TrendingUp',
    severity: 'success',
    link: '/admin/finance?tab=sales',
    requiredPermission: 'finance.read',
    scheduled: true,
    defaultConfig: { recipient_roles: ['manager', 'finance'], channels },
    params: [],
  },
  {
    type: 'supplier_payment_due',
    label: 'Paiements fournisseurs à échéance',
    desc: 'Quand un bon de commande ou une facture fournisseur arrive à échéance (ou est en retard).',
    icon: 'CreditCard',
    severity: 'warning',
    link: '/admin/finance?tab=vendors',
    requiredPermission: 'finance.read',
    scheduled: true,
    defaultConfig: { recipient_roles: ['manager', 'finance'], channels, lead_time_days: 3 },
    params: [{ key: 'lead_time_days', label: 'Préavis (jours avant échéance)', kind: 'days', default: 3 }],
  },
  {
    type: 'supplier_balance_high',
    label: 'Solde fournisseur élevé',
    desc: 'Quand le montant dû à un fournisseur dépasse un seuil.',
    icon: 'Wallet',
    severity: 'warning',
    link: '/admin/finance?tab=vendors',
    requiredPermission: 'finance.read',
    scheduled: true,
    defaultConfig: { recipient_roles: ['manager', 'finance'], channels, threshold_mad: 10000 },
    params: [{ key: 'threshold_mad', label: 'Seuil du solde (MAD)', kind: 'currency', default: 10000 }],
  },
  {
    type: 'payroll_due',
    label: 'Rappel de paie mensuelle',
    desc: 'Un rappel chaque mois pour préparer/verser les salaires.',
    icon: 'CalendarClock',
    severity: 'warning',
    link: '/admin/personnel',
    requiredPermission: 'personnel.read',
    scheduled: true,
    defaultConfig: { recipient_roles: ['manager', 'finance'], channels, day_of_month: 28 },
    params: [{ key: 'day_of_month', label: 'Jour du mois', kind: 'day_of_month', default: 28 }],
  },
  {
    type: 'payslip_ready',
    label: 'Fiche de paie disponible',
    desc: "Notifie l'employé concerné quand sa fiche de paie est enregistrée.",
    icon: 'FileText',
    severity: 'info',
    link: '/admin/personnel',
    requiredPermission: 'personnel.read',
    dynamicRecipients: true,
    defaultConfig: { channels },
    params: [],
  },
  {
    type: 'contract_expiry',
    label: 'Contrats arrivant à échéance',
    desc: "Quand le contrat d'un employé approche de sa date de fin.",
    icon: 'CalendarX',
    severity: 'warning',
    link: '/admin/personnel',
    requiredPermission: 'personnel.read',
    scheduled: true,
    defaultConfig: { recipient_roles: ['manager'], channels, lead_time_days: 30 },
    params: [{ key: 'lead_time_days', label: 'Préavis (jours avant échéance)', kind: 'days', default: 30 }],
  },
];

export const NOTIFICATION_TYPE_MAP: Record<string, NotifTypeDef> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.type, t]),
);

// Types whose enabled/recipients/channels are configured via notification_settings.
export const CONFIGURABLE_TYPES: string[] = NOTIFICATION_TYPES.map((t) => t.type);
