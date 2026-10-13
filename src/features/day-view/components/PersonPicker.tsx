import { useEffect, useId, useRef } from 'react';
import { Avatar, Button } from '../../../components';
import type { Person } from '../../../types';
import styles from './PersonPicker.module.css';

interface PersonPickerProps {
  title: string;
  people: Person[];
  /** The person currently picked, marked in the list. */
  selectedId?: string;
  onPick: (personId: string) => void;
  /** Shows a "Remove comment" button when given. */
  onRemove?: () => void;
  onClose: () => void;
}

/** Modal single-choice list of people, e.g. who's commenting on a photo. Mount it to open it. */
export function PersonPicker({
  title,
  people,
  selectedId,
  onPick,
  onRemove,
  onClose,
}: PersonPickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // backdrop click
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className={styles.person}
              aria-current={person.id === selectedId ? 'true' : undefined}
              onClick={() => onPick(person.id)}
            >
              <Avatar
                name={person.name}
                color={person.color}
                imageBlob={person.avatarBlob}
                size={36}
              />
              <span className={styles.name}>{person.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        {onRemove && (
          <Button variant="danger" onClick={onRemove}>
            Remove comment
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </dialog>
  );
}
