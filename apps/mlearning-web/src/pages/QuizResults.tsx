import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import StatsCards from '../components/quizResults/StatsCards';
import GradeHistogram from '../components/quizResults/GradeHistogram';
import FilterBar, {
  type SortOrder,
  type StatusFilter,
} from '../components/quizResults/FilterBar';
import StudentTable from '../components/quizResults/StudentTable';
import Pagination from '../components/quizResults/Pagination';

import { students } from '../components/quizResults/mockData';
import {
  isSubmitted,
  normalize,
  type StudentRow,
} from '../components/quizResults/quizDetails';
import styles from '../components/quizResults/quizResults.module.css';
import QuizDetailModal from '../components/quizResults/Quizdetailmodal';
/**
 * Quiz Results & Grade Detail dashboard page.
 * Quản lý state tìm kiếm, lọc trạng thái, sắp xếp điểm và popup chi tiết bài làm.
 */
export function QuizResultsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const counts = useMemo<Record<StatusFilter, number>>(() => {
    const submitted = students.filter(isSubmitted).length;
    return { all: students.length, submitted, pending: students.length - submitted };
  }, []);

  const rows = useMemo(() => {
    const q = normalize(query.trim());

    return students
      .filter((s) => {
        if (status === 'submitted' && !isSubmitted(s)) return false;
        if (status === 'pending' && isSubmitted(s)) return false;
        if (!q) return true;
        return normalize(s.name).includes(q) || normalize(s.id).includes(q);
      })
      .sort((a, b) => {
        // Sinh viên chưa có điểm luôn nằm cuối, bất kể chiều sắp xếp.
        if (a.autoScore === null && b.autoScore === null) return 0;
        if (a.autoScore === null) return 1;
        if (b.autoScore === null) return -1;
        return sortOrder === 'asc' ? a.autoScore - b.autoScore : b.autoScore - a.autoScore;
      });
  }, [query, status, sortOrder]);

  return (
    <div className={styles.page}>
      <PageHeader title=" Bảng Kết Quả &amp; Điểm Chi Tiết: Quiz 04" />
      <div className={styles.pageContent}>
        <StatsCards />
        <GradeHistogram />
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          sortOrder={sortOrder}
          onSortToggle={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          counts={counts}
        />
        <StudentTable rows={rows} onView={setSelected} />
        <Pagination currentTotal={rows.length} shown={rows.length} />

        {selected && <QuizDetailModal student={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}