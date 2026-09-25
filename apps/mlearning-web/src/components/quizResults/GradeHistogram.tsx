import styles from './GradeHistogram.module.css';
import { histogram } from './mockData';
import type { HistogramBucket } from './types';

// Maps a colorKey to its bar CSS class (see .module.css for hex values)
const colorClass: Record<HistogramBucket['colorKey'], string> = {
  danger: styles.barDanger,
  histpink: styles.barPink,
  histlav: styles.barLav,
  brand: styles.barBrand,
  success: styles.barSuccess,
};

const TOTAL_STUDENTS = 128;

/** Bar chart showing how many students fall into each score bucket. */
export default function GradeHistogram() {
  const maxCount = Math.max(...histogram.map((b) => b.count));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>📊 Phân Bố Điểm (Grade Distribution Histogram)</span>
        <button className={styles.alphaBtn}>Bảng kiểm soát Alpha: 0.86 ▾</button>
      </div>

      <div className={styles.bars}>
        {histogram.map((bucket) => (
          <div key={bucket.range} className={styles.barCol}>
            <span className={styles.count}>
              {bucket.count} ({((bucket.count / TOTAL_STUDENTS) * 100).toFixed(1)}%)
            </span>
            <div
              className={`${styles.bar} ${colorClass[bucket.colorKey]}`}
              style={{ height: `${(bucket.count / maxCount) * 100}%` }}
            />
            <span className={styles.range}>{bucket.range}</span>
          </div>
        ))}
      </div>

      <p className={styles.footnote}>Trục X: Khoảng điểm · Trục Y: Số lượng sinh viên</p>
    </div>
  );
}
