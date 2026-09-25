import { Search, Grid, List, Star, Clock, BadgeCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CourseCatalog.module.css';

export function CourseCatalog() {
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchInput}>
          <Search size={20} className={styles.searchIcon} />
          <input type="text" placeholder="Filter displayed course titles or topics..." />
        </div>

        <div className={styles.controls}>
          <div className={styles.sortSelect}>
            <label htmlFor="sortSelector">Sort by:</label>
            <select id="sortSelector">
              <option>Recommended / Popular</option>
              <option>Highest Rated (4.5+ ★)</option>
              <option>Academic Rigor / Difficulty</option>
              <option>Course Code (Ascending)</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${styles.active}`}>
              <Grid size={18} />
            </button>
            <button className={styles.viewBtn}>
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* CARD 1 */}
        <article className={styles.courseCard}>
          <div className={styles.cardBanner}>
            <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop" alt="Cloud Data" />
            <div className={styles.badgeTopLeft}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--primary)', border: '1px solid rgba(195, 198, 215, 0.6)' }}>CS & AI</span>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}>Graduate Core</span>
            </div>
            <div className={styles.badgeTopRight}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span> Enrolled
              </span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.courseMeta}>
              <span className={styles.courseCode}>CRN 40812 • CS 408</span>
            </div>
            <h3 className={styles.courseTitle}>CS 408: Distributed Systems & Cloud Architecture</h3>
            <p className={styles.courseDesc}>Consensus protocols, Raft, Paxos, distributed transaction logging, and resilient cloud design.</p>

            <div className={styles.instructorRow}>
              <img className={styles.instructorAvatar} src="https://i.pravatar.cc/100?img=11" alt="Prof" />
              <div className={styles.instructorInfo}>
                <span className={styles.instructorName}>
                  Prof. Dr. Elizabeth Vance <BadgeCheck size={14} color="var(--primary)" />
                </span>
                <span className={styles.instructorRole}>Chair, Cloud Research Lab</span>
              </div>
            </div>
            <div className={styles.scheduleBadge}>
              <Clock size={14} color="var(--primary)" /> Mon/Wed 10:00 - 11:30 AM • Turing Hall B
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>72%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '72%' }}></div>
              </div>
            </div>
            <button className={styles.actionBtn}>
              Go to Course <ArrowRight size={16} />
            </button>
          </div>
        </article>

        {/* CARD 2 */}
        <article className={styles.courseCard}>
          <div className={styles.cardBanner}>
            <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop" alt="Math" />
            <div className={styles.badgeTopLeft}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--primary)', border: '1px solid rgba(195, 198, 215, 0.6)' }}>Math & Stats</span>
              <span style={{ fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-secondary-container)' }}>4.0 Credits</span>
            </div>
            <div className={styles.badgeTopRight}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}>
                Open Seats
              </span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.courseMeta}>
              <span className={styles.courseCode} style={{ color: 'var(--secondary)' }}>CRN 30288 • MATH 302</span>
            </div>
            <h3 className={styles.courseTitle}>MATH 302: Applied Stochastic Processes & Queueing</h3>
            <p className={styles.courseDesc}>Markov chains, Poisson arrival modeling, Brownian motion, and Monte Carlo algorithmic simulations.</p>

            <div className={styles.instructorRow}>
              <img className={styles.instructorAvatar} src="https://i.pravatar.cc/100?img=8" alt="Prof" />
              <div className={styles.instructorInfo}>
                <span className={styles.instructorName}>
                  Dr. Marcus Chen <BadgeCheck size={14} color="var(--primary)" />
                </span>
                <span className={styles.instructorRole}>Institute for Applied Math</span>
              </div>
            </div>
            <div className={styles.scheduleBadge}>
              <Clock size={14} color="var(--primary)" /> Tue/Thu 01:15 - 02:45 PM • Euler 104
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>54%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '54%' }}></div>
              </div>
            </div>
            <button className={styles.actionBtn}>
              Go to Course <ArrowRight size={16} />
            </button>
          </div>
        </article>

        {/* CARD 3 */}
        <article className={styles.courseCard}>
          <div className={styles.cardBanner}>
            <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop" alt="AI" />
            <div className={styles.badgeTopLeft}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--primary)', border: '1px solid rgba(195, 198, 215, 0.6)' }}>CS & AI</span>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}>Graduate Core</span>
            </div>
            <div className={styles.badgeTopRight}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}>
                Open Seats
              </span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.courseMeta}>
              <span className={styles.courseCode}>CRN 42005 • CS 420</span>
            </div>
            <h3 className={styles.courseTitle}>CS 420: Deep Learning & Neural Architectures</h3>
            <p className={styles.courseDesc}>Transformer attention, diffusion models, reinforcement learning, and PyTorch acceleration.</p>

            <div className={styles.instructorRow}>
              <img className={styles.instructorAvatar} src="https://i.pravatar.cc/100?img=12" alt="Prof" />
              <div className={styles.instructorInfo}>
                <span className={styles.instructorName}>
                  Prof. Aris Thorne <BadgeCheck size={14} color="var(--primary)" />
                </span>
                <span className={styles.instructorRole}>Lead AI Research Scientist</span>
              </div>
            </div>
            <div className={styles.scheduleBadge}>
              <Clock size={14} color="var(--primary)" /> Fri 09:00 - 12:00 PM • CS Aud. 1
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>65%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '65%' }}></div>
              </div>
            </div>
            <button className={styles.actionBtn}>
              Go to Course <ArrowRight size={16} />
            </button>
          </div>
        </article>

        {/* CARD 4 */}
        <article className={styles.courseCard}>
          <div className={styles.cardBanner}>
            <img src="https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=600&auto=format&fit=crop" alt="Biology" />
            <div className={styles.badgeTopLeft}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--tertiary)', border: '1px solid rgba(195, 198, 215, 0.6)' }}>Bioinformatics</span>
              <span style={{ fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-secondary-container)' }}>3.0 Credits</span>
            </div>
            <div className={styles.badgeTopRight}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}>
                Open Seats
              </span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.courseMeta}>
              <span className={styles.courseCode} style={{ color: 'var(--tertiary)' }}>CRN 21530 • BIO 215</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Star size={12} color="#f59e0b" fill="#f59e0b" /> 4.7 (42)</span>
            </div>
            <h3 className={styles.courseTitle}>BIO 215: Computational Genomics & Sequence Analysis</h3>
            <p className={styles.courseDesc}>Genome assembly pipelines, BLAST algorithmic heuristics, protein folding models, and phylogenetic trees.</p>

            <div className={styles.instructorRow}>
              <img className={styles.instructorAvatar} src="https://i.pravatar.cc/100?img=5" alt="Prof" />
              <div className={styles.instructorInfo}>
                <span className={styles.instructorName}>
                  Dr. Elena Rostova <BadgeCheck size={14} color="var(--primary)" />
                </span>
                <span className={styles.instructorRole}>Genomics Institute</span>
              </div>
            </div>
            <div className={styles.scheduleBadge}>
              <Clock size={14} color="var(--primary)" /> Wed 02:00 - 05:00 PM • BioLab 3
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>88%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '88%' }}></div>
              </div>
            </div>
            <button className={styles.actionBtn}>
              Go to Course <ArrowRight size={16} />
            </button>
          </div>
        </article>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageInfo}>
          Showing <span>1-6</span> of <span>184</span> Available Courses
        </div>
        <div className={styles.pageControls}>
          <button className={`${styles.pageBtn} ${styles.pageBtnBorder}`} disabled>
            <ChevronLeft size={16} />
          </button>
          <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
          <button className={styles.pageBtn}>2</button>
          <button className={styles.pageBtn}>3</button>
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>...</span>
          <button className={styles.pageBtn}>31</button>
          <button className={`${styles.pageBtn} ${styles.pageBtnBorder}`}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
