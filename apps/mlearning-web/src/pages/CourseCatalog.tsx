import { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CourseCatalog.module.css';
import { useNavigate } from 'react-router-dom';
import { CourseCard } from '../components/course/Coursecard';
import { courses } from '../components/course/Coursedata';
import PageHeader from '../components/ui/PageHeader';

const PAGE_SIZE = 8; // tối đa 8 card / trang

type PageToken = number | '...';

export function CourseCatalog() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) =>
      sortBy === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
  }, [sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedCourses.length / PAGE_SIZE));

  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedCourses.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedCourses]);

  // Không phân role nữa: luôn đi tới /course/:id
  const handleGoToCourse = (courseId: string | number) => {
    navigate(`/course/${courseId}`);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    document.getElementById('course-grid-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageNumbers = useMemo<PageToken[]>(() => {
    const pages: PageToken[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className={styles.page}>
      <PageHeader title="Course" />
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div className={styles.searchInput}>
            <Search size={20} className={styles.searchIcon} />
            <input type="text" placeholder="Filter displayed course titles or topics..." />
          </div>

          <div className={styles.controls}>
            <div className={styles.sortSelect}>
              <label htmlFor="sortSelector">Sort by:</label>
              <select
                id="sortSelector"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'asc' | 'desc');
                  setCurrentPage(1);
                }}
              >
                <option value="asc">Course Name (A to Z)</option>
                <option value="desc">Course Name (Z to A)</option>
              </select>
            </div>
          </div>
        </div>

        <div id="course-grid-top" />
        {/* key={currentPage} khiến grid remount mỗi lần đổi trang -> animation chạy lại */}
        <div className={styles.grid} key={currentPage} style={{ animation: 'catalogFadeSlide 0.35s ease' }}>
          {pagedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onGoToCourse={() => handleGoToCourse(course.id)}
            />
          ))}
        </div>

        <div className={styles.pagination}>
          <div className={styles.pageInfo}>
            Showing <span>{pagedCourses.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{(currentPage - 1) * PAGE_SIZE + pagedCourses.length}</span> of <span>{courses.length}</span> Available Courses
          </div>
          <div className={styles.pageControls}>
            <button
              className={`${styles.pageBtn} ${styles.pageBtnBorder} ${styles.pageBtnAnimated}`}
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>...</span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${styles.pageBtnAnimated} ${p === currentPage ? styles.active : ''}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className={`${styles.pageBtn} ${styles.pageBtnBorder} ${styles.pageBtnAnimated}`}
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}