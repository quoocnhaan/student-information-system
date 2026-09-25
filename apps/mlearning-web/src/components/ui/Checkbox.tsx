import { type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`${styles.checkboxWrapper} ${className}`}>
      <input type="checkbox" className={styles.checkboxInput} {...props} />
      <div className={styles.customCheckbox}>
        <Check className={styles.icon} strokeWidth={3} />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
