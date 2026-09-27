import React, { useEffect, useState } from "react";
import styles from "./ModuleForm.module.css";
import type { ModuleItem, ModuleStatus } from "./Sidebar";

/** Dữ liệu form không gồm id (id do Sidebar tự sinh khi tạo mới) */
export type ModuleFormValues = Omit<ModuleItem, "id">;

interface ModuleFormProps {
    /** "create" = Thêm Module mới, "edit" = Sửa Module đã có */
    mode: "create" | "edit";
    /** Dữ liệu khởi tạo khi ở chế độ sửa */
    initialData?: ModuleItem;
    /** Gọi khi người dùng bấm Lưu, trả về dữ liệu đã nhập */
    onSubmit: (values: ModuleFormValues) => void;
    /** Gọi khi đóng form (bấm Hủy / X / click ra ngoài overlay) */
    onClose: () => void;
}

const emptyValues: ModuleFormValues = {
    title: "",
    subtitle: "",
    status: "upcoming",
    badge: "",
    extra: "",
};

const statusOptions: { value: ModuleStatus; label: string }[] = [
    { value: "done", label: "Đã hoàn thành" },
    { value: "active", label: "Đang diễn ra" },
    { value: "upcoming", label: "Sắp mở" },
];

/**
 * ModuleForm - Modal dùng chung cho cả Thêm mới và Sửa một Module trong đề cương.
 * Chỉ xử lý state cục bộ của form; việc lưu/cập nhật danh sách do component cha
 * (Sidebar) đảm nhiệm thông qua callback onSubmit.
 */
const ModuleForm: React.FC<ModuleFormProps> = ({ mode, initialData, onSubmit, onClose }) => {
    const [values, setValues] = useState<ModuleFormValues>(emptyValues);

    // Nạp lại dữ liệu mỗi khi mở form sửa một module khác
    useEffect(() => {
        if (mode === "edit" && initialData) {
            const { id, ...rest } = initialData;
            setValues(rest);
        } else {
            setValues(emptyValues);
        }
    }, [mode, initialData]);

    const handleChange = (
        field: keyof ModuleFormValues
    ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim()) return; // Tiêu đề là bắt buộc

        onSubmit({
            title: values.title.trim(),
            subtitle: values.subtitle.trim(),
            status: values.status,
            badge: values.badge?.trim() || undefined,
            extra: values.extra?.trim() || undefined,
        });
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {mode === "create" ? "Thêm Module mới" : "Sửa Module"}
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        ✕
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.field}>
                        <span className={styles.label}>Tên Module *</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.title}
                            onChange={handleChange("title")}
                            placeholder="VD: Module 7: Sharding & Horizontal Scaling"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Mô tả / Thời lượng</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.subtitle}
                            onChange={handleChange("subtitle")}
                            placeholder="VD: Tuần 13-14 · 4 hoạt động"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Trạng thái</span>
                        <select
                            className={styles.input}
                            value={values.status}
                            onChange={handleChange("status")}
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className={styles.row}>
                        <label className={styles.field}>
                            <span className={styles.label}>Nhãn (badge)</span>
                            <input
                                className={styles.input}
                                type="text"
                                value={values.badge ?? ""}
                                onChange={handleChange("badge")}
                                placeholder="VD: Đang diễn ra"
                            />
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Ghi chú thêm</span>
                            <input
                                className={styles.input}
                                type="text"
                                value={values.extra ?? ""}
                                onChange={handleChange("extra")}
                                placeholder="VD: Đang công khai Khả thi"
                            />
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.saveBtn}>
                            {mode === "create" ? "Thêm Module" : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModuleForm;