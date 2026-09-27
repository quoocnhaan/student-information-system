import type { CSSProperties } from 'react';
import { Clock, Star, BadgeCheck, ArrowRight } from 'lucide-react';
import styles from '../../pages/CourseCatalog.module.css';
import type { Course, TagVariant, StatusVariant } from './Coursedata';

interface CourseCardProps {
    course: Course;
    onGoToCourse: () => void;
}

const statusBadgeStyles: Record<StatusVariant, CSSProperties> = {
    success: {
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
    },
    outline: {
        fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--on-surface-variant)',
        border: '1px solid var(--outline-variant)',
    },
};

const tagStyles: Record<TagVariant, CSSProperties> = {
    primary: {
        fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: 'var(--primary)', color: 'var(--on-primary)',
    },
    neutral: {
        fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-secondary-container)',
    },
};

const categoryStyle: CSSProperties = {
    fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--primary)',
    border: '1px solid rgba(195, 198, 215, 0.6)',
};

export function CourseCard({ course, onGoToCourse }: CourseCardProps) {
    const {
        banner, category, tag, statusBadge, crn, code,
        title, description, instructor, schedule, progress, rating,
    } = course;

    return (
        <article className={styles.courseCard}>
            <div className={styles.cardBanner}>
                <img src={banner} alt={title} />
                <div className={styles.badgeTopLeft}>
                    <span style={categoryStyle}>{category}</span>
                    {tag && <span style={tagStyles[tag.variant]}>{tag.label}</span>}
                </div>
                <div className={styles.badgeTopRight}>
                    {statusBadge && (
                        <span style={statusBadgeStyles[statusBadge.variant]}>
                            {statusBadge.variant === 'success' && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
                            )}
                            {statusBadge.label}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.courseMeta}>
                    <span className={styles.courseCode}>{crn} • {code}</span>
                    {rating && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={12} color="#f59e0b" fill="#f59e0b" /> {rating.score} ({rating.count})
                        </span>
                    )}
                </div>
                <h3 className={styles.courseTitle}>{title}</h3>
                <p className={styles.courseDesc}>{description}</p>

                <div className={styles.instructorRow}>
                    <img className={styles.instructorAvatar} src={instructor.avatar} alt="Prof" />
                    <div className={styles.instructorInfo}>
                        <span className={styles.instructorName}>
                            {instructor.name} {instructor.verified && <BadgeCheck size={14} color="var(--primary)" />}
                        </span>
                        <span className={styles.instructorRole}>{instructor.role}</span>
                    </div>
                </div>
                <div className={styles.scheduleBadge}>
                    <Clock size={14} color="var(--primary)" /> {schedule}
                </div>
            </div>

            <div className={styles.cardFooter}>
                <div className={styles.progressContainer}>
                    <div className={styles.progressHeader}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{progress}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                <button className={styles.actionBtn} onClick={onGoToCourse}>
                    Go to Course <ArrowRight size={16} />
                </button>
            </div>
        </article>
    );
}