import React, { useState } from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  defaultKey?: string;
  onChange?: (key: string) => void;
}

/**
 * Tabs - Thanh chuyển đổi giữa các loại hoạt động trong Module
 * (Tất cả hoạt động / Tài liệu bài giảng / Bài tập & Cổng nộp / Bài kiểm tra Quiz & Điểm)
 */
const Tabs: React.FC<TabsProps> = ({ tabs, defaultKey, onChange }) => {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);

  const handleClick = (key: string) => {
    setActive(key);
    onChange?.(key);
  };

  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`${styles.tab} ${active === tab.key ? styles.tabActive : ""}`}
          onClick={() => handleClick(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
