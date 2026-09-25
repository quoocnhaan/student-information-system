import React from "react";
import styles from "./Breadcrumb.module.css";

/**
 * Breadcrumb - Đường dẫn điều hướng + tiêu đề khóa học
 */
const Breadcrumb: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.courseRow}>
        <div className={styles.tagGroup}>
          <span className={styles.tag}>CS 408</span>
          <span className={styles.tag}>4 Tín chỉ (ECTS)</span>
          <span className={styles.tagActive}>● Đang giảng dạy</span>
        </div>

        <h1 className={styles.courseTitle}>
          Hệ Phân Tán &amp; Kiến Trúc Đám Mây (Distributed Systems &amp; Cloud Architecture)
        </h1>

        <div className={styles.meta}>
          <span>🕐 Thứ 2 &amp; Thứ 4 (10:00 - 11:30 AM)</span>
          <span>📍 Phòng Lab A2-402 &amp; AWS Academy Cluster</span>
          <span>👩‍🏫 Giảng viên chính: GS. TS. Elizabeth Vance</span>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
