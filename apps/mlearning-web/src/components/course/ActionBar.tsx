import React, { useState } from "react";
import styles from "./ActionBar.module.css";
import QuizForm, { type QuizFormValues } from "./Quizform";

interface ActionBarProps {
  /** Gọi khi người dùng tạo Quiz mới thành công (tuỳ chọn, để cha nối vào danh sách thực tế) */
  onCreateQuiz?: (values: QuizFormValues) => void;
}

/**
 * ActionBar - Thanh chứa các nút hành động chính của khóa học
 */
const ActionBar: React.FC<ActionBarProps> = ({ onCreateQuiz }) => {
  const [isQuizFormOpen, setIsQuizFormOpen] = useState(false);

  const handleSubmitQuiz = (values: QuizFormValues) => {
    onCreateQuiz?.(values);
    setIsQuizFormOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.primaryBtn}>
        <span className={styles.plus}>⊕</span> Thêm Hoạt động / Tài nguyên
        <span className={styles.caret}>▾</span>
      </button>
      <button className={styles.secondaryBtn}>📤 Tải lên tài liệu</button>
      <button className={styles.secondaryBtn} onClick={() => setIsQuizFormOpen(true)}>
        📝 Tạo Quiz
      </button>
      <button className={styles.secondaryBtn}>🔗 Tạo Cổng nộp</button>
      <button className={styles.secondaryBtn}>📊 Sổ điểm &amp; Báo cáo</button>

      {/* Modal Tạo Quiz */}
      {isQuizFormOpen && (
        <QuizForm onSubmit={handleSubmitQuiz} onClose={() => setIsQuizFormOpen(false)} />
      )}
    </div>
  );
};

export default ActionBar;