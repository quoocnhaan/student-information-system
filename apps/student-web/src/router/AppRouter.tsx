import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

import DashboardPage from "../pages/Dashboard/DashboardPage";
import StudentProfilePage from "../pages/Profile/StudentProfilePage";
import StudentGradePage from "../pages/Grades/StudentGradePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="results" element={<StudentGradePage />} />
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
