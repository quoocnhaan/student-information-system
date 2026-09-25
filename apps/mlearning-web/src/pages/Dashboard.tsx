import { ArrowRight, Filter, ChevronRight, FileText, Calendar as CalendarIcon, Clock, BadgeCheck, CheckCircle2 } from 'lucide-react';
import styles from './Dashboard.module.css';

export function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.grid}>
        {/* Main Column */}
        <div className={styles.mainColumn}>
          {/* Active Courses Section */}
          <section>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Active Enrolled Courses</h2>
                <p className={styles.sectionSubtitle}>Fall 2025 • 16 Credit Hours Total</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-card)', cursor: 'pointer' }}>
                  <Filter size={20} color="var(--on-surface-variant)" />
                </button>
                <a href="#all-courses" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                  All Courses <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className={styles.courseGrid}>
              {/* Course 1: CS 408 */}
              <article className={styles.courseCard}>
                <div>
                  <div className={styles.courseMeta}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        CS • 4 Cr
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Mon, Wed 10:00 AM</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                      Grade: A
                    </span>
                  </div>
                  <h4 className={styles.courseTitle}>CS 408: Distributed Systems & Cloud</h4>
                  <p className={styles.courseDesc}>Consensus models, peer-to-peer protocols, and replication topology.</p>

                  <div className={styles.courseInstructor}>
                    <div className={styles.instructorAvatar}>
                      <img src="https://i.pravatar.cc/100?img=11" alt="Prof. Marcus Vance" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span className={styles.instructorName}>Prof. Marcus Vance</span>
                  </div>
                </div>

                <div className={styles.courseFooter}>
                  <div className={styles.progressHeader}>
                    <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>Syllabus Progress</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>72%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: '72%' }}></div>
                  </div>
                  <div className={styles.nextTask}>
                    <span className={styles.nextTaskName} style={{ color: '#b45309' }}>
                      <FileText size={14} /> PS3 Raft Consensus Engine
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Due Oct 24</span>
                  </div>
                </div>
              </article>

              {/* Course 2: MATH 302 */}
              <article className={styles.courseCard}>
                <div>
                  <div className={styles.courseMeta}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                        MATH • 4 Cr
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Tue, Thu 1:30 PM</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                      Grade: A-
                    </span>
                  </div>
                  <h4 className={styles.courseTitle}>MATH 302: Applied Stochastic Processes</h4>
                  <p className={styles.courseDesc}>Markov chains, Poisson processes, and Brownian motion models.</p>

                  <div className={styles.courseInstructor}>
                    <div className={styles.instructorAvatar}>
                      <img src="https://i.pravatar.cc/100?img=5" alt="Prof. Clara Sterling" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span className={styles.instructorName}>Prof. Clara Sterling</span>
                  </div>
                </div>

                <div className={styles.courseFooter}>
                  <div className={styles.progressHeader}>
                    <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>Syllabus Progress</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>54%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: '54%' }}></div>
                  </div>
                  <div className={styles.nextTask}>
                    <span className={styles.nextTaskName}>
                      <CheckCircle2 size={14} /> Midterm Problem Set 4
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Due Oct 29</span>
                  </div>
                </div>
              </article>
            </div>
          </section>

          {/* Recent Announcements */}
          <section className={styles.cardPanel} style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgeCheck size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>Campus Notices & Bulletins</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                <a href="#board" style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>View Faculty Noticeboard</a>
                <span style={{ color: 'var(--outline-variant)' }}>•</span>
                <a href="#archive" style={{ fontWeight: 500, color: 'var(--on-surface-variant)', textDecoration: 'none' }}>View Archive</a>
              </div>
            </div>

            <div>
              <div className={styles.noticeItem}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>Office of the Registrar</span>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Today at 09:30 AM</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '4px' }}>Spring 2026 Course Registration Opens Nov 10</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Ensure all departmental prerequisites and advisor holds are cleared before enrollment window opens.</p>
                </div>
                <ChevronRight size={20} color="var(--outline)" />
              </div>

              <div className={styles.noticeItem}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>University Libraries</span>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Yesterday at 4:15 PM</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '4px' }}>IEEE Xplore database maintenance scheduled Sunday</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Direct proxy access will be temporarily paused between 02:00 - 06:00 UTC.</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>Upcoming Deadlines</h3>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)' }}>
                3 Pending
              </span>
            </div>

            <div>
              <div className={`${styles.deadlineItem} ${styles.deadlineHigh}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(253, 230, 138, 0.7)', color: '#78350f' }}>Due in 4 Days</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)', marginTop: '4px', marginBottom: '2px' }}>PS3: Consensus Engine (Raft)</h4>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>CS 408 • Autograder & Benchmarks</p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--error)' }}>High Priority</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)' }}>Max Score: 100 pts</span>
                  <button style={{ padding: '4px 12px', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary)', fontSize: '12px', fontWeight: 500, borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                    Submit Code
                  </button>
                </div>
              </div>

              <div className={styles.deadlineItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}>Due in 6 Days</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)', marginTop: '4px', marginBottom: '2px' }}>Lab 5: Sequence Alignment (BLAST)</h4>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>BIO 215 • Jupyter Notebook</p>
                  </div>
                  <Clock size={18} color="var(--outline)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(195, 198, 215, 0.4)' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)' }}>Max Score: 50 pts</span>
                  <button style={{ padding: '4px 12px', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: 500, borderRadius: '4px', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>
                    Work on Lab
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Academic Health */}
          <section className={styles.cardPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>Academic Health</h3>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                Good Standing
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(242, 243, 255, 0.5)', border: '1px solid rgba(195, 198, 215, 0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Cumulative GPA</p>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>3.89</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: 'var(--primary)', border: '1px solid #bfdbfe' }}>
                    Dean's Honor List
                  </span>
                  <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', marginTop: '6px' }}>Fall 2025: 4.00 Term GPA</p>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(195, 198, 215, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>Grad Degree Credits</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--on-surface)' }}>18 / 32 Credits (56%)</span>
                </div>
                <div className={styles.progressTrack} style={{ marginBottom: '6px' }}>
                  <div className={styles.progressFill} style={{ width: '56%' }}></div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Top 5% of Graduate Computer Science Cohort</p>
              </div>
            </div>

            <a href="#transcript" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', marginTop: '12px' }}>
              <span>View Full Academic Transcript & Honors Audit</span>
              <ArrowRight size={16} />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
