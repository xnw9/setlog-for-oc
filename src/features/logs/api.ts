import { db, newId, useLiveQuery } from '../../db';
import type { Day, Log, Person } from '../../types';

const byName = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Number of logs, e.g. to choose between "Logs" and "+ New log". `undefined` while loading. */
export function useLogCount(): number | undefined {
  return useLiveQuery(() => db.logs.count());
}

export interface LogSummary {
  log: Log;
  /** Members in log order; people deleted from the library are skipped. */
  members: Person[];
  dayCount: number;
}

/** Every log with its members and day count, sorted by name. `undefined` while loading. */
export function useLogSummaries(): LogSummary[] | undefined {
  return useLiveQuery(async () => {
    const [logs, people] = await Promise.all([db.logs.toArray(), db.people.toArray()]);
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const summaries = await Promise.all(
      logs.map(async (log) => ({
        log,
        members: log.memberIds.flatMap((id) => peopleById.get(id) ?? []),
        dayCount: await db.days.where('logId').equals(log.id).count(),
      })),
    );
    return summaries.sort((a, b) => byName.compare(a.log.name, b.log.name));
  });
}

export type NewLog = Omit<Log, 'id'>;

/** Creates a log and its days 0..dayCount-1 in one transaction. Resolves to the new log's id. */
export async function createLog(input: NewLog, dayCount: number): Promise<string> {
  const id = newId();
  await db.transaction('rw', db.logs, db.days, async () => {
    await db.logs.add({ ...input, id });
    const days: Day[] = Array.from({ length: dayCount }, (_, index) => ({
      id: newId(),
      logId: id,
      index,
    }));
    await db.days.bulkAdd(days);
  });
  return id;
}
