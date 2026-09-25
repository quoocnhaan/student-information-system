import styles from "./CourseManagement.module.css";
import Breadcrumb from "../components/course/Breadcrumb";
import ActionBar from "../components/course/ActionBar";
import Sidebar from "../components/course/Sidebar";
import ModuleContent from "../components/course/ModuleContent";

/**
 * CoursePage - Trang quản lý khóa học "CS 408: Hệ Phân Tán & Kiến Trúc Đám Mây"
 * Bố cục: Header trên cùng, Breadcrumb + ActionBar, và layout 2 cột
 * (Sidebar danh sách Module bên trái, ModuleContent chi tiết bên phải)
 */
export function CourseManagement() {
  return (
    <div className={styles.page}>
      <Breadcrumb />
      <ActionBar />

      <div className={styles.body}>
        <div className={styles.sidebarCol}>
          <Sidebar />
        </div>
        <div className={styles.contentCol}>
          <ModuleContent />
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Universitas Academic Portal · Phần hệ Quản lý Giảng dạy &amp; Đánh giá Học thuật trực tuyến</span>
        <span>Hệ thống sao lưu điểm số tức thời · Bảo mật học thuật SSL 256-bit</span>
      </footer>
    </div>
  );
};
