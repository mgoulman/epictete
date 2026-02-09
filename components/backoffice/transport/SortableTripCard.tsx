'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TripCard from './TripCard';
import { Driver, Vehicle, TransportTrip } from '@/lib/types/transport';

interface SortableTripCardProps {
  trip: TransportTrip;
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateTrip: (tripId: string, driverId: string | null, vehicleId: string | null) => void;
}

export default function SortableTripCard({ trip, drivers, vehicles, onUpdateTrip }: SortableTripCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TripCard
        trip={trip}
        drivers={drivers}
        vehicles={vehicles}
        onUpdateTrip={onUpdateTrip}
        isDragging={isDragging}
      />
    </div>
  );
}
