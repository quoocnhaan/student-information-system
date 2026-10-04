import React, { useState } from "react";
import styles from "./Questionbankmodal.module.css";
import QuestionForm, { type QuestionFormValues, type QuestionItem } from "./Questionform";

interface QuestionBankModalProps {
    /** Tên Quiz đang quản lý câu hỏi, hiển thị ở tiêu đề modal */
    quizTitle: string;
    /** Danh sách câu hỏi hiện có của quiz này */
    questions: QuestionItem[];
    /** Gọi khi thêm 1 câu hỏi mới */
    onAddQuestion: (values: QuestionFormValues) => void;
    onClose: () => void;
}

/**
 * QuestionBankModal - Modal "Ngân hàng câu hỏi" của một Quiz.
 * Mặc định hiển thị danh sách câu hỏi đã có; bấm "+ Thêm câu hỏi" sẽ
 * chuyển sang QuestionForm để nhập câu hỏi + đáp án mới.
 */
const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
    quizTitle,
    questions,
    onAddQuestion,
    onClose,
}) => {
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = (values: QuestionFormValues) => {
        onAddQuestion(values);
        setIsAdding(false);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h3 className={styles.title}>Ngân hàng câu hỏi</h3>
                        <span className={styles.subtitle}>{quizTitle}</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        ✕
                    </button>
                </div>

                {isAdding ? (
                    <QuestionForm onSubmit={handleSubmit} onCancel={() => setIsAdding(false)} />
                ) : (
                    <div className={styles.body}>
                        <div className={styles.listHeader}>
                            <span className={styles.countLabel}>{questions.length} câu hỏi</span>
                            <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
                                + Thêm câu hỏi
                            </button>
                        </div>

                        {questions.length === 0 ? (
                            <p className={styles.emptyState}>
                                Chưa có câu hỏi nào. Bấm "+ Thêm câu hỏi" để bắt đầu tạo ngân hàng câu hỏi cho
                                quiz này.
                            </p>
                        ) : (
                            <ul className={styles.list}>
                                {questions.map((q, idx) => (
                                    <li key={q.id} className={styles.questionCard}>
                                        <div className={styles.questionHead}>
                                            <span className={styles.questionIndex}>Câu {idx + 1}</span>
                                            <span className={styles.questionMeta}>
                                                {q.type === "single" ? "Chọn 1 đáp án" : "Chọn nhiều đáp án"} ·{" "}
                                                {q.points} điểm
                                            </span>
                                        </div>
                                        <p className={styles.questionContent}>{q.content}</p>
                                        <ul className={styles.optionList}>
                                            {q.options.map((o) => (
                                                <li
                                                    key={o.id}
                                                    className={`${styles.optionItem} ${o.isCorrect ? styles.optionItemCorrect : ""
                                                        }`}
                                                >
                                                    {o.isCorrect ? "✓" : "○"} {o.text}
                                                </li>
                                            ))}
                                        </ul>
                                        {q.explanation && (
                                            <p className={styles.explanation}>💡 {q.explanation}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionBankModal;
