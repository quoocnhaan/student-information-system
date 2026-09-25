import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  progress: number;
  height?: number;
  className?: string;
}

export function ProgressBar({ progress, height = 6, className = '' }: ProgressBarProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  const isCompleted = safeProgress === 100;

  return (
    <div className={`${styles.progressWrapper} ${className}`}>
      <div className={styles.track} style={{ height }}>
        <div
          className={`${styles.fill} ${isCompleted ? styles.completed : ''}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}
