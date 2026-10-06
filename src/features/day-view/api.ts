import { db, isSlotTakenError, newId, useLiveQuery } from '../../db';
import { resizeImage } from '../../lib/image';
import type { Day, Entry, Log, Person } from '../../types';

export interface DayViewData {
  log: Log;
  day: Day;
  dayCount: number;
  /** Members in log order; people deleted from the library are skipped. */
  members: Person[];
  /** This day's pictures. */
  entries: Entry[];
}

/** Everything the day view shows. `undefined` while loading, `null` if the log or day is missing. */
export function useDayView(
  logId: string | undefined,
  index: number,
): DayViewData | null | undefined {
  return useLiveQuery(async () => {
    const log = logId ? await db.logs.get(logId) : undefined;
    if (!log) return null;
    const [day, dayCount, people] = await Promise.all([
      db.days.where('[logId+index]').equals([log.id, index]).first(),
      db.days.where('logId').equals(log.id).count(),
      db.people.bulkGet(log.memberIds),
    ]);
    if (!day) return null;
    const entries = await db.entries.where('dayId').equals(day.id).toArray();
    return { log, day, dayCount, members: people.filter((p): p is Person => !!p), entries };
  }, [logId, index]);
}

/** Appends the next day to a log. Resolves to its index. */
export async function createNextDay(logId: string): Promise<number> {
  return db.transaction('rw', db.days, async () => {
    const index = await db.days.where('logId').equals(logId).count();
    await db.days.add({ id: newId(), logId, index });
    return index;
  });
}

/** Deletes every picture in a day; the day itself stays. */
export async function clearDay(dayId: string): Promise<void> {
  await db.entries.where('dayId').equals(dayId).delete();
}

/**
 * Stores a photo for one member in one slot, replacing any photo already there.
 * The image is scaled down first. Throws if the file can't be read as an image.
 */
export async function setPhoto(
  day: Day,
  personId: string,
  slotStartHour: number,
  file: Blob,
): Promise<void> {
  const { blob, width, height } = await resizeImage(file);
  const key: [string, string, number] = [day.id, personId, slotStartHour];
  const fields = { imageBlob: blob, width, height, crop: { x: 0.5, y: 0.5, zoom: 1 } };
  try {
    await db.transaction('rw', db.entries, async () => {
      const existing = await db.entries.where('[dayId+personId+slotStartHour]').equals(key).first();
      if (existing) {
        await db.entries.update(existing.id, { ...fields, caption: undefined });
      } else {
        await db.entries.add({
          id: newId(),
          logId: day.logId,
          dayId: day.id,
          personId,
          slotStartHour,
          ...fields,
        });
      }
    });
  } catch (error) {
    // A second tap raced this one into the same slot; that photo won, which is fine.
    if (!isSlotTakenError(error)) throw error;
  }
}

export async function removePhoto(entryId: string): Promise<void> {
  await db.entries.delete(entryId);
}
