import styles from './QuestionCard.module.css';
import RichTextInline from './RichTextInline';
import SpecBlock from './SpecBlock';
import AnswerOption from './AnswerOption';
import type { QuestionData, AnswerOption as AnswerOptionType } from './types';

interface Props {
  question: QuestionData;
  selectedOptionId: AnswerOptionType['id'] | null;
  onSelectOption: (optionId: AnswerOptionType['id']) => void;
  onClearSelection: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmitClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
}

/**
 * Question card: metadata row, prompt, formal spec, answer options and footer actions.
 * Controlled component — selection lives in the parent (QuizTakingPage).
 * On the last question, the primary button triggers `onSubmitClick`
 * (opens a confirmation dialog in the parent) instead of `onNext`.
 */
export default function QuestionCard({
  question,
  selectedOptionId,
  onSelectOption,
  onClearSelection,
  onPrevious,
  onNext,
  onSubmitClick,
  isFirst,
  isLast,
  isFlagged,
  onToggleFlag,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.meta}>
          <span className={styles.qBadge}>Question {question.number}</span>
          <span className={styles.metaText}>
            {question.type} • {question.points.toFixed(1)} Points
          </span>
        </div>
        <button
          className={styles.flagBtn}
          onClick={onToggleFlag}
          aria-pressed={isFlagged}
          style={
            isFlagged
              ? { color: '#b45309', backgroundColor: '#fffbeb', borderColor: '#f59e0b' }
              : undefined
          }
        >
          {isFlagged ? '⚑ Flagged' : '⚑ Flag '}
        </button>
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
            selected={selectedOptionId === opt.id}
            onSelect={onSelectOption}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.btnGhost}
          onClick={onPrevious}
          disabled={isFirst}
          style={isFirst ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          ← Previous
        </button>
        <button className={styles.btnLink} onClick={onClearSelection}>
          Clear Selection
        </button>
        <button className={styles.btnPrimary} onClick={isLast ? onSubmitClick : onNext}>
          {isLast ? 'Submit Quiz' : 'Next →'}
        </button>
      </div>
    </div>
  );
}