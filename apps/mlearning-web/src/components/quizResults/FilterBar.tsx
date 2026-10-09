import styles from './quizResults.module.css';
import { BiSearch } from 'react-icons/bi';

export type StatusFilter = 'all' | 'submitted' | 'pending';
export type SortOrder = 'asc' | 'desc';

const tabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả nhóm' },
  { key: 'submitted', label: 'Đã nộp bài' },
  { key: 'pending', label: 'Chưa nộp bài' },
];

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sortOrder: SortOrder;
  onSortToggle: () => void;
  counts: Record<StatusFilter, number>;
}

/** Ô tìm kiếm, tab lọc theo trạng thái nộp bài và nút sắp xếp theo điểm. */
export default function FilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  sortOrder,
  onSortToggle,
  counts,
}: Props) {
  return (
    <div className={styles.filterWrap}>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <BiSearch />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm sinh viên theo Tên hoặc MSSV..."
            className={styles.searchInput}
          />
        </div>
        <button
          type="button"
          className={styles.sortBtn}
          onClick={onSortToggle}
          title="Bấm để đổi chiều sắp xếp"
        >
          Sắp xếp: Điểm {sortOrder === 'desc' ? 'giảm dần ▾' : 'tăng dần ▴'}
        </button>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange(tab.key)}
            className={`${styles.tab} ${status === tab.key ? styles.tabActive : ''}`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>
    </div>
  );
}