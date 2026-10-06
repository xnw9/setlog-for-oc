import type { DayMode, Weekday } from '../types';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Parses YYYY-MM-DD as a local date (not UTC, which can shift the day). */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toIsoDate(parseIsoDate(value)) === value; // rejects e.g. 2026-02-30
}

export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now);
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

const dateParts = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "Tue 30 Sep 2026" (Intl alone adds a comma after the weekday). */
function formatDate(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.formatToParts(date).find((p) => p.type === type)?.value;
  return `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`;
}

/**
 * The label for day `index` (0-based) of a log.
 * Date mode: "Tue 30 Sep 2026". Weekday mode: "Monday", then "Monday #2" from the second week on.
 */
export function dayLabel(dayMode: DayMode, firstDayKey: string, index: number): string {
  if (dayMode === 'date') return formatDate(parseIsoDate(addDays(firstDayKey, index)));

  const start = WEEKDAYS.indexOf(firstDayKey as Weekday);
  const name = WEEKDAY_NAMES[WEEKDAYS[(start + index) % 7]];
  const week = Math.floor(index / 7) + 1; // each weekday appears once per 7 consecutive days
  return week > 1 ? `${name} #${week}` : name;
}

/** The first-day key after dropping `count` days from the start: the date or weekday moves on. */
export function shiftFirstDayKey(dayMode: DayMode, firstDayKey: string, count: number): string {
  if (dayMode === 'date') return addDays(firstDayKey, count);
  return WEEKDAYS[(WEEKDAYS.indexOf(firstDayKey as Weekday) + count) % 7];
}

/** Whole days from `fromIso` to `toIso` (negative if `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime();
  return Math.round(ms / 86_400_000); // round: DST days are 23 or 25 hours long
}
