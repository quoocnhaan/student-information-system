import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ children, interactive = false, className = '', ...props }: CardProps) {
  const rootClass = `${styles.card} ${interactive ? styles.interactive : ''} ${className}`;

  return (
    <div className={rootClass} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.header} ${className}`} {...props}>{children}</div>;
}

export function CardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.body} ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.footer} ${className}`} {...props}>{children}</div>;
}
