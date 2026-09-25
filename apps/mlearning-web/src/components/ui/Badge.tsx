import type { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'completed' | 'deadline' | 'late' | 'neutral';
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  const rootClass = `${styles.badge} ${styles[variant]} ${className}`;

  return (
    <span className={rootClass} {...props}>
      {children}
    </span>
  );
}
