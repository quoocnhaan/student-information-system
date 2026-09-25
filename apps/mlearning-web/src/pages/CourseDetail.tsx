import { FaGithub } from 'react-icons/fa';
import { Clock, Download as DownloadIcon, MessageSquare, Video, Clock10, CheckCircle2, CircleDot, Lock as LockIcon, Users, Play, BookOpen, Book, Terminal as TerminalIcon, History as HistoryIcon, ExternalLink, HelpCircle, PlayCircle as PlayCircleIcon, FileText, CheckCircle as Mail, MapPin } from 'lucide-react';
import styles from './CourseDetail.module.css';

export function CourseDetail() {
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
                <div className={styles.moduleMiniProgress}>
                  <div className={styles.miniProgressHeader}>
                    <span>Module Progress</span>
                    <span>75%</span>
                  </div>
                  <div className={styles.miniProgressTrack}>
                    <div className={styles.miniProgressFill} style={{ width: '75%' }}></div>
                  </div>
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

              <div className={styles.bannerProgress}>
                <div className={styles.circularProgress}>
                  <svg>
                    <circle className={styles.circularBg} cx="28" cy="28" r="24" strokeWidth="4"></circle>
                    <circle className={styles.circularFill} cx="28" cy="28" r="24" strokeWidth="4" strokeDasharray="150" strokeDashoffset="37.5"></circle>
                  </svg>
                  <span className={styles.circularText}>75%</span>
                </div>
                <span className={styles.progressStatusText}>3 of 4 Done</span>
              </div>
            </div>

            <div className={styles.filterTabs}>
              <button className={`${styles.filterTab} ${styles.filterTabActive}`}>All Activities (5)</button>
              <button className={`${styles.filterTab} ${styles.filterTabInactive}`}>Lectures (2)</button>
              <button className={`${styles.filterTab} ${styles.filterTabInactive}`}>Readings (1)</button>
              <button className={`${styles.filterTab} ${styles.filterTabInactive}`}>Assignments & Labs (1)</button>
              <button className={`${styles.filterTab} ${styles.filterTabInactive}`}>Quizzes (1)</button>
            </div>
          </div>

          <div className={styles.activityList}>
            {/* Activity 1 */}
            <article className={styles.activityItem}>
              <div className={styles.activityLayout}>
                <div className={styles.activityContent}>
                  <div className={`${styles.activityIcon} ${styles.iconSuccess}`}>
                    <Video size={22} />
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaBadgeSuccess}`}>Completed</span>
                      <span className={styles.metaText}>42 mins</span>
                      <span className={styles.metaDot}>•</span>
                      <span className={styles.metaText}>Watched Oct 16</span>
                    </div>
                    <h3 className={styles.activityTitle}>Lecture 4.1: The State Machine Approach & Consensus Foundations</h3>
                    <p className={styles.activityDesc}>Theoretical underpinnings of determinism, distributed logs, and non-blocking atomic commitments.</p>
                  </div>
                </div>
                <div className={styles.activityActions}>
                  <button className={styles.actionBtnSecondary}>
                    <Play size={16} /> Rewatch
                  </button>
                  <button className={styles.actionBtnSecondary}>
                    <FileText size={16} /> Slides
                  </button>
                  <button className={styles.actionBtnIcon}>
                    <Book size={18} />
                  </button>
                </div>
              </div>
            </article>

            {/* Activity 2 */}
            <article className={`${styles.activityItem} ${styles.activityItemActive}`}>
              <div className={styles.activityLayout}>
                <div className={styles.activityContent}>
                  <div className={`${styles.activityIcon} ${styles.iconActive}`}>
                    <PlayCircleIcon size={22} fill="var(--primary)" color="var(--primary-fixed)" />
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaBadgeWarning}`}>In Progress (40%)</span>
                      <span className={styles.metaText}>45 mins total</span>
                      <span className={styles.metaDot}>•</span>
                      <span className={styles.metaTextPrimary}>18:24 remaining</span>
                    </div>
                    <h3 className={styles.activityTitle}>Lecture 4.2: Raft Leader Election, Heartbeats & Log Invariants</h3>
                    <p className={styles.activityDesc}>Detailed step-through of randomized election timers, RequestVote RPC semantics, and split-brain resolution.</p>
                  </div>
                </div>
                <div className={styles.activityActions}>
                  <button className={styles.actionBtnPrimary}>
                    <Play size={18} fill="currentColor" /> Resume Video (18:24)
                  </button>
                </div>
              </div>
              <div className={styles.inlineScrubber}>
                <div className={styles.scrubberTrack}>
                  <div className={styles.scrubberFill} style={{ width: '40%' }}></div>
                </div>
                <div className={styles.scrubberTime}>
                  <span className={`${styles.scrubberText} ${styles.scrubberTextActive}`}>18:24</span>
                  <span>/</span>
                  <span className={styles.scrubberText}>45:00</span>
                </div>
                <button className={styles.scrubberLink}>
                  <FileText size={16} /> Companion Notes
                </button>
              </div>
            </article>

            {/* Activity 3 */}
            <article className={styles.activityItem}>
              <div className={styles.activityLayout}>
                <div className={styles.activityContent}>
                  <div className={`${styles.activityIcon} ${styles.iconSuccess}`}>
                    <BookOpen size={22} />
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaBadgeSuccess}`}>Read & Annotated</span>
                      <span className={styles.metaText}>Required Paper</span>
                    </div>
                    <h3 className={styles.activityTitle}>In Search of an Understandable Consensus Algorithm</h3>
                    <p className={styles.activityDesc}>Diego Ongaro and John Ousterhout (Stanford University, USENIX ATC)</p>
                  </div>
                </div>
                <div className={styles.activityActions}>
                  <button className={styles.actionBtnSecondary}>
                    <BookOpen size={18} color="var(--primary)" /> Open PDF Reader
                  </button>
                  <span className={styles.tagBadge}>14 Highlights</span>
                </div>
              </div>
            </article>

            {/* Activity 4 */}
            <article className={`${styles.activityItem} ${styles.activityItemUrgent} ${styles.assignmentActivity}`}>
              <div className={styles.urgentTag}>
                <Clock10 size={14} /> Due in 4 Days (Oct 28)
              </div>
              <div className={styles.activityLayout}>
                <div className={styles.activityContent}>
                  <div className={`${styles.activityIcon} ${styles.iconActive}`}>
                    <TerminalIcon size={24} />
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaBadgePrimary}`}>Problem Set 3 • Core Lab</span>
                      <span className={styles.metaText}>100 Points Possible</span>
                    </div>
                    <h3 className={styles.activityTitle}>Problem Set 3: Building a Fault-Tolerant Raft Consensus Core in Go</h3>
                    <p className={styles.activityDesc}>Implement leader election (Part 2A) and log agreement (Part 2B). Your implementation must pass the strict network-partition and dropped-RPC stress testing framework.</p>
                  </div>
                </div>
              </div>
              <div className={styles.ciBox}>
                <div className={styles.ciInfo}>
                  <div className={styles.ciHeader}>
                    <span className={styles.ciTitle}>Automated Grading CI Suite:</span>
                    <span className={styles.ciStatusBadge}>4 / 6 Tests Passing</span>
                    <span className={styles.ciScore}>(Score: 75/100 Pts)</span>
                  </div>
                  <div className={styles.ciTests}>
                    <span className={styles.ciTestPass}>TestInitialElection: PASS</span>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.ciTestPass}>TestReElection: PASS</span>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.ciTestFail}>TestConcurrentPartitions: FAILED (timeout 3000ms)</span>
                  </div>
                </div>
                <div className={styles.ciActions}>
                  <button className={styles.actionBtnSecondary}>
                    <HistoryIcon size={16} /> Submission Log (3)
                  </button>
                  <button className={styles.actionBtnPrimary}>
                    <ExternalLink size={18} /> Open Web IDE & Runner
                  </button>
                </div>
              </div>
            </article>

            {/* Activity 5 */}
            <article className={styles.activityItem} style={{ opacity: 0.9 }}>
              <div className={styles.activityLayout}>
                <div className={styles.activityContent}>
                  <div className={`${styles.activityIcon} ${styles.iconLocked}`}>
                    <HelpCircle size={22} />
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaBadgeLocked}`}>Locked Activity</span>
                      <span className={styles.metaText}>Estimated 15 mins • 10 Questions</span>
                    </div>
                    <h3 className={styles.activityTitle} style={{ color: 'var(--on-surface-variant)' }}>Module 4 Knowledge Check Quiz</h3>
                    <p className={styles.activityDesc}>Short multiple-choice assessment covering Raft election conditions, state transitions, and safety guarantees.</p>
                  </div>
                </div>
                <div className={styles.activityActions}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#b45309', backgroundColor: '#fef3c7', padding: '6px 12px', borderRadius: 'var(--radius-lg)' }}>
                    <LockIcon size={14} /> Unlocks upon passing PS3 automated tests
                  </div>
                </div>
              </div>
            </article>

          </div>
        </section>
      </div>
    </div>
  );
}
