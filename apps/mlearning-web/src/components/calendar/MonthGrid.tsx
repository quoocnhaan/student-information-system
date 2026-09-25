import styles from './MonthGrid.module.css';
import { octoberDays } from './mockData';
import type { EventCategory } from './types';

const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Maps each event category to its chip class (see legend colors in MonthGrid.module.css)
const chipClass: Record<EventCategory, string> = {
  lecture: styles.chipLecture,
  deadline: styles.chipDeadline,
  exam: styles.chipExam,
  'office-hours': styles.chipOffice,
  seminar: styles.chipSeminar,
  institutional: styles.chipInstitutional,
};

/** Full month calendar grid with per-day event chips. */
export default function MonthGrid() {
  return (
    <div className={styles.card}>
      <div className={styles.weekHeader}>
        {weekdays.map((d) => (
          <span key={d} className={styles.weekday}>{d}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {octoberDays.map((day, i) => (
          <div
            key={`${day.date}-${i}`}
            className={`${styles.cell} ${!day.currentMonth ? styles.cellMuted : ''}`}
          >
            <span className={`${styles.dateNum} ${day.isToday ? styles.today : ''}`}>
              {day.date}
            </span>
            <div className={styles.events}>
              {day.events.map((ev) => (
                <div key={ev.id} className={`${styles.chip} ${chipClass[ev.category]}`}>
                  <span className={styles.chipTitle}>{ev.title}</span>
                  <span className={styles.chipTime}>{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
