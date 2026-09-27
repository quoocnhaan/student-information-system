import styles from './CalendarToolbar.module.css';


interface CalendarToolbarProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

/** Toolbar controlling the visible month/view of the calendar. */
export default function CalendarToolbar({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarToolbarProps) {

  const monthName = currentMonth.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <button className={styles.todayBtn} onClick={onToday}>Today</button>
        <button className={styles.navBtn} aria-label="Previous month" onClick={onPreviousMonth}>‹</button>
        <button className={styles.navBtn} aria-label="Next month" onClick={onNextMonth}>›</button>
        <div className={styles.monthBlock}>
          <span className={styles.month}>{monthName}</span>
          <span className={styles.subtitle}>Midterm Examination Phase</span>
        </div>
      </div>
    </div>
  );
}
