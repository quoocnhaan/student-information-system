import styles from './StatsCards.module.css';
import { stats } from './mockData';

/** Row of 4 summary stat cards: submission rate, average score, average time, hardest question. */
export default function StatsCards() {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardLabel}>Tỷ lệ đã nộp bài</span>
        </div>
        <p className={styles.cardValue}>
          {stats.submissionRate.percent}%
          <span className={styles.cardValueSub}>
            ({stats.submissionRate.submitted}/{stats.submissionRate.total})
          </span>
        </p>
        <p className={styles.cardNote}>
          {stats.submissionRate.total - stats.submissionRate.submitted} sinh viên chưa nộp
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardLabel}>Điểm Trung Bình (TB)</span>
        </div>
        <p className={styles.cardValue}>
          {stats.averageScore.value}
          <span className={styles.cardValueSub}>/ 10</span>
        </p>
        <p className={styles.cardNote}>
          Cao nhất: {stats.averageScore.max} · Thấp nhất: {stats.averageScore.min} · Trung vị: {stats.averageScore.median}
        </p>
      </div>
    </div>
  );
}
