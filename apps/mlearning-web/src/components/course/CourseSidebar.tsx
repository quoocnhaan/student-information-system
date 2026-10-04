import React, { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import styles from "./Sidebar.module.css";
import ModuleForm, { type ModuleFormValues } from "./Moduleform";

export type ModuleStatus = "done" | "active" | "upcoming";

export interface ModuleItem {
  id: number;
  title: string;
  subtitle: string;
  status: ModuleStatus;
  badge?: string;
  extra?: string;
}

const COLLAPSED_COUNT = 4;

const initialModules: ModuleItem[] = [
  {
    id: 1,
    title: "Module 1: Nhập môn Hệ Phân tán",
    subtitle: "Tuần 1-2 - 4 hoạt động - Đã hoàn thành",
    status: "done",
  },
  {
    id: 2,
    title: "Module 2: RPC, Socket & Giao tiếp Liên tiến trình",
    subtitle: "Tuần 3-4 - 5 hoạt động - Đã hoàn thành",
    status: "done",
  },
  {
    id: 3,
    title: "Module 3: Đồng hồ Luận lý Lamport & Vector Clock",
    subtitle: "Tuần 5-6 - 4 hoạt động - Đã kiểm tra",
    status: "done",
  },
  {
    id: 4,
    title: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
    subtitle: "Tuần 7-8 - 5 hoạt động học tập - 1 bài tập lớn & 1 Quiz trực tiếp",
    status: "active",
    badge: "Đang diễn ra",
    extra: "Đang công khai Khả thi",
  },
  {
    id: 5,
    title: "Module 5: Paxos & Quorum-based Replication",
    subtitle: "Tuần 9-10 - Dự kiến mở 15/11/2026",
    status: "upcoming",
  },
  {
    id: 6,
    title: "Module 6: Cloud Storage, S3 & Distributed File Systems",
    subtitle: "Tuần 11-12 - Lập lịch mở tự động",
    status: "upcoming",
  },
];

const splitSubtitle = (subtitle: string) => {
  const [week, ...rest] = subtitle.split(" - ");
  return { week, meta: rest.join(" - ") };
};

export interface CourseSidebarProps {
  /** true = teacher: hiện nút Thêm/Sửa/Xóa module (cha truyền từ useIsTeacher) */
  canEdit?: boolean;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({ canEdit = false }) => {
  const [modules, setModules] = useState<ModuleItem[]>(initialModules);
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const isFormOpen = isCreating || editingModule !== null;
  const formMode: "create" | "edit" = isCreating ? "create" : "edit";

  const visibleModules = showAll ? modules : modules.slice(0, COLLAPSED_COUNT);

  const handleOpenCreate = () => {
    setEditingModule(null);
    setIsCreating(true);
  };


  const handleCloseForm = () => {
    setIsCreating(false);
    setEditingModule(null);
  };

  const handleDeleteModule = (id: number) => {
    const moduleToDelete = modules.find((m) => m.id === id);
    if (!moduleToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${moduleToDelete.title}" không?`
    );
    if (!confirmed) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmitForm = (values: ModuleFormValues) => {
    if (formMode === "create") {
      const nextId =
        modules.length > 0 ? Math.max(...modules.map((m) => m.id)) + 1 : 1;
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
            <span className={styles.sidebarSubtitle}>
              {modules.length} module - 16 tuần học
            </span>
          </div>

          {canEdit && (
            <button type="button" className={styles.addBtn} onClick={handleOpenCreate}>
              <Plus size={14} /> Thêm Module
            </button>
          )}
        </div>

        <ul className={styles.moduleList}>
          {visibleModules.map((m) => {
            const { meta } = splitSubtitle(m.subtitle);
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
                    <div className={styles.moduleText}>
                      <h3
                        className={[
                          styles.moduleTitle,
                          isActive ? styles.moduleTitleActive : "",
                          isLocked ? styles.moduleTitleLocked : "",
                        ].join(" ")}
                      >
                        {m.title}
                      </h3>
                      {m.badge && <span className={styles.moduleBadge}>{m.badge}</span>}
                      {meta && <span className={styles.moduleMeta}>{meta}</span>}
                      {m.extra && <span className={styles.moduleMeta}>{m.extra}</span>}
                    </div>
                  </div>

                  {canEdit && (
                    <div className={styles.moduleActions}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteModule(m.id)}
                        title="Xóa module"
                        aria-label={`Xóa ${m.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {modules.length > COLLAPSED_COUNT && (
          <button
            type="button"
            className={styles.showAllBtn}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Thu gọn" : "Xem đầy đủ 16 tuần học"}{" "}
            <ChevronDown
              size={14}
              style={{ transform: showAll ? "rotate(180deg)" : undefined }}
            />
          </button>
        )}
      </div>

      {isFormOpen && canEdit && (
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

export default CourseSidebar;