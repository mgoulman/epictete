'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import StaffPool, { StaffChipOverlay } from './StaffPool';
import DroppableScheduleDay from './DroppableScheduleDay';
import ShiftCard, { ShiftCardData } from './ShiftCard';
import UndoToast from '../transport/UndoToast';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Shift {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  enabled: boolean;
  shifts: Shift[];
}

interface WeeklyScheduleConfig {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface StaffType {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  staff_type_id: string | null;
  staff_type: StaffType | null;
  hire_date: string;
  monthly_salary: number | null;
  is_active: boolean;
  notes: string | null;
  schedule_type: 'weekly' | null;
  schedule_config: WeeklyScheduleConfig | null;
  department: string | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
}

interface TimeOff {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

type ScheduleView = 'combined' | 'cuisine' | 'salle' | 'transport';
type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAY_NAMES: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getDefaultWeeklySchedule(): WeeklyScheduleConfig {
  const day: DaySchedule = { enabled: false, shifts: [{ start_time: '10:00', end_time: '18:00' }] };
  return {
    monday: { ...day }, tuesday: { ...day }, wednesday: { ...day }, thursday: { ...day },
    friday: { ...day }, saturday: { ...day }, sunday: { ...day },
  };
}

function normalizeWeeklyConfig(raw: Record<string, unknown>): WeeklyScheduleConfig {
  const result: Record<string, DaySchedule> = {};
  for (const day of DAY_NAMES) {
    const d = raw[day] as Record<string, unknown> | undefined;
    if (!d) {
      result[day] = { enabled: false, shifts: [{ start_time: '10:00', end_time: '18:00' }] };
      continue;
    }
    if (Array.isArray(d.shifts)) {
      result[day] = { enabled: !!d.enabled, shifts: d.shifts as Shift[] };
    } else {
      result[day] = {
        enabled: !!d.enabled,
        shifts: [{ start_time: (d.start_time as string) || '10:00', end_time: (d.end_time as string) || '18:00' }],
      };
    }
  }
  return result as unknown as WeeklyScheduleConfig;
}

function getDayNameFromDate(date: Date): DayName {
  const idx = date.getDay(); // 0=Sun, 1=Mon...
  return DAY_NAMES[idx === 0 ? 6 : idx - 1];
}

interface UndoEntry {
  staffId: string;
  prevConfig: WeeklyScheduleConfig;
  message: string;
}

interface ScheduleBoardProps {
  staffMembers: StaffMember[];
  weekDays: Date[];
  approvedTimeOff: TimeOff[];
  scheduleView: ScheduleView;
  onUpdateStaffSchedule: (staffId: string, newConfig: WeeklyScheduleConfig) => Promise<void>;
}

export default function ScheduleBoard({
  staffMembers,
  weekDays,
  approvedTimeOff,
  scheduleView,
  onUpdateStaffSchedule,
}: ScheduleBoardProps) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [poolSearch, setPoolSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Check if staff is on approved time-off for a given date
  const isStaffOff = useCallback((staffId: string, date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return approvedTimeOff.some(
      to => to.staff_id === staffId && to.status === 'approved' && dateStr >= to.start_date && dateStr <= to.end_date
    );
  }, [approvedTimeOff]);

  // Get the schedule config for a staff member (normalized)
  const getConfig = useCallback((staff: StaffMember): WeeklyScheduleConfig => {
    if (staff.schedule_config) {
      return normalizeWeeklyConfig(staff.schedule_config as unknown as Record<string, unknown>);
    }
    return getDefaultWeeklySchedule();
  }, []);

  // Build items for each day column
  const dayColumns = useMemo(() => {
    const columns: Record<DayName, Array<{ id: string; data: ShiftCardData }>> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };

    for (const staff of staffMembers) {
      if (!staff.is_active) continue;

      // View filter
      if (scheduleView === 'cuisine' && staff.department !== 'cuisine') continue;
      if (scheduleView === 'salle' && staff.department !== 'salle') continue;
      if (scheduleView === 'transport' && !staff.transport_pickup && !staff.transport_dropoff) continue;

      const config = getConfig(staff);

      for (let i = 0; i < weekDays.length; i++) {
        const day = weekDays[i];
        const dayName = getDayNameFromDate(day);
        const dayConfig = config[dayName];

        if (!dayConfig?.enabled) continue;

        const off = isStaffOff(staff.id, day);

        columns[dayName].push({
          id: `shift-${staff.id}-${dayName}`,
          data: {
            staffId: staff.id,
            staffName: `${staff.first_name} ${staff.last_name}`,
            staffType: staff.staff_type,
            department: staff.department,
            transportPickup: staff.transport_pickup,
            transportDropoff: staff.transport_dropoff,
            shifts: dayConfig.shifts,
            isOff: off,
          },
        });
      }
    }

    return columns;
  }, [staffMembers, weekDays, scheduleView, getConfig, isStaffOff]);

  // Day stats
  const dayStats = useMemo(() => {
    const stats: Record<DayName, { staffCount: number; offCount: number }> = {} as never;
    for (const dayName of DAY_NAMES) {
      const items = dayColumns[dayName];
      stats[dayName] = {
        staffCount: items.filter(i => !i.data.isOff).length,
        offCount: items.filter(i => i.data.isOff).length,
      };
    }
    return stats;
  }, [dayColumns]);

  // Identify what's being dragged
  const activeDragData = useMemo(() => {
    if (!activeId) return null;

    // Dragging from pool
    if (typeof activeId === 'string' && activeId.startsWith('pool-')) {
      const staffId = activeId.replace('pool-', '');
      return { type: 'pool' as const, staff: staffMembers.find(s => s.id === staffId) || null };
    }

    // Dragging a shift card
    if (typeof activeId === 'string' && activeId.startsWith('shift-')) {
      const parts = activeId.split('-');
      // shift-{staffId}-{dayName} but staffId could contain dashes (UUID)
      const dayName = parts[parts.length - 1] as DayName;
      const staffId = parts.slice(1, -1).join('-');
      const staff = staffMembers.find(s => s.id === staffId);
      const items = dayColumns[dayName] || [];
      const item = items.find(i => i.id === activeId);
      return { type: 'shift' as const, staff, item, dayName, staffId };
    }

    return null;
  }, [activeId, staffMembers, dayColumns]);

  // --- Handlers ---

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Determine target day (over could be day container ID or a shift card ID)
    let targetDay: DayName | null = null;
    if (DAY_NAMES.includes(overIdStr as DayName)) {
      targetDay = overIdStr as DayName;
    } else if (overIdStr.startsWith('shift-')) {
      const parts = overIdStr.split('-');
      targetDay = parts[parts.length - 1] as DayName;
    }
    if (!targetDay) return;

    // --- POOL → DAY: Create new shift ---
    if (activeIdStr.startsWith('pool-')) {
      const staffId = activeIdStr.replace('pool-', '');
      const staff = staffMembers.find(s => s.id === staffId);
      if (!staff) return;

      const config = getConfig(staff);
      const dayConfig = config[targetDay];

      // Already has shifts for this staff on this day?
      if (dayConfig.enabled && dayConfig.shifts.length >= 2) return; // max 2

      const prevConfig = JSON.parse(JSON.stringify(config)) as WeeklyScheduleConfig;

      if (dayConfig.enabled) {
        // Add second shift
        dayConfig.shifts.push({ start_time: '18:00', end_time: '22:00' });
      } else {
        // Enable day with default times
        dayConfig.enabled = true;
        dayConfig.shifts = [{ start_time: '10:00', end_time: '18:00' }];
      }

      config[targetDay] = dayConfig;

      setUndoEntry({ staffId, prevConfig, message: pn.shiftAdded || 'Shift added' });
      await onUpdateStaffSchedule(staffId, config);
      return;
    }

    // --- SHIFT → DIFFERENT DAY: Move ---
    if (activeIdStr.startsWith('shift-')) {
      const parts = activeIdStr.split('-');
      const sourceDayName = parts[parts.length - 1] as DayName;
      const staffId = parts.slice(1, -1).join('-');

      if (sourceDayName === targetDay) return; // no-op same day

      const staff = staffMembers.find(s => s.id === staffId);
      if (!staff) return;

      const config = getConfig(staff);
      const sourceDay = config[sourceDayName];
      const targetDayConfig = config[targetDay];

      // Check target capacity
      if (targetDayConfig.enabled && targetDayConfig.shifts.length >= 2) return;

      const prevConfig = JSON.parse(JSON.stringify(config)) as WeeklyScheduleConfig;

      // Copy shifts to target
      const shiftsToMove = [...sourceDay.shifts];
      if (targetDayConfig.enabled) {
        // Merge (add first shift from source)
        targetDayConfig.shifts.push(shiftsToMove[0]);
      } else {
        targetDayConfig.enabled = true;
        targetDayConfig.shifts = shiftsToMove;
      }

      // Disable source day
      sourceDay.enabled = false;
      sourceDay.shifts = [{ start_time: '10:00', end_time: '18:00' }];

      config[sourceDayName] = sourceDay;
      config[targetDay] = targetDayConfig;

      setUndoEntry({ staffId, prevConfig, message: pn.shiftMoved || 'Shift moved' });
      await onUpdateStaffSchedule(staffId, config);
    }
  }, [staffMembers, getConfig, onUpdateStaffSchedule, pn]);

  // Edit shift times inline
  const handleEditShifts = useCallback(async (staffId: string, dayName: string, shifts: Shift[]) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    const config = getConfig(staff);
    config[dayName as DayName].shifts = shifts;

    await onUpdateStaffSchedule(staffId, config);
  }, [staffMembers, getConfig, onUpdateStaffSchedule]);

  // Remove from day
  const handleRemoveFromDay = useCallback(async (staffId: string, dayName: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    const config = getConfig(staff);
    const prevConfig = JSON.parse(JSON.stringify(config)) as WeeklyScheduleConfig;

    config[dayName as DayName] = {
      enabled: false,
      shifts: [{ start_time: '10:00', end_time: '18:00' }],
    };

    setUndoEntry({ staffId, prevConfig, message: pn.shiftRemoved || 'Shift removed' });
    await onUpdateStaffSchedule(staffId, config);
  }, [staffMembers, getConfig, onUpdateStaffSchedule, pn]);

  // Undo
  const handleUndo = useCallback(async () => {
    if (!undoEntry) return;
    await onUpdateStaffSchedule(undoEntry.staffId, undoEntry.prevConfig);
    setUndoEntry(null);
  }, [undoEntry, onUpdateStaffSchedule]);

  const handleDismissUndo = useCallback(() => setUndoEntry(null), []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Staff Pool */}
        <StaffPool
          staffMembers={staffMembers}
          scheduleView={scheduleView}
          searchTerm={poolSearch}
          onSearchChange={setPoolSearch}
        />

        {/* 7-Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dayName = getDayNameFromDate(day);
            return (
              <DroppableScheduleDay
                key={dayName}
                dayId={dayName}
                dayLabel={day.toLocaleDateString('en-US', { weekday: 'short' })}
                dayDate={day.getDate()}
                isToday={day.toDateString() === new Date().toDateString()}
                staffCount={dayStats[dayName].staffCount}
                offCount={dayStats[dayName].offCount}
                items={dayColumns[dayName]}
                onEditShifts={handleEditShifts}
                onRemoveFromDay={handleRemoveFromDay}
              />
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeDragData?.type === 'pool' && activeDragData.staff && (
            <StaffChipOverlay staff={activeDragData.staff} />
          )}
          {activeDragData?.type === 'shift' && activeDragData.item && (
            <div className="w-[140px]">
              <ShiftCard
                data={activeDragData.item.data}
                dayName={activeDragData.dayName!}
                onEditShifts={() => {}}
                onRemoveFromDay={() => {}}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {undoEntry && (
        <UndoToast
          message={undoEntry.message}
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      )}
    </>
  );
}
