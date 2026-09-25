import styles from './AnswerOption.module.css';
import RichTextInline from './RichTextInline';
import type { AnswerOption as AnswerOptionType } from './types';

interface Props {
  option: AnswerOptionType;
  selected: boolean;
  onSelect: (id: AnswerOptionType['id']) => void;
}

/** Radio-style answer option with an optional "Your Selection" badge. */
export default function AnswerOption({ option, selected, onSelect }: Props) {
  return (
    <label className={`${styles.option} ${selected ? styles.optionSelected : ''}`}>
      <input
        type="radio"
        name="quiz-answer"
        className={styles.radio}
        checked={selected}
        onChange={() => onSelect(option.id)}
      />
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.label}>Option {option.id}</span>
          {selected && <span className={styles.badge}>Your Selection</span>}
        </div>
        <p className={styles.text}>
          <RichTextInline segments={option.text} />
        </p>
      </div>
    </label>
  );
}
