import React, { useState } from "react";
import styles from "./ActionBar.module.css";
import { Pencil, Plus } from "lucide-react";
import ActivityForm from "./Activityform";
import type { ActivityCardProps } from "./ActivityCard";
import type { Activity } from "./Activitytypes";
import { toActivity } from "./convertActivity";

export interface ActionBarProps {
  onEditHeader: () => void;
  /** Gọi khi tạo xong một hoạt động mới (tài liệu / bài tập / quiz) */
  onAddActivity: (activity: Activity) => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ onEditHeader, onAddActivity }) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const handleAdd = (values: ActivityCardProps) => {
    onAddActivity(toActivity(values)); // chuyển sang kiểu Activity trước khi gửi lên cha
    setIsAddingActivity(false);
  };

  return (
    <>
      <div className={styles.bannerActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onEditHeader}
        >
          <Pencil size={16} /> Sửa Module
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setIsAddingActivity(true)}
        >
          <Plus size={16} /> Thêm vào Module
        </button>
      </div>

      {isAddingActivity && (
        <ActivityForm onSubmit={handleAdd} onClose={() => setIsAddingActivity(false)} />
      )}
    </>
  );
};

export default ActionBar;