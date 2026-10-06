import type { SlotHours } from '../types';

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
