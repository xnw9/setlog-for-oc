import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  /** Route for the back button. Omit both this and `onBack` to hide it. */
  backTo?: string;
  /** Handles the back button instead of a plain link, e.g. to ask before discarding changes. */
  onBack?: () => void;
  children?: ReactNode;
}

/** Page shell: header with optional back button and title, then the page content. */
export function PageLayout({ title, backTo, onBack, children }: PageLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {onBack ? (
          <Button variant="ghost" className={styles.back} aria-label="Back" onClick={onBack}>
            ‹
          </Button>
        ) : (
          backTo && (
            <Button to={backTo} variant="ghost" className={styles.back} aria-label="Back">
              ‹
            </Button>
          )
        )}
        <h1 className={styles.title}>{title}</h1>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
