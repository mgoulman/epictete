import {
  LayoutDashboard,
  Wallet,
  LineChart,
  Receipt,
  Truck,
  Package,
  ShoppingCart,
  Users,
  CalendarClock,
  UserCog,
  Store,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission slug; owners/admins bypass the check. */
  permission?: string;
  /** Not yet built — rendered but flagged "bientôt". */
  soon?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Wedge-first, MVP-only. POS (salle/cuisine), transport, marketing, docs, menu/recipes
// are intentionally absent — see the product-ux scope decision.
export const NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Feuille de Caisse", href: "/caisse", icon: Wallet, permission: "finance.read" },
      { label: "Rapports", href: "/rapports", icon: LineChart, permission: "finance.read", soon: true },
    ],
  },
  {
    title: "Argent",
    items: [
      { label: "Dépenses", href: "/depenses", icon: Receipt, permission: "finance.read", soon: true },
      { label: "Fournisseurs", href: "/fournisseurs", icon: Truck, permission: "inventory.read", soon: true },
    ],
  },
  {
    title: "Stock",
    items: [
      { label: "Inventaire", href: "/stock", icon: Package, permission: "inventory.read" },
      { label: "Achats du jour", href: "/stock/achats", icon: ShoppingCart, permission: "inventory.read", soon: true },
    ],
  },
  {
    title: "Équipe",
    items: [
      { label: "Personnel", href: "/equipe", icon: Users, permission: "personnel.read", soon: true },
      { label: "Présence", href: "/equipe/presence", icon: CalendarClock, permission: "personnel.read", soon: true },
    ],
  },
  {
    title: "Réglages",
    items: [
      { label: "Utilisateurs", href: "/reglages/utilisateurs", icon: UserCog, permission: "users.manage" },
      { label: "Restaurant", href: "/reglages/restaurant", icon: Store, permission: "settings.manage" },
    ],
  },
];

/** Owners/admins see everything; otherwise gate on the granted permission set. */
export function canSee(item: NavItem, role: string | null, perms: string[]): boolean {
  if (role === "owner" || role === "admin") return true;
  if (!item.permission) return true;
  return perms.includes(item.permission);
}
