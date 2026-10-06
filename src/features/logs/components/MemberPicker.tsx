import { Avatar, Button, IconButton } from '../../../components';
import type { Person } from '../../../types';
import styles from './MemberPicker.module.css';

interface MemberPickerProps {
  /** The whole People library. */
  people: Person[];
  /** Chosen members, in log order. */
  value: string[];
  onChange: (memberIds: string[]) => void;
  error?: string;
}

/** Choose log members from the People library and put them in order. */
export function MemberPicker({ people, value, onChange, error }: MemberPickerProps) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const chosen = value.flatMap((id) => byId.get(id) ?? []);
  const available = people.filter((person) => !value.includes(person.id));

  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>Members</legend>

      {people.length === 0 && (
        <div className={styles.empty}>
          <p>No people yet. Add people first, then pick them here.</p>
          <Button to="/people/new" variant="secondary">
            + Add person
          </Button>
        </div>
      )}

      {chosen.length > 0 && (
        <ol className={styles.chosen}>
          {chosen.map((person, index) => (
            <li key={person.id} className={styles.row}>
              <Avatar name={person.name} color={person.color} imageBlob={person.avatarBlob} />
              <span className={styles.name}>{person.name}</span>
              <IconButton
                aria-label={`Move ${person.name} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ▲
              </IconButton>
              <IconButton
                aria-label={`Move ${person.name} down`}
                disabled={index === chosen.length - 1}
                onClick={() => move(index, 1)}
              >
                ▼
              </IconButton>
              <IconButton
                aria-label={`Remove ${person.name}`}
                onClick={() => onChange(value.filter((id) => id !== person.id))}
              >
                ✕
              </IconButton>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 && (
        <div className={styles.available}>
          <span className={styles.hint}>Tap to add:</span>
          {available.map((person) => (
            <button
              key={person.id}
              type="button"
              className={styles.chip}
              onClick={() => onChange([...value, person.id])}
              aria-label={`Add ${person.name}`}
            >
              <Avatar
                name={person.name}
                color={person.color}
                imageBlob={person.avatarBlob}
                size={28}
              />
              {person.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
