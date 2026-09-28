import { useMemo, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Download as DownloadIcon, MessageSquare, Video, Clock10, CheckCircle2, CircleDot, Lock as LockIcon, Users, CheckCircle as Mail, MapPin } from 'lucide-react';
import styles from './CourseDetail.module.css';
import ActivityItem from '../components/course/Activityitem';
import { activities } from '../components/course/Activitymockdata';

// ---- Dữ liệu mẫu cho 2 activity dạng dropdown (thay bằng dữ liệu từ API khi có backend) ----

export function CourseDetail() {
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'lecture' | 'assignment' | 'quiz'
  >('all');
  const activityCounts = useMemo(() => {
    return {
      all: activities.length,

      lecture: activities.filter(
        (activity) => activity.type === 'resource'
      ).length,

      assignment: activities.filter(
        (activity) => activity.type === 'assignment'
      ).length,

      quiz: activities.filter(
        (activity) => activity.type === 'quiz'
      ).length,
    };
  }, []);
  const filteredActivities = useMemo(() => {
    switch (activeFilter) {
      case 'lecture':
        return activities.filter(
          (activity) => activity.type === 'resource'
        );

      case 'assignment':
        return activities.filter(
          (activity) => activity.type === 'assignment'
        );

      case 'quiz':
        return activities.filter(
          (activity) => activity.type === 'quiz'
        );

      default:
        return activities;
    }
  }, [activeFilter]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <div className={styles.container}>
      {/* HERO COURSE HEADER & STATS CARD */}
      <section className={styles.heroCard}>
        <div className={styles.heroAccent}></div>
        <div className={styles.heroGrid}>
          {/* Left: Course Overview & Meta */}
          <div className={styles.heroContent}>
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgePrimary}`}>
                <span className={styles.badgeDot}></span>
                CS 408 • Core Graduate
              </span>
              <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                Fall 2025 • 4.0 Credits
              </span>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                <span className={styles.badgeDot}></span>
                Enrolled (Active)
              </span>
              <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                <Clock size={14} />
                Mon/Wed 10:00 - 11:30 AM EST
              </span>
            </div>

            <div>
              <h1 className={styles.courseTitle}>
                CS 408: Distributed Systems & Cloud Architecture
              </h1>
              <p className={styles.courseDesc}>
                In-depth study of consensus protocols (Paxos, Raft), Byzantine fault tolerance, remote procedure calls (gRPC/Protobuf), distributed storage engines, and microservices scalability at cloud-native multi-region scale.
              </p>
            </div>

            <div className={styles.instructorModule}>
              <div className={styles.instructorProfile}>
                <img className={styles.instructorAvatar} src="https://i.pravatar.cc/100?img=11" alt="Prof" />
                <div>
                  <div className={styles.instructorNameRow}>
                    <span className={styles.instructorName}>Prof. Dr. Elizabeth Vance</span>
                    <span className={styles.instructorTag}>Instructor</span>
                  </div>
                  <span className={styles.instructorRole}>Director, Systems & Network Architecture Lab</span>
                </div>
              </div>
              <div className={styles.divider}></div>
              <div className={styles.contactInfo}>
                <span className={styles.contactRow}>
                  <Mail size={16} color='var(--primary)' /> e.vance@universitas.edu
                </span>
                <span className={styles.contactRow}>
                  <MapPin size={16} color='var(--primary)' /> Tue/Thu 2:00 - 4:00 PM • Bldg 4, Rm 102
                </span>
              </div>
            </div>

            <div className={styles.quickActions}>
              <button className={`${styles.actionBtn} ${styles.btnPrimary}`}>
                <DownloadIcon size={18} /> Download Full Syllabus (PDF)
              </button>
              <button className={`${styles.actionBtn} ${styles.btnSecondary}`}>
                <MessageSquare size={18} color="var(--secondary)" /> Course Forum (18 new)
              </button>
              <button className={`${styles.actionBtn} ${styles.btnSecondary}`}>
                <Video size={18} color="var(--primary)" /> Office Hours Zoom Queue
              </button>
              <button className={`${styles.actionBtn} ${styles.btnSecondary}`}>
                <FaGithub size={18} />GitHub Classroom Repo
              </button>
            </div>
          </div>

          {/* Right: Course Performance & Standing Card */}
          <div className={styles.performanceCard}>
            <div className={styles.standingHeader}>
              <span className={styles.standingTitle}>Academic Standing</span>
              <span className={styles.standingBadge}>On Track</span>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Current Grade</span>
                <div className={styles.metricValueRow}>
                  <span className={`${styles.metricValueMain} ${styles.textPrimary}`}>A</span>
                  <span className={styles.metricValueSub}>94.2%</span>
                </div>
                <span className={`${styles.metricFooter} ${styles.textSecondary}`}>Top 10% of cohort</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Completed Units</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValueMain}>18</span>
                  <span className={`${styles.metricValueSub} ${styles.textSecondary}`}>/ 25 items</span>
                </div>
                <span className={`${styles.metricFooter} ${styles.textSuccess}`}>72% Finished</span>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Semester Completion</span>
                <span className={styles.progressValue}>72%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '72%' }}></div>
              </div>
            </div>

            <div className={styles.alertBox}>
              <Clock10 size={20} className={styles.alertIcon} />
              <div className={styles.alertContent}>
                <div className={styles.alertHeader}>
                  <span className={styles.alertTitle}>Next Due Date</span>
                  <span className={styles.alertBadge}>4 Days Left</span>
                </div>
                <p className={styles.alertDesc}>PS3: Raft Consensus Engine (Go implementation)</p>
                <span className={styles.alertFooter}>Due Tue, Oct 28 • 11:59 PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO-COLUMN PEDAGOGICAL WORKFLOW LAYOUT */}
      <div className={styles.mainLayout}>
        {/* COLUMN A: Modular Weekly Syllabus Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <div>
                <h2 className={styles.sidebarTitle}>Course Modules</h2>
                <span className={styles.sidebarSubtitle}>8 Total Modules • 16 Weeks</span>
              </div>
              <span className={styles.sidebarBadge}>Midterm Phase</span>
            </div>

            <div className={styles.moduleList}>
              <div className={styles.moduleItem}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <CheckCircle2 size={20} className={`${styles.moduleIcon} ${styles.moduleIconSuccess}`} fill="#ecfdf5" />
                    <div>
                      <span className={styles.moduleWeek}>Week 1-2</span>
                      <h3 className={styles.moduleTitle}>Foundations of Distributed Systems</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusSuccess}`}>4/4</span>
                </div>
              </div>

              <div className={styles.moduleItem}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <CheckCircle2 size={20} className={`${styles.moduleIcon} ${styles.moduleIconSuccess}`} fill="#ecfdf5" />
                    <div>
                      <span className={styles.moduleWeek}>Week 3-4</span>
                      <h3 className={styles.moduleTitle}>RPCs & Fault-Tolerant Communication</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusSuccess}`}>4/4</span>
                </div>
              </div>

              <div className={styles.moduleItem}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <CheckCircle2 size={20} className={`${styles.moduleIcon} ${styles.moduleIconSuccess}`} fill="#ecfdf5" />
                    <div>
                      <span className={styles.moduleWeek}>Week 5-6</span>
                      <h3 className={styles.moduleTitle}>Time, Clocks & State Replication</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusSuccess}`}>5/5</span>
                </div>
              </div>

              <div className={`${styles.moduleItem} ${styles.moduleItemActive}`}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <CircleDot size={20} className={`${styles.moduleIcon} ${styles.moduleIconActive}`} />
                    <div>
                      <span className={`${styles.moduleWeek} ${styles.moduleWeekActive}`}>
                        Week 7-8 <span className={styles.activeTag}>CURRENT</span>
                      </span>
                      <h3 className={`${styles.moduleTitle} ${styles.moduleTitleActive}`}>Consensus Algorithms & Raft Implementation</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusActive}`}>3/4 Done</span>
                </div>
              </div>

              <div className={`${styles.moduleItem} ${styles.moduleItemLocked}`}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <LockIcon size={20} className={`${styles.moduleIcon} ${styles.moduleIconLocked}`} />
                    <div>
                      <span className={`${styles.moduleWeek} ${styles.moduleWeekInactive}`}>Week 9-10</span>
                      <h3 className={`${styles.moduleTitle} ${styles.moduleTitleLocked}`}>Distributed Transactions & 2PC/3PC</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusLocked}`}>Nov 03</span>
                </div>
              </div>

              <div className={`${styles.moduleItem} ${styles.moduleItemLocked}`}>
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <LockIcon size={20} className={`${styles.moduleIcon} ${styles.moduleIconLocked}`} />
                    <div>
                      <span className={`${styles.moduleWeek} ${styles.moduleWeekInactive}`}>Week 11-12</span>
                      <h3 className={`${styles.moduleTitle} ${styles.moduleTitleLocked}`}>Byzantine Fault Tolerance & Blockchain</h3>
                    </div>
                  </div>
                  <span className={`${styles.moduleStatusBadge} ${styles.moduleStatusLocked}`}>Nov 17</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportHeader}>
              <Users size={20} color="var(--primary)" />
              <h3 className={styles.supportTitle}>Teaching Assistant Support</h3>
            </div>
            <p className={styles.supportDesc}>
              Lab questions or Go debugging? Join the active TA discord channel or book 1-on-1 code reviews.
            </p>
            <div className={styles.supportFooter}>
              <span>Marcus Chen (Head TA)</span>
              <a href="#booking" className={styles.supportLink}>Book Slot →</a>
            </div>
          </div>
        </aside>

        {/* COLUMN B: Active Module Activities & Learning Stream */}
        <section className={styles.contentStream}>
          <div className={styles.activeModuleBanner}>
            <div className={styles.bannerLayout}>
              <div>
                <div className={styles.bannerTop}>
                  <span className={styles.bannerTag}>In Progress</span>
                  <span className={styles.bannerDate}>Oct 14 - Oct 28, 2025</span>
                </div>
                <h2 className={styles.bannerTitle}>Module 4: Consensus Algorithms & Raft Implementation</h2>
                <p className={styles.bannerDesc}>
                  Deconstruct the mechanics of distributed state machine replication, leader election edge-cases, log reconciliation safety, and partition tolerance.
                </p>
              </div>
            </div>

            <div className={styles.filterTabs}>
              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'all'
                  ? styles.filterTabActive
                  : styles.filterTabInactive
                  }`}
                onClick={() => setActiveFilter('all')}
              >
                All Activities ({activityCounts.all})
              </button>

              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'lecture'
                  ? styles.filterTabActive
                  : styles.filterTabInactive
                  }`}
                onClick={() => setActiveFilter('lecture')}
              >
                Lectures ({activityCounts.lecture})
              </button>

              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'assignment'
                  ? styles.filterTabActive
                  : styles.filterTabInactive
                  }`}
                onClick={() => setActiveFilter('assignment')}
              >
                Assignments & Labs ({activityCounts.assignment})
              </button>

              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'quiz'
                  ? styles.filterTabActive
                  : styles.filterTabInactive
                  }`}
                onClick={() => setActiveFilter('quiz')}
              >
                Quizzes ({activityCounts.quiz})
              </button>
            </div>
          </div>

          <div className={styles.activityList}>
            {filteredActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onStartQuiz={(quizId) =>
                  navigate(`/course/${id}/quiz-taking/${quizId}`)
                }
                onSaveSubmission={(assignmentId, file) => {
                  console.log(
                    'Save submission',
                    assignmentId,
                    file.name
                  );
                }}
                onRemoveSubmission={(assignmentId) => {
                  console.log(
                    'Remove submission',
                    assignmentId
                  );
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

