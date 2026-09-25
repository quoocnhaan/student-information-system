import styles from './QuizTopBar.module.css';

/** Sticky top bar for the quiz-taking session. */
export default function QuizTopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={`${styles.pill} ${styles.pillTimer}`}>
          <span className={styles.pillIcon}>⏱</span> 25:29 remaining
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
