'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTripCard from './SortableTripCard';
import { Driver, Vehicle, TransportTrip } from '@/lib/types/transport';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface DroppableDayProps {
  dayId: string; // date string "YYYY-MM-DD"
  dayLabel: string;
  isToday: boolean;
  trips: TransportTrip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateTrip: (tripId: string, driverId: string | null, vehicleId: string | null) => void;
}

export default function DroppableDay({
  dayId,
  dayLabel,
  isToday,
  trips,
  drivers,
  vehicles,
  onUpdateTrip,
}: DroppableDayProps) {
  const { t } = useTranslation();
  const tc = t.backoffice.transportComp;
  const { setNodeRef, isOver } = useDroppable({ id: dayId });

  const tripIds = trips.map(t => t.id);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div
        className={`p-2 text-center text-sm font-medium border-b border-border ${
          isToday ? 'bg-[#606338] text-white' : 'bg-secondary'
        }`}
      >
        {dayLabel}
      </div>
      <div
        ref={setNodeRef}
        className={`p-2 min-h-[300px] space-y-2 transition-colors ${
          isOver ? 'bg-[#606338]/10' : ''
        }`}
      >
        <SortableContext items={tripIds} strategy={verticalListSortingStrategy}>
          {trips.map(trip => (
            <SortableTripCard
              key={trip.id}
              trip={trip}
              drivers={drivers}
              vehicles={vehicles}
              onUpdateTrip={onUpdateTrip}
            />
          ))}
        </SortableContext>
        {trips.length === 0 && !isOver && (
          <div className="text-xs text-muted-foreground text-center py-4">{tc.noTrips}</div>
        )}
      </div>
    </div>
  );
}
