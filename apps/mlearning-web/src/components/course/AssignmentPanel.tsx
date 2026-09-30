import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    AlertTriangle, CalendarClock, CalendarDays, Check, CheckCircle2, Clock,
    FileText, Lock, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import styles from './Activityitem.module.css';
import type { AssignmentActivity, AssignmentSubmission } from './Activitytypes';
import { formatDateTime, formatDuration } from './Activityutils';
import type { Tone } from './activityShared';
import StatusBanner from './StatusBanner';
import InfoTile from './InfoTile';
import SubmissionForm from './SubmissionForm';

interface Props {
    activity: AssignmentActivity;
    submission: AssignmentSubmission | null;
    now: number;
    onSave: (file: File) => void;
    onRemove: () => void;
}

type StepState = 'done' | 'current' | 'pending' | 'failed';

const stepClass: Record<StepState, string> = {
    done: styles.stepDone,
    current: styles.stepCurrent,
    pending: '',
    failed: styles.stepFailed,
};

export default function AssignmentPanel({ activity, submission, now, onSave, onRemove }: Props) {
    const [mode, setMode] = useState<'view' | 'edit'>('view');

    const opens = new Date(activity.opensAt).getTime();
    const due = new Date(activity.dueAt).getTime();
    const notOpen = now < opens;
    const pastDue = now > due;
    const canModify = !notOpen && !pastDue; // chỉ được nộp / sửa / xóa trong khoảng mở - hạn nộp
    const isGraded = activity.gradingStatus === 'Graded';

    const timing = ((): { text: string; tone: Tone } => {
        if (submission) {
            const diff = due - new Date(submission.submittedAt).getTime();
            return diff >= 0
                ? { text: `Submitted ${formatDuration(diff)} early`, tone: 'success' }
                : { text: `Submitted ${formatDuration(-diff)} late`, tone: 'danger' };
        }
        if (notOpen) return { text: `Opens in ${formatDuration(opens - now)}`, tone: 'neutral' };
        if (pastDue) return { text: `Overdue by ${formatDuration(now - due)}`, tone: 'danger' };
        return { text: `${formatDuration(due - now)} remaining`, tone: 'warning' };
    })();

    const banner = ((): { tone: Tone; icon: ReactNode; title: string; subtitle: string } => {
        if (submission) {
            return {
                tone: timing.tone === 'danger' ? 'danger' : 'success',
                icon: <CheckCircle2 size={22} />,
                title: 'Submitted for grading',
                subtitle: `${timing.text} • ${activity.gradingStatus}`,
            };
        }
        if (notOpen) return { tone: 'neutral', icon: <Lock size={20} />, title: 'Not open yet', subtitle: timing.text };
        if (pastDue) {
            return { tone: 'danger', icon: <AlertTriangle size={20} />, title: 'No submission • deadline passed', subtitle: timing.text };
        }
        return { tone: 'warning', icon: <Clock size={20} />, title: 'Not submitted yet', subtitle: timing.text };
    })();

    const steps: { label: string; state: StepState }[] = [
        { label: 'Opened', state: notOpen ? 'pending' : 'done' },
        { label: 'Submitted', state: submission ? 'done' : notOpen ? 'pending' : pastDue ? 'failed' : 'current' },
        { label: 'Graded', state: isGraded ? 'done' : 'pending' },
    ];

    const handleRemove = () => {
        if (window.confirm('Are you sure you want to remove your submission?')) onRemove();
    };

    return (
        <>
            <StatusBanner {...banner} />

            {/* Thanh tiến trình: Opened -> Submitted -> Graded */}
            <ol className={styles.stepper} aria-label="Assignment progress">
                {steps.map((s, i) => (
                    <li key={s.label} className={`${styles.step} ${stepClass[s.state]}`}>
                        <span className={styles.stepDot}>
                            {s.state === 'done' ? (
                                <Check size={14} strokeWidth={3} />
                            ) : s.state === 'failed' ? (
                                <X size={14} strokeWidth={3} />
                            ) : (
                                i + 1
                            )}
                        </span>
                        <span className={styles.stepLabel}>{s.label}</span>
                    </li>
                ))}
            </ol>

            <div className={styles.infoGrid}>
                <InfoTile icon={<CalendarDays size={18} />} label={notOpen ? 'Opens' : 'Opened'}>
                    {formatDateTime(activity.opensAt)}
                </InfoTile>
                <InfoTile icon={<CalendarClock size={18} />} label="Due" danger={pastDue && !submission}>
                    {formatDateTime(activity.dueAt)}
                </InfoTile>
            </div>

            {activity.templateFile && (
                <div className={styles.attachment}>
                    <span className={styles.attachIcon}>
                        <FileText size={18} />
                    </span>
                    <div className={styles.attachText}>
                        <span className={styles.attachName}>{activity.templateFile.name}</span>
                        <span className={styles.attachMeta}>
                            Assignment file • {formatDateTime(activity.templateFile.uploadedAt)}
                        </span>
                    </div>
                </div>
            )}

            {mode === 'view' ? (
                <>
                    {(canModify || (pastDue && submission)) && (
                        <div className={styles.actionRow}>
                            {canModify && !submission && (
                                <button type="button" className={styles.btnPrimary} onClick={() => setMode('edit')}>
                                    <Plus size={16} /> Add submission
                                </button>
                            )}
                            {canModify && submission && (
                                <>
                                    <button type="button" className={styles.btnPrimary} onClick={() => setMode('edit')}>
                                        <Pencil size={16} /> Edit submission
                                    </button>
                                    <button type="button" className={styles.btnDanger} onClick={handleRemove}>
                                        <Trash2 size={16} /> Remove
                                    </button>
                                </>
                            )}
                            {pastDue && submission && (
                                <p className={styles.notice}>
                                    <Lock size={15} /> The deadline has passed, your submission is locked.
                                </p>
                            )}
                        </div>
                    )}

                    <div className={styles.card}>
                        <h4 className={styles.cardTitle}>Submission details</h4>
                        <dl className={styles.statusList}>
                            <div className={styles.statusRow}>
                                <dt>Grading status</dt>
                                <dd>
                                    <span className={`${styles.pill} ${isGraded ? styles.toneSuccess : styles.toneNeutral}`}>
                                        {activity.gradingStatus}
                                    </span>
                                </dd>
                            </div>
                            {submission ? (
                                <>
                                    <div className={styles.statusRow}>
                                        <dt>Last modified</dt>
                                        <dd className={styles.statusText}>{formatDateTime(submission.lastModified)}</dd>
                                    </div>
                                    <div className={styles.statusRow}>
                                        <dt>Submitted file</dt>
                                        <dd>
                                            <span className={styles.fileTag}>
                                                <FileText size={15} />
                                                <span className={styles.fileTagName}>{submission.fileName}</span>
                                            </span>
                                        </dd>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.statusRow}>
                                    <dt>Submitted file</dt>
                                    <dd className={styles.statusText}>—</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </>
            ) : (
                <SubmissionForm
                    hasSubmission={!!submission}
                    onSave={(file) => {
                        onSave(file);
                        setMode('view');
                    }}
                    onCancel={() => setMode('view')}
                />
            )}
        </>
    );
}