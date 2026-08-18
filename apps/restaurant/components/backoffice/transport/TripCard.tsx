'use client';

import { useState } from 'react';
import {
  Driver, Vehicle, TransportTrip,
  TRIP_TYPE_CONFIG, DEPARTMENT_CONFIG
} from '@/lib/types/transport';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface TripCardProps {
  trip: TransportTrip;
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateTrip: (tripId: string, driverId: string | null, vehicleId: string | null) => void;
  isDragging?: boolean;
}

export default function TripCard({ trip, drivers, vehicles, onUpdateTrip, isDragging }: TripCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const tc = t.backoffice.transportComp;
  const typeConfig = TRIP_TYPE_CONFIG[trip.trip_type];
  const passengerCount = trip.passengers?.length || 0;

  return (
    <div
      className={`p-2 rounded-lg border border-border text-xs cursor-pointer hover:bg-secondary/50 transition-colors ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-[#606338]/40' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground">{trip.scheduled_time.slice(0, 5)}</span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
        >
          {typeConfig.labelFr}
        </span>
      </div>
      <div className="text-muted-foreground mb-1">
        {passengerCount} {passengerCount !== 1 ? tc.passengers : tc.passenger}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
          {/* Driver Select */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">{tc.driver}</label>
            <select
              value={trip.driver_id || ''}
              onChange={(e) => onUpdateTrip(trip.id, e.target.value || null, trip.vehicle_id)}
              className="w-full px-2 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
            >
              <option value="">{tc.unassigned}</option>
              {drivers.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Select */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">{tc.vehicle}</label>
            <select
              value={trip.vehicle_id || ''}
              onChange={(e) => onUpdateTrip(trip.id, trip.driver_id, e.target.value || null)}
              className="w-full px-2 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
            >
              <option value="">{tc.unassigned}</option>
              {vehicles.filter(v => v.is_active).map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.capacity})</option>
              ))}
            </select>
          </div>

          {/* Passengers */}
          {trip.passengers && trip.passengers.length > 0 && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">{tc.passengers}</label>
              <div className="space-y-0.5">
                {trip.passengers.map(p => (
                  <div key={p.id} className="text-foreground">
                    {p.staff?.first_name} {p.staff?.last_name}
                    {p.staff?.department && (
                      <span className="ml-1 text-muted-foreground">
                        ({DEPARTMENT_CONFIG[p.staff.department]?.labelFr})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
