import styles from './WeekGrid.module.css';
import { addDays, isSameDay, startOfWeek, toDateKey } from './calendarUtils';

// Chỉnh cho khớp với kiểu dữ liệu trong mockData.ts của bạn
export interface ClassSession {
    id: string;
    subject: string;
    date: string;       // 'YYYY-MM-DD'
    startTime: string;  // '07:30'
    endTime: string;    // '09:30'
    room?: string;
    color?: string;     // ví dụ '#2141d6'
}

interface Props {
    selectedDate: Date;
    sessions: ClassSession[];
    onSelectDate: (date: Date) => void;
}

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export default function WeekGrid({ selectedDate, sessions, onSelectDate }: Props) {
    const weekStart = startOfWeek(selectedDate);
    const today = new Date();

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className={styles.week}>
            {days.map((day, i) => {
                const key = toDateKey(day);
                const daySessions = sessions
                    .filter((s) => s.date === key)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                    <section
                        key={key}
                        className={`${styles.column} ${isSameDay(day, selectedDate) ? styles.columnSelected : ''}`}
                    >
                        <button type="button" className={styles.dayHead} onClick={() => onSelectDate(day)}>
                            <span className={styles.weekday}>{WEEKDAYS[i]}</span>
                            <span className={`${styles.dayDate} ${isSameDay(day, today) ? styles.dayToday : ''}`}>
                                {day.getDate()}/{day.getMonth() + 1}
                            </span>
                        </button>

                        <div className={styles.list}>
                            {daySessions.length === 0 ? (
                                <p className={styles.empty}>Không có lịch</p>
                            ) : (
                                daySessions.map((s) => (
                                    <article
                                        key={s.id}
                                        className={styles.session}
                                        style={{ ['--session-color' as string]: s.color ?? '#2141d6' }}
                                    >
                                        <h4 className={styles.subject}>{s.subject}</h4>
                                        <p className={styles.time}>
                                            {s.startTime} – {s.endTime}
                                        </p>
                                        {s.room && <p className={styles.room}>{s.room}</p>}
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}