import type { ReactNode } from 'react';
import styles from './Activityitem.module.css';
import { toneClass } from './activityShared';
import type { Tone } from './activityShared';

interface Props {
    tone: Tone;
    icon: ReactNode;
    title: string;
    subtitle?: string;
}

export default function StatusBanner({ tone, icon, title, subtitle }: Props) {
    return (
        <div className={`${styles.banner} ${toneClass[tone]}`}>
            <span className={styles.bannerIcon}>{icon}</span>
            <div className={styles.bannerText}>
                <span className={styles.bannerTitle}>{title}</span>
                {subtitle && <span className={styles.bannerSub}>{subtitle}</span>}
            </div>
        </div>
    );
}