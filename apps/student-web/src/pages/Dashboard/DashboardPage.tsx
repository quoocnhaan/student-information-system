import WelcomeBanner from "./components/WelcomeBanner";
import StatCards from "./components/StatCards";
import TodayClasses from "./components/TodayClasses";
import NotificationsList from "./components/NotificationsList";
import UpcomingExams from "./components/UpcomingExams";
import StudyProgress from "./components/StudyProgress";
import CurrentSemesterCourses from "./components/CurrentSemesterCourses";
import TodoList from "./components/TodoList";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Banner */}
      <WelcomeBanner />

      {/* Stats Grid */}
      <StatCards />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 */}
        <TodayClasses />

        {/* Column 2 */}
        <NotificationsList />

        {/* Column 3 */}
        <UpcomingExams />

        {/* Column 4 */}
        <StudyProgress />

        {/* Column 5 */}
        <CurrentSemesterCourses />

        {/* Column 6 */}
        <TodoList />
        
      </div>
    </div>
  );
}
