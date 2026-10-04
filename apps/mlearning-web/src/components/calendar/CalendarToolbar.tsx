import styles from './CalendarToolbar.module.css';

export type CalendarView = 'month' | 'week';

interface CalendarToolbarProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  view?: CalendarView;
  onChangeView?: (view: CalendarView) => void;
  rangeLabel?: string; // ví dụ "12/10 – 18/10/2026", dùng cho chế độ tuần
}

/** Toolbar controlling the visible month/week of the calendar. */
export default function CalendarToolbar({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
  view = 'month',
  onChangeView,
  rangeLabel,
}: CalendarToolbarProps) {
  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const unit = view === 'week' ? 'week' : 'month';

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <button type="button" className={styles.todayBtn} onClick={onToday}>
          Today
        </button>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={`Previous ${unit}`}
          onClick={onPreviousMonth}
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.navBtn}
          aria-label={`Next ${unit}`}
          onClick={onNextMonth}
        >
          ›
        </button>
        <div className={styles.monthBlock}>
          <span className={styles.month}>
            {view === 'week' && rangeLabel ? rangeLabel : monthName}
          </span>
          <span className={styles.subtitle}>Midterm Examination Phase</span>
        </div>
      </div>

      {onChangeView && (
        <div role="group" aria-label="Calendar view" className={styles.viewSwitch}>
          <button
            type="button"
            className={`${styles.viewBtn} ${view === 'month' ? styles.viewActive : ''}`}
            aria-pressed={view === 'month'}
            onClick={() => onChangeView('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${view === 'week' ? styles.viewActive : ''}`}
            aria-pressed={view === 'week'}
            onClick={() => onChangeView('week')}
          >
            Week
          </button>
        </div>
      )}
    </div>
  );
}