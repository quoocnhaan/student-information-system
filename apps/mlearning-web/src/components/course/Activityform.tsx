import React, { useState } from "react";
import styles from "./Activityform.module.css";
import type { ActivityCardProps, ActivityType } from "./ActivityCard";
import { quizFormToActivityCard } from "./Quizformtoactivitycard";

interface ActivityFormInitialValues {
    type?: ActivityType;
    title?: string;
    description?: string;
    openAt?: string;
    closeAt?: string;
    existingFileNames?: string[];
}

interface ActivityFormProps {
    onSubmit: (values: ActivityCardProps) => void;
    onClose: () => void;
    initialValues?: ActivityFormInitialValues;
}

const typeOptions: { value: ActivityType; label: string }[] = [
    { value: "document", label: "Tài liệu bài giảng" },
    { value: "assignment", label: "Bài tập / Cổng nộp" },
    { value: "quiz", label: "Bài kiểm tra Quiz" },
];

function formatDateTime(value: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
}

/**
 * ActivityForm - Modal thêm / sửa hoạt động.
 * Ba loại (tài liệu, bài tập, quiz) đều nằm trong cùng 1 modal,
 * chuyển đổi bằng dropdown "Loại hoạt động".
 */
const ActivityForm: React.FC<ActivityFormProps> = ({ onSubmit, onClose, initialValues }) => {
    const isEdit = !!initialValues;

    // ─── State chung ──────────────────────────────────────────────────────────
    const [type, setType] = useState<ActivityType>(initialValues?.type ?? "document");
    const [title, setTitle] = useState(initialValues?.title ?? "");
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [openAt, setOpenAt] = useState(initialValues?.openAt ?? "");
    const [closeAt, setCloseAt] = useState(initialValues?.closeAt ?? "");

    // ─── State riêng: document / assignment ──────────────────────────────────
    const [existingFileNames, setExistingFileNames] = useState<string[]>(
        initialValues?.existingFileNames ?? []
    );
    const [files, setFiles] = useState<File[]>([]);

    // ─── State riêng: quiz ───────────────────────────────────────────────────
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [totalPoints, setTotalPoints] = useState(100);
    const [attemptsAllowed, setAttemptsAllowed] = useState("1");
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(false);

    // ─── File handlers ────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => {
                const taken = new Set([...prev.map((f) => f.name), ...existingFileNames]);
                return [...prev, ...newFiles.filter((f) => !taken.has(f.name))];
            });
            e.target.value = "";
        }
    };
    const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
    const removeExistingFile = (name: string) =>
        setExistingFileNames((prev) => prev.filter((n) => n !== name));

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        if (type === "quiz") {
            onSubmit(
                quizFormToActivityCard({
                    title: title.trim(),
                    description: description.trim(),
                    questionCount,
                    durationMinutes,
                    totalPoints,
                    attemptsAllowed,
                    openAt,
                    closeAt,
                    shuffleQuestions,
                    showAnswersAfterSubmit,
                })
            );
            return;
        }

        const allFileNames = [...existingFileNames, ...files.map((f) => f.name)];

        if (type === "document") {
            const totalSize = files.reduce((s, f) => s + f.size, 0);
            const sizeMB = totalSize > 0 ? ` · ${(totalSize / 1024 / 1024).toFixed(1)} MB` : "";
            const statusLabel = allFileNames.length > 0
                ? `TÀI LIỆU ĐÃ ĐĂNG · ${allFileNames.length} file${sizeMB}`
                : "TÀI LIỆU ĐÃ ĐĂNG";

            onSubmit({
                type: "document",
                statusLabel,
                title: title.trim(),
                description: description.trim(),
                footer: allFileNames.length > 0 ? `File đính kèm: ${allFileNames.join(", ")}` : undefined,
                primaryActionLabel: "Xem tài liệu",
                extraNote: JSON.stringify({ fileNames: allFileNames }),
            });
        } else if (type === "assignment") {
            const scheduleText =
                openAt && closeAt ? `Mở từ: ${formatDateTime(openAt)} đến ${formatDateTime(closeAt)}`
                    : closeAt ? `Hạn nộp: ${formatDateTime(closeAt)}`
                        : openAt ? `Mở từ: ${formatDateTime(openAt)}`
                            : "";
            const fileInfo = allFileNames.length > 0 ? ` | File đính kèm: ${allFileNames.join(", ")}` : "";

            onSubmit({
                type: "assignment",
                statusLabel: "BÀI TẬP VỀ NHÀ",
                title: title.trim(),
                description: description.trim(),
                footer: scheduleText
                    ? `${scheduleText}${fileInfo}`
                    : allFileNames.length > 0 ? `File đính kèm: ${allFileNames.join(", ")}` : undefined,
                primaryActionLabel: "Nộp bài / Xem chi tiết",
                extraNote: JSON.stringify({ opensAt: openAt || null, dueAt: closeAt || null, fileNames: allFileNames }),
            });
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {isEdit ? "Sửa Hoạt động / Tài nguyên" : "Thêm Hoạt động / Tài nguyên"}
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* ── Loại hoạt động ── */}
                    <label className={styles.field}>
                        <span className={styles.label}>Loại hoạt động</span>
                        <select
                            className={styles.input}
                            value={type}
                            onChange={(e) => setType(e.target.value as ActivityType)}
                            disabled={isEdit}
                        >
                            {typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </label>

                    {/* ── Tiêu đề (chung) ── */}
                    <label className={styles.field}>
                        <span className={styles.label}>
                            {type === "quiz" ? "Tên Quiz *" : "Tiêu đề *"}
                        </span>
                        <input
                            className={styles.input}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={
                                type === "document" ? "VD: Slide Bài Giảng Tuần 5"
                                    : type === "assignment" ? "VD: Bài tập lớn cuối kỳ"
                                        : "VD: Quiz 05 – Paxos & Quorum-based Replication"
                            }
                            required
                        />
                    </label>

                    {/* ── Mô tả (chung) ── */}
                    <label className={styles.field}>
                        <span className={styles.label}>
                            {type === "assignment" ? "Mô tả yêu cầu" : "Mô tả / Hướng dẫn"}
                        </span>
                        <textarea
                            className={styles.textarea}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                type === "quiz"
                                    ? "VD: Kiểm tra kiến thức về thuật toán Paxos và cơ chế đồng thuận"
                                    : "Nhập nội dung mô tả"
                            }
                            rows={2}
                        />
                    </label>

                    {/* ── Ngày mở / đóng (assignment & quiz) ── */}
                    {(type === "assignment" || type === "quiz") && (
                        <div className={styles.row}>
                            <label className={styles.field}>
                                <span className={styles.label}>
                                    {type === "quiz" ? "Thời gian mở" : "Ngày mở"}
                                </span>
                                <input
                                    className={styles.input}
                                    type="datetime-local"
                                    value={openAt}
                                    onChange={(e) => setOpenAt(e.target.value)}
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.label}>
                                    {type === "quiz" ? "Thời gian đóng" : "Ngày hết hạn"}
                                </span>
                                <input
                                    className={styles.input}
                                    type="datetime-local"
                                    value={closeAt}
                                    onChange={(e) => setCloseAt(e.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    {/* ══ Phần riêng của QUIZ ══════════════════════════════════════════ */}
                    {type === "quiz" && (
                        <>
                            <div className={styles.row}>
                                <label className={styles.field}>
                                    <span className={styles.label}>Số câu hỏi</span>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={1}
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(Number(e.target.value) || 0)}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.label}>Thời lượng (phút)</span>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={1}
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
                                    />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.label}>Điểm tối đa</span>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={0}
                                        value={totalPoints}
                                        onChange={(e) => setTotalPoints(Number(e.target.value) || 0)}
                                    />
                                </label>
                            </div>

                            <label className={styles.field}>
                                <span className={styles.label}>Số lần làm bài cho phép</span>
                                <select
                                    className={styles.input}
                                    value={attemptsAllowed}
                                    onChange={(e) => setAttemptsAllowed(e.target.value)}
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
                                        checked={shuffleQuestions}
                                        onChange={(e) => setShuffleQuestions(e.target.checked)}
                                    />
                                    <span>Trộn ngẫu nhiên thứ tự câu hỏi</span>
                                </label>

                            </div>
                        </>
                    )}

                    {/* ══ Phần riêng của DOCUMENT / ASSIGNMENT ══════════════════════ */}
                    {(type === "document" || type === "assignment") && (
                        <>
                            <label className={styles.field}>
                                <span className={styles.label}>
                                    {type === "assignment" ? "Tệp đính kèm cho sinh viên" : "Tải lên tài liệu"}
                                </span>
                                <input
                                    className={styles.input}
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                />
                            </label>

                            {existingFileNames.length > 0 && (
                                <div className={styles.fileList}>
                                    {existingFileNames.map((name) => (
                                        <div key={name} className={`${styles.fileChip} ${styles.fileChipExisting}`}>
                                            <span className={styles.fileChipName}>📎 {name}</span>
                                            <span className={styles.fileChipSize}>đã tải lên</span>
                                            <button
                                                type="button"
                                                className={styles.fileChipRemove}
                                                onClick={() => removeExistingFile(name)}
                                                aria-label={`Xóa ${name}`}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {files.length > 0 && (
                                <div className={styles.fileList}>
                                    {files.map((file, idx) => (
                                        <div key={idx} className={styles.fileChip}>
                                            <span className={styles.fileChipName}>{file.name}</span>
                                            <span className={styles.fileChipSize}>({(file.size / 1024).toFixed(0)} KB)</span>
                                            <button
                                                type="button"
                                                className={styles.fileChipRemove}
                                                onClick={() => removeFile(idx)}
                                                aria-label={`Xóa ${file.name}`}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Actions ── */}
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>Hủy</button>
                        <button type="submit" className={styles.saveBtn}>
                            {isEdit ? "Cập nhật" : type === "quiz" ? "Tạo Quiz" : "Thêm hoạt động"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivityForm;
