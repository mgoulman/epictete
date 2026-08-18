'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ShiftCard, { ShiftCardData } from './ShiftCard';

interface Shift {
  start_time: string;
  end_time: string;
}

interface SortableShiftCardProps {
  id: string;
  data: ShiftCardData;
  dayName: string;
  onEditShifts: (staffId: string, dayName: string, shifts: Shift[]) => void;
  onRemoveFromDay: (staffId: string, dayName: string) => void;
}

export default function SortableShiftCard({ id, data, dayName, onEditShifts, onRemoveFromDay }: SortableShiftCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ShiftCard
        data={data}
        dayName={dayName}
        onEditShifts={onEditShifts}
        onRemoveFromDay={onRemoveFromDay}
        isDragging={isDragging}
      />
    </div>
  );
}
