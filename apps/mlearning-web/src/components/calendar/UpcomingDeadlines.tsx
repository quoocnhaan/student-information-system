import styles from './UpcomingDeadlines.module.css';
import { upcomingDeadlines } from './mockData';

/** Compact list of deadlines coming up in the next 7 days. */
export default function UpcomingDeadlines() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Upcoming Deadlines</span>
        <span className={styles.headerSub}>Next 7 Days</span>
      </div>

      <div className={styles.list}>
        {upcomingDeadlines.map((d) => (
          <div key={d.id} className={styles.item}>
            <span className={`${styles.dot} ${d.urgent ? styles.dotUrgent : ''}`} />
            <div className={styles.text}>
              <p className={styles.title}>{d.title}</p>
              <p className={styles.subtitle}>{d.subtitle}</p>
            </div>
            <span className={`${styles.dueLabel} ${d.urgent ? styles.dueUrgent : ''}`}>
              {d.dueLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
