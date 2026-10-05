import Dexie, { type EntityTable } from 'dexie';
import type { Day, Entry, Log, Person } from '../types';

export class SetlogDB extends Dexie {
  people!: EntityTable<Person, 'id'>;
  logs!: EntityTable<Log, 'id'>;
  days!: EntityTable<Day, 'id'>;
  entries!: EntityTable<Entry, 'id'>;

  constructor(name = 'setlog') {
    super(name);
    // Only indexed fields are listed; every other field is still stored.
    // v2: added *memberIds to logs.
    this.version(2).stores({
      people: 'id, name',
      logs: 'id, *memberIds', // * = multi-entry: find logs containing a person
      days: 'id, logId, [logId+index]',
      entries: 'id, logId, dayId, personId, [dayId+personId+slotStartHour]',
    });
    // v3: made the entry slot index unique. One photo per person per slot is a model invariant,
    // and a plain index left it to the caller: a read-then-write add path that isn't wrapped in a
    // transaction can interleave, so a double-tap writes two entries into one cell. The day view
    // would then render whichever came back first while the orphan still counted towards the
    // "log has pictures" check that locks slot length — a stuck lock with no photo explaining it.
    this.version(3).stores({
      entries: 'id, logId, dayId, personId, &[dayId+personId+slotStartHour]',
    });
  }
}

/** Thrown by `entries.add` when a photo already occupies that person's slot. See schema v3. */
export function isSlotTakenError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError';
}

export const db = new SetlogDB();

export const newId = () => crypto.randomUUID();

/** Ask the browser not to evict our data under storage pressure. Resolves to whether it's persisted. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
