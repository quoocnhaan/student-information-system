import styles from './PageHeader.module.css';

/** Page title, description and top-right action buttons. */
export default function PageHeader() {
  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>
          Bảng Kết Quả &amp; Điểm Chi Tiết: Quiz 04
        </h1>
      </div>
    </div>
  );
}
