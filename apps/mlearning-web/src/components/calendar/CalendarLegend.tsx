import styles from './CalendarLegend.module.css';

const legendItems = [
  { label: 'Lectures', className: styles.dotLecture },
  { label: 'Assignment Deadlines', className: styles.dotDeadline },
  { label: 'Exams & Quizzes', className: styles.dotExam },
  { label: 'Office Hours & TA', className: styles.dotOffice },
  { label: 'Seminars & Study', className: styles.dotSeminar },
  { label: 'Institutional', className: styles.dotInstitutional },
];

/** Legend explaining the color coding used in the month grid chips. */
export default function CalendarLegend() {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Calendar Categories:</span>
      {legendItems.map((item) => (
        <span key={item.label} className={styles.item}>
          <span className={`${styles.dot} ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
