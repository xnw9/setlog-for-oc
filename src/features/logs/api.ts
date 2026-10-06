import Dexie from 'dexie';
import { db, newId, useLiveQuery } from '../../db';
import { shiftFirstDayKey } from '../../lib/days';
import type { Day, Log, Person } from '../../types';
import { picturesToRemove, type EntryRef } from './lib/removals';

const byName = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * A log's pictures, read as index keys so none of their image data is loaded. Reading the rows
 * instead would pull every photo in the log into memory to get at these four scalars.
 */
async function entryRefsForLog(days: Day[]): Promise<EntryRef[]> {
  const perDay = await Promise.all(
    days.map(async (day) => {
      // Dexie types index keys as IndexableType[]; a compound index yields one array per entry.
      const keys = await db.entries
        .where('[dayId+personId+slotStartHour]')
        .between([day.id, Dexie.minKey, Dexie.minKey], [day.id, Dexie.maxKey, Dexie.maxKey])
        .keys();
      return keys as unknown as [string, string, number][];
    }),
  );
  return perDay
    .flat()
    .map(([dayId, personId, slotStartHour]) => ({ dayId, personId, slotStartHour }));
}

/** Deletes pictures by their slot keys, without reading the rows first. */
function deleteEntries(refs: EntryRef[]): Promise<number> {
  return db.entries
    .where('[dayId+personId+slotStartHour]')
    .anyOf(refs.map((ref) => [ref.dayId, ref.personId, ref.slotStartHour]))
    .delete();
}

/** Number of logs, e.g. to choose between "Logs" and "+ New log". `undefined` while loading. */
export function useLogCount(): number | undefined {
  return useLiveQuery(() => db.logs.count());
}

export interface LogSummary {
  log: Log;
  /** Members in log order; people deleted from the library are skipped. */
  members: Person[];
  dayCount: number;
  pictureCount: number;
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
        pictureCount: await db.entries.where('logId').equals(log.id).count(),
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

export interface LogForEdit {
  log: Log;
  /** In index order. */
  days: Day[];
  /** The log's pictures, without their image data. */
  entries: EntryRef[];
}

/** A log with its days and pictures, for the settings page. `undefined` while loading, `null` if missing. */
export function useLogForEdit(logId: string | undefined): LogForEdit | null | undefined {
  return useLiveQuery(async () => {
    const log = logId ? await db.logs.get(logId) : undefined;
    if (!log) return null;
    const days = await db.days
      .where('[logId+index]')
      .between([log.id, 0], [log.id, Infinity])
      .toArray();
    return { log, days, entries: await entryRefsForLog(days) };
  }, [logId]);
}

export interface LogUpdate {
  /** Every log field except the id. `firstDayKey` is the label of the current first day. */
  fields: NewLog;
  /** Day indexes to keep, inclusive. Days outside are deleted along with their pictures. */
  keepFrom: number;
  keepUntil: number;
  /** Start hours of the slots after the change; pictures in other slots are deleted. */
  slotStartHours: number[];
}

/**
 * Saves settings in one transaction: deletes pictures in removed days, members and slots, deletes
 * trimmed days, renumbers the rest from 0 and moves the first day on by the days trimmed off the start.
 */
export async function updateLog(logId: string, update: LogUpdate): Promise<void> {
  const { fields, keepFrom, keepUntil, slotStartHours } = update;
  await db.transaction('rw', db.logs, db.days, db.entries, async () => {
    const days = await db.days.where('logId').equals(logId).toArray();
    const removals = picturesToRemove(await entryRefsForLog(days), {
      days,
      keepFrom,
      keepUntil,
      memberIds: fields.memberIds,
      slotStartHours,
    });
    await deleteEntries(removals.map((removal) => removal.entry));

    const [kept, trimmed] = [
      days.filter((day) => day.index >= keepFrom && day.index <= keepUntil),
      days.filter((day) => day.index < keepFrom || day.index > keepUntil),
    ];
    await db.days.bulkDelete(trimmed.map((day) => day.id));
    if (keepFrom > 0) {
      await db.days.bulkPut(kept.map((day) => ({ ...day, index: day.index - keepFrom })));
    }

    await db.logs.put({
      ...fields,
      id: logId,
      firstDayKey: shiftFirstDayKey(fields.dayMode, fields.firstDayKey, keepFrom),
    });
  });
}

/** Deletes a log with all its days and pictures. */
export async function deleteLog(logId: string): Promise<void> {
  await db.transaction('rw', db.logs, db.days, db.entries, async () => {
    await db.entries.where('logId').equals(logId).delete();
    await db.days.where('logId').equals(logId).delete();
    await db.logs.delete(logId);
  });
}

/**
 * The day a log opens on: the latest day with photos, or the first day if there are none.
 * `undefined` while loading, `null` if the log doesn't exist.
 */
export function useOpeningDayIndex(logId: string | undefined): number | null | undefined {
  return useLiveQuery(async () => {
    const log = logId ? await db.logs.get(logId) : undefined;
    if (!log) return null;
    const days = await db.days
      .where('[logId+index]')
      .between([log.id, 0], [log.id, Infinity])
      .toArray();
    // Walk back from the last day and stop at the first with pictures. count() reads the index
    // only, so this never loads a photo.
    for (let i = days.length - 1; i > 0; i--) {
      if ((await db.entries.where('dayId').equals(days[i].id).count()) > 0) return days[i].index;
    }
    return 0;
  }, [logId]);
}
