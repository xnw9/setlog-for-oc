import type { MouseEvent, ReactNode } from 'react';
import { Button } from '../Button/Button';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  /** The level above this page. The back button is always a link here; omit to hide it. */
  backTo?: string;
  /**
   * Runs before the back link is followed. Call `event.preventDefault()` to stay on the page,
   * e.g. to ask before discarding changes. It can't change where the link goes.
   */
  onBack?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Buttons at the right of the header, e.g. a settings link. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Page shell: header with optional back button and title, then the page content. */
export function PageLayout({ title, backTo, onBack, actions, children }: PageLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {backTo && (
          <Button
            to={backTo}
            variant="ghost"
            className={styles.back}
            aria-label="Back"
            onClick={onBack}
          >
            ‹
          </Button>
        )}
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
