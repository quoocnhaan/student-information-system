import React, { useEffect, useState } from "react";
import styles from "./Moduleform.module.css";
import type { ModuleItem, ModuleStatus } from "./CourseSidebar";

/** Dữ liệu form không gồm id (id do Sidebar tự sinh khi tạo mới) */
export type ModuleFormValues = Omit<ModuleItem, "id">;

interface ModuleFormProps {
    mode: "create" | "edit";
    initialData?: ModuleItem;
    onSubmit: (values: ModuleFormValues) => void;
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

const ModuleForm: React.FC<ModuleFormProps> = ({ mode, initialData, onSubmit, onClose }) => {
    const [values, setValues] = useState<ModuleFormValues>(emptyValues);

    useEffect(() => {
        if (mode === "edit" && initialData) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, ...rest } = initialData;
            setValues(rest);
        } else {
            setValues(emptyValues);
        }
    }, [mode, initialData]);

    const handleChange =
        (field: Exclude<keyof ModuleFormValues, "status">) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
            };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setValues((prev) => ({ ...prev, status: e.target.value as ModuleStatus }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim()) return;

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
                    <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
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
                            placeholder="VD: Tuần 13-14 - 4 hoạt động"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Trạng thái</span>
                        <select
                            className={styles.input}
                            value={values.status}
                            onChange={handleStatusChange}
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