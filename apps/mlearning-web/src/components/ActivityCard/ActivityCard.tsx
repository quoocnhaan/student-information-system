import React from "react";
import styles from "./ActivityCard.module.css";

export type ActivityType = "document" | "assignment" | "quiz";

export interface ActivityCardProps {
  type: ActivityType;
  statusLabel: string; // ví dụ: "TÀI LIỆU ĐÃ ĐĂNG", "ĐANG MỞ TRẢ LỜI"
  title: string;
  description: string;
  footer?: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  extraNote?: string; // ví dụ số bài đã nộp / cần chấm
  /** Gọi khi bấm nút chính (vd: "Cập nhật File", "SpeedGrader") */
  onPrimaryAction?: () => void;
  /** Gọi khi bấm nút phụ (vd: "Sửa Rubric", "Ngân hàng câu hỏi") */
  onSecondaryAction?: () => void;
}

/** Icon minh họa theo loại hoạt động */
const typeIcon: Record<ActivityType, string> = {
  document: "📄",
  assignment: "📥",
  quiz: "📋",
};

/**
 * ActivityCard - Thẻ hiển thị một hoạt động trong Module
 * (tài liệu bài giảng, bài tập/cổng nộp, hoặc bài kiểm tra quiz)
 */
const ActivityCard: React.FC<ActivityCardProps> = ({
  type,
  statusLabel,
  title,
  description,
  footer,
  primaryActionLabel,
  secondaryActionLabel,
  extraNote,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{typeIcon[type]}</span>
      </div>

      <div className={styles.content}>
        <span className={`${styles.status} ${styles[type]}`}>{statusLabel}</span>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {footer && <span className={styles.footer}>{footer}</span>}
      </div>

      <div className={styles.actions}>
        {extraNote && <span className={styles.extraNote}>{extraNote}</span>}
        <div className={styles.buttonRow}>
          {secondaryActionLabel && (
            <button className={styles.secondaryBtn} onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
          <button className={styles.primaryBtn} onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;