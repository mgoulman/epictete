-- Transport Management Schema
-- This migration creates tables for managing staff transport scheduling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.drivers IS 'Drivers available for staff transport';

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.vehicles IS 'Vehicles available for staff transport';
COMMENT ON COLUMN public.vehicles.name IS 'Display name for the vehicle, e.g. Van 1, Minibus';
COMMENT ON COLUMN public.vehicles.capacity IS 'Maximum passenger capacity';

-- Add department and transport preference columns to staff_members
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('cuisine', 'salle'));

ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS transport_pickup BOOLEAN DEFAULT false;

ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS transport_dropoff BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.staff_members.department IS 'Staff department: cuisine (kitchen) or salle (dining room)';
COMMENT ON COLUMN public.staff_members.transport_pickup IS 'Whether staff needs pickup transport to work';
COMMENT ON COLUMN public.staff_members.transport_dropoff IS 'Whether staff needs dropoff transport from work';

-- Transport trips table (generated schedules)
CREATE TABLE IF NOT EXISTS public.transport_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  trip_type TEXT NOT NULL CHECK (trip_type IN ('pickup', 'dropoff')),
  scheduled_time TIME NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.transport_trips IS 'Auto-generated transport trips for staff';
COMMENT ON COLUMN public.transport_trips.trip_type IS 'Type of trip: pickup (to work) or dropoff (from work)';
COMMENT ON COLUMN public.transport_trips.scheduled_time IS 'Time the trip is scheduled to depart';

-- Trip passengers (staff assigned to each trip)
CREATE TABLE IF NOT EXISTS public.transport_trip_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, staff_id)
);

COMMENT ON TABLE public.transport_trip_passengers IS 'Staff members assigned to each transport trip';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_active ON public.drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_transport_trips_date ON public.transport_trips(date);
CREATE INDEX IF NOT EXISTS idx_transport_trips_type_date ON public.transport_trips(trip_type, date);
CREATE INDEX IF NOT EXISTS idx_transport_trip_passengers_trip ON public.transport_trip_passengers(trip_id);
CREATE INDEX IF NOT EXISTS idx_transport_trip_passengers_staff ON public.transport_trip_passengers(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_department ON public.staff_members(department);
CREATE INDEX IF NOT EXISTS idx_staff_members_transport ON public.staff_members(transport_pickup, transport_dropoff);

-- Enable RLS on new tables
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trip_passengers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers
CREATE POLICY "Authenticated users can read drivers"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage drivers"
  ON public.drivers FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- RLS Policies for vehicles
CREATE POLICY "Authenticated users can read vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- RLS Policies for transport_trips
CREATE POLICY "Authenticated users can read transport trips"
  ON public.transport_trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage transport trips"
  ON public.transport_trips FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- RLS Policies for transport_trip_passengers
CREATE POLICY "Authenticated users can read trip passengers"
  ON public.transport_trip_passengers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trip passengers"
  ON public.transport_trip_passengers FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- Update trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transport_trips_updated_at ON public.transport_trips;
CREATE TRIGGER update_transport_trips_updated_at
  BEFORE UPDATE ON public.transport_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
