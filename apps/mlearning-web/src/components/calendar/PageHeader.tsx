import styles from './PageHeader.module.css';

/** Breadcrumb + page title + status badges + primary actions. */
export default function PageHeader() {
  return (
    <div className={styles.wrap}>
      <p className={styles.breadcrumb}>
        Dashboard <span className={styles.sep}>/</span>{' '}
        <span className={styles.current}>Academic Calendar &amp; Schedule</span>
      </p>

      <div className={styles.row}>
        <div className={styles.titleGroup}>
          <div className={styles.titleLine}>
            <h1 className={styles.title}>Academic Calendar &amp; Schedule</h1>
            <span className={`${styles.badge} ${styles.badgeBlue}`}>Fall 2025 Reminder</span>
          </div>
          <span className={`${styles.badge} ${styles.badgeGreen}`}>
            <span className={styles.dot} /> Week 8 Active
          </span>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnOutline}>⟳ Sync with Google / iCal</button>
          <button className={styles.btnOutline}>⭳ Export Schedule</button>
          <button className={styles.btnPrimary}>+ Create Event / Reminder</button>
        </div>
      </div>
    </div>
  );
}
