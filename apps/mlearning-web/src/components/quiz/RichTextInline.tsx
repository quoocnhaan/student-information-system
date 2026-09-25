import styles from './RichTextInline.module.css';
import type { RichText } from './types';

interface Props {
  segments: RichText;
}

/** Renders a mix of plain text and inline-code segments (e.g. RPC or field names). */
export default function RichTextInline({ segments }: Props) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.code ? (
          <code key={i} className={styles.code}>
            {seg.value}
          </code>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}
