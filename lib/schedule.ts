// Shared helpers for reading a staff member's weekly schedule config.

export interface Shift { start_time: string; end_time: string; }
export interface DaySchedule { enabled: boolean; shifts: Shift[]; }
export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAY_NAMES: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** Day name for a YYYY-MM-DD string (parsed as a plain calendar date). */
export function dayNameForDateString(dateStr: string): DayName {
  const [y, m, d] = dateStr.split('-').map(Number);
  const idx = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return DAY_NAMES[idx === 0 ? 6 : idx - 1];
}

/** First planned shift for a staff config on the given date, or null if not scheduled. */
export function plannedShiftFor(config: unknown, dateStr: string): Shift | null {
  if (!config || typeof config !== 'object') return null;
  const day = dayNameForDateString(dateStr);
  const raw = (config as Record<string, unknown>)[day] as Record<string, unknown> | undefined;
  if (!raw || !raw.enabled) return null;
  if (Array.isArray(raw.shifts) && raw.shifts.length > 0) {
    return raw.shifts[0] as Shift;
  }
  if (raw.start_time && raw.end_time) {
    return { start_time: raw.start_time as string, end_time: raw.end_time as string };
  }
  return null;
}
