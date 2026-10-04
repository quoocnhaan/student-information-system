import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Nút hành động bên phải (ví dụ "Add course") */
  actions?: ReactNode;
}

/** Header dùng chung cho các trang: tiêu đề, mô tả ngắn và vùng nút hành động. */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          <div className={styles.titleLine}>
            <h1 className={styles.title}>{title}</h1>
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}