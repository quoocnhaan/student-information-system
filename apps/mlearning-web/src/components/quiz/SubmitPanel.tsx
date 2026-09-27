import styles from './SubmitPanel.module.css';

interface Props {
  unanswered: number;
  flagged: number;
  onSubmit?: () => void;
  disabled?: boolean;
}

/** Sidebar card prompting final review and submission of the quiz. */
export default function SubmitPanel({ unanswered, flagged, onSubmit, disabled }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.title}>Ready to complete exam?</p>
      <p className={styles.text}>
        Review all answers. You currently have {unanswered} questions unanswered and {flagged} flagged.
      </p>
      <button
        className={styles.submitBtn}
        onClick={onSubmit}
        disabled={disabled}
        style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
      >
        ✓ Submit Quiz &amp; Finish
      </button>
    </div>
  );
}