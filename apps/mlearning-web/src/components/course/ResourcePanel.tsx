import { Download, FileText } from 'lucide-react';
import styles from './Activityitem.module.css';
import type { ResourceActivity } from './Activitytypes';

export default function ResourcePanel({ activity }: { activity: ResourceActivity }) {
    return (
        <div className={styles.card}>
            <div className={styles.resourceTop}>
                <h4 className={styles.cardTitle}>Files ({activity.files.length})</h4>
                <a className={styles.btnPrimary} href={activity.folderUrl ?? '#'} download>
                    <Download size={16} /> Download folder
                </a>
            </div>
            <ul className={styles.fileList}>
                {activity.files.map((f) => (
                    <li key={f.name}>
                        <a className={styles.fileLink} href={f.url ?? '#'} download>
                            <span className={styles.attachIcon}>
                                <FileText size={16} />
                            </span>
                            <span className={styles.fileLinkName}>{f.name}</span>
                            <Download size={15} className={styles.fileLinkDl} />
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}