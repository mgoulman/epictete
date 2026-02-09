// Transport Management Types

export type TripType = 'pickup' | 'dropoff';
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type Department = 'cuisine' | 'salle';

export interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  license_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransportTrip {
  id: string;
  date: string;
  trip_type: TripType;
  scheduled_time: string;
  driver_id: string | null;
  vehicle_id: string | null;
  driver?: Driver | null;
  vehicle?: Vehicle | null;
  status: TripStatus;
  notes: string | null;
  passengers?: TripPassenger[];
  created_at: string;
  updated_at: string;
}

export interface TripPassenger {
  id: string;
  trip_id: string;
  staff_id: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    department: Department | null;
  };
  created_at: string;
}

// Staff member with transport fields
export interface StaffWithTransport {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: Department | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
  is_active: boolean;
  staff_type?: {
    id: string;
    name: string;
    color: string;
  };
  schedule_type?: 'weekly' | 'monthly' | null;
  schedule_config?: Record<string, unknown> | null;
}

// Trip type configuration for UI
export const TRIP_TYPE_CONFIG: Record<TripType, { label: string; labelFr: string; color: string; bg: string }> = {
  pickup: { label: 'Pickup', labelFr: 'Ramassage', color: '#22c55e', bg: '#22c55e20' },
  dropoff: { label: 'Dropoff', labelFr: 'Retour', color: '#3b82f6', bg: '#3b82f620' }
};

// Trip status configuration for UI
export const TRIP_STATUS_CONFIG: Record<TripStatus, { label: string; labelFr: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', labelFr: 'Planifié', color: '#f59e0b', bg: '#f59e0b20' },
  in_progress: { label: 'In Progress', labelFr: 'En cours', color: '#3b82f6', bg: '#3b82f620' },
  completed: { label: 'Completed', labelFr: 'Terminé', color: '#22c55e', bg: '#22c55e20' },
  cancelled: { label: 'Cancelled', labelFr: 'Annulé', color: '#ef4444', bg: '#ef444420' }
};

// Department configuration for UI
export const DEPARTMENT_CONFIG: Record<Department, { label: string; labelFr: string; color: string; bg: string }> = {
  cuisine: { label: 'Kitchen', labelFr: 'Cuisine', color: '#f97316', bg: '#f9731620' },
  salle: { label: 'Dining Room', labelFr: 'Salle', color: '#8b5cf6', bg: '#8b5cf620' }
};

// Form data types
export interface DriverFormData {
  first_name: string;
  last_name: string;
  phone: string;
  license_number: string;
  is_active: boolean;
}

export interface VehicleFormData {
  name: string;
  plate_number: string;
  capacity: number;
  is_active: boolean;
}

// Generation request
export interface GenerateTripsRequest {
  startDate: string;
  endDate: string;
}

// Grouped shifts for schedule view
export interface GroupedShift {
  staff_id: string;
  staff_name: string;
  department: Department | null;
  start_time: string;
  end_time: string;
  staff_type?: {
    id: string;
    name: string;
    color: string;
  };
}
