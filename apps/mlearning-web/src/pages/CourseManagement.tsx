import React, { useMemo, useState } from "react";
import styles from "./CourseManagement.module.css";
import Sidebar from "../components/course/Sidebar";
import ActionBar from "../components/course/ActionBar";
import ModuleHeaderForm, { type ModuleHeaderValues } from "../components/course/Moduleheaderform";
import QuestionBankModal from "../components/course/Questionbankmodal";
import type { QuestionFormValues, QuestionItem } from "../components/course/Questionform";
import ActivityItem from "../components/course/Activityitem";
import { activities as mockActivities } from "../components/course/Activitymockdata";
import type { Activity } from "../components/course/Activitytypes";

const TOTAL_WEEKS = 16;

type FilterKey = "all" | Activity["type"];

const initialHeader: ModuleHeaderValues = {
  breadcrumbSmall: "Khu vực Quản lý Học liệu & Hoạt động Tuần 7 - 8",
  moduleTitle: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
};

let questionIdCounter = 0;
const makeQuestionId = () => `q-${Date.now()}-${questionIdCounter++}`;

const CoursePage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [header, setHeader] = useState<ModuleHeaderValues>(initialHeader);
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  const [questionBankByQuiz, setQuestionBankByQuiz] =
    useState<Record<string, QuestionItem[]>>({});
  const [activeQuizTitle, setActiveQuizTitle] = useState<string | null>(null);

  const handleAddActivity = (activity: Activity) => {
    setActivities((prev) => [...prev, activity]);
  };

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  // Số lượng theo loại - tự cập nhật khi thêm hoạt động mới
  const tabs = useMemo(() => {
    const count = (type: Activity["type"]) =>
      activities.filter((a) => a.type === type).length;
    return [
      { key: "all" as FilterKey, label: `Tất cả hoạt động (${activities.length})` },
      { key: "resource" as FilterKey, label: `Tài liệu bài giảng (${count("resource")})` },
      { key: "assignment" as FilterKey, label: `Bài tập & Cổng nộp (${count("assignment")})` },
      { key: "quiz" as FilterKey, label: `Bài kiểm tra Quiz & Điểm (${count("quiz")})` },
    ];
  }, [activities]);

  const visibleActivities = useMemo(
    () => activities.filter((a) => activeFilter === "all" || a.type === activeFilter),
    [activities, activeFilter]
  );

  const handleSaveHeader = (values: ModuleHeaderValues) => {
    setHeader(values);
    setIsEditingHeader(false);
  };

  const handleAddQuestion = (quizTitle: string) => (values: QuestionFormValues) => {
    setQuestionBankByQuiz((prev) => {
      const current = prev[quizTitle] ?? [];
      return { ...prev, [quizTitle]: [...current, { id: makeQuestionId(), ...values }] };
    });
  };

  return (
    <div className={styles.container}>
      <section className={styles.heroCard}>
        <div className={styles.heroAccent} />
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
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
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        <div className={styles.sidebarCol}>
          <Sidebar />
        </div>
        <div className={styles.contentCol}>
          <section className={styles.wrapper}>
            <div className={styles.activeModuleBanner}>
              <div className={styles.bannerLayout}>
                <div className={styles.bannerText}>
                  <div className={styles.bannerTop}></div>
                  <h2 className={styles.bannerTitle}>{header.moduleTitle}</h2>
                </div>
                <ActionBar
                  onEditHeader={() => setIsEditingHeader(true)}
                  onAddActivity={handleAddActivity}
                />
              </div>

              <div
                className={styles.filterTabs}
                role="tablist"
                aria-label="Lọc hoạt động theo loại"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === tab.key}
                    className={`${styles.filterTab} ${activeFilter === tab.key ? styles.filterTabActive : styles.filterTabInactive
                      }`}
                    onClick={() => setActiveFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.activityList}>
              {visibleActivities.length === 0 ? (
                <div className={styles.emptyState}>
                  Chưa có hoạt động nào thuộc loại này. Chọn "Thêm vào Module" để tạo mới.
                </div>
              ) : (
                visibleActivities.map((a) => <ActivityItem key={a.id} activity={a} />)
              )}
            </div>

            {isEditingHeader && (
              <ModuleHeaderForm
                initialData={header}
                onSubmit={handleSaveHeader}
                onClose={() => setIsEditingHeader(false)}
              />
            )}

            {activeQuizTitle && (
              <QuestionBankModal
                quizTitle={activeQuizTitle}
                questions={questionBankByQuiz[activeQuizTitle] ?? []}
                onAddQuestion={handleAddQuestion(activeQuizTitle)}
                onClose={() => setActiveQuizTitle(null)}
              />
            )}
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Universitas Academic Portal</span>
      </footer>
    </div>
  );
};

export default CoursePage;