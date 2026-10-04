import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { AcademicCalendarPage } from './pages/AcademicCalendarPage'
import { CourseCatalog } from './pages/CourseCatalog'
import { QuizTakingPage } from './pages/QuizTakingPage'
import { QuizResultsPage } from './pages/QuizResultsPage'
import CoursePage from './pages/CoursePage'
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
                <Route path="/quiz-results" element={<QuizResultsPage />} />
                <Route path="/course/:id/quiz-taking/:quizId" element={<QuizTakingPage />} />
                <Route path="/course/:id" element={<CoursePage />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

