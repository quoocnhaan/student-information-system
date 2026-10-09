import { useState } from 'react';
import styles from './quizResults.module.css';

interface Props {
  totalPages?: number;
  currentTotal?: number;
  /** Số dòng đang hiển thị trong bảng (sau khi tìm kiếm/lọc). */
  shown?: number;
}

/** Pagination controls plus a note about the grade-lock deadline. */
export default function Pagination({ totalPages = 15, currentTotal = 128, shown = 8 }: Props) {
  const [page, setPage] = useState(1);
  const pagesToShow = [1, 2, 3];

  return (
    <div className={styles.paginationWrap}>
      <div className={styles.row}>
        <p className={styles.note}>
          Hiển thị {shown === 0 ? 0 : `1 - ${shown}`} trên tổng số {currentTotal} sinh viên
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
    </div>
  );
}