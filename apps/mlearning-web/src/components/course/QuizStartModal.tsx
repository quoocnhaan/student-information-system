import { Clock, FileQuestion, Play, Repeat, Timer } from 'lucide-react';
import styles from './Activityitem.module.css';
import type { QuizActivity } from './Activitytypes';

interface Props {
    activity: QuizActivity;
    attemptsLeft: number;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function QuizStartModal({ activity, attemptsLeft, onCancel, onConfirm }: Props) {
    return (
        <div className={styles.quizModalOverlay} onClick={onCancel}>
            <div className={styles.quizModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.quizModalIcon}>
                    <Play size={24} fill="currentColor" />
                </div>

                <h2 className={styles.quizModalTitle}>Start Quiz?</h2>
                <p className={styles.quizModalDescription}>Please review the quiz information before starting.</p>

                <div className={styles.quizModalInfo}>
                    <div className={styles.quizModalInfoItem}>
                        <div className={styles.quizModalInfoIcon}>
                            <Timer size={20} />
                        </div>
                        <div>
                            <span>Time limit</span>
                            <strong>{activity.timeLimitMins} minutes</strong>
                        </div>
                    </div>

                    <div className={styles.quizModalInfoItem}>
                        <div className={styles.quizModalInfoIcon}>
                            <FileQuestion size={20} />
                        </div>
                        <div>
                            <span>Questions</span>
                            <strong>{activity.questionCount} questions</strong>
                        </div>
                    </div>

                    <div className={styles.quizModalInfoItem}>
                        <div className={styles.quizModalInfoIcon}>
                            <Repeat size={20} />
                        </div>
                        <div>
                            <span>Attempts remaining</span>
                            <strong>{attemptsLeft}</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.quizModalNotice}>
                    <Clock size={17} />
                    <span>The timer will start immediately after you begin the quiz.</span>
                </div>

                <div className={styles.quizModalActions}>
                    <button type="button" className={styles.quizCancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className={styles.quizStartBtn} onClick={onConfirm}>
                        <Play size={17} fill="currentColor" />
                        Start Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}