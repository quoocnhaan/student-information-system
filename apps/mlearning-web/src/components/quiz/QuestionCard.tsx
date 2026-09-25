import { useState } from 'react';
import styles from './QuestionCard.module.css';
import RichTextInline from './RichTextInline';
import SpecBlock from './SpecBlock';
import AnswerOption from './AnswerOption';
import type { QuestionData, AnswerOption as AnswerOptionType } from './types';

interface Props {
  question: QuestionData;
}

/** Question card: metadata row, prompt, formal spec, answer options and footer actions. */
export default function QuestionCard({ question }: Props) {
  const [selected, setSelected] = useState<AnswerOptionType['id'] | null>(question.selectedOptionId);

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.meta}>
          <span className={styles.qBadge}>Question {question.number}</span>
          <span className={styles.metaText}>
            {question.type} • {question.points.toFixed(1)} Points
          </span>
        </div>
        <button className={styles.flagBtn}>⚑ Flag for Review</button>
      </div>

      <p className={styles.prompt}>
        <RichTextInline segments={question.prompt} />
      </p>

      <SpecBlock title={question.specTitle} link={question.specLink} lines={question.specLines} />

      <div className={styles.options}>
        {question.options.map((opt) => (
          <AnswerOption
            key={opt.id}
            option={opt}
            selected={selected === opt.id}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnGhost}>← Previous Question</button>
        <button className={styles.btnLink} onClick={() => setSelected(null)}>
          Clear Selection
        </button>
        <button className={styles.btnPrimary}>Save &amp; Next Question →</button>
      </div>
    </div>
  );
}
