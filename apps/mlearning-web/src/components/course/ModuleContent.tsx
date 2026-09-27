import React, { useState } from "react";
import styles from "./ModuleContent.module.css";
import Tabs, { type TabItem } from "../Tabs/Tabs";
import ActivityCard, { type ActivityCardProps } from "../ActivityCard/ActivityCard";
import ModuleHeaderForm, { type ModuleHeaderValues } from "./Moduleheaderform";
import ActivityForm from "./Activityform";
import QuestionBankModal from "./Questionbankmodal";
import type { QuestionFormValues, QuestionItem } from "./Questionform";

const tabs: TabItem[] = [
  { key: "all", label: "Tất cả hoạt động (5)" },
  { key: "docs", label: "Tài liệu bài giảng (2)" },
  { key: "assignments", label: "Bài tập & Cổng nộp (1)" },
  { key: "quiz", label: "Bài kiểm tra Quiz & Điểm (2)" },
];

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
 * ModuleContent - Nội dung chính khu vực phải: tiêu đề module (có thể sửa),
 * thanh tab lọc hoạt động, và danh sách các thẻ hoạt động (có thể thêm mới).
 * Với các thẻ Quiz, nút "Ngân hàng câu hỏi" mở QuestionBankModal để quản lý
 * câu hỏi + đáp án riêng cho quiz đó (lưu theo tiêu đề quiz).
 */
const ModuleContent: React.FC<ModuleContentProps> = ({ activities, onAddActivity }) => {
  const [header, setHeader] = useState<ModuleHeaderValues>(initialHeader);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Ngân hàng câu hỏi của từng quiz, lưu theo tiêu đề quiz (title)
  const [questionBankByQuiz, setQuestionBankByQuiz] = useState<Record<string, QuestionItem[]>>(
    {}
  );
  // Tiêu đề quiz đang mở Ngân hàng câu hỏi (null = không mở modal nào)
  const [activeQuizTitle, setActiveQuizTitle] = useState<string | null>(null);

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
      <div className={styles.moduleHeader}>
        <div className={styles.moduleHeaderLeft}>
          <span className={styles.breadcrumbSmall}>{header.breadcrumbSmall}</span>
          <h2 className={styles.moduleTitle}>{header.moduleTitle}</h2>
        </div>
        <div className={styles.moduleHeaderActions}>
          <button className={styles.editBtn} onClick={() => setIsEditingHeader(true)}>
            ✏ Sửa Module
          </button>
          <button className={styles.addModuleBtn} onClick={() => setIsAddingActivity(true)}>
            + Thêm vào Module
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} defaultKey="all" />

      <div className={styles.activityList}>
        {activities.map((a, idx) => (
          <ActivityCard
            key={idx}
            {...a}
            onSecondaryAction={
              a.type === "quiz" && a.secondaryActionLabel === "Ngân hàng câu hỏi"
                ? () => setActiveQuizTitle(a.title)
                : undefined
            }
          />
        ))}
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