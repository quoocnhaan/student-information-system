import React from "react";
import styles from "./ActionBar.module.css";

/**
 * ActionBar - Thanh chứa các nút hành động chính của khóa học
 */
const ActionBar: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <button className={styles.primaryBtn}>
        <span className={styles.plus}>⊕</span> Thêm Hoạt động / Tài nguyên
        <span className={styles.caret}>▾</span>
      </button>
      <button className={styles.secondaryBtn}>📤 Tải lên tài liệu</button>
      <button className={styles.secondaryBtn}>📝 Tạo Quiz</button>
      <button className={styles.secondaryBtn}>🔗 Tạo Cổng nộp</button>
      <button className={styles.secondaryBtn}>📊 Sổ điểm &amp; Báo cáo</button>
    </div>
  );
};

export default ActionBar;
