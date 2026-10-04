import styles from './MonthGrid.module.css';
import type { EventCategory } from './types';
import { formatDateKey, getCalendarDays } from './calendarUtils';
import { scheduleByDate } from './mockData';
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
interface MonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}
export default function MonthGrid({
  currentMonth,
  selectedDate,
  onSelectDate,
}: MonthGridProps) {

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

  const today = new Date();
  return (
    <div className={styles.card}>
      <div className={styles.weekHeader}>
        {weekdays.map((d) => (
          <span key={d} className={styles.weekday}>{d}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((day, index) => {

          const isSelected =
            isSameDate(
              day.dateObject,
              selectedDate
            );

          const isToday =
            isSameDate(
              day.dateObject,
              today
            );

          const dateKey =
            formatDateKey(day.dateObject);

          const events =
            scheduleByDate[dateKey] ?? [];

          return (
            <div
              key={`${dateKey}-${index}`}
              className={`
                ${styles.cell}

                ${!day.currentMonth
                  ? styles.cellMuted
                  : ''
                }

                ${isSelected
                  ? styles.cellSelected
                  : ''
                }
              `}
              onClick={() =>
                onSelectDate(day.dateObject)
              }
            >

              <span
                className={`
                  ${styles.dateNum}

                  ${isToday
                    ? styles.today
                    : ''
                  }
                `}
              >
                {day.date}
              </span>

              <div className={styles.events}>

                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`
                      ${styles.chip}
                      ${chipClass[event.category]}
                    `}
                  >
                    <span
                      className={
                        styles.chipTitle
                      }
                    >
                      {event.title}
                    </span>

                    <span
                      className={
                        styles.chipTime
                      }
                    >
                      {event.time}
                    </span>
                  </div>
                ))}

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}
