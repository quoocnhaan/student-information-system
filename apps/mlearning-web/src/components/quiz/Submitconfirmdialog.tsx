import styles from './Submitconfirmdialog.module.css';

interface Props {
    open: boolean;
    totalQuestions: number;
    answeredCount: number;
    unansweredCount: number;
    flaggedCount: number;
    onCancel: () => void;
    onConfirm: () => void;
    /**
     * 'manual'  — learner clicked "Submit Quiz" themselves: shows both
     *             "Go back" and "Confirm Submit", closable by overlay click.
     * 'timeout' — the countdown hit 0: shows ONLY "Confirm Submit", cannot
     *             be dismissed (no cancel button, overlay click does nothing).
     */
    variant?: 'manual' | 'timeout';
}

/**
 * Confirmation modal shown before final quiz submission.
 * In 'timeout' mode it becomes a locked, single-action notice: the learner
 * can no longer back out, only acknowledge and submit.
 */
export default function SubmitConfirmDialog({
    open,
    totalQuestions,
    answeredCount,
    unansweredCount,
    flaggedCount,
    onCancel,
    onConfirm,
    variant = 'manual',
}: Props) {
    if (!open) return null;

    const isTimeout = variant === 'timeout';

    return (
        <div
            className={styles.overlay}
            role="presentation"
            onClick={isTimeout ? undefined : onCancel}
        >
            <div
                className={styles.dialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="submit-confirm-title"
                aria-describedby="submit-confirm-desc"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="submit-confirm-title" className={styles.title}>
                    {isTimeout ? "Time's up ⏱" : 'Submit quiz for grading?'}
                </h2>
                <p id="submit-confirm-desc" className={styles.desc}>
                    {isTimeout
                        ? 'Your time has run out. Your current answers will be submitted now.'
                        : "Once submitted, you won't be able to change any answers."}
                </p>

                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Answered</span>
                        <span className={styles.summaryValue}>
                            {answeredCount} / {totalQuestions}
                        </span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Unanswered</span>
                        <span className={`${styles.summaryValue} ${unansweredCount > 0 ? styles.warn : ''}`}>
                            {unansweredCount}
                        </span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Flagged for review</span>
                        <span className={`${styles.summaryValue} ${flaggedCount > 0 ? styles.warn : ''}`}>
                            {flaggedCount}
                        </span>
                    </div>
                </div>

                {!isTimeout && unansweredCount > 0 && (
                    <p className={styles.warningText}>
                        ⚠ You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
                    </p>
                )}

                <div className={isTimeout ? styles.actionsSingle : styles.actions}>
                    {!isTimeout && (
                        <button className={styles.btnCancel} onClick={onCancel}>
                            Go back
                        </button>
                    )}
                    <button className={styles.btnConfirm} onClick={onConfirm} autoFocus={isTimeout}>
                        Confirm Submit
                    </button>
                </div>
            </div>
        </div>
    );
}
