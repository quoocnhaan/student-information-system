import React, { useMemo, useState } from "react";
import styles from "./CourseManagement.module.css";
import { type ModuleHeaderValues } from "../components/course/Moduleheaderform";
import Sidebardetail from "../components/course/Sidebardetail";
import ActivityList from "../components/course/ActivityList";
import type { Activity } from "../components/course/Activitytypes";
import { activities as mockActivities } from "../components/course/Activitymockdata";


const TOTAL_WEEKS = 16;

type FilterKey = "all" | Activity["type"];

const initialHeader: ModuleHeaderValues = {
  breadcrumbSmall: "Khu vực Quản lý Học liệu & Hoạt động Tuần 7 - 8",
  moduleTitle: "Module 4: Thuật toán Đồng thuận Raft & Distributed State",
};


const CourseDetail: React.FC = () => {
  const [items] = useState<Activity[]>(mockActivities);
  const [header] = useState<ModuleHeaderValues>(initialHeader);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Số lượng theo loại - tự cập nhật khi thêm hoạt động mới
  const tabs = useMemo(() => {
    const count = (type: Activity["type"]) =>
      items.filter((a) => a.type === type).length;
    return [
      { key: "all" as FilterKey, label: `Tất cả hoạt động (${items.length})` },
      { key: "resource" as FilterKey, label: `Tài liệu bài giảng (${count("resource")})` },
      { key: "assignment" as FilterKey, label: `Bài tập & Cổng nộp (${count("assignment")})` },
      { key: "quiz" as FilterKey, label: `Bài kiểm tra Quiz & Điểm (${count("quiz")})` },
    ];
  }, [items]);

  const visibleActivities = useMemo(
    () => items.filter((a) => activeFilter === "all" || a.type === activeFilter),
    [items, activeFilter]
  );
  return (
    <div className={styles.container}>
      {/* HERO COURSE HEADER & STATS CARD */}
      <section className={styles.heroCard}>
        <div className={styles.heroAccent} />
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>

            <div>
              <h1 className={styles.courseTitle}>
                CS 408: Hệ Phân tán &amp; Kiến trúc Đám mây
              </h1>
              <p className={styles.courseDesc}>
                Quản lý học liệu, bài tập, bài kiểm tra và điểm số cho toàn bộ {TOTAL_WEEKS} tuần học:
                giao thức đồng thuận (Paxos, Raft), RPC (gRPC/Protobuf), lưu trữ phân tán và mở rộng
                microservices trên nền tảng đám mây.
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.mainLayout}>
        <div className={styles.sidebarCol}>
          <Sidebardetail />
        </div>
        <div className={styles.contentCol}>
          <section className={styles.wrapper}>
            <div className={styles.activeModuleBanner}>
              <div className={styles.bannerLayout}>
                <div className={styles.bannerText}>
                  <div className={styles.bannerTop}>
                  </div>

                  <h2 className={styles.bannerTitle}>
                    {header.moduleTitle}
                  </h2>
                </div>
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
              <ActivityList activities={visibleActivities} />
            </div>
          </section>

        </div>
      </div>

      <footer className={styles.footer}>
        <span>Universitas Academic Portal </span>
      </footer>
    </div>
  );
}

export default CourseDetail;