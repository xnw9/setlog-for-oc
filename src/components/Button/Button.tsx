import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface CommonProps {
  variant?: Variant;
  /** Stretch to the container's full width. */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

type AsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
/** Passing `to` renders a router link styled as a button. */
type AsLink = CommonProps & { to: string; 'aria-label'?: string };

export type ButtonProps = AsButton | AsLink;

export function Button(props: ButtonProps) {
  const { variant = 'primary', block = false, className, children } = props;
  const classes = [styles.button, styles[variant], block && styles.block, className]
    .filter(Boolean)
    .join(' ');

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} aria-label={props['aria-label']}>
        {children}
      </Link>
    );
  }

  const { variant: _v, block: _b, className: _c, children: _ch, to: _t, ...buttonProps } = props;
  return (
    <button type="button" {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
