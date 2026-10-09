import React, { useState } from "react";
import styles from "./Activityform.module.css";
import type { ActivityCardProps, ActivityType } from "./ActivityCard";
import { quizFormToActivityCard } from "./Quizformtoactivitycard";
import { QuizForm } from "./Quizform";

interface ActivityFormInitialValues {
    type?: ActivityType;
    title?: string;
    description?: string;
    openAt?: string;
    closeAt?: string;
    existingFileNames?: string[];
    timeLimitMins?: number;
    maxScore?: number;
    questions?: any[];
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
 *
 * Có 3 loại:
 * - document
 * - assignment
 * - quiz
 *
 * Quiz được xử lý bằng QuizForm riêng.
 * Document và Assignment dùng form chung bên dưới.
 */
const ActivityForm: React.FC<ActivityFormProps> = ({
    onSubmit,
    onClose,
    initialValues,
}) => {
    const isEdit = !!initialValues;

    // ─── State chung ───────────────────────────────────────────────
    const [type, setType] = useState<ActivityType>(
        initialValues?.type ?? "document"
    );

    const [title, setTitle] = useState(
        initialValues?.title ?? ""
    );

    const [description, setDescription] = useState(
        initialValues?.description ?? ""
    );

    const [openAt, setOpenAt] = useState(
        initialValues?.openAt ?? ""
    );

    const [closeAt, setCloseAt] = useState(
        initialValues?.closeAt ?? ""
    );

    // ─── State riêng document / assignment ────────────────────────
    const [existingFileNames, setExistingFileNames] = useState<string[]>(
        initialValues?.existingFileNames ?? []
    );

    const [files, setFiles] = useState<File[]>([]);

    // ─── File handlers ────────────────────────────────────────────
    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const newFiles = Array.from(e.target.files);

        setFiles((prev) => {
            const taken = new Set([
                ...prev.map((file) => file.name),
                ...existingFileNames,
            ]);

            return [
                ...prev,
                ...newFiles.filter(
                    (file) => !taken.has(file.name)
                ),
            ];
        });

        e.target.value = "";
    };

    const removeFile = (idx: number) => {
        setFiles((prev) =>
            prev.filter((_, index) => index !== idx)
        );
    };

    const removeExistingFile = (name: string) => {
        setExistingFileNames((prev) =>
            prev.filter((fileName) => fileName !== name)
        );
    };

    // ─── Submit document / assignment ────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) return;

        const allFileNames = [
            ...existingFileNames,
            ...files.map((file) => file.name),
        ];

        // ─── Document ─────────────────────────────────────────────
        if (type === "document") {
            const totalSize = files.reduce(
                (size, file) => size + file.size,
                0
            );

            const sizeMB =
                totalSize > 0
                    ? ` · ${(totalSize / 1024 / 1024).toFixed(1)} MB`
                    : "";

            const statusLabel =
                allFileNames.length > 0
                    ? `TÀI LIỆU ĐÃ ĐĂNG · ${allFileNames.length} file${sizeMB}`
                    : "TÀI LIỆU ĐÃ ĐĂNG";

            onSubmit({
                type: "document",
                statusLabel,
                title: title.trim(),
                description: description.trim(),
                footer:
                    allFileNames.length > 0
                        ? `File đính kèm: ${allFileNames.join(", ")}`
                        : undefined,
                primaryActionLabel: "Xem tài liệu",
                extraNote: JSON.stringify({
                    fileNames: allFileNames,
                }),
            });

            return;
        }

        // ─── Assignment ──────────────────────────────────────────
        if (type === "assignment") {
            const scheduleText =
                openAt && closeAt
                    ? `Mở từ: ${formatDateTime(openAt)} đến ${formatDateTime(closeAt)}`
                    : closeAt
                        ? `Hạn nộp: ${formatDateTime(closeAt)}`
                        : openAt
                            ? `Mở từ: ${formatDateTime(openAt)}`
                            : "";

            const fileInfo =
                allFileNames.length > 0
                    ? ` | File đính kèm: ${allFileNames.join(", ")}`
                    : "";

            onSubmit({
                type: "assignment",
                statusLabel: "BÀI TẬP VỀ NHÀ",
                title: title.trim(),
                description: description.trim(),
                footer: scheduleText
                    ? `${scheduleText}${fileInfo}`
                    : allFileNames.length > 0
                        ? `File đính kèm: ${allFileNames.join(", ")}`
                        : undefined,
                primaryActionLabel: "Nộp bài / Xem chi tiết",
                extraNote: JSON.stringify({
                    opensAt: openAt || null,
                    dueAt: closeAt || null,
                    fileNames: allFileNames,
                }),
            });
        }
    };

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div
            className={styles.overlay}
            onClick={onClose}
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {isEdit
                            ? "Sửa Hoạt động / Tài nguyên"
                            : "Thêm Hoạt động / Tài nguyên"}
                    </h3>

                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                {/* Loại hoạt động - Chung cho tất cả các loại */}
                <div style={{ padding: "18px 18px 0", display: "flex", flexDirection: "column" }}>
                    <label className={styles.field}>
                        <span className={styles.label}>
                            Loại hoạt động
                        </span>
                        <select
                            className={styles.input}
                            value={type}
                            onChange={(e) =>
                                setType(e.target.value as ActivityType)
                            }
                            disabled={isEdit}
                        >
                            {typeOptions.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* =================================================
                    QUIZ
                   ================================================= */}
                {type === "quiz" ? (
                    <QuizForm
                        initialValues={
                            initialValues
                                ? {
                                    title: initialValues.title ?? "",
                                    description:
                                        initialValues.description ?? "",
                                    opensAt:
                                        initialValues.openAt ?? "",
                                    closesAt:
                                        initialValues.closeAt ?? "",
                                    timeLimitMins: initialValues.timeLimitMins ?? 60,
                                    maxScore: initialValues.maxScore ?? 10,
                                    questions: initialValues.questions ?? [],
                                }
                                : undefined
                        }
                        onSubmit={(values) => {
                            onSubmit(
                                quizFormToActivityCard(values)
                            );
                        }}
                        onCancel={onClose}
                    />
                ) : (
                    /* =================================================
                       DOCUMENT / ASSIGNMENT
                       ================================================= */
                    <form
                        className={styles.form}
                        style={{ paddingTop: '14px' }}
                        onSubmit={handleSubmit}
                    >

                        {/* Tiêu đề */}
                        <label className={styles.field}>
                            <span className={styles.label}>
                                Tiêu đề *
                            </span>

                            <input
                                className={styles.input}
                                type="text"
                                value={title}
                                onChange={(e) =>
                                    setTitle(e.target.value)
                                }
                                placeholder={
                                    type === "document"
                                        ? "VD: Slide Bài Giảng Tuần 5"
                                        : "VD: Bài tập lớn cuối kỳ"
                                }
                                required
                            />
                        </label>

                        {/* Mô tả */}
                        <label className={styles.field}>
                            <span className={styles.label}>
                                {type === "assignment"
                                    ? "Mô tả yêu cầu"
                                    : "Mô tả / Hướng dẫn"}
                            </span>

                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                placeholder={
                                    type === "assignment"
                                        ? "Nhập nội dung yêu cầu bài tập"
                                        : "Nhập nội dung mô tả"
                                }
                                rows={2}
                            />
                        </label>

                        {/* Ngày mở / đóng - chỉ Assignment */}
                        {type === "assignment" && (
                            <div className={styles.row}>
                                <label className={styles.field}>
                                    <span className={styles.label}>
                                        Ngày mở
                                    </span>

                                    <input
                                        className={styles.input}
                                        type="datetime-local"
                                        value={openAt}
                                        onChange={(e) =>
                                            setOpenAt(e.target.value)
                                        }
                                    />
                                </label>

                                <label className={styles.field}>
                                    <span className={styles.label}>
                                        Ngày hết hạn
                                    </span>

                                    <input
                                        className={styles.input}
                                        type="datetime-local"
                                        value={closeAt}
                                        onChange={(e) =>
                                            setCloseAt(e.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        )}

                        {/* Document / Assignment files */}
                        {(type === "document" ||
                            type === "assignment") && (
                                <>
                                    <label className={styles.field}>
                                        <span className={styles.label}>
                                            {type === "assignment"
                                                ? "Tệp đính kèm cho sinh viên"
                                                : "Tải lên tài liệu"}
                                        </span>

                                        <input
                                            className={styles.input}
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </label>

                                    {/* File đã có */}
                                    {existingFileNames.length > 0 && (
                                        <div className={styles.fileList}>
                                            {existingFileNames.map(
                                                (name) => (
                                                    <div
                                                        key={name}
                                                        className={`${styles.fileChip} ${styles.fileChipExisting}`}
                                                    >
                                                        <span
                                                            className={
                                                                styles.fileChipName
                                                            }
                                                        >
                                                            📎 {name}
                                                        </span>

                                                        <span
                                                            className={
                                                                styles.fileChipSize
                                                            }
                                                        >
                                                            đã tải lên
                                                        </span>

                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.fileChipRemove
                                                            }
                                                            onClick={() =>
                                                                removeExistingFile(
                                                                    name
                                                                )
                                                            }
                                                            aria-label={`Xóa ${name}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                    {/* File mới */}
                                    {files.length > 0 && (
                                        <div className={styles.fileList}>
                                            {files.map(
                                                (file, index) => (
                                                    <div
                                                        key={`${file.name}-${index}`}
                                                        className={
                                                            styles.fileChip
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.fileChipName
                                                            }
                                                        >
                                                            {file.name}
                                                        </span>

                                                        <span
                                                            className={
                                                                styles.fileChipSize
                                                            }
                                                        >
                                                            (
                                                            {(
                                                                file.size /
                                                                1024
                                                            ).toFixed(0)}{" "}
                                                            KB)
                                                        </span>

                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.fileChipRemove
                                                            }
                                                            onClick={() =>
                                                                removeFile(
                                                                    index
                                                                )
                                                            }
                                                            aria-label={`Xóa ${file.name}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={onClose}
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                className={styles.saveBtn}
                            >
                                {isEdit
                                    ? "Cập nhật"
                                    : "Thêm hoạt động"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ActivityForm;
