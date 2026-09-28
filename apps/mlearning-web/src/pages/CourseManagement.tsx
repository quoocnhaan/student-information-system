import React, { useState } from "react";
import { Clock, Clock10 } from "lucide-react";
import styles from "./CourseManagement.module.css";
import ActionBar from "../components/course/ActionBar";
import Sidebar from "../components/course/Sidebar";
import ModuleContent from "../components/course/ModuleContent";
import type { ActivityCardProps } from "../components/course/ActivityCard";
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

// Số liệu tổng quan lớp học (dữ liệu mẫu - thay bằng dữ liệu từ API khi có backend)
const TOTAL_STUDENTS = 128;
const SUBMITTED = 114;
const PENDING_GRADING = 14;
const CURRENT_WEEK = 8;
const TOTAL_WEEKS = 16;

const submittedPercent = Math.round((SUBMITTED / TOTAL_STUDENTS) * 100);
const semesterPercent = Math.round((CURRENT_WEEK / TOTAL_WEEKS) * 100);

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
    <div className={styles.container}>
      {/* HERO: thông tin môn học + thao tác chính + tổng quan lớp */}
      <section className={styles.heroCard}>
        <div className={styles.heroAccent} />
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgePrimary}`}>
                <span className={styles.badgeDot} />
                CS 408 • Sau đại học
              </span>
              <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                Học kỳ Thu 2025 • 4 tín chỉ
              </span>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                <span className={styles.badgeDot} />
                Đang giảng dạy
              </span>
              <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                <Clock size={14} />
                Thứ 2 / Thứ 4 · 10:00 - 11:30
              </span>
            </div>

            <div>
              <h1 className={styles.courseTitle}>
                CS 408: Hệ Phân tán &amp; Kiến trúc Đám mây
              </h1>
              <p className={styles.courseDesc}>
                Quản lý học liệu, bài tập, bài kiểm tra và điểm số cho toàn bộ {TOTAL_WEEKS} tuần học:
                giao thức đồng thuận (Paxos, Raft), RPC (gRPC/Protobuf), lưu trữ phân tán và mở rộng
                microservices trên nền tảng đám mây.
              </p>
            </div>

            <div className={styles.actionsWrap}>
              <ActionBar onCreateQuiz={handleCreateQuiz} />
            </div>
          </div>

          <div className={styles.performanceCard}>
            <div className={styles.standingHeader}>
              <span className={styles.standingTitle}>Tổng quan lớp học</span>
              <span className={styles.standingBadge}>Đúng tiến độ</span>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Sĩ số</span>
                <div className={styles.metricValueRow}>
                  <span className={`${styles.metricValueMain} ${styles.metricValueMainPrimary}`}>
                    {TOTAL_STUDENTS}
                  </span>
                  <span className={styles.metricValueSub}>sinh viên</span>
                </div>
                <span className={styles.metricFooter}>Đã ghi danh</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Nộp Problem Set 3</span>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValueMain}>{SUBMITTED}</span>
                  <span className={styles.metricValueSub}>/ {TOTAL_STUDENTS}</span>
                </div>
                <span className={`${styles.metricFooter} ${styles.metricFooterSuccess}`}>
                  {submittedPercent}% đã nộp
                </span>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>
                  Tiến độ học kỳ · Tuần {CURRENT_WEEK}/{TOTAL_WEEKS}
                </span>
                <span className={styles.progressValue}>{semesterPercent}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${semesterPercent}%` }} />
              </div>
            </div>

            <div className={styles.alertBox}>
              <Clock10 size={20} className={styles.alertIcon} />
              <div className={styles.alertContent}>
                <div className={styles.alertHeader}>
                  <span className={styles.alertTitle}>Cần chấm điểm</span>
                  <span className={styles.alertBadge}>Còn 2 ngày</span>
                </div>
                <p className={styles.alertDesc}>
                  Problem Set 3: {PENDING_GRADING} bài mới đang chờ chấm
                </p>
                <span className={styles.alertFooter}>Hạn nộp Chủ Nhật · 23:59</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LAYOUT 2 CỘT: đề cương (trái) + hoạt động của module (phải) */}
      <div className={styles.mainLayout}>
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