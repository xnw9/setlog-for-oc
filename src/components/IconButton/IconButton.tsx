import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon alone has no text for screen readers. */
  'aria-label': string;
  variant?: 'ghost' | 'filled';
  children: ReactNode;
}

/** Round button holding just an icon, e.g. the ‹ › switchers and the export icon. */
export function IconButton({ variant = 'ghost', className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={[styles.iconButton, styles[variant], className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}
