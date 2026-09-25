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
  return (
    <div className={styles.page}>
      <PageHeader />

      <div className={styles.content}>
        <main className={styles.main}>
          <CalendarToolbar />
          <MonthGrid />
          <CalendarLegend />
        </main>

        <aside className={styles.sidebar}>
          <MiniCalendar />
          <TodaySchedule />
          <UpcomingDeadlines />
          <SyncBar />
        </aside>
      </div>
    </div>
  );
}
