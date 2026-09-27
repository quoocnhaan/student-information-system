import styles from './TodaySchedule.module.css';
import { scheduleByDate } from './mockData';
import { formatDateKey } from './calendarUtils';


interface TodayScheduleProps {
  selectedDate: Date;
}

export default function TodaySchedule({
  selectedDate,
}: TodayScheduleProps) {

  // Chuyển Date thành key: YYYY-MM-DD
  const dateKey = formatDateKey(selectedDate);


  // Lấy schedule của ngày được chọn
  const schedule = scheduleByDate[dateKey] ?? [];

  // Format ngày hiển thị
  const formattedDate = selectedDate.toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }
  );

  return (
    <div className={styles.card}>

      <div className={styles.header}>

        <span className={styles.headerTitle}>
          📅 Today's Schedule
        </span>

        <span className={styles.headerDate}>
          {formattedDate}
        </span>

      </div>

      <div className={styles.list}>

        {schedule.length === 0 ? (
          <div className={styles.empty}>
            No schedule for this day.
          </div>
        ) : (
          schedule.map((item) => (

            <div
              key={item.id}
              className={`
                ${styles.item}
                ${item.category === 'deadline'
                  ? styles.itemWarn
                  : ''
                }
              `}
            >

              <div className={styles.itemTop}>

                <span
                  className={`
                    ${styles.tag}
                    ${item.category === 'deadline'
                      ? styles.tagWarn
                      : styles.tagBlue
                    }
                  `}
                >
                  {item.courseCode}
                </span>

                <span className={styles.time}>
                  {item.time}
                </span>

              </div>

              <p className={styles.itemTitle}>
                {item.title}
              </p>

              <p className={styles.itemLocation}>
                {item.location}
              </p>

              <div className={styles.actions}>

                {item.actions.map((action) => (

                  <button
                    key={action.label}
                    className={
                      action.primary
                        ? styles.btnPrimary
                        : styles.btnOutline
                    }
                  >
                    {action.label}
                  </button>

                ))}

              </div>

            </div>

          ))
        )}

      </div>
    </div>
  );
}