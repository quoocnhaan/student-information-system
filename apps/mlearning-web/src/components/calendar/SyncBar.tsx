import styles from './SyncBar.module.css';

/** Small footer bar prompting calendar sync (Google/Apple). */
export default function SyncBar() {
  return (
    <div className={styles.bar}>
      <span className={styles.icon}>🔗</span>
      <div className={styles.text}>
        <p className={styles.title}>Calendar Synchronization</p>
        <p className={styles.subtitle}>Connect Google &amp; Apple Calendar Sync App</p>
      </div>
    </div>
  );
}
