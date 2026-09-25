import styles from './StudentTable.module.css';
import Badge from './Badge';
import { students } from './mockData';

const columns = [
  'Sinh viên / MSSV',
  'Thời điểm nộp',
  'Thời gian làm',
  'Lần nộp',
  'Điểm số tự động',
  'Điểm kết integrity',
  'Thao tác giảng viên',
];

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Sortable/filterable results table listing each student's submission and score. */
export default function StudentTable() {
  return (
    <div className={styles.card}>
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
            {students.map((s) => (
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
                  {s.integrityScore !== null ? (
                    <div className={styles.integrityCell}>
                      <span className={styles.muted}>{s.integrityScore} / 13</span>
                      <Badge label={s.integrityBadge.label} tone={s.integrityBadge.tone} />
                    </div>
                  ) : (
                    <Badge label={s.integrityBadge.label} tone={s.integrityBadge.tone} />
                  )}
                </td>

                <td>
                  <button className={styles.actionBtn}>✎ {s.lecturerAction}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
