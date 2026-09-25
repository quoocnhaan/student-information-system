import styles from './TodaySchedule.module.css';
import { todaySchedule } from './mockData';

/** List of today's events/deadlines, each with quick-action buttons. */
export default function TodaySchedule() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>📅 Today's Schedule</span>
        <span className={styles.headerDate}>Wed, Oct 22</span>
      </div>

      <div className={styles.list}>
        {todaySchedule.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${item.category === 'deadline' ? styles.itemWarn : ''}`}
          >
            <div className={styles.itemTop}>
              <span className={`${styles.tag} ${item.category === 'deadline' ? styles.tagWarn : styles.tagBlue}`}>
                {item.courseCode}
              </span>
              <span className={styles.time}>{item.time}</span>
            </div>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemLocation}>{item.location}</p>
            <div className={styles.actions}>
              {item.actions.map((a) => (
                <button
                  key={a.label}
                  className={a.primary ? styles.btnPrimary : styles.btnOutline}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
