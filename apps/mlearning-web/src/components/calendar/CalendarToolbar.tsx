import styles from './CalendarToolbar.module.css';

const views = ['Month', 'Week', 'Day', 'Agenda'] as const;

/** Toolbar controlling the visible month/view of the calendar. */
export default function CalendarToolbar() {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <button className={styles.todayBtn}>Today</button>
        <button className={styles.navBtn} aria-label="Previous month">‹</button>
        <button className={styles.navBtn} aria-label="Next month">›</button>
        <div className={styles.monthBlock}>
          <span className={styles.month}>October 2025</span>
          <span className={styles.subtitle}>Midterm Examination Phase</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.viewSwitch}>
          {views.map((v, i) => (
            <button key={v} className={`${styles.viewBtn} ${i === 0 ? styles.viewBtnActive : ''}`}>
              {v}
            </button>
          ))}
        </div>
        <select className={styles.select} defaultValue="all">
          <option value="all">All Courses (4 enrolled)</option>
          <option value="cs409">CS 409</option>
          <option value="bio215">BIO 215</option>
          <option value="math240">MATH 240</option>
        </select>
      </div>
    </div>
  );
}
