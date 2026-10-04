import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

import DashboardPage from "../pages/Dashboard/DashboardPage";
import StudentProfilePage from "../pages/Profile/StudentProfilePage";
import StudentGradePage from "../pages/Grades/StudentGradePage";
import StudyProgressPage from "../pages/Progress/StudyProgressPage";
import TimeTablePage from "../pages/Timetable/TimeTablePage";
import ExamSchedulePage from "../pages/ExamSchedule/ExamSchedulePage";
import ChooseSemester from "../pages/Courses/ChooseSemester";
import RegisterCoursePage from "../pages/Courses/RegisterCoursePage";
import CheckTimetable from "../pages/Courses/CheckTimetable";
import ConfirmPage from "../pages/Courses/ConfirmPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="results" element={<StudentGradePage />} />
          <Route path="progress" element={<StudyProgressPage />} />
          <Route path="schedule" element={<TimeTablePage />} />
          <Route path="exam-schedule" element={<ExamSchedulePage />} />
          <Route path="register">
            <Route index element={<ChooseSemester />} />
            <Route path="select" element={<RegisterCoursePage />} />
            <Route path="timetable" element={<CheckTimetable />} />
            <Route path="confirm" element={<ConfirmPage />} />
          </Route>
          {/* Add other routes here later */}
          <Route
            path="*"
            element={
              <div className="p-8 text-center text-slate-500">
                Trang này đang được xây dựng...
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
