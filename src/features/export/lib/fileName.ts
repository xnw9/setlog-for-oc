import { addDays, dayLabel } from '../../../lib/days';
import type { Log } from '../../../types';

export type ExportFormat = 'png' | 'jpeg';

/** Characters Windows, macOS or Android refuse in file names. */
const UNSAFE = /[\\/:*?"<>|]/g;

/**
 * "Trip_2026-10-06_1000.png" for date logs, "Trip_Monday-2_1000.jpg" for weekday logs.
 * Unsafe characters and spaces become hyphens ("Trip: day/one" → "Trip-day-one").
 */
export function exportFileName(
  log: Pick<Log, 'name' | 'dayMode' | 'firstDayKey'>,
  dayIndex: number,
  slotStartHour: number,
  format: ExportFormat,
): string {
  const name = log.name.replace(UNSAFE, ' ').trim().replace(/\s+/g, '-') || 'Log';
  const day =
    log.dayMode === 'date'
      ? addDays(log.firstDayKey, dayIndex)
      : dayLabel('weekday', log.firstDayKey, dayIndex).replace(' #', '-');
  const slot = `${String(slotStartHour).padStart(2, '0')}00`;
  return `${name}_${day}_${slot}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}
