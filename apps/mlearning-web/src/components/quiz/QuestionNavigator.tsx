import styles from './QuestionNavigator.module.css';
import type { NavigatorState } from './types';

interface Props {
  data: NavigatorState;
}

/** Sidebar card showing the answered/flagged/unanswered breakdown and a jump-to grid. */
export default function QuestionNavigator({ data }: Props) {
  const numbers = Array.from({ length: data.totalQuestions }, (_, i) => i + 1);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>▦</span>
        <span className={styles.headerTitle}>Question Navigator</span>
        <span className={styles.headerTotal}>{data.totalQuestions} Total</span>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.statBox} ${styles.statAnswered}`}>
          <span className={styles.statNum}>{data.answeredCount}</span>
          <span className={styles.statLabel}>Answered</span>
        </div>
        <div className={`${styles.statBox} ${styles.statFlagged}`}>
          <span className={styles.statNum}>{data.flaggedCount}</span>
          <span className={styles.statLabel}>Flagged</span>
        </div>
        <div className={`${styles.statBox} ${styles.statUnanswered}`}>
          <span className={styles.statNum}>{data.unansweredCount}</span>
          <span className={styles.statLabel}>Unanswered</span>
        </div>
      </div>

      <div className={styles.grid}>
        {numbers.map((n) => {
          const isAnswered = data.answeredIds.includes(n);
          const isFlagged = data.flaggedIds.includes(n);
          const isCurrent = n === data.current;
          return (
            <button
              key={n}
              className={`${styles.cell} ${isAnswered ? styles.cellAnswered : ''} ${
                isCurrent ? styles.cellCurrent : ''
              }`}
            >
              {n}
              {isFlagged && <span className={styles.flagDot} />}
            </button>
          );
        })}
      </div>

      {data.nextUnanswered !== null && (
        <button className={styles.jumpBtn}>
          ⏵ Jump to Next Unanswered (#{data.nextUnanswered})
        </button>
      )}
    </div>
  );
}
