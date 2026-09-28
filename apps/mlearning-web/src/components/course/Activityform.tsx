import React, { useState } from "react";
import styles from "./Activityform.module.css";
import type { ActivityCardProps, ActivityType } from "./ActivityCard";

interface ActivityFormProps {
    onSubmit: (values: ActivityCardProps) => void;
    onClose: () => void;
}

const typeOptions: { value: ActivityType; label: string }[] = [
    { value: "document", label: "Tài liệu bài giảng" },
    { value: "assignment", label: "Bài tập / Cổng nộp" },
    { value: "quiz", label: "Bài kiểm tra Quiz" },
];

const emptyValues: ActivityCardProps = {
    type: "document",
    statusLabel: "",
    title: "",
    description: "",
    footer: "",
    extraNote: "",
    primaryActionLabel: "",
    secondaryActionLabel: "",
};

/**
 * ActivityForm - Modal thêm một hoạt động mới (tài liệu / bài tập / quiz)
 * vào danh sách hoạt động của Module đang xem trong ModuleContent.
 */
const ActivityForm: React.FC<ActivityFormProps> = ({ onSubmit, onClose }) => {
    const [values, setValues] = useState<ActivityCardProps>(emptyValues);

    const handleChange =
        (field: keyof ActivityCardProps) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
            };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim() || !values.primaryActionLabel.trim()) return;

        onSubmit({
            type: values.type,
            statusLabel: values.statusLabel.trim(),
            title: values.title.trim(),
            description: values.description.trim(),
            footer: values.footer?.trim() || undefined,
            extraNote: values.extraNote?.trim() || undefined,
            primaryActionLabel: values.primaryActionLabel.trim(),
            secondaryActionLabel: values.secondaryActionLabel?.trim() || undefined,
        });
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Thêm Hoạt động / Tài nguyên</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        ✕
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.field}>
                        <span className={styles.label}>Loại hoạt động</span>
                        <select className={styles.input} value={values.type} onChange={handleChange("type")}>
                            {typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Nhãn trạng thái</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.statusLabel}
                            onChange={handleChange("statusLabel")}
                            placeholder="VD: TÀI LIỆU ĐÃ ĐĂNG · PDF · 2.1 MB"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Tiêu đề *</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.title}
                            onChange={handleChange("title")}
                            placeholder="VD: Slide Bài Giảng Tuần 5: Paxos Consensus"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Mô tả</span>
                        <textarea
                            className={styles.textarea}
                            value={values.description}
                            onChange={handleChange("description")}
                            placeholder="VD: Thời lượng 40 phút · 20 câu trắc nghiệm"
                            rows={2}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Ghi chú cuối (footer)</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.footer ?? ""}
                            onChange={handleChange("footer")}
                            placeholder="VD: Hạn nộp: Thứ 6, 23:59"
                        />
                    </label>

                    <div className={styles.row}>
                        <label className={styles.field}>
                            <span className={styles.label}>Nhãn phụ (extra note)</span>
                            <input
                                className={styles.input}
                                type="text"
                                value={values.extraNote ?? ""}
                                onChange={handleChange("extraNote")}
                                placeholder="VD: 5 bài chờ chấm"
                            />
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Nút phụ</span>
                            <input
                                className={styles.input}
                                type="text"
                                value={values.secondaryActionLabel ?? ""}
                                onChange={handleChange("secondaryActionLabel")}
                                placeholder="VD: Sửa Rubric"
                            />
                        </label>
                    </div>

                    <label className={styles.field}>
                        <span className={styles.label}>Nút chính *</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.primaryActionLabel}
                            onChange={handleChange("primaryActionLabel")}
                            placeholder="VD: Xem bảng đề & kết quả Quiz"
                            required
                        />
                    </label>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.saveBtn}>
                            Thêm hoạt động
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivityForm;
