import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import MonthGrid from '../components/calendar/MonthGrid';
import CalendarLegend from '../components/calendar/CalendarLegend';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TodaySchedule from '../components/calendar/TodaySchedule';
import styles from './AcademicCalendarPage.module.css';
import WeekGrid from '../components/calendar/WeekGrid';
import { addDays, startOfWeek } from '../components/calendar/calendarUtils';
import { sessions } from '../components/calendar/mockData';
/**
 * Academic Calendar & Schedule page.
 * Static UI only — wire `mockData.ts` up to real API/state as needed.
 */
type CalendarView = 'month' | 'week';
export function AcademicCalendarPage() {
  const today = new Date();
  const [view, setView] = useState<CalendarView>('month');
  const [currentMonth, setCurrentMonth] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const shiftWeek = (weeks: number) => {
    const next = addDays(selectedDate, weeks * 7);
    setSelectedDate(next);
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const handlePrevious = () => (view === 'week' ? shiftWeek(-1) : handlePreviousMonth());
  const handleNext = () => (view === 'week' ? shiftWeek(1) : handleNextMonth());
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  const rangeLabel = view === 'week' ? `${fmt(weekStart)} – ${fmt(weekEnd)}/${weekEnd.getFullYear()}` : undefined;

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
      <PageHeader title="Calendar" />

      <div className={styles.content}>
        <main className={styles.main}>
          <CalendarToolbar
            currentMonth={currentMonth}
            onPreviousMonth={handlePrevious}
            onNextMonth={handleNext}
            onToday={handleToday}
            view={view}
            onChangeView={setView}
            rangeLabel={rangeLabel}
          />

          {view === 'month' ? (
            <MonthGrid
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          ) : (
            <WeekGrid
              selectedDate={selectedDate}
              sessions={sessions}
              onSelectDate={handleSelectDate}
            />
          )}

          {view === 'month' && <CalendarLegend />}
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
        </aside>
      </div>
    </div>
  );
}
