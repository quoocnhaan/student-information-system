import styles from './SubmitPanel.module.css';

interface Props {
  unanswered: number;
  flagged: number;
}

/** Sidebar card prompting final review and submission of the quiz. */
export default function SubmitPanel({ unanswered, flagged }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.title}>Ready to complete exam?</p>
      <p className={styles.text}>
        Review all answers. You currently have {unanswered} questions unanswered and {flagged} flagged.
      </p>
      <button className={styles.submitBtn}>✓ Submit Quiz &amp; Finish</button>
    </div>
  );
}
