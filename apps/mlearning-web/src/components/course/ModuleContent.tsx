import React from "react";
import styles from "./ModuleContent.module.css";
import Tabs, { type TabItem } from "../Tabs/Tabs";
import ActivityCard, { type ActivityCardProps } from "../ActivityCard/ActivityCard";

const tabs: TabItem[] = [
  { key: "all", label: "Tất cả hoạt động (5)" },
  { key: "docs", label: "Tài liệu bài giảng (2)" },
  { key: "assignments", label: "Bài tập & Cổng nộp (1)" },
  { key: "quiz", label: "Bài kiểm tra Quiz & Điểm (2)" },
];

const activities: ActivityCardProps[] = [
  {
    type: "document",
    statusLabel: "TÀI LIỆU ĐÃ ĐĂNG · PDF · 4.2 MB",
    title: "Slide Bài Giảng Tuần 4: Raft Consensus Engine, Log Replication & Safety Invariants",
    description: "✓ 122/128 Sinh viên đã tải về",
    footer: "Cập nhật: 02 tuần trước",
    primaryActionLabel: "↻ Cập nhật File",
    secondaryActionLabel: undefined,
  },
  {
    type: "assignment",
    statusLabel: "CÔNG NỘP BÀI TẬP LỚN",
    title: "Problem Set 3: Xây dựng Fault-Tolerant Raft Node bằng Go & gRPC",
    description: "Hạn nộp: Chủ Nhật, 23:59 (Còn 2 ngày)",
    footer: "Đã nộp: 114 / 128 sinh viên",
    extraNote: "14 bài mới chờ chấm",
    primaryActionLabel: "SpeedGrader (14)",
    secondaryActionLabel: "Sửa Rubric",
  },
  {
    type: "quiz",
    statusLabel: "ĐANG MỞ TRẢ LỜI",
    title: "Quiz 04: Giao thức Bầu cử Leader Raft, Heartbeats & Election Safety",
    description: "Thời lượng: 45 phút · 25 câu trắc nghiệm kỹ thuật",
    footer: "Mở từ: 08:00 đến 22:00 hôm nay · Tính điểm trực tiếp vào cột Đánh giá quá trình (10%)",
    primaryActionLabel: "Xem bảng đề & kết quả Quiz",
    secondaryActionLabel: "Ngân hàng câu hỏi",
  },
];

/**
 * ModuleContent - Nội dung chính khu vực phải: tiêu đề module,
 * thanh tab lọc hoạt động, và danh sách các thẻ hoạt động
 */
const ModuleContent: React.FC = () => {
  return (
    <section className={styles.wrapper}>
      <div className={styles.moduleHeader}>
        <div className={styles.moduleHeaderLeft}>
          <span className={styles.breadcrumbSmall}>
            📁 Khu vực Quản lý Học liệu &amp; Hoạt động Tuần 7 - 8
          </span>
          <h2 className={styles.moduleTitle}>
            Module 4: Thuật toán Đồng thuận Raft &amp; Distributed State
          </h2>
        </div>
        <div className={styles.moduleHeaderActions}>
          <button className={styles.editBtn}>✏ Sửa Module</button>
          <button className={styles.addModuleBtn}>+ Thêm vào Module 4</button>
        </div>
      </div>

      <Tabs tabs={tabs} defaultKey="all" />

      <div className={styles.activityList}>
        {activities.map((a, idx) => (
          <ActivityCard key={idx} {...a} />
        ))}
      </div>
    </section>
  );
};

export default ModuleContent;
