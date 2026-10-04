import { ArrowRight, Filter, ChevronRight, Calendar as CalendarIcon, Clock, BadgeCheck } from 'lucide-react';
import styles from './Dashboard.module.css';
import PageHeader from '../components/ui/PageHeader';
import { CourseCard } from '../components/course/Coursecard';
import { courses } from '../components/course/Coursedata';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className={styles.dashboard}>
      <PageHeader title="Dashboard" />
      <div className={styles.grid}>
        {/* Main Column */}
        <div className={styles.mainColumn}>
          {/* Active Courses Section */}
          <section>
            <div className={styles.sectionHeader}>
              <div className={styles.panelHeader}>
                <div className={styles.titleGroup}>
                  <h2 className={styles.sectionTitle}>Recently Accessed Courses</h2>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.filterBtn}>
                    <Filter size={20} color="var(--on-surface-variant)" />
                  </button>
                  <a href="courses" className={styles.allCoursesLink}>
                    All Courses <ArrowRight size={16} />
                  </a>
                </div>
              </div>
              <div className={styles.courseGrid}>
                {/* Course 1: CS 408 */}
                <CourseCard
                  key={courses[0].id}
                  course={courses[0]}
                  onGoToCourse={() => {
                    navigate(`/course/${courses[0].id}`);
                  }}
                />
                {/* Course 2: MATH 302 */}

                <CourseCard
                  key={courses[1].id}
                  course={courses[1]}
                  onGoToCourse={() => {
                    navigate(`/course/${courses[1].id}`);
                  }}
                />
                <CourseCard
                  key={courses[3].id}
                  course={courses[3]}
                  onGoToCourse={() => {
                    navigate(`/course/${courses[3].id}`);
                  }}
                />
              </div>
            </div>
          </section>

          {/* Recent Announcements */}
          <section className={`${styles.cardPanel} ${styles.noticesSection}`}>
            <div className={styles.panelHeader}>
              <div className={styles.titleGroup}>
                <BadgeCheck size={22} color="var(--primary)" />
                <h3 className={styles.panelTitle}>Campus Notices & Bulletins</h3>
              </div>
              <div className={styles.headerActions}>
                <a href="#board" className={styles.noticeboardLink}>View Faculty Noticeboard</a>
                <span className={styles.bulletDivider}>•</span>
              </div>
            </div>

            <div>
              <div className={styles.noticeItem}>
                <div className={styles.noticeContent}>
                  <div className={styles.noticeMeta}>
                    <span className={styles.noticeDate}>Today at 09:30 AM</span>
                  </div>
                  <p className={styles.noticeTitle}>CS 408 - Problem Set 3 (Raft Consensus)</p>
                  <p className={styles.noticeDesc}>Your submission has been graded.</p>
                </div>
                <ChevronRight size={20} color="var(--outline)" />
              </div>

              <div className={styles.noticeItem}>
                <div className={styles.noticeContent}>
                  <div className={styles.noticeMeta}>
                    <span className={styles.noticeDate}>Yesterday at 4:15 PM</span>
                  </div>
                  <p className={styles.noticeTitle}>Lab 5: Sequence Alignment (BLAST)</p>
                  <p className={styles.noticeDesc}>Your submission has been graded.</p>
                </div>
                <ChevronRight size={20} color="var(--outline)" />
              </div>
            </div>
          </section>
        </div>

        {/* Side Column */}
        <div className={styles.sideColumn}>
          {/* Upcoming Deadlines */}
          <section className={styles.cardPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.titleGroup}>
                <CalendarIcon size={22} color="var(--primary)" />
                <h3 className={styles.panelTitle}>Upcoming Deadlines</h3>
              </div>
            </div>

            <div>
              <div className={styles.deadlineItem}>
                <div className={styles.deadlineHeader}>
                  <div>
                    <span className={styles.deadlineBadge}>10:00 PM Tue, 1-10-2026</span>
                    <h4 className={styles.deadlineTitle}>Lab 5: Sequence Alignment (BLAST)</h4>
                    <p className={styles.deadlineCourse}>BIO 215 • Jupyter Notebook</p>
                  </div>
                  <Clock size={18} color="var(--outline)" />
                </div>
                <div className={styles.deadlineFooter}>
                  <button className={styles.deadlineButton}>
                    Add submission
                  </button>
                </div>
              </div>

              <div className={styles.deadlineItem}>
                <div className={styles.deadlineHeader}>
                  <div>
                    <span className={styles.deadlineBadge}>10:00 PM Tue, 1-10-2026</span>
                    <h4 className={styles.deadlineTitle}>Lab 5: Sequence Alignment (BLAST)</h4>
                    <p className={styles.deadlineCourse}>BIO 215 • Jupyter Notebook</p>
                  </div>
                  <Clock size={18} color="var(--outline)" />
                </div>
                <div className={styles.deadlineFooter}>
                  <button className={styles.deadlineButton}>
                    Add submission
                  </button>
                </div>
              </div>
              <div className={styles.deadlineItem}>
                <div className={styles.deadlineHeader}>
                  <div>
                    <span className={styles.deadlineBadge}>10:00 PM Tue, 1-10-2026</span>
                    <h4 className={styles.deadlineTitle}>Lab 5: Sequence Alignment (BLAST)</h4>
                    <p className={styles.deadlineCourse}>BIO 215 • Jupyter Notebook</p>
                  </div>
                  <Clock size={18} color="var(--outline)" />
                </div>
                <div className={styles.deadlineFooter}>
                  <button className={styles.deadlineButton}>
                    Add submission
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
