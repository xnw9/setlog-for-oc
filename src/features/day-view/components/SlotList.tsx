import { useEffect, useRef } from 'react';
import { Button } from '../../../components';
import styles from './SlotList.module.css';

export interface SlotListItem {
  startHour: number;
  label: string;
  /** Pictures in this slot, out of the member count. */
  filled: number;
}

interface SlotListProps {
  open: boolean;
  slots: SlotListItem[];
  memberCount: number;
  current: number;
  onPick: (index: number) => void;
  onClose: () => void;
}

/** Modal list of a day's slots for jumping straight to one; filled slots are marked. */
export function SlotList({ open, slots, memberCount, current, onPick, onClose }: SlotListProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="Jump to slot"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // backdrop click
      }}
    >
      <ul className={styles.list}>
        {slots.map((slot, index) => (
          <li key={slot.startHour}>
            <button
              type="button"
              className={styles.item}
              aria-current={index === current ? 'true' : undefined}
              onClick={() => onPick(index)}
            >
              <span>{slot.label}</span>
              <span className={styles.count}>
                {slot.filled > 0 ? '● ' : ''}
                {slot.filled}/{memberCount}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" block onClick={onClose}>
        Close
      </Button>
    </dialog>
  );
}
