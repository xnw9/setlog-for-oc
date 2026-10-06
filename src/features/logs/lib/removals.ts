import type { Day, Entry } from '../../../types';

/**
 * A picture identified by its slot alone. The schema v3 index on
 * [dayId+personId+slotStartHour] is unique, so this names exactly one picture without its id —
 * which lets callers read pictures from the index instead of loading their image data.
 */
export type EntryRef = Pick<Entry, 'dayId' | 'personId' | 'slotStartHour'>;

export interface RemovalCriteria {
  days: Day[];
  /** Day indexes kept, inclusive. Days outside are removed. */
  keepFrom: number;
  keepUntil: number;
  memberIds: string[];
  /** Start hours of the slots that will exist after the change. */
  slotStartHours: number[];
}

export type RemovalReason = 'day' | 'member' | 'slot';

export interface Removal {
  entry: EntryRef;
  /** The first reason that applies: a removed day, then a removed member, then a removed slot. */
  reason: RemovalReason;
  dayIndex: number;
}

/** Pictures a settings change would delete. Used for the warning and again inside the save. */
export function picturesToRemove(entries: EntryRef[], criteria: RemovalCriteria): Removal[] {
  const dayIndexById = new Map(criteria.days.map((day) => [day.id, day.index]));
  const members = new Set(criteria.memberIds);
  const slots = new Set(criteria.slotStartHours);

  return entries.flatMap((entry): Removal[] => {
    const dayIndex = dayIndexById.get(entry.dayId) ?? -1;
    const reason: RemovalReason | undefined =
      dayIndex < criteria.keepFrom || dayIndex > criteria.keepUntil
        ? 'day'
        : !members.has(entry.personId)
          ? 'member'
          : !slots.has(entry.slotStartHour)
            ? 'slot'
            : undefined;
    return reason ? [{ entry, reason, dayIndex }] : [];
  });
}
