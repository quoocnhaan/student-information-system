import styles from './Breadcrumb.module.css';

const crumbs = [
  'Trang chủ',
  'CS 409 (Học kỳ Fall 2025)',
  'Module 4: Consensus & Fault Tolerance',
  'Bảng Kết Quả',
  'Quiz 04',
];

/** Breadcrumb trail shown above the page title. */
export default function Breadcrumb() {
  return (
    <nav className={styles.wrap}>
      {crumbs.map((crumb, i) => (
        <span key={crumb} className={styles.item}>
          <span className={i === crumbs.length - 1 ? styles.current : styles.link}>
            {crumb}
          </span>
          {i < crumbs.length - 1 && <span className={styles.sep}>›</span>}
        </span>
      ))}
    </nav>
  );
}
