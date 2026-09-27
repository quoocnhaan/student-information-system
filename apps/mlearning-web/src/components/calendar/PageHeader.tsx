import styles from './PageHeader.module.css';

/** Breadcrumb + page title + status badges + primary actions. */
export default function PageHeader() {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          <div className={styles.titleLine}>
            <h1 className={styles.title}>Academic Calendar &amp; Schedule</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
