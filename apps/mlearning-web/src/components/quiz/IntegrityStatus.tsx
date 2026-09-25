import styles from './IntegrityStatus.module.css';

interface Props {
  courseCode: string;
  warningsRemaining: number;
}

/** Sidebar card showing proctoring/integrity monitoring status. */
export default function IntegrityStatus({ courseCode, warningsRemaining }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>✓</span>
        <span className={styles.title}>Academic Integrity Active</span>
      </div>
      <p className={styles.text}>
        Fullscreen monitoring is enforced for {courseCode}. Browser blur and background tab
        events are recorded in real time.
      </p>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Tab switch tolerance:</span>
        <span className={styles.badge}>{warningsRemaining} warning remaining</span>
      </div>
    </div>
  );
}
