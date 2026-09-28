import React, { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import styles from "./ModuleContent.module.css";
import ActivityCard, { type ActivityCardProps } from "./ActivityCard";
import ModuleHeaderForm, { type ModuleHeaderValues } from "./Moduleheaderform";
import ActivityForm from "./Activityform";
import QuestionBankModal from "./Questionbankmodal";
import type { QuestionFormValues, QuestionItem } from "./Questionform";

type FilterKey = "all" | ActivityCardProps["type"];

const initialHeader: ModuleHeaderValues = {
  breadcrumbSmall: "📁 Khu vực Quản lý Học liệu & Hoạt động Tuần 7 - 8",
  moduleTitle: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
};

let questionIdCounter = 0;
const makeQuestionId = () => `q-${Date.now()}-${questionIdCounter++}`;

interface ModuleContentProps {
  /** Danh sách hoạt động hiển thị trong module - do CourseManagement (cha) quản lý */
  activities: ActivityCardProps[];
  /** Gọi khi thêm một hoạt động mới qua form "+ Thêm vào Module" */
  onAddActivity: (activity: ActivityCardProps) => void;
}

/**
 * ModuleContent - Nội dung chính khu vực phải: banner module (có thể sửa),
 * tab lọc hoạt động theo loại, và danh sách các thẻ hoạt động (có thể thêm mới).
 * Với các thẻ Quiz, nút "Ngân hàng câu hỏi" mở QuestionBankModal để quản lý
 * câu hỏi + đáp án riêng cho quiz đó (lưu theo tiêu đề quiz).
 */
const ModuleContent: React.FC<ModuleContentProps> = ({ activities, onAddActivity }) => {
  const [header, setHeader] = useState<ModuleHeaderValues>(initialHeader);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Ngân hàng câu hỏi của từng quiz, lưu theo tiêu đề quiz (title)
  const [questionBankByQuiz, setQuestionBankByQuiz] = useState<Record<string, QuestionItem[]>>(
    {}
  );
  // Tiêu đề quiz đang mở Ngân hàng câu hỏi (null = không mở modal nào)
  const [activeQuizTitle, setActiveQuizTitle] = useState<string | null>(null);

  // Số lượng theo loại - tự cập nhật khi thêm hoạt động mới
  const tabs = useMemo(() => {
    const count = (type: ActivityCardProps["type"]) =>
      activities.filter((a) => a.type === type).length;
    return [
      { key: "all" as FilterKey, label: `Tất cả hoạt động (${activities.length})` },
      { key: "document" as FilterKey, label: `Tài liệu bài giảng (${count("document")})` },
      { key: "assignment" as FilterKey, label: `Bài tập & Cổng nộp (${count("assignment")})` },
      { key: "quiz" as FilterKey, label: `Bài kiểm tra Quiz & Điểm (${count("quiz")})` },
    ];
  }, [activities]);

  // Giữ index gốc để key ổn định khi lọc
  const visibleActivities = useMemo(
    () =>
      activities
        .map((activity, index) => ({ activity, index }))
        .filter(({ activity }) => activeFilter === "all" || activity.type === activeFilter),
    [activities, activeFilter]
  );

  const handleSaveHeader = (values: ModuleHeaderValues) => {
    setHeader(values);
    setIsEditingHeader(false);
  };

  const handleAddActivity = (values: ActivityCardProps) => {
    onAddActivity(values);
    setIsAddingActivity(false);
  };

  const handleAddQuestion = (quizTitle: string) => (values: QuestionFormValues) => {
    setQuestionBankByQuiz((prev) => {
      const current = prev[quizTitle] ?? [];
      return { ...prev, [quizTitle]: [...current, { id: makeQuestionId(), ...values }] };
    });
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.activeModuleBanner}>
        <div className={styles.bannerLayout}>
          <div className={styles.bannerText}>
            <div className={styles.bannerTop}>
              <span className={styles.bannerTag}>Đang diễn ra</span>
              <span className={styles.bannerMeta}>{header.breadcrumbSmall}</span>
            </div>
            <h2 className={styles.bannerTitle}>{header.moduleTitle}</h2>
          </div>

          <div className={styles.bannerActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setIsEditingHeader(true)}
            >
              <Pencil size={16} /> Sửa Module
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setIsAddingActivity(true)}
            >
              <Plus size={16} /> Thêm vào Module
            </button>
          </div>
        </div>

        <div className={styles.filterTabs} role="tablist" aria-label="Lọc hoạt động theo loại">
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
          visibleActivities.map(({ activity: a, index }) => (
            <ActivityCard
              key={index}
              {...a}
              onSecondaryAction={
                a.type === "quiz" && a.secondaryActionLabel === "Ngân hàng câu hỏi"
                  ? () => setActiveQuizTitle(a.title)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {/* Modal Sửa tiêu đề Module */}
      {isEditingHeader && (
        <ModuleHeaderForm
          initialData={header}
          onSubmit={handleSaveHeader}
          onClose={() => setIsEditingHeader(false)}
        />
      )}

      {/* Modal Thêm hoạt động mới vào Module */}
      {isAddingActivity && (
        <ActivityForm
          onSubmit={handleAddActivity}
          onClose={() => setIsAddingActivity(false)}
        />
      )}

      {/* Modal Ngân hàng câu hỏi của quiz đang chọn */}
      {activeQuizTitle && (
        <QuestionBankModal
          quizTitle={activeQuizTitle}
          questions={questionBankByQuiz[activeQuizTitle] ?? []}
          onAddQuestion={handleAddQuestion(activeQuizTitle)}
          onClose={() => setActiveQuizTitle(null)}
        />
      )}
    </section>
  );
};

export default ModuleContent;