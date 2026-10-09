import React, { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ActionBar.module.css";
import { Pencil, Plus, Library } from "lucide-react";
import ActivityForm from "./Activityform";
import { QuestionBank } from "./Questionbank";
import type { ActivityCardProps } from "./ActivityCard";
import type { Activity } from "./Activitytypes";
import { toActivity } from "./convertActivity";

export interface ActionBarProps {
  onEditHeader: () => void;
  onAddActivity: (activity: Activity) => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  onEditHeader,
  onAddActivity,
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);

  const handleAddActivity = (activity: ActivityCardProps) => {
    onAddActivity(toActivity(activity));
    setIsAddingActivity(false);
  };

  return (
    <>
      <div className={styles.bannerActions}>
        <button
          type="button"
          className={styles.btn}
          onClick={onEditHeader}
        >
          <Pencil size={16} />
          Sửa Module
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={() => setIsQuestionBankOpen(true)}
        >
          <Library size={16} />
          Ngân hàng câu hỏi
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={() => setIsAddingActivity(true)}
        >
          <Plus size={16} />
          Thêm vào Module
        </button>
      </div>

      {/* =========================
          FORM THÊM HOẠT ĐỘNG
          ========================= */}
      {isAddingActivity &&
        createPortal(
          <div
            className={styles.activityFormOverlay}
            onClick={() => setIsAddingActivity(false)}
          >
            <div
              className={styles.activityFormModal}
              onClick={(e) => e.stopPropagation()}
            >
              <ActivityForm
                onClose={() => setIsAddingActivity(false)}
                onSubmit={handleAddActivity}
              />
            </div>
          </div>,
          document.body
        )}

      {/* =========================
          QUESTION BANK
          ========================= */}
      {isQuestionBankOpen &&
        createPortal(
          <div
            className={styles.questionBankOverlay}
            onClick={() => setIsQuestionBankOpen(false)}
          >
            <div
              className={styles.questionBankModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.questionBankContent}>
                <QuestionBank
                  onClose={() => setIsQuestionBankOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ActionBar;
