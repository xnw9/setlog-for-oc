import { db, newId, useLiveQuery } from '../../db';
import type { Log, Person } from '../../types';

const byName = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Everyone in the People library, sorted by name (case-insensitive). `undefined` while loading. */
export function usePeople(): Person[] | undefined {
  return useLiveQuery(async () =>
    (await db.people.toArray()).sort((a, b) => byName.compare(a.name, b.name)),
  );
}

/** One person: `undefined` while loading, `null` if there's no such person. */
export function usePerson(id: string | undefined): Person | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.people.get(id)) ?? null) : null), [id]);
}

/** Logs that include this person as a member. `undefined` while loading. */
export function useLogsWithMember(personId: string): Log[] | undefined {
  return useLiveQuery(() => db.logs.where('memberIds').equals(personId).toArray(), [personId]);
}

export type PersonInput = Pick<Person, 'name' | 'color' | 'avatarBlob'>;

/** Adds a new person, or updates `id` if given. Resolves to the person's id. */
export async function savePerson(input: PersonInput, id?: string): Promise<string> {
  const person: Person = { id: id ?? newId(), ...input };
  await db.people.put(person);
  return person.id;
}

/** Deletes a person. Refuses if they're still a member of any log. */
export async function deletePerson(id: string): Promise<void> {
  await db.transaction('rw', db.people, db.logs, async () => {
    if ((await db.logs.where('memberIds').equals(id).count()) > 0) {
      throw new Error('This person is still in a log.');
    }
    await db.people.delete(id);
  });
}
