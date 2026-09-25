import Breadcrumb from '../components/quizResults/Breadcrumb';
import PageHeader from '../components/quizResults/PageHeader';
import StatsCards from '../components/quizResults/StatsCards';
import GradeHistogram from '../components/quizResults/GradeHistogram';
import FilterBar from '../components/quizResults/FilterBar';
import StudentTable from '../components/quizResults/StudentTable';
import Pagination from '../components/quizResults/Pagination';
import styles from './QuizResultsPage.module.css';

/**
 * Quiz Results & Grade Detail dashboard page.
 * Static UI only — wire `mockData.ts` up to real API/state as needed.
 */
export function QuizResultsPage() {
  return (
    <div className={styles.page}>
      <Breadcrumb />
      <PageHeader />
      <StatsCards />
      <GradeHistogram />
      <FilterBar />
      <StudentTable />
      <Pagination />
    </div>
  );
}
