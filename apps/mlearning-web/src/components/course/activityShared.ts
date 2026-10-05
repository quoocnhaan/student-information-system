import styles from './Activityitem.module.css';

export const MAX_FILE_MB = 250;

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

// Mỗi tone set sẵn 3 biến CSS (--tone-bg / --tone-fg / --tone-bd) dùng chung cho badge, pill, banner.
export const toneClass: Record<Tone, string> = {
    success: styles.toneSuccess,
    warning: styles.toneWarning,
    danger: styles.toneDanger,
    neutral: styles.toneNeutral,
};

export function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}