import styles from './StatsCards.module.css';
import { stats } from './mockData';

/** Row of 4 summary stat cards: submission rate, average score, average time, hardest question. */
export default function StatsCards() {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={`${styles.iconBox} ${styles.iconBlue}`}>👥</span>
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
          <span className={`${styles.iconBox} ${styles.iconGreen}`}>🎯</span>
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

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={`${styles.iconBox} ${styles.iconGray}`}>⏱</span>
          <span className={styles.cardLabel}>Thời gian làm bài TB</span>
        </div>
        <p className={styles.cardValue}>{stats.averageTime.value}</p>
        <p className={styles.cardNote}>
          Nhanh nhất: {stats.averageTime.fastest} · Chậm nhất: {stats.averageTime.slowest}
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={`${styles.iconBox} ${styles.iconWarn}`}>⚠</span>
          <span className={styles.cardLabel}>Câu hỏi khó nhất</span>
        </div>
        <p className={styles.cardValueSm} title={stats.hardestQuestion.label}>
          {stats.hardestQuestion.label}
        </p>
        <p className={styles.cardNote}>
          <span className={styles.danger}>{stats.hardestQuestion.correctRate}%</span> trả lời đúng ·{' '}
          <a href="#" className={styles.link}>{stats.hardestQuestion.link}</a>
        </p>
      </div>
    </div>
  );
}
