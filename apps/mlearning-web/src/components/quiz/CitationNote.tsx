import styles from './CitationNote.module.css';

interface Props {
  citation: string;
}

/** Small info box citing the source material for the question. */
export default function CitationNote({ citation }: Props) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>ℹ</span>
      <p className={styles.text}>
        <strong>Reference Material Citation:</strong> {citation}
      </p>
    </div>
  );
}
