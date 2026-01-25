// Time-based availability utilities for Morocco timezone (Africa/Casablanca)
import { MenuCategory, DayOfWeek } from './supabase';

const MOROCCO_TIMEZONE = 'Africa/Casablanca';

// Get current time in Morocco
export function getMoroccoTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: MOROCCO_TIMEZONE }));
}

// Get current day of week in Morocco
export function getMoroccoDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const moroccoTime = getMoroccoTime();
  return days[moroccoTime.getDay()];
}

// Check if current time is within a time range
function isWithinTimeRange(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return true;
  
  const now = getMoroccoTime();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse time strings (HH:MM:SS format)
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Check if current day is in the available days
function isDayAvailable(availableDays: DayOfWeek[] | null): boolean {
  if (!availableDays || availableDays.length === 0) return true;
  const today = getMoroccoDayOfWeek();
  return availableDays.includes(today);
}

// Check if a category is currently available
export function isCategoryAvailable(category: MenuCategory): boolean {
  if (category.availability_type === 'always') return true;
  
  const dayAvailable = isDayAvailable(category.available_days);
  const timeAvailable = isWithinTimeRange(category.available_start_time, category.available_end_time);
  
  return dayAvailable && timeAvailable;
}

// Check if it's currently brunch time (weekend 10 AM - 2 PM)
export function isBrunchTime(): boolean {
  const today = getMoroccoDayOfWeek();
  const isWeekend = today === 'saturday' || today === 'sunday';
  
  if (!isWeekend) return false;
  
  return isWithinTimeRange('10:00:00', '14:00:00');
}

// Check if it's currently breakfast time (until 10 AM)
export function isBreakfastTime(): boolean {
  return isWithinTimeRange('07:00:00', '10:00:00');
}

// Get availability status for a category
export interface AvailabilityStatus {
  isAvailable: boolean;
  isHighlighted: boolean;  // For brunch animation
  availabilityTag: string | null;  // Message to show when unavailable
}

export function getCategoryAvailabilityStatus(category: MenuCategory): AvailabilityStatus {
  const isAvailable = isCategoryAvailable(category);
  
  // Determine if this is brunch and should be highlighted
  const isHighlighted = category.availability_type === 'brunch' && isBrunchTime();
  
  // Generate availability tag
  let availabilityTag: string | null = null;
  
  if (!isAvailable) {
    switch (category.availability_type) {
      case 'breakfast':
        availabilityTag = 'Disponible jusqu\'à 10h';
        break;
      case 'brunch':
        availabilityTag = 'Disponible Sam-Dim 10h-14h';
        break;
      case 'custom':
        if (category.available_days && category.available_start_time && category.available_end_time) {
          const daysStr = category.available_days
            .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3))
            .join(', ');
          const startTime = category.available_start_time.slice(0, 5);
          const endTime = category.available_end_time.slice(0, 5);
          availabilityTag = `Disponible ${daysStr} ${startTime}-${endTime}`;
        }
        break;
    }
  } else if (category.availability_type !== 'always') {
    // Show subtle reminder even when available
    switch (category.availability_type) {
      case 'breakfast':
        availabilityTag = 'Jusqu\'à 10h';
        break;
      case 'brunch':
        availabilityTag = 'Sam-Dim 10h-14h';
        break;
    }
  }
  
  return { isAvailable, isHighlighted, availabilityTag };
}

// Format time for display
export function formatAvailabilityTime(category: MenuCategory): string {
  if (category.availability_type === 'always') return '';
  
  if (category.availability_type === 'breakfast') {
    return '7h - 10h';
  }
  
  if (category.availability_type === 'brunch') {
    return 'Sam-Dim 10h - 14h';
  }
  
  if (category.available_start_time && category.available_end_time) {
    const start = category.available_start_time.slice(0, 5).replace(':', 'h');
    const end = category.available_end_time.slice(0, 5).replace(':', 'h');
    return `${start} - ${end}`;
  }
  
  return '';
}
