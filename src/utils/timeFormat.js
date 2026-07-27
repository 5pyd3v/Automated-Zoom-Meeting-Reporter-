import { AppError } from './errors.js';

/**
 * Parses a 24-hour "HH:mm" time string (as produced by an HTML
 * <input type="time"> picker) into total minutes since midnight.
 * @param {string} value e.g. "23:27"
 * @returns {number}
 */
export function parseTimeInputToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    throw new AppError('A valid ending time must be selected for every meeting.');
  }
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) {
    throw new AppError('The selected ending time is invalid.');
  }
  return hours * 60 + minutes;
}

/**
 * Subtracts a duration (in seconds) from an ending time (in minutes
 * since midnight) and returns the resulting time, also in minutes
 * since midnight. Wraps correctly across midnight.
 * @param {number} endingMinutes
 * @param {number} durationSeconds
 * @returns {number}
 */
export function subtractDuration(endingMinutes, durationSeconds) {
  const durationMinutes = Math.round(durationSeconds / 60);
  let result = endingMinutes - durationMinutes;
  while (result < 0) result += 24 * 60;
  return result % (24 * 60);
}

/**
 * Formats minutes-since-midnight as "h:mm AM/PM".
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutesAsClock(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${hours}:${paddedMinutes} ${period}`;
}

/** Returns today's date formatted as DD-MM-YYYY. */
export function formatTodayAsDDMMYYYY() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}
