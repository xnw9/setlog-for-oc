import type { ReactNode } from 'react';
import { IconButton } from '../../../components';
import styles from './Switcher.module.css';

interface SwitcherProps {
  /** e.g. "day" or "slot", for the button labels: "Previous day", "Next slot". */
  unit: string;
  label: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  /** Disable at the ends: switchers never wrap around. */
  hasPrevious: boolean;
  hasNext: boolean;
  /** Makes the label a button, e.g. to open the slot list. */
  onLabelClick?: () => void;
  labelDescription?: string;
}

/** ‹ label › control used for both days and slots. */
export function Switcher({
  unit,
  label,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onLabelClick,
  labelDescription,
}: SwitcherProps) {
  return (
    <div className={styles.switcher}>
      <IconButton aria-label={`Previous ${unit}`} disabled={!hasPrevious} onClick={onPrevious}>
        ‹
      </IconButton>
      {onLabelClick ? (
        <button
          type="button"
          className={`${styles.label} ${styles.clickable}`}
          onClick={onLabelClick}
          aria-label={labelDescription}
        >
          {label}
        </button>
      ) : (
        <span className={styles.label} aria-live="polite">
          {label}
        </span>
      )}
      <IconButton aria-label={`Next ${unit}`} disabled={!hasNext} onClick={onNext}>
        ›
      </IconButton>
    </div>
  );
}
