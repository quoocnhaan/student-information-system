import { useEffect, useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import styles from './Activityitem.module.css';
import type { Activity, AssignmentSubmission } from './Activitytypes';
import { toneClass } from './activityShared';
import { getActivityHeader } from './getActivityHeader';
import AssignmentPanel from './AssignmentPanel';
import QuizPanel from './QuizPanel';
import ResourcePanel from './ResourcePanel';
import { useNavigate, useParams } from 'react-router-dom';

interface Props {
    activity: Activity;
    defaultOpen?: boolean;
    isTeacher?: boolean;
    onStartQuiz?: (quizId: string) => void;
    onSaveSubmission?: (assignmentId: string, file: File) => void;
    onRemoveSubmission?: (assignmentId: string) => void;
    onEdit?: (activity: Activity) => void;
    onDelete?: (activityId: string) => void;
}

export default function ActivityItem({
    activity,
    defaultOpen = false,
    isTeacher = false,
    onStartQuiz,
    onSaveSubmission,
    onRemoveSubmission,
    onEdit,
    onDelete,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const [now, setNow] = useState(() => Date.now());
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(
        activity.type === 'assignment' ? activity.submission : null
    );

    const navigate = useNavigate();
    const { id: courseId } = useParams<{ id: string }>();
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(t);
    }, []);

    const panelId = `activity-panel-${activity.id}`;
    const header = getActivityHeader(activity, submission, now);

    const handleSave = (file: File) => {
        const stamp = new Date().toISOString();
        setSubmission({ fileName: file.name, submittedAt: stamp, lastModified: stamp });
        onSaveSubmission?.(activity.id, file);
    };

    const handleRemove = () => {
        setSubmission(null);
        onRemoveSubmission?.(activity.id);
    };

    const handleStartQuiz = () => {
        if (onStartQuiz) {
            onStartQuiz(activity.id);
        } else {
            navigate(`/course/${courseId}/quiz-taking/${activity.id}`);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Bạn có chắc muốn xóa "${activity.title}" không?`)) {
            onDelete?.(activity.id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.(activity);
    };

    return (
        <article className={`${styles.item} ${open ? styles.itemOpen : ''}`}>
            <div className={styles.head}>
                <div className={styles.headMain}>
                    <div className={`${styles.icon} ${header.tone === 'success' ? styles.iconSuccess : ''}`}>
                        {header.icon}
                    </div>
                    <div className={styles.details}>
                        <div className={styles.meta}>
                            <span className={`${styles.badge} ${toneClass[header.tone]}`}>{header.badge}</span>
                            {header.metaText && <span className={styles.metaText}>{header.metaText}</span>}
                        </div>
                        <h3 className={styles.title}>{activity.title}</h3>
                        {activity.description && <p className={styles.desc}>{activity.description}</p>}
                    </div>
                </div>

                <div className={styles.headActions}>
                    {isTeacher && (
                        <div className={styles.teacherActions}>
                            <button
                                type="button"
                                className={styles.editBtn}
                                onClick={handleEdit}
                                title="Sửa hoạt động"
                                aria-label="Sửa"
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={handleDelete}
                                title="Xóa hoạt động"
                                aria-label="Xóa"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        className={styles.toggleBtn}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? 'Ẩn chi tiết' : header.buttonLabel}
                        <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
                    </button>
                </div>
            </div>

            <div id={panelId} className={`${styles.panelWrap} ${open ? styles.panelWrapOpen : ''}`}>
                <div className={styles.panelInner}>
                    <div className={styles.panelBody}>
                        {activity.type === 'assignment' && (
                            <AssignmentPanel
                                activity={activity}
                                submission={submission}
                                now={now}
                                onSave={handleSave}
                                onRemove={handleRemove}
                            />
                        )}
                        {activity.type === 'quiz' && (
                            <QuizPanel activity={activity} now={now} onStart={handleStartQuiz} />
                        )}
                        {activity.type === 'resource' && <ResourcePanel activity={activity} />}
                    </div>
                </div>
            </div>
        </article>
    );
}