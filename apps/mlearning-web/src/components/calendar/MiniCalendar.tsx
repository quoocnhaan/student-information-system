import styles from './MiniCalendar.module.css';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Simple static 5-week layout for October 2025 (Sun-first), today = 22
const weeks: (number | null)[][] = [
  [null, null, null, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, null],
];

const TODAY = 22;

/** Small month picker shown in the sidebar. */
export default function MiniCalendar() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <button className={styles.navBtn} aria-label="Previous month">‹</button>
        <span className={styles.title}>October 2025</span>
        <button className={styles.navBtn} aria-label="Next month">›</button>
      </div>

      <div className={styles.weekRow}>
        {weekdays.map((d, i) => (
          <span key={`${d}-${i}`} className={styles.weekday}>{d}</span>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div className={styles.weekRow} key={wi}>
          {week.map((d, di) => (
            <span
              key={di}
              className={`${styles.day} ${d === TODAY ? styles.today : ''} ${d === null ? styles.empty : ''}`}
            >
              {d ?? ''}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
