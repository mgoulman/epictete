/** Convert "HH:MM" or "HH:MM:SS" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes since midnight to "HH:MM:SS" */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Compute a new scheduled_time when a trip is reordered between two neighbors.
 * Returns the midpoint of beforeTime and afterTime, rounded to the nearest 5 minutes.
 * If only one neighbor exists, return the trip's own time unchanged.
 */
export function computeNewTime(
  beforeTime: string | null,
  afterTime: string | null,
  currentTime: string
): string {
  if (beforeTime && afterTime) {
    const bMin = timeToMinutes(beforeTime);
    const aMin = timeToMinutes(afterTime);
    const mid = Math.round((bMin + aMin) / 2 / 5) * 5;
    return minutesToTime(mid);
  }
  // Only one neighbor or none — keep current time
  return currentTime;
}
