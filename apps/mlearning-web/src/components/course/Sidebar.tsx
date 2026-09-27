import React, { useState } from "react";
import styles from "./Sidebar.module.css";
import ModuleForm, { type ModuleFormValues } from "./Moduleform";

/** Trạng thái của một module trong đề cương */
export type ModuleStatus = "done" | "active" | "upcoming";

export interface ModuleItem {
  id: number;
  title: string;
  subtitle: string;
  status: ModuleStatus;
  badge?: string; // ví dụ: "Đang diễn ra"
  extra?: string; // ví dụ: "Đang công khai Khả thi"
}

const initialModules: ModuleItem[] = [
  {
    id: 1,
    title: "Module 1: Nhập môn Hệ Phân tán",
    subtitle: "Tuần 1-2 · 4 hoạt động · Đã hoàn thành",
    status: "done",
  },
  {
    id: 2,
    title: "Module 2: RPC, Socket & Giao tiếp Liên tiến trình",
    subtitle: "Tuần 3-4 · 5 hoạt động · Đã hoàn thành",
    status: "done",
  },
  {
    id: 3,
    title: "Module 3: Đồng hồ Luận lý Lamport & Vector Clock",
    subtitle: "Tuần 5-6 · 4 hoạt động · Đã kiểm tra",
    status: "done",
  },
  {
    id: 4,
    title: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
    subtitle: "Tuần 7-8 · 5 hoạt động học tập · 1 bài tập lớn & 1 Quiz trực tiếp",
    status: "active",
    badge: "Đang diễn ra",
    extra: "Đang công khai Khả thi",
  },
  {
    id: 5,
    title: "Module 5: Paxos & Quorum-based Replication",
    subtitle: "Tuần 9-10 · Dự kiến mở 15/11/2025",
    status: "upcoming",
  },
  {
    id: 6,
    title: "Module 6: Cloud Storage, S3 & Distributed File Systems",
    subtitle: "Tuần 11-12 · Lập lịch mở tự động",
    status: "upcoming",
  },
];

/** Icon trạng thái tương ứng cho từng module */
const StatusIcon: React.FC<{ status: ModuleStatus }> = ({ status }) => {
  if (status === "done") return <span className={styles.iconDone}>✓</span>;
  if (status === "active") return <span className={styles.iconActive}>●</span>;
  return <span className={styles.iconUpcoming}>🔒</span>;
};

/**
 * Sidebar - Danh sách "Đề cương & Các Tuần học" hiển thị các module của khóa học
 */
const Sidebar: React.FC = () => {
  const [modules, setModules] = useState<ModuleItem[]>(initialModules);

  // Module nào đang được sửa (null = không mở form sửa)
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);
  // Có đang mở form Thêm Module mới không
  const [isCreating, setIsCreating] = useState(false);

  const isFormOpen = isCreating || editingModule !== null;
  const formMode: "create" | "edit" = isCreating ? "create" : "edit";

  const handleOpenCreate = () => {
    setEditingModule(null);
    setIsCreating(true);
  };

  const handleOpenEdit = (module: ModuleItem) => {
    setIsCreating(false);
    setEditingModule(module);
  };

  const handleCloseForm = () => {
    setIsCreating(false);
    setEditingModule(null);
  };

  /** Xử lý khi form submit - thêm mới hoặc cập nhật module tùy theo chế độ */
  const handleSubmitForm = (values: ModuleFormValues) => {
    if (formMode === "create") {
      const nextId = modules.length > 0 ? Math.max(...modules.map((m) => m.id)) + 1 : 1;
      setModules((prev) => [...prev, { id: nextId, ...values }]);
    } else if (editingModule) {
      setModules((prev) =>
        prev.map((m) => (m.id === editingModule.id ? { id: m.id, ...values } : m))
      );
    }
    handleCloseForm();
  };
  return (
    <aside className={styles.sidebar}>
      <div className={styles.headerRow}>
        <span className={styles.headerTitle}>📋 Đề cương &amp; Các Tuần học</span>
        <button className={styles.addBtn} onClick={handleOpenCreate}>+ Thêm Module</button>
      </div>

      <ul className={styles.list}>
        {modules.map((m) => (
          <li
            key={m.id}
            className={`${styles.item} ${m.status === "active" ? styles.itemActive : ""
              }`}
          >
            <div className={styles.itemRow}>
              <StatusIcon status={m.status} />
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>{m.title}</span>
                <span className={styles.itemSubtitle}>{m.subtitle}</span>

                {m.badge && (
                  <div className={styles.badgeRow}>
                    <span className={styles.badge}>{m.badge}</span>
                  </div>
                )}
                {m.extra && <span className={styles.extraLink}>✓ {m.extra}</span>}
              </div>
              <button
                className={styles.editIconBtn}
                onClick={() => handleOpenEdit(m)}
                aria-label={`Sửa ${m.title}`}
                title="Sửa Module"
              >
                ✏
              </button>
            </div>
            {m.status === "active" && <span className={styles.activeDot} />}
          </li>
        ))}
      </ul>

      <button className={styles.showAllBtn}>Xem đầy đủ 16 Tuần học ▾</button>
      {isFormOpen && (
        <ModuleForm
          mode={formMode}
          initialData={editingModule ?? undefined}
          onSubmit={handleSubmitForm}
          onClose={handleCloseForm}
        />
      )}
    </aside>
  );
};

export default Sidebar;
