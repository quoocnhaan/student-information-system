import ActivityItem from "./Activityitem";
import type { Activity } from "./Activitytypes";
import styles from "./ActivityList.module.css";

interface Props {
    activities: Activity[];
    emptyText?: string;
}

const ActivityList = ({ activities, emptyText = "Chưa có hoạt động nào thuộc loại này." }: Props) => {
    if (activities.length === 0) {
        return <div className={styles.emptyState}>{emptyText}</div>;
    }

    return (
        <div className={styles.activityList}>
            {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    );
};

export default ActivityList;