import styles from './ProgressBar.module.css';

interface Props {
  currentQuestion: number;
  total: number;
  isCurrentAnswered: boolean;
  percentComplete: number;
}

/** Thin progress bar with "Question N of M answered" / "X% Completed" labels. */
export default function ProgressBar({ currentQuestion, total, isCurrentAnswered, percentComplete }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percentComplete}%` }} />
      </div>
      <div className={styles.labels}>
        <span className={styles.left}>
          Question {currentQuestion} of {total}{isCurrentAnswered ? ' answered' : ''}
        </span>
        <span className={styles.right}>{percentComplete}% Completed</span>
      </div>
    </div>
  );
}
