import styles from './SpecBlock.module.css';

interface Props {
  title: string;
  link: string;
  lines: string[];
}

/** Monospace "formal specification" callout block shown inside the question. */
export default function SpecBlock({ title, link, lines }: Props) {
  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <a href="#" className={styles.link}>{link}</a>
      </div>
      <pre className={styles.code}>
        {lines.join('\n')}
      </pre>
    </div>
  );
}
