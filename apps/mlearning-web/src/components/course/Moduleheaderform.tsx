import React, { useEffect, useState } from "react";
import styles from "./ModuleHeaderForm.module.css";

export interface ModuleHeaderValues {
    breadcrumbSmall: string;
    moduleTitle: string;
}

interface ModuleHeaderFormProps {
    initialData: ModuleHeaderValues;
    onSubmit: (values: ModuleHeaderValues) => void;
    onClose: () => void;
}

/**
 * ModuleHeaderForm - Modal chỉnh sửa tiêu đề Module đang xem trong ModuleContent
 * (dòng breadcrumb nhỏ "Khu vực Quản lý Học liệu..." và tên Module chính)
 */
const ModuleHeaderForm: React.FC<ModuleHeaderFormProps> = ({
    initialData,
    onSubmit,
    onClose,
}) => {
    const [values, setValues] = useState<ModuleHeaderValues>(initialData);

    useEffect(() => {
        setValues(initialData);
    }, [initialData]);

    const handleChange =
        (field: keyof ModuleHeaderValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
            };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.moduleTitle.trim()) return; // Tên module là bắt buộc

        onSubmit({
            breadcrumbSmall: values.breadcrumbSmall.trim(),
            moduleTitle: values.moduleTitle.trim(),
        });
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Sửa Module</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        ✕
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.field}>
                        <span className={styles.label}>Khu vực / Tuần học</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.breadcrumbSmall}
                            onChange={handleChange("breadcrumbSmall")}
                            placeholder="VD: Khu vực Quản lý Học liệu & Hoạt động Tuần 7 - 8"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>Tên Module *</span>
                        <input
                            className={styles.input}
                            type="text"
                            value={values.moduleTitle}
                            onChange={handleChange("moduleTitle")}
                            placeholder="VD: Module 4: Thuật toán Đồng thuận Raft & Distributed State"
                            required
                        />
                    </label>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.saveBtn}>
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModuleHeaderForm;