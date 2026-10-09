import { useEffect, useMemo, useRef } from 'react';
import { BiX } from 'react-icons/bi';
import Badge from './Badge';
import styles from './quizResults.module.css';
import { OPTION_LETTERS, getStudentAnswers, type StudentRow } from './quizDetails';

interface Props {
    student: StudentRow;
    onClose: () => void;
}

/** Popup chi tiết bài làm: đáp án sinh viên chọn so với đáp án đúng của từng câu. */
export default function QuizDetailModal({ student, onClose }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const score = student.autoScore ?? 0;

    const answers = useMemo(() => getStudentAnswers(student.id, score), [student.id, score]);
    const correctCount = answers.filter((a) => a.isCorrect).length;

    // Đóng bằng phím Esc, khoá cuộn trang phía sau và focus vào nút đóng khi mở.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    return (
        <div className={styles.modalOverlay} onMouseDown={onClose}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quiz-detail-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHead}>
                    <div>
                        <h2 id="quiz-detail-title" className={styles.modalTitle}>
                            Bài làm của {student.name}
                        </h2>
                        <p className={styles.modalSub}>
                            MSSV: {student.id} · Nộp lúc {student.submittedAt} · Thời gian làm {student.duration}
                        </p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        className={styles.modalClose}
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <BiX />
                    </button>
                </div>

                <div className={styles.modalSummary}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Điểm</span>
                        <span className={styles.summaryValue}>{score.toFixed(1)} / 10</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Câu đúng</span>
                        <span className={styles.summaryValue}>
                            {correctCount} / {answers.length}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Câu sai</span>
                        <span className={styles.summaryValue}>{answers.length - correctCount}</span>
                    </div>
                </div>

                <div className={styles.modalBody}>
                    {answers.map(({ question, selectedIndex, isCorrect }, qi) => (
                        <section key={question.id} className={styles.question}>
                            <div className={styles.questionHead}>
                                <h3 className={styles.questionText}>
                                    Câu {qi + 1}. {question.text}
                                </h3>
                                <Badge
                                    label={isCorrect ? 'Đúng' : selectedIndex === null ? 'Bỏ trống' : 'Sai'}
                                    tone={isCorrect ? 'success' : 'danger'}
                                />
                            </div>

                            <ul className={styles.options}>
                                {question.options.map((option, oi) => {
                                    const isCorrectOption = oi === question.correctIndex;
                                    const isSelected = oi === selectedIndex;

                                    const stateClass = isCorrectOption
                                        ? styles.optionCorrect
                                        : isSelected
                                            ? styles.optionWrong
                                            : '';

                                    return (
                                        <li key={oi} className={`${styles.option} ${stateClass}`}>
                                            <span className={styles.optionLetter}>{OPTION_LETTERS[oi]}</span>
                                            <span className={styles.optionText}>{option}</span>
                                            <span className={styles.optionTags}>
                                                {isSelected && (
                                                    <span className={styles.tagStudent}>Sinh viên chọn</span>
                                                )}
                                                {isCorrectOption && <span className={styles.tagCorrect}>Đáp án đúng</span>}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>

                <div className={styles.modalFoot}>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}