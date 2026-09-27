import React, { useState } from "react";
import styles from "./CourseManagement.module.css";
import Breadcrumb from "../components/course/Breadcrumb";
import ActionBar from "../components/course/ActionBar";
import Sidebar from "../components/course/Sidebar";
import ModuleContent from "../components/course/ModuleContent";
import type { ActivityCardProps } from "../components/ActivityCard/ActivityCard";
import { quizFormToActivityCard } from "../components/course/Quizformtoactivitycard";

const initialActivities: ActivityCardProps[] = [
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

const CoursePage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityCardProps[]>(initialActivities);

  const handleAddActivity = (activity: ActivityCardProps) => {
    setActivities((prev) => [...prev, activity]);
  };

  /** Khi tạo Quiz thành công từ ActionBar -> chuyển thành 1 thẻ hoạt động và thêm vào danh sách */
  const handleCreateQuiz: React.ComponentProps<typeof ActionBar>["onCreateQuiz"] = (
    quizValues
  ) => {
    handleAddActivity(quizFormToActivityCard(quizValues));
  };

  return (
    <div className={styles.page}>
      <Breadcrumb />
      <ActionBar onCreateQuiz={handleCreateQuiz} />

      <div className={styles.body}>
        <div className={styles.sidebarCol}>
          <Sidebar />
        </div>
        <div className={styles.contentCol}>
          <ModuleContent activities={activities} onAddActivity={handleAddActivity} />
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Universitas Academic Portal · Phần hệ Quản lý Giảng dạy &amp; Đánh giá Học thuật trực tuyến</span>
        <span>Hệ thống sao lưu điểm số tức thời · Bảo mật học thuật SSL 256-bit</span>
      </footer>
    </div>
  );
};
export default CoursePage;