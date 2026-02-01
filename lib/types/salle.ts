// Salle / Table Management Types

export type TableShape = 'round' | 'square' | 'rectangle';
export type TableStatus = 'free' | 'occupied' | 'reserved' | 'cleaning';
export type SessionStatus = 'active' | 'served' | 'billed' | 'closed';
export type OrderItemStatus = 'ordered' | 'preparing' | 'served' | 'cancelled';

export interface FloorZone {
  id: string;
  name: string;
  sort_order: number;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  zone_id: string;
  table_number: string;
  seats: number;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: TableStatus;
  assigned_waiter_id: string | null;
  assigned_waiter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  // Joined for service view
  active_session?: TableSession | null;
}

/** Default dimensions per shape (percentage of canvas) */
export const SHAPE_DEFAULTS: Record<TableShape, { width: number; height: number }> = {
  round: { width: 8, height: 8 },
  square: { width: 8, height: 8 },
  rectangle: { width: 12, height: 7 },
};

export interface TableSession {
  id: string;
  table_id: string;
  waiter_id: string;
  guests_count: number;
  status: SessionStatus;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
  // Joined data
  waiter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  table?: Table;
  orders?: TableOrder[];
}

export interface TableOrder {
  id: string;
  session_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: OrderItemStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  menu_item?: {
    id: string;
    name: string;
    name_fr: string;
    price: number;
    category_id: string | null;
    image_url: string | null;
  };
}

export const TABLE_STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string }> = {
  free: { label: 'Libre', color: '#22c55e', bg: '#22c55e20' },
  occupied: { label: 'Occupée', color: '#ef4444', bg: '#ef444420' },
  reserved: { label: 'Réservée', color: '#f59e0b', bg: '#f59e0b20' },
  cleaning: { label: 'Nettoyage', color: '#6b7280', bg: '#6b728020' },
};

export const SESSION_STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#ef4444' },
  served: { label: 'Servie', color: '#3b82f6' },
  billed: { label: 'Facturée', color: '#f59e0b' },
  closed: { label: 'Fermée', color: '#6b7280' },
};

export const ORDER_STATUS_CONFIG: Record<OrderItemStatus, { label: string; color: string }> = {
  ordered: { label: 'Commandé', color: '#f59e0b' },
  preparing: { label: 'En préparation', color: '#3b82f6' },
  served: { label: 'Servi', color: '#22c55e' },
  cancelled: { label: 'Annulé', color: '#ef4444' },
};
