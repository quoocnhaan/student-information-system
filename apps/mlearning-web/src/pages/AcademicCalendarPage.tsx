import { useState } from 'react';
import PageHeader from '../components/calendar/PageHeader';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import MonthGrid from '../components/calendar/MonthGrid';
import CalendarLegend from '../components/calendar/CalendarLegend';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TodaySchedule from '../components/calendar/TodaySchedule';
import UpcomingDeadlines from '../components/calendar/UpcomingDeadlines';
import SyncBar from '../components/calendar/SyncBar';
import styles from './AcademicCalendarPage.module.css';

/**
 * Academic Calendar & Schedule page.
 * Static UI only — wire `mockData.ts` up to real API/state as needed.
 */
export function AcademicCalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const [selectedDate, setSelectedDate] = useState(today);

  // Tháng trước
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  };

  // Tháng sau
  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  };

  // Quay về hôm nay
  const handleToday = () => {
    const now = new Date();

    setCurrentMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );

    setSelectedDate(now);
  };

  // Click một ngày
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);

    // Nếu click ngày thuộc tháng khác
    // thì tự chuyển calendar sang tháng đó
    setCurrentMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      )
    );
  };


  return (
    <div className={styles.page}>
      <PageHeader />

      <div className={styles.content}>
        <main className={styles.main}>
          <CalendarToolbar
            currentMonth={currentMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday} />
          <MonthGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
          <CalendarLegend />
        </main>

        <aside className={styles.sidebar}>
          <MiniCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onSelectDate={handleSelectDate}
          />
          <TodaySchedule selectedDate={selectedDate} />
          <UpcomingDeadlines />
          <SyncBar />
        </aside>
      </div>
    </div>
  );
}
