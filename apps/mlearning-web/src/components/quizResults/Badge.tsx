import styles from './Badge.module.css';
import type { BadgeTone } from './types';

interface Props {
  label: string;
  tone: BadgeTone;
}

const toneClass: Record<BadgeTone, string> = {
  success: styles.success,
  warn: styles.warn,
  danger: styles.danger,
  neutral: styles.neutral,
};

/** Small pill badge used for row status in the student table. */
export default function Badge({ label, tone }: Props) {
  return <span className={`${styles.badge} ${toneClass[tone]}`}>{label}</span>;
}
