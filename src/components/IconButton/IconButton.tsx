import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './IconButton.module.css';

interface CommonProps {
  /** Required: an icon alone has no text for screen readers. */
  'aria-label': string;
  variant?: 'ghost' | 'filled';
  className?: string;
  children: ReactNode;
}

type AsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
/** Passing `to` renders a router link, e.g. a ⚙ that opens a settings page. */
type AsLink = CommonProps & { to: string };

/** Round button holding just an icon, e.g. the ‹ › switchers and the export icon. */
export function IconButton(props: AsButton | AsLink) {
  const { variant = 'ghost', className, children } = props;
  const classes = [styles.iconButton, styles[variant], className].filter(Boolean).join(' ');

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} aria-label={props['aria-label']}>
        {children}
      </Link>
    );
  }

  const { variant: _v, className: _c, children: _ch, to: _t, ...buttonProps } = props;
  return (
    <button type="button" {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
