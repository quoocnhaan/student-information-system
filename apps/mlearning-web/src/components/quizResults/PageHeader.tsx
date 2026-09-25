import styles from './PageHeader.module.css';

/** Page title, description and top-right action buttons. */
export default function PageHeader() {
  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>
          Bảng Kết Quả &amp; Điểm Chi Tiết: Quiz 04
          <span className={styles.titleSub}> (Consensus &amp; Leader Election)</span>
        </h1>
        <p className={styles.desc}>
          Các cho chiến kiến từ đồng theo thời gian thực, của sinh viên nay xem rõ ràng đối chiếu.
          Đảm bảo thay đổi toàn Raft, Paxos và Split-Brain resolution. Học kỳ 1 - Năm học 2025-2026.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnOutline}>⭳ Xuất CSV / Excel</button>
        <button className={styles.btnOutline}>⭳ Xuất Kết quả CSV theo mã SV</button>
        <button className={styles.btnPrimary}>⟳ Đồng bộ Điểm Tổng</button>
      </div>
    </div>
  );
}
