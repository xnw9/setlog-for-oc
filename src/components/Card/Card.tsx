import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** Rounded surface container used to group content. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />;
}
