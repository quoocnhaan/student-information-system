import type { ReactNode } from 'react';
import styles from './Activityitem.module.css';

interface Props {
    icon: ReactNode;
    label: string;
    children: ReactNode;
    danger?: boolean;
}

export default function InfoTile({ icon, label, children, danger = false }: Props) {
    return (
        <div className={`${styles.infoTile} ${danger ? styles.tileDanger : ''}`}>
            <span className={styles.tileIcon}>{icon}</span>
            <div className={styles.tileText}>
                <span className={styles.tileLabel}>{label}</span>
                <span className={styles.tileValue}>{children}</span>
            </div>
        </div>
    );
}