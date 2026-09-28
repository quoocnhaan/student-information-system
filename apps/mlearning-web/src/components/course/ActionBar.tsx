import React, { useState } from "react";
import { BarChart3, ChevronDown, FileQuestion, Link2, Plus, Upload } from "lucide-react";
import styles from "./ActionBar.module.css";
import QuizForm, { type QuizFormValues } from "./Quizform";

interface ActionBarProps {
  /** Gọi khi người dùng tạo Quiz mới thành công (tuỳ chọn, để cha nối vào danh sách thực tế) */
  onCreateQuiz?: (values: QuizFormValues) => void;
}

/**
 * ActionBar - Hàng nút hành động chính của khóa học (đặt trong hero card)
 */
const ActionBar: React.FC<ActionBarProps> = ({ onCreateQuiz }) => {
  const [isQuizFormOpen, setIsQuizFormOpen] = useState(false);

  const handleSubmitQuiz = (values: QuizFormValues) => {
    onCreateQuiz?.(values);
    setIsQuizFormOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.primaryBtn}>
        <Plus size={18} className={styles.icon} />
        Thêm Hoạt động / Tài nguyên
        <ChevronDown size={16} className={styles.caret} />
      </button>
      <button type="button" className={styles.secondaryBtn}>
        <Upload size={18} className={styles.iconAccent} />
        Tải lên tài liệu
      </button>
      <button type="button" className={styles.secondaryBtn} onClick={() => setIsQuizFormOpen(true)}>
        <FileQuestion size={18} className={styles.iconAccent} />
        Tạo Quiz
      </button>
      <button type="button" className={styles.secondaryBtn}>
        <Link2 size={18} className={styles.iconAccent} />
        Tạo Cổng nộp
      </button>
      <button type="button" className={styles.secondaryBtn}>
        <BarChart3 size={18} className={styles.iconAccent} />
        Sổ điểm &amp; Báo cáo
      </button>

      {/* Modal Tạo Quiz */}
      {isQuizFormOpen && (
        <QuizForm onSubmit={handleSubmitQuiz} onClose={() => setIsQuizFormOpen(false)} />
      )}
    </div>
  );
};

export default ActionBar;