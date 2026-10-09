import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./CoursePage.module.css";
import CourseSidebar from "../components/course/CourseSidebar";
import ActionBar from "../components/course/ActionBar";
import ActivityList from "../components/course/ActivityList";
import ActivityItem from "../components/course/Activityitem";
import ActivityForm from "../components/course/Activityform";
import ModuleHeaderForm, { type ModuleHeaderValues } from "../components/course/Moduleheaderform";
import type { Activity } from "../components/course/Activitytypes";
import type { ActivityCardProps } from "../components/course/ActivityCard";
import { toActivity } from "../components/course/convertActivity";
import { activities as mockActivities } from "../components/course/Activitymockdata";
import { courses } from "../components/course/Coursedata";
import { useIsTeacher } from "../hooks/useRole";

const TOTAL_WEEKS = 16;

type FilterKey = "all" | Activity["type"];

const initialHeader: ModuleHeaderValues = {
  breadcrumbSmall: "Khu vực Quản lý Học liệu & Hoạt động Tuần 7 - 8",
  moduleTitle: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
};


/**
 * CoursePage - route /course/:id, dùng chung cho student và teacher.
 * Role lấy từ useIsTeacher() (đọc từ AuthContext).
 */
const CoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isTeacher = useIsTeacher();

  // Tìm khóa học theo id trên URL (nếu không thấy thì dùng tiêu đề mặc định)
  const course = courses.find((c) => String(c.id) === id);
  const courseTitle = course?.title ?? "CS 408: Hệ Phân tán & Kiến trúc Đám mây";

  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [header, setHeader] = useState<ModuleHeaderValues>(initialHeader);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  /** Chuyển Activity → giá trị khởi tạo cho ActivityForm */
  const activityToInitialValues = (a: Activity) => {
    const toLocalInput = (iso: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    if (a.type === "assignment") {
      return {
        type: "assignment" as const,
        title: a.title,
        description: a.description ?? "",
        openAt: toLocalInput(a.opensAt),
        closeAt: toLocalInput(a.dueAt),
        existingFileNames: a.templateFiles?.map((f) => f.name) ?? [],
      };
    }
    if (a.type === "quiz") {
      return {
        type: "quiz" as const,
        title: a.title,
        description: a.description ?? "",
        openAt: toLocalInput(a.opensAt),
        closeAt: toLocalInput(a.closesAt),
        timeLimitMins: a.timeLimitMins,
        maxScore: 10,
        questions: [],
      };
    }
    return {
      type: "document" as const,
      title: a.title,
      description: a.description ?? "",
      existingFileNames: a.files?.map((f) => f.name) ?? [],
    };
  };

  const handleAddActivity = (activity: Activity) => {
    setActivities((prev) => [...prev, activity]);
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleEditSubmit = (values: ActivityCardProps) => {
    if (!editingActivity) return;
    const updated = { ...toActivity(values), id: editingActivity.id };
    setActivities((prev) => prev.map((a) => a.id === editingActivity.id ? updated : a));
    setEditingActivity(null);
  };

  const tabs = useMemo(() => {
    const count = (type: Activity["type"]) =>
      activities.filter((a) => a.type === type).length;
    return [
      { key: "all" as FilterKey, label: `Tất cả hoạt động (${activities.length})` },
      { key: "resource" as FilterKey, label: `Tài liệu bài giảng (${count("resource")})` },
      { key: "assignment" as FilterKey, label: `Bài tập & Nộp bài (${count("assignment")})` },
      { key: "quiz" as FilterKey, label: `Bài kiểm tra Quiz & Điểm (${count("quiz")})` },
    ];
  }, [activities]);

  const visibleActivities = useMemo(
    () => activities.filter((a) => activeFilter === "all" || a.type === activeFilter),
    [activities, activeFilter]
  );

  const handleSaveHeader = (values: ModuleHeaderValues) => {
    setHeader(values);
    setIsEditingHeader(false);
  };


  return (
    <div className={styles.container}>
      <section className={styles.heroCard}>
        <div className={styles.heroAccent} />
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.courseTitle}>{courseTitle}</h1>
              <p className={styles.courseDesc}>
                Quản lý học liệu, bài tập, bài kiểm tra và điểm số cho toàn bộ{" "}
                {TOTAL_WEEKS} tuần học: giao thức đồng thuận (Paxos, Raft), RPC
                (gRPC/Protobuf), lưu trữ phân tán và mở rộng microservices trên
                nền tảng đám mây.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainLayout}>
        <div className={styles.sidebarCol}>
          <CourseSidebar canEdit={isTeacher} />
        </div>

        <div className={styles.contentCol}>
          <section className={styles.wrapper}>
            <div className={styles.activeModuleBanner}>
              <div className={styles.bannerLayout}>
                <div className={styles.bannerText}>
                  <div className={styles.bannerTop} />
                  <h2 className={styles.bannerTitle}>{header.moduleTitle}</h2>
                </div>

                {isTeacher && (
                  <ActionBar
                    onEditHeader={() => setIsEditingHeader(true)}
                    onAddActivity={handleAddActivity}
                  />
                )}
              </div>

              <div
                className={styles.filterTabs}
                role="tablist"
                aria-label="Lọc hoạt động theo loại"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === tab.key}
                    className={`${styles.filterTab} ${activeFilter === tab.key
                      ? styles.filterTabActive
                      : styles.filterTabInactive
                      }`}
                    onClick={() => setActiveFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.activityList}>
              {isTeacher ? (
                visibleActivities.length === 0 ? (
                  <div className={styles.emptyState}>
                    Chưa có hoạt động nào thuộc loại này. Chọn "Thêm vào Module" để tạo mới.
                  </div>
                ) : (
                  visibleActivities.map((a) => (
                    <ActivityItem
                      key={a.id}
                      activity={a}
                      isTeacher={isTeacher}
                      onEdit={handleEditActivity}
                      onDelete={handleDeleteActivity}
                    />
                  ))
                )
              ) : (
                <ActivityList activities={visibleActivities} />
              )}
            </div>

            {isTeacher && isEditingHeader && (
              <ModuleHeaderForm
                initialData={header}
                onSubmit={handleSaveHeader}
                onClose={() => setIsEditingHeader(false)}
              />
            )}

            {isTeacher && editingActivity && (
              <ActivityForm
                initialValues={activityToInitialValues(editingActivity)}
                onSubmit={handleEditSubmit}
                onClose={() => setEditingActivity(null)}
              />
            )}
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Universitas Academic Portal</span>
      </footer>
    </div>
  );
};

export default CoursePage;