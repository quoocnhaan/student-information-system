import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  iconLeft, 
  iconRight, 
  className = '', 
  ...props 
}: ButtonProps) {
  const rootClass = `${styles.button} ${styles[variant]} ${className}`;
  
  return (
    <button className={rootClass} {...props}>
      {iconLeft && <span className={styles['icon-left']}>{iconLeft}</span>}
      {children}
      {iconRight && <span className={styles['icon-right']}>{iconRight}</span>}
    </button>
  );
}
