import { useState } from 'react';
import styles from './FilterBar.module.css';

const groupTabs = ['Tất cả nhóm (128)', 'Đã nộp bài (118)', 'Đang chấm bài (10)'];

/** Search input, group filter tabs, sort control and a small warning banner. */
export default function FilterBar() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className={styles.wrap}>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm sinh viên theo Tên hoặc MSSV..."
            className={styles.searchInput}
          />
        </div>
        <button className={styles.sortBtn}>Sắp xếp: Điểm giảm dần ▾</button>
      </div>

      <div className={styles.tabs}>
        {groupTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.banner}>
        ⚠ Có sinh viên nộp bài trễ / vi phạm giám sát thi
      </div>
    </div>
  );
}
