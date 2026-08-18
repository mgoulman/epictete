'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import DroppableDay from './DroppableDay';
import TripCard from './TripCard';
import UndoToast from './UndoToast';
import { Driver, Vehicle, TransportTrip } from '@/lib/types/transport';
import { computeNewTime } from '@/lib/utils/schedule-time';

interface DraggableScheduleGridProps {
  weekDays: Date[];
  trips: TransportTrip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  tripTypeFilter: 'all' | 'pickup' | 'dropoff';
  formatDate: (date: Date) => string;
  onUpdateTrip: (tripId: string, driverId: string | null, vehicleId: string | null) => void;
  onDragUpdateTrip: (tripId: string, date: string, scheduledTime: string) => Promise<void>;
}

interface UndoEntry {
  tripId: string;
  prevDate: string;
  prevTime: string;
  newDate: string;
  newTime: string;
}

/** Get "YYYY-MM-DD" from a Date */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function DraggableScheduleGrid({
  weekDays,
  trips,
  drivers,
  vehicles,
  tripTypeFilter,
  formatDate,
  onUpdateTrip,
  onDragUpdateTrip,
}: DraggableScheduleGridProps) {
  // Local optimistic copy of trips (keyed by day)
  const [localTrips, setLocalTrips] = useState<TransportTrip[]>(trips);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const prevTripsRef = useRef(trips);

  // Sync from parent when trips change (e.g. week navigation, generate)
  if (trips !== prevTripsRef.current) {
    prevTripsRef.current = trips;
    setLocalTrips(trips);
    setUndoEntry(null);
  }

  // 5px activation distance so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Build trips-per-day map
  const tripsByDay = useMemo(() => {
    const map: Record<string, TransportTrip[]> = {};
    for (const day of weekDays) {
      const dateStr = toDateStr(day);
      let dayTrips = localTrips.filter(t => t.date === dateStr);
      if (tripTypeFilter !== 'all') {
        dayTrips = dayTrips.filter(t => t.trip_type === tripTypeFilter);
      }
      dayTrips.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
      map[dateStr] = dayTrips;
    }
    return map;
  }, [localTrips, weekDays, tripTypeFilter]);

  // Find which day-container a trip lives in
  const findContainer = useCallback(
    (tripId: string): string | null => {
      for (const [dayId, dayTrips] of Object.entries(tripsByDay)) {
        if (dayTrips.some(t => t.id === tripId)) return dayId;
      }
      return null;
    },
    [tripsByDay]
  );

  const activeTrip = activeId ? localTrips.find(t => t.id === activeId) : null;

  // --- Drag handlers ---

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      const activeContainer = findContainer(activeIdStr);
      // over could be a day-container ID or another trip ID
      let overContainer = tripsByDay[overIdStr] ? overIdStr : findContainer(overIdStr);

      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      // Move trip between containers optimistically during drag
      setLocalTrips(prev => {
        const trip = prev.find(t => t.id === activeIdStr);
        if (!trip) return prev;

        return prev.map(t =>
          t.id === activeIdStr ? { ...t, date: overContainer as string } : t
        );
      });
    },
    [findContainer, tripsByDay]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      const trip = localTrips.find(t => t.id === activeIdStr);
      if (!trip) return;

      // Original values before this drag (from parent trips)
      const originalTrip = trips.find(t => t.id === activeIdStr);
      const prevDate = originalTrip?.date || trip.date;
      const prevTime = originalTrip?.scheduled_time || trip.scheduled_time;

      const activeContainer = findContainer(activeIdStr);
      const overContainer = tripsByDay[overIdStr] ? overIdStr : findContainer(overIdStr);

      if (!activeContainer || !overContainer) return;

      let newDate = overContainer;
      let newTime = trip.scheduled_time;

      if (activeContainer === overContainer) {
        // Reorder within same day
        const dayTrips = tripsByDay[activeContainer];
        const oldIndex = dayTrips.findIndex(t => t.id === activeIdStr);
        const overIndex = dayTrips.findIndex(t => t.id === overIdStr);

        if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
          const reordered = arrayMove(dayTrips, oldIndex, overIndex);

          // Compute new time based on neighbors
          const newIdx = reordered.findIndex(t => t.id === activeIdStr);
          const beforeTrip = newIdx > 0 ? reordered[newIdx - 1] : null;
          const afterTrip = newIdx < reordered.length - 1 ? reordered[newIdx + 1] : null;

          newTime = computeNewTime(
            beforeTrip?.scheduled_time ?? null,
            afterTrip?.scheduled_time ?? null,
            trip.scheduled_time
          );

          // Update local state with new order
          setLocalTrips(prev =>
            prev.map(t => (t.id === activeIdStr ? { ...t, scheduled_time: newTime } : t))
          );
        } else {
          // Dropped in same position, no change
          return;
        }
      } else {
        // Moved to different day — date already updated in handleDragOver, time stays the same
        newDate = overContainer;
      }

      // Check if anything actually changed
      if (newDate === prevDate && newTime === prevTime) return;

      // Store undo entry
      setUndoEntry({
        tripId: activeIdStr,
        prevDate,
        prevTime,
        newDate,
        newTime,
      });

      // Persist to DB
      await onDragUpdateTrip(activeIdStr, newDate, newTime);
    },
    [localTrips, trips, findContainer, tripsByDay, onDragUpdateTrip]
  );

  // --- Undo ---

  const handleUndo = useCallback(async () => {
    if (!undoEntry) return;
    const { tripId, prevDate, prevTime } = undoEntry;

    // Optimistic rollback
    setLocalTrips(prev =>
      prev.map(t =>
        t.id === tripId ? { ...t, date: prevDate, scheduled_time: prevTime } : t
      )
    );
    setUndoEntry(null);

    // Persist rollback
    await onDragUpdateTrip(tripId, prevDate, prevTime);
  }, [undoEntry, onDragUpdateTrip]);

  const handleDismissUndo = useCallback(() => {
    setUndoEntry(null);
  }, []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dateStr = toDateStr(day);
            return (
              <DroppableDay
                key={dateStr}
                dayId={dateStr}
                dayLabel={formatDate(day)}
                isToday={day.toDateString() === new Date().toDateString()}
                trips={tripsByDay[dateStr] || []}
                drivers={drivers}
                vehicles={vehicles}
                onUpdateTrip={onUpdateTrip}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTrip ? (
            <div className="w-[140px]">
              <TripCard
                trip={activeTrip}
                drivers={drivers}
                vehicles={vehicles}
                onUpdateTrip={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {undoEntry && (
        <UndoToast
          message="Trip moved"
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      )}
    </>
  );
}
