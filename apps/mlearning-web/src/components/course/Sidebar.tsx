import React, { useState } from "react";
import { CheckCircle2, CircleDot, Lock, Pencil, Plus } from "lucide-react";
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
  if (status === "done") {
    return (
      <CheckCircle2
        size={20}
        className={`${styles.moduleIcon} ${styles.moduleIconSuccess}`}
        fill="#ecfdf5"
      />
    );
  }
  if (status === "active") {
    return <CircleDot size={20} className={`${styles.moduleIcon} ${styles.moduleIconActive}`} />;
  }
  return <Lock size={20} className={`${styles.moduleIcon} ${styles.moduleIconLocked}`} />;
};

/** Tách subtitle "Tuần 1-2 · 4 hoạt động · ..." thành nhãn tuần + phần mô tả còn lại */
const splitSubtitle = (subtitle: string) => {
  const [week, ...rest] = subtitle.split(" · ");
  return { week, meta: rest.join(" · ") };
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
      <div className={styles.sidebarCard}>
        <div className={styles.sidebarHeader}>
          <div>
            <h2 className={styles.sidebarTitle}>Đề cương môn học</h2>
            <span className={styles.sidebarSubtitle}>{modules.length} module • 16 tuần học</span>
          </div>
          <button type="button" className={styles.addBtn} onClick={handleOpenCreate}>
            <Plus size={14} /> Thêm Module
          </button>
        </div>

        <ul className={styles.moduleList}>
          {modules.map((m) => {
            const { week, meta } = splitSubtitle(m.subtitle);
            const isActive = m.status === "active";
            const isLocked = m.status === "upcoming";

            return (
              <li
                key={m.id}
                className={[
                  styles.moduleItem,
                  isActive ? styles.moduleItemActive : "",
                  isLocked ? styles.moduleItemLocked : "",
                ].join(" ")}
              >
                <div className={styles.moduleItemHeader}>
                  <div className={styles.moduleItemContent}>
                    <StatusIcon status={m.status} />
                    <div className={styles.moduleText}>
                      <span className={`${styles.moduleWeek} ${isActive ? styles.moduleWeekActive : ""}`}>
                        {week}
                        {isActive && m.badge && <span className={styles.activeTag}>{m.badge}</span>}
                      </span>
                      <h3
                        className={[
                          styles.moduleTitle,
                          isActive ? styles.moduleTitleActive : "",
                          isLocked ? styles.moduleTitleLocked : "",
                        ].join(" ")}
                      >
                        {m.title}
                      </h3>
                      {meta && <span className={styles.moduleMeta}>{meta}</span>}
                      {m.extra && <span className={styles.moduleExtra}>✓ {m.extra}</span>}
                    </div>
                  </div>

                  <div className={styles.moduleAside}>
                    {m.status === "done" && (
                      <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>Hoàn thành</span>
                    )}
                    {isLocked && (
                      <span className={`${styles.statusBadge} ${styles.statusLocked}`}>Sắp mở</span>
                    )}
                    <button
                      type="button"
                      className={styles.editIconBtn}
                      onClick={() => handleOpenEdit(m)}
                      aria-label={`Sửa ${m.title}`}
                      title="Sửa Module"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button type="button" className={styles.showAllBtn}>
          Xem đầy đủ 16 Tuần học ▾
        </button>
      </div>

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