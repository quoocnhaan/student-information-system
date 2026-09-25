import { useState } from 'react';
import styles from './Pagination.module.css';

interface Props {
  totalPages?: number;
  currentTotal?: number;
}

/** Pagination controls plus a note about the grade-lock deadline. */
export default function Pagination({ totalPages = 15, currentTotal = 128 }: Props) {
  const [page, setPage] = useState(1);
  const pagesToShow = [1, 2, 3];

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <p className={styles.note}>
          Hiển thị 1 - 8 trên tổng số {currentTotal} sinh viên
        </p>

        <div className={styles.pager}>
          <button
            className={styles.navBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹
          </button>

          {pagesToShow.map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <span className={styles.ellipsis}>…</span>
          <button className={styles.pageBtn} onClick={() => setPage(totalPages)}>
            {totalPages}
          </button>

          <button
            className={styles.navBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.lockNote}>
        🛡 Quy chế khóa điểm tự động: Hệ thống sẽ tự động khóa điểm khi vào lúc 23:59 ngày
        26/10/2025. Các trường hợp phúc khảo phải nộp muộn nhất trước hạn khóa.
      </div>
    </div>
  );
}
