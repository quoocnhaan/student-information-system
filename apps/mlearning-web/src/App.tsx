import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { CourseManagement } from './pages/CourseManagement'
import { AcademicCalendarPage } from './pages/AcademicCalendarPage'
import { CourseCatalog } from './pages/CourseCatalog'
import { QuizTakingPage } from './pages/QuizTakingPage'
import { QuizResultsPage } from './pages/QuizResultsPage'
import { CourseDetail } from './pages/CourseDetail'
import { Login } from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courses" element={<CourseCatalog />} />
                <Route path="/calendar" element={<AcademicCalendarPage />} />
                <Route path="/directory" element={<CourseManagement />} />
                <Route path="/quiz-results" element={<QuizResultsPage />} />
                <Route path="/quiz-taking" element={<QuizTakingPage />} />
                <Route path="/course/:id" element={<CourseDetail />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

