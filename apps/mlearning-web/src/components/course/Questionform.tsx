import React, { useState } from "react";
import styles from "./Questionform.module.css";

/** Loại câu hỏi: chọn 1 đáp án hoặc chọn nhiều đáp án */
export type QuestionType = "single" | "multiple";

export interface QuestionOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface QuestionItem {
    id: string;
    type: QuestionType;
    content: string;
    points: number;
    options: QuestionOption[];
    explanation?: string;
}

/** Dữ liệu form (chưa có id - id do nơi lưu trữ tự sinh) */
export type QuestionFormValues = Omit<QuestionItem, "id">;

interface QuestionFormProps {
    onSubmit: (values: QuestionFormValues) => void;
    onCancel: () => void;
}

let optionIdCounter = 0;
const makeOptionId = () => `opt-${Date.now()}-${optionIdCounter++}`;

const createEmptyOption = (): QuestionOption => ({
    id: makeOptionId(),
    text: "",
    isCorrect: false,
});

/**
 * QuestionForm - Form thêm một câu hỏi trắc nghiệm vào Ngân hàng câu hỏi.
 * Không tự bọc overlay/modal riêng - được nhúng bên trong QuestionBankModal
 * để dùng chung phần khung modal + tiêu đề.
 */
const QuestionForm: React.FC<QuestionFormProps> = ({ onSubmit, onCancel }) => {
    const [content, setContent] = useState("");
    const [type, setType] = useState<QuestionType>("single");
    const [points, setPoints] = useState(1);
    const [explanation, setExplanation] = useState("");
    const [options, setOptions] = useState<QuestionOption[]>([
        createEmptyOption(),
        createEmptyOption(),
    ]);
    const [error, setError] = useState("");

    const handleOptionTextChange = (id: string, text: string) => {
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
    };

    /** Đánh dấu đáp án đúng - single: chỉ 1 đáp án đúng; multiple: cho phép nhiều */
    const handleToggleCorrect = (id: string) => {
        setOptions((prev) =>
            prev.map((o) => {
                if (type === "single") {
                    return { ...o, isCorrect: o.id === id };
                }
                return o.id === id ? { ...o, isCorrect: !o.isCorrect } : o;
            })
        );
    };

    const handleAddOption = () => {
        setOptions((prev) => [...prev, createEmptyOption()]);
    };

    const handleRemoveOption = (id: string) => {
        setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.id !== id) : prev));
    };

    /** Khi đổi loại câu hỏi sang "single", chỉ giữ lại 1 đáp án đúng đầu tiên */
    const handleTypeChange = (nextType: QuestionType) => {
        setType(nextType);
        if (nextType === "single") {
            setOptions((prev) => {
                const firstCorrectIndex = prev.findIndex((o) => o.isCorrect);
                return prev.map((o, idx) => ({ ...o, isCorrect: idx === firstCorrectIndex }));
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedContent = content.trim();
        const filledOptions = options.filter((o) => o.text.trim().length > 0);

        if (!trimmedContent) {
            setError("Vui lòng nhập nội dung câu hỏi.");
            return;
        }
        if (filledOptions.length < 2) {
            setError("Cần ít nhất 2 đáp án có nội dung.");
            return;
        }
        if (!filledOptions.some((o) => o.isCorrect)) {
            setError("Vui lòng đánh dấu ít nhất 1 đáp án đúng.");
            return;
        }

        onSubmit({
            content: trimmedContent,
            type,
            points,
            options: filledOptions.map((o) => ({ ...o, text: o.text.trim() })),
            explanation: explanation.trim() || undefined,
        });
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
                <span className={styles.label}>Nội dung câu hỏi *</span>
                <textarea
                    className={styles.textarea}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="VD: Trong Raft, khi nào một node chuyển từ Follower sang Candidate?"
                    rows={3}
                />
            </label>

            <div className={styles.row}>
                <label className={styles.field}>
                    <span className={styles.label}>Loại câu hỏi</span>
                    <select
                        className={styles.input}
                        value={type}
                        onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                    >
                        <option value="single">Chọn 1 đáp án đúng</option>
                        <option value="multiple">Chọn nhiều đáp án đúng</option>
                    </select>
                </label>

                <label className={styles.field}>
                    <span className={styles.label}>Điểm số</span>
                    <input
                        className={styles.input}
                        type="number"
                        min={0}
                        step={0.5}
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value) || 0)}
                    />
                </label>
            </div>

            <div className={styles.optionsBlock}>
                <span className={styles.label}>
                    Đáp án {type === "single" ? "(chọn 1 đáp án đúng)" : "(có thể chọn nhiều đáp án đúng)"}
                </span>

                {options.map((option, idx) => (
                    <div key={option.id} className={styles.optionRow}>
                        <input
                            className={styles.optionCheck}
                            type={type === "single" ? "radio" : "checkbox"}
                            name="correct-option"
                            checked={option.isCorrect}
                            onChange={() => handleToggleCorrect(option.id)}
                            aria-label={`Đáp án đúng ${idx + 1}`}
                        />
                        <input
                            className={styles.optionInput}
                            type="text"
                            value={option.text}
                            onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                            placeholder={`Đáp án ${idx + 1}`}
                        />
                        <button
                            type="button"
                            className={styles.removeOptionBtn}
                            onClick={() => handleRemoveOption(option.id)}
                            disabled={options.length <= 2}
                            aria-label="Xóa đáp án"
                            title="Xóa đáp án"
                        >
                            ✕
                        </button>
                    </div>
                ))}

                <button type="button" className={styles.addOptionBtn} onClick={handleAddOption}>
                    + Thêm đáp án
                </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                    Hủy
                </button>
                <button type="submit" className={styles.saveBtn}>
                    Thêm câu hỏi
                </button>
            </div>
        </form>
    );
};

export default QuestionForm;
