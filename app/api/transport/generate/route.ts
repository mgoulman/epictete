import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

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

interface MonthlyScheduleConfig {
  default_shifts: Shift[];
  days_per_month: number;
  working_days: string[];
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
  schedule_type: 'weekly' | 'monthly' | null;
  schedule_config: Record<string, unknown> | null;
}

// Normalize schedule config for backward compatibility
function normalizeWeeklyConfig(raw: Record<string, unknown>): WeeklyScheduleConfig {
  const days: (keyof WeeklyScheduleConfig)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result = {} as WeeklyScheduleConfig;

  for (const day of days) {
    const d = raw[day] as Record<string, unknown> | undefined;
    if (!d) {
      result[day] = { enabled: false, shifts: [{ start_time: '09:00', end_time: '17:00' }] };
      continue;
    }
    if (Array.isArray(d.shifts)) {
      result[day] = { enabled: !!d.enabled, shifts: d.shifts as Shift[] };
    } else {
      result[day] = {
        enabled: !!d.enabled,
        shifts: [{ start_time: (d.start_time as string) || '09:00', end_time: (d.end_time as string) || '17:00' }]
      };
    }
  }
  return result;
}

function normalizeMonthlyConfig(raw: Record<string, unknown>): MonthlyScheduleConfig {
  const days_per_month = (raw.days_per_month as number) || 22;
  if (Array.isArray(raw.default_shifts)) {
    return {
      default_shifts: raw.default_shifts as Shift[],
      days_per_month,
      working_days: Array.isArray(raw.working_days) ? raw.working_days as string[] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    };
  }
  return {
    default_shifts: [{
      start_time: (raw.default_start_time as string) || '09:00',
      end_time: (raw.default_end_time as string) || '17:00',
    }],
    days_per_month,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
}

// Get shifts for a staff member on a specific date
function getStaffShifts(staff: StaffMember, date: Date): Shift[] {
  if (!staff.schedule_type || !staff.schedule_config) return [];

  const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const dayName = dayMap[date.getDay()];

  if (staff.schedule_type === 'weekly') {
    const config = normalizeWeeklyConfig(staff.schedule_config);
    const dayConfig = config[dayName as keyof WeeklyScheduleConfig];
    if (dayConfig?.enabled) {
      return dayConfig.shifts;
    }
  } else if (staff.schedule_type === 'monthly') {
    const config = normalizeMonthlyConfig(staff.schedule_config);
    if (config.working_days.includes(dayName)) {
      return config.default_shifts;
    }
  }

  return [];
}

// POST - Generate transport trips for a date range
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Get all active staff with transport preferences
    const { data: staffList, error: staffError } = await supabase
      .from('staff_members')
      .select('id, first_name, last_name, department, transport_pickup, transport_dropoff, schedule_type, schedule_config')
      .eq('is_active', true)
      .or('transport_pickup.eq.true,transport_dropoff.eq.true');

    if (staffError) throw staffError;

    const staff = staffList as StaffMember[];

    // Fetch approved time-off records that overlap with the date range
    const { data: timeOffRecords } = await supabase
      .from('time_off')
      .select('staff_id, start_date, end_date')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    // Delete existing trips for the date range (to regenerate)
    const { error: deleteError } = await supabase
      .from('transport_trips')
      .delete()
      .gte('date', startDate)
      .lte('date', endDate);

    if (deleteError) throw deleteError;

    // Generate trips for each day
    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripsToCreate: Array<{
      date: string;
      trip_type: string;
      scheduled_time: string;
      status: string;
    }> = [];
    const tripPassengersMap: Map<string, string[]> = new Map(); // key: "date|type|time", value: staff IDs

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Collect pickup times and dropoff times
      const pickupTimes: Map<string, string[]> = new Map(); // time -> staff IDs
      const dropoffTimes: Map<string, string[]> = new Map(); // time -> staff IDs

      for (const s of staff) {
        // Skip staff on approved day off
        const isOff = timeOffRecords?.some(t =>
          t.staff_id === s.id && t.start_date <= dateStr && t.end_date >= dateStr
        );
        if (isOff) continue;

        const shifts = getStaffShifts(s, d);

        for (const shift of shifts) {
          // Pickup: staff needs to arrive at shift start time
          if (s.transport_pickup) {
            const time = shift.start_time.slice(0, 5); // HH:MM
            if (!pickupTimes.has(time)) pickupTimes.set(time, []);
            pickupTimes.get(time)!.push(s.id);
          }

          // Dropoff: staff leaves at shift end time
          if (s.transport_dropoff) {
            const time = shift.end_time.slice(0, 5); // HH:MM
            if (!dropoffTimes.has(time)) dropoffTimes.set(time, []);
            dropoffTimes.get(time)!.push(s.id);
          }
        }
      }

      // Create pickup trips
      for (const [time, staffIds] of pickupTimes) {
        const key = `${dateStr}|pickup|${time}`;
        tripsToCreate.push({
          date: dateStr,
          trip_type: 'pickup',
          scheduled_time: time,
          status: 'scheduled'
        });
        tripPassengersMap.set(key, staffIds);
      }

      // Create dropoff trips
      for (const [time, staffIds] of dropoffTimes) {
        const key = `${dateStr}|dropoff|${time}`;
        tripsToCreate.push({
          date: dateStr,
          trip_type: 'dropoff',
          scheduled_time: time,
          status: 'scheduled'
        });
        tripPassengersMap.set(key, staffIds);
      }
    }

    // Insert trips in batch
    if (tripsToCreate.length === 0) {
      return NextResponse.json({ success: true, tripsCreated: 0, message: 'No trips to generate' });
    }

    const { data: createdTrips, error: insertError } = await supabase
      .from('transport_trips')
      .insert(tripsToCreate)
      .select();

    if (insertError) throw insertError;

    // Insert passengers for each trip
    const allPassengers: Array<{ trip_id: string; staff_id: string }> = [];
    for (const trip of createdTrips || []) {
      const key = `${trip.date}|${trip.trip_type}|${trip.scheduled_time.slice(0, 5)}`;
      const staffIds = tripPassengersMap.get(key) || [];
      for (const staffId of staffIds) {
        allPassengers.push({ trip_id: trip.id, staff_id: staffId });
      }
    }

    if (allPassengers.length > 0) {
      const { error: passengersError } = await supabase
        .from('transport_trip_passengers')
        .insert(allPassengers);

      if (passengersError) throw passengersError;
    }

    return NextResponse.json({
      success: true,
      tripsCreated: createdTrips?.length || 0,
      passengersAssigned: allPassengers.length
    });
  } catch (error) {
    console.error('Transport generate error:', error);
    return NextResponse.json({ error: 'Failed to generate trips' }, { status: 500 });
  }
}
