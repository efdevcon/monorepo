import { format, parse, isValid } from 'date-fns';
import { Event } from './model';

/**
 * Computes a sorted array of all unique dates that have events
 * 
 * @param events - Array of event objects
 * @returns Array of date strings in ISO format (YYYY-MM-DD), sorted chronologically
 */
export function computeCalendarRange(events: Event[]): string[] {
  if (!events || events.length === 0) {
    return [];
  }

  const uniqueDates = new Set<string>();
  
  events.forEach(event => {
    // Process all timeblocks for each event
    event.timeblocks.forEach(timeblock => {
      if (timeblock.start) {
        // Extract the date part from the ISO string
        const startDate = timeblock.start.split('T')[0];
        if (isValidDateString(startDate)) {
          uniqueDates.add(startDate);
        }
      }
      
      if (timeblock.end) {
        // Extract the date part from the ISO string
        const endDate = timeblock.end.split('T')[0];
        if (isValidDateString(endDate)) {
          uniqueDates.add(endDate);
        }
        
        // If start and end dates are different, add all dates in between
        const startDate = timeblock.start.split('T')[0];
        if (startDate !== endDate) {
          const dates = getDatesInRange(startDate, endDate);
          dates.forEach(date => uniqueDates.add(date));
        }
      }
    });
  });

  // Convert to array and sort chronologically
  return Array.from(uniqueDates).sort();
}

/**
 * Validates if a string is in the expected date format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(date);
}

/**
 * Gets all dates between start and end date (inclusive)
 */
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
  const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
  
  if (!isValid(startDate) || !isValid(endDate)) {
    return [];
  }
  
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  // Add each date in the range
  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
} 