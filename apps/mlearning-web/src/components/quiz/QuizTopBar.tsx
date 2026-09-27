import { useEffect, useRef, useState } from 'react';
import styles from './QuizTopBar.module.css';

interface Props {
  /** Total time allowed for the quiz, in seconds. Defaults to 25:29 to match the original static UI. */
  durationSeconds?: number;
  /** Called exactly once, when the countdown reaches 0. */
  onExpire?: () => void;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Sticky top bar for the quiz-taking session, with a live countdown timer. */
export default function QuizTopBar({ durationSeconds = 1 * 60 + 29, onExpire }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    // Reset if the allotted duration itself changes (e.g. a fresh quiz session).
    setRemaining(durationSeconds);
    hasExpiredRef.current = false;
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
      }
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remaining, onExpire]);

  const isLow = remaining <= 60 && remaining > 0;
  const isExpired = remaining <= 0;

  return (
    <header className={styles.bar}>
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
          aria-live="polite"
        >
          <span className={styles.pillIcon}>⏱</span>{' '}
          {isExpired ? 'Time is up — submitting...' : `${formatTime(remaining)} remaining`}
        </span>
      </div>

      <div className={styles.center}>
        <span className={styles.pill}>
          <span className={styles.pillIcon}>☁</span> All changes auto-saved
        </span>
      </div>
    </header>
  );
}