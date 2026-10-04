import React, { useState } from "react";
import styles from "./Quizform.module.css";

/** Dữ liệu form Tạo Quiz */
export interface QuizFormValues {
    title: string;
    description: string;
    questionCount: number;
    durationMinutes: number;
    totalPoints: number;
    attemptsAllowed: string; // "unlimited" hoặc số lần dạng chuỗi, ví dụ "1", "2"
    openAt: string; // datetime-local string
    closeAt: string; // datetime-local string
    shuffleQuestions: boolean;
    showAnswersAfterSubmit: boolean;
}

interface QuizFormProps {
    /** Gọi khi người dùng bấm Tạo Quiz, trả về dữ liệu đã nhập */
    onSubmit: (values: QuizFormValues) => void;
    /** Gọi khi đóng form (bấm Hủy / X / click ra ngoài overlay) */
    onClose: () => void;
}

const emptyValues: QuizFormValues = {
    title: "",
    description: "",
    questionCount: 10,
    durationMinutes: 30,
    totalPoints: 100,
    attemptsAllowed: "1",
    openAt: "",
    closeAt: "",
    shuffleQuestions: true,
    showAnswersAfterSubmit: false,
};

/**
 * QuizForm - Modal tạo một bài Quiz mới cho khóa học.
 * Chỉ xử lý state cục bộ của form; việc lưu vào danh sách Quiz thực tế
 * do component cha đảm nhiệm thông qua callback onSubmit.
 */
const QuizForm: React.FC<QuizFormProps> = ({ onSubmit, onClose }) => {
    const [values, setValues] = useState<QuizFormValues>(emptyValues);

    const handleTextChange =
        (field: keyof QuizFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
            };

    const handleNumberChange =
        (field: keyof QuizFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = Number(e.target.value);
            setValues((prev) => ({ ...prev, [field]: Number.isNaN(value) ? 0 : value }));
        };

    const handleCheckboxChange =
        (field: keyof QuizFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setValues((prev) => ({ ...prev, [field]: e.target.checked }));
        };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim()) return; // Tên Quiz là bắt buộc

        onSubmit({
            ...values,
            title: values.title.trim(),
            description: values.description.trim(),
        });
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Tạo Quiz mới</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        ✕
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.field}>
                        <span className={styles.label}>Tên Quiz *</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.title}
                            onChange={handleTextChange("title")}
                            placeholder="VD: Quiz 05: Paxos & Quorum-based Replication"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Mô tả / Hướng dẫn</span>
                        <textarea
                            className={styles.textarea}
                            value={values.description}
                            onChange={handleTextChange("description")}
                            placeholder="VD: Kiểm tra kiến thức về thuật toán Paxos và cơ chế đồng thuận theo Quorum"
                            rows={2}
                        />
                    </label>

                    <div className={styles.row}>
                        <label className={styles.field}>
                            <span className={styles.label}>Số câu hỏi</span>
                            <input
                                className={styles.input}
                                type="number"
                                min={1}
                                value={values.questionCount}
                                onChange={handleNumberChange("questionCount")}
                            />
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Thời lượng (phút)</span>
                            <input
                                className={styles.input}
                                type="number"
                                min={1}
                                value={values.durationMinutes}
                                onChange={handleNumberChange("durationMinutes")}
                            />
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Điểm tối đa</span>
                            <input
                                className={styles.input}
                                type="number"
                                min={0}
                                value={values.totalPoints}
                                onChange={handleNumberChange("totalPoints")}
                            />
                        </label>
                    </div>

                    <div className={styles.row}>
                        <label className={styles.field}>
                            <span className={styles.label}>Thời gian mở</span>
                            <input
                                className={styles.input}
                                type="datetime-local"
                                value={values.openAt}
                                onChange={handleTextChange("openAt")}
                            />
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Thời gian đóng</span>
                            <input
                                className={styles.input}
                                type="datetime-local"
                                value={values.closeAt}
                                onChange={handleTextChange("closeAt")}
                            />
                        </label>
                    </div>

                    <label className={styles.field}>
                        <span className={styles.label}>Số lần làm bài cho phép</span>
                        <select
                            className={styles.input}
                            value={values.attemptsAllowed}
                            onChange={handleTextChange("attemptsAllowed")}
                        >
                            <option value="1">1 lần</option>
                            <option value="2">2 lần</option>
                            <option value="3">3 lần</option>
                            <option value="unlimited">Không giới hạn</option>
                        </select>
                    </label>

                    <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxRow}>
                            <input
                                type="checkbox"
                                checked={values.shuffleQuestions}
                                onChange={handleCheckboxChange("shuffleQuestions")}
                            />
                            <span>Trộn ngẫu nhiên thứ tự câu hỏi</span>
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.saveBtn}>
                            Tạo Quiz
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuizForm;
