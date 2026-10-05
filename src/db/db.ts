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
    this.version(1).stores({
      people: 'id, name',
      logs: 'id',
      days: 'id, logId, [logId+index]',
      entries: 'id, logId, dayId, personId, [dayId+personId+slotStartHour]',
    });
  }
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
