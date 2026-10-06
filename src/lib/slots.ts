import type { LabelMode, Log, SlotHours } from '../types';
import { addDays, todayIsoDate } from './days';

export interface Slot {
  /** Clock hour 0–23; entries are keyed by this. */
  startHour: number;
  endHour: number;
}

/** Hours from start to end, 1–24. An end at or before the start means the next day. */
export function spanHours(startHour: number, endHour: number): number {
  return (endHour - startHour + 24) % 24 || 24;
}

export function crossesMidnight(startHour: number, endHour: number): boolean {
  return endHour <= startHour;
}

/** Every valid end hour for a start: whole numbers of slots, up to a full 24 hours. */
export function endHourOptions(startHour: number, slotHours: SlotHours): number[] {
  return Array.from({ length: 24 / slotHours }, (_, i) => (startHour + (i + 1) * slotHours) % 24);
}

/** The nearest valid end hour for a new slot length, keeping at least one slot. */
export function alignEndHour(startHour: number, endHour: number, slotHours: SlotHours): number {
  const slots = Math.max(1, Math.round(spanHours(startHour, endHour) / slotHours));
  return (startHour + slots * slotHours) % 24;
}

export function slotsFor(startHour: number, endHour: number, slotHours: SlotHours): Slot[] {
  const count = Math.floor(spanHours(startHour, endHour) / slotHours);
  return Array.from({ length: count }, (_, i) => {
    const start = (startHour + i * slotHours) % 24;
    return { startHour: start, endHour: (start + slotHours) % 24 };
  });
}

/** "08:00" */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** "08:00–10:00" or "08:00", following the log's label setting. */
export function formatSlot(startHour: number, slotHours: SlotHours, labelMode: LabelMode): string {
  const start = formatHour(startHour);
  return labelMode === 'start' ? start : `${start}–${formatHour((startHour + slotHours) % 24)}`;
}

/**
 * Where "now" falls in a log's daily window: the log day's date and the slot's start hour, or
 * `null` outside the window. A window that crosses midnight belongs to the day it started, so
 * 01:00 in a 22:00–02:00 log is still yesterday's log day.
 */
export function currentSlot(
  log: Pick<Log, 'startHour' | 'endHour' | 'slotHours'>,
  now = new Date(),
): { date: string; slotStartHour: number } | null {
  const hour = now.getHours();
  const offset = (hour - log.startHour + 24) % 24;
  if (offset >= spanHours(log.startHour, log.endHour)) return null;
  const today = todayIsoDate(now);
  return {
    date: hour < log.startHour ? addDays(today, -1) : today,
    slotStartHour: (log.startHour + Math.floor(offset / log.slotHours) * log.slotHours) % 24,
  };
}
