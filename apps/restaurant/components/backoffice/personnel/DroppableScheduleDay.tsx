'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableShiftCard from './SortableShiftCard';
import { ShiftCardData } from './ShiftCard';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Shift {
  start_time: string;
  end_time: string;
}

interface DroppableScheduleDayProps {
  dayId: string; // e.g. 'monday'
  dayLabel: string;
  dayDate: number;
  isToday: boolean;
  staffCount: number;
  offCount: number;
  items: Array<{ id: string; data: ShiftCardData }>;
  onEditShifts: (staffId: string, dayName: string, shifts: Shift[]) => void;
  onRemoveFromDay: (staffId: string, dayName: string) => void;
}

export default function DroppableScheduleDay({
  dayId,
  dayLabel,
  dayDate,
  isToday,
  staffCount,
  offCount,
  items,
  onEditShifts,
  onRemoveFromDay,
}: DroppableScheduleDayProps) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const { setNodeRef, isOver } = useDroppable({ id: dayId });

  const itemIds = items.map(i => i.id);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Day Header */}
      <div
        className={`p-2 text-center border-b border-border ${
          isToday ? 'bg-[#606338] text-white' : 'bg-secondary'
        }`}
      >
        <div className="text-xs font-medium">{dayLabel}</div>
        <div className="text-lg font-bold">{dayDate}</div>
        <div className={`text-[10px] ${isToday ? 'text-white/70' : 'text-muted-foreground'}`}>
          {staffCount} {pn.in}
          {offCount > 0 && <span className="text-red-400"> · {offCount} {pn.off}</span>}
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-1.5 min-h-[200px] space-y-1.5 transition-colors ${
          isOver ? 'bg-[#606338]/10' : ''
        }`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableShiftCard
              key={item.id}
              id={item.id}
              data={item.data}
              dayName={dayId}
              onEditShifts={onEditShifts}
              onRemoveFromDay={onRemoveFromDay}
            />
          ))}
        </SortableContext>
        {items.length === 0 && !isOver && (
          <div className="text-[10px] text-muted-foreground text-center py-6">{pn.dropHere}</div>
        )}
        {items.length === 0 && isOver && (
          <div className="text-[10px] text-[#606338] text-center py-6 font-medium border-2 border-dashed border-[#606338]/30 rounded-lg">{pn.dropHere}</div>
        )}
      </div>
    </div>
  );
}
