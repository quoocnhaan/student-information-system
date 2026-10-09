import { BiShow } from 'react-icons/bi';
import styles from './quizResults.module.css';
import type { StudentRow } from './quizDetails';

const columns = [
  'Sinh viên / MSSV',
  'Thời điểm nộp',
  'Thời gian làm',
  'Lần nộp',
  'Điểm số tự động',
  'Thao tác giảng viên',
];

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  rows: StudentRow[];
  onView: (student: StudentRow) => void;
}

/** Bảng kết quả từng sinh viên; nút "Xem chi tiết" mở bài làm của sinh viên đó. */
export default function StudentTable({ rows, onView }: Props) {
  return (
    <div className={styles.tableCard}>
      <div className={styles.scrollWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thCheckbox}>
                <input type="checkbox" />
              </th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className={styles.emptyCell}>
                  Không tìm thấy sinh viên phù hợp.
                </td>
              </tr>
            )}

            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <input type="checkbox" />
                </td>

                <td>
                  <div className={styles.studentCell}>
                    <div className={styles.avatar}>{initials(s.name)}</div>
                    <div>
                      <p className={styles.studentName}>{s.name}</p>
                      <p className={styles.studentId}>{s.id}</p>
                    </div>
                  </div>
                </td>

                <td className={styles.muted}>{s.submittedAt}</td>
                <td className={styles.muted}>{s.duration}</td>
                <td className={styles.muted}>{s.attemptsNote}</td>

                <td>
                  {s.autoScore !== null ? (
                    <span className={styles.scoreStrong}>{s.autoScore.toFixed(1)} / 10</span>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={s.autoScore === null}
                    title={s.autoScore === null ? 'Sinh viên chưa nộp bài' : undefined}
                    onClick={() => onView(s)}
                  >
                    <BiShow /> Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}