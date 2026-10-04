import styles from './MiniCalendar.module.css';
import { getCalendarDays } from './calendarUtils';
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MiniCalendarProps {
  currentMonth: Date;
  selectedDate: Date;

  onPreviousMonth: () => void;
  onNextMonth: () => void;

  onSelectDate: (date: Date) => void;
}
export default function MiniCalendar({
  currentMonth,
  selectedDate,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}: MiniCalendarProps) {

  const days = getCalendarDays(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  const isSameDate = (
    date1: Date,
    date2: Date
  ) => {
    return (
      date1.getFullYear() ===
      date2.getFullYear() &&
      date1.getMonth() ===
      date2.getMonth() &&
      date1.getDate() ===
      date2.getDate()
    );
  };

  return (
    <div className={styles.card}>

      <div className={styles.header}>

        <button
          className={styles.navBtn}
          onClick={onPreviousMonth}
          aria-label="Previous month"
        >
          ‹
        </button>

        <span className={styles.title}>
          {currentMonth.toLocaleDateString(
            'en-US',
            {
              month: 'long',
              year: 'numeric',
            }
          )}
        </span>

        <button
          className={styles.navBtn}
          onClick={onNextMonth}
          aria-label="Next month"
        >
          ›
        </button>

      </div>

      <div className={styles.weekRow}>
        {weekdays.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className={styles.weekday}
          >
            {day}
          </span>
        ))}
      </div>

      <div className={styles.daysGrid}>

        {days.map((day, index) => {

          const selected =
            isSameDate(
              day.dateObject,
              selectedDate
            );

          return (
            <button
              key={`${day.dateObject.toISOString()}-${index}`}
              type="button"
              className={`
                ${styles.day}

                ${!day.currentMonth
                  ? styles.muted
                  : ''
                }

                ${selected
                  ? styles.selected
                  : ''
                }
              `}
              onClick={() =>
                onSelectDate(day.dateObject)
              }
            >
              {day.date}
            </button>
          );
        })}

      </div>

    </div>
  );
}
