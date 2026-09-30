import styles from '../../pages/CourseCatalog.module.css';
import type { Course } from './Coursedata';

interface CourseCardProps {
    course: Course;
    onGoToCourse: () => void;
}


export function CourseCard({ course, onGoToCourse }: CourseCardProps) {
    const { banner, title, } = course;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onGoToCourse();
        }
    };
    return (
        <article
            className={styles.courseCard}
            onClick={onGoToCourse}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`Vào khóa học ${title}`}
        >
            <div className={styles.cardBanner}>
                <img src={banner} alt={title} />
            </div>

            <div className={styles.cardBody}>
                <h3 className={styles.courseTitle}>{title}</h3>
            </div>
        </article>
    );
}