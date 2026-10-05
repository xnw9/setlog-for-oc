import { useId, type InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Helper text under the field. Hidden while there's an error. */
  hint?: string;
  error?: string;
}

/** `className` styles the wrapper, not the input, so callers can set the field's layout. */
export function TextField({ label, hint, error, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  // aria-describedby takes a list, so merge rather than overwrite: spreading inputProps over a
  // computed value would silently unlink the error text and leave it unannounced.
  const describedBy =
    [note && noteId, inputProps['aria-describedby']].filter(Boolean).join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : inputProps['aria-invalid']}
        aria-describedby={describedBy}
      />
      {note && (
        <p id={noteId} className={error ? styles.error : styles.hint}>
          {note}
        </p>
      )}
    </div>
  );
}
