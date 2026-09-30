import styles from './QuestionNavigator.module.css';
import type { NavigatorState } from './types';

interface Props {
  data: NavigatorState;
  secondsLeft: number;          // thời gian còn lại do cha quản lý
  onSelect?: (questionNumber: number) => void;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function QuestionNavigator({ data, secondsLeft, onSelect }: Props) {
  const numbers = Array.from({ length: data.totalQuestions }, (_, i) => i + 1);

  const isLow = secondsLeft <= 60 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Question Navigator</span>
        <div className={styles.left}>
          <span
            className={`${styles.pill} ${styles.pillTimer}`}
            style={
              isExpired
                ? { color: '#991b1b', backgroundColor: '#fee2e2', borderColor: '#fca5a5' }
                : isLow
                  ? { color: '#b45309', backgroundColor: '#fffbeb', borderColor: '#f59e0b' }
                  : undefined
            }
            role="timer"
            aria-live="off"
          >
            <span className={styles.pillIcon}>⏱</span>{' '}
            {isExpired ? 'Submitting' : formatTime(secondsLeft)}
          </span>
        </div>
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
              className={`${styles.cell} ${isAnswered ? styles.cellAnswered : ''} ${isCurrent ? styles.cellCurrent : ''
                }`}
              onClick={() => onSelect?.(n)}
            >
              {n}
              {isFlagged && <span className={styles.flagDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}