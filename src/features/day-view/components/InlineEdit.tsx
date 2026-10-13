import { useRef, useState } from 'react';
import { CAPTION_MAX_LENGTH } from '../api';

interface InlineEditProps {
  initial: string;
  /** Called with the new text when it changed; Enter or tapping away saves, Esc cancels. */
  onSave: (text: string) => void;
  /** Called when editing ends, saved or not. */
  onDone: () => void;
  className?: string;
  'aria-label': string;
  placeholder?: string;
}

/** A focused one-line text field for editing a caption or comment in place. */
export function InlineEdit({ initial, onSave, onDone, ...inputProps }: InlineEditProps) {
  const [value, setValue] = useState(initial);
  const cancelled = useRef(false);

  return (
    <input
      {...inputProps}
      value={value}
      maxLength={CAPTION_MAX_LENGTH}
      autoFocus
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur(); // blur saves
        if (event.key === 'Escape') {
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (!cancelled.current && value.trim() !== initial.trim()) onSave(value);
        onDone();
      }}
    />
  );
}
