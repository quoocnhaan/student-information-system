import type { ReactNode } from "react";
import {
  ClipboardCheck,
  FileQuestion,
  FileText,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import styles from "./ActivityCard.module.css";

export type ActivityType = "document" | "assignment" | "quiz";

export interface ActivityCardProps {
  type: ActivityType;
  statusLabel: string;
  title: string;
  description: string;
  footer?: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  extraNote?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

const typeIcon: Record<ActivityType, ReactNode> = {
  document: <FileText size={21} strokeWidth={1.8} />,
  assignment: <ClipboardCheck size={22} strokeWidth={1.8} />,
  quiz: <FileQuestion size={22} strokeWidth={1.8} />,
};

const ActivityCard = ({
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
}: ActivityCardProps) => {
  const isAssignment = type === "assignment";

  return (
    <article className={styles.card}>
      <div
        className={`${styles.iconWrap} ${type === "assignment"
            ? styles.assignmentIcon
            : type === "document"
              ? styles.documentIcon
              : styles.quizIcon
          }`}
      >
        {typeIcon[type]}
      </div>

      <div className={styles.content}>
        <div className={styles.metaRow}>
          <span className={`${styles.status} ${styles[type]}`}>
            {statusLabel}
          </span>

          {isAssignment && footer && (
            <span className={styles.metaText}>{footer}</span>
          )}
        </div>

        <h3 className={styles.title}>{title}</h3>

        {description && (
          <p className={styles.description}>{description}</p>
        )}

        {!isAssignment && footer && (
          <span className={styles.footer}>{footer}</span>
        )}

        {extraNote && (
          <span className={styles.extraNote}>{extraNote}</span>
        )}
      </div>

      <div className={styles.actions}>
        {secondaryActionLabel && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        )}

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={onPrimaryAction}
        >
          {type === "document" ? (
            <RefreshCw size={15} />
          ) : (
            <ChevronDown size={16} className={styles.buttonChevron} />
          )}
          {primaryActionLabel}
        </button>
      </div>
    </article>
  );
};

export default ActivityCard;