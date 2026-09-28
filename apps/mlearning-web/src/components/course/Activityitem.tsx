import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    ChevronDown,
    ClipboardCheck,
    FileQuestion,
    Folder,
    FileText,
    Download,
    UploadCloud,
    Plus,
    Pencil,
    Trash2,
    Play,
    CalendarDays,
    CalendarClock,
    Repeat,
    Timer,
    Lock,
    X,
    Check,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import styles from './Activityitem.module.css';
import type {
    Activity,
    AssignmentActivity,
    AssignmentSubmission,
    QuizActivity,
    ResourceActivity,
} from './Activitytypes';
import { formatDateTime, formatDuration } from './Activityutils';

const MAX_FILE_MB = 250;

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

// Mỗi tone set sẵn 3 biến CSS (--tone-bg / --tone-fg / --tone-bd) dùng chung cho badge, pill, banner.
const toneClass: Record<Tone, string> = {
    success: styles.toneSuccess,
    warning: styles.toneWarning,
    danger: styles.toneDanger,
    neutral: styles.toneNeutral,
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    activity: Activity;
    defaultOpen?: boolean;
    /** Bấm "Attempt quiz now" -> điều hướng sang trang làm quiz. */
    onStartQuiz?: (quizId: string) => void;
    /** Bấm Save changes ở form nộp bài (gọi API upload ở đây). */
    onSaveSubmission?: (assignmentId: string, file: File) => void;
    onRemoveSubmission?: (assignmentId: string) => void;
}

export default function ActivityItem({
    activity,
    defaultOpen = false,
    onStartQuiz,
    onSaveSubmission,
    onRemoveSubmission,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    // "now" cập nhật mỗi 30s để nút làm quiz / nộp bài tự bật-tắt đúng giờ.
    const [now, setNow] = useState(() => Date.now());
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(
        activity.type === 'assignment' ? activity.submission : null
    );

    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(t);
    }, []);

    const panelId = `activity-panel-${activity.id}`;
    const header = getHeader(activity, submission, now);

    const handleSave = (file: File) => {
        const stamp = new Date().toISOString();
        setSubmission({ fileName: file.name, submittedAt: stamp, lastModified: stamp });
        onSaveSubmission?.(activity.id, file);
    };

    const handleRemove = () => {
        setSubmission(null);
        onRemoveSubmission?.(activity.id);
    };

    return (
        <article className={`${styles.item} ${open ? styles.itemOpen : ''}`}>
            <div className={styles.head}>
                <div className={styles.headMain}>
                    <div className={`${styles.icon} ${header.tone === 'success' ? styles.iconSuccess : ''}`}>{header.icon}</div>
                    <div className={styles.details}>
                        <div className={styles.meta}>
                            <span className={`${styles.badge} ${toneClass[header.tone]}`}>{header.badge}</span>
                            {header.metaText && <span className={styles.metaText}>{header.metaText}</span>}
                        </div>
                        <h3 className={styles.title}>{activity.title}</h3>
                        {activity.description && <p className={styles.desc}>{activity.description}</p>}
                    </div>
                </div>

                {/* Nút DUY NHẤT trên card: mở/đóng dropdown */}
                <button
                    type="button"
                    className={styles.toggleBtn}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? 'Hide details' : header.buttonLabel}
                    <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
                </button>
            </div>

            <div id={panelId} className={`${styles.panelWrap} ${open ? styles.panelWrapOpen : ''}`}>
                <div className={styles.panelInner}>
                    <div className={styles.panelBody}>
                        {activity.type === 'assignment' && (
                            <AssignmentPanel
                                activity={activity}
                                submission={submission}
                                now={now}
                                onSave={handleSave}
                                onRemove={handleRemove}
                            />
                        )}
                        {activity.type === 'quiz' && (
                            <QuizPanel activity={activity} now={now} onStart={() => onStartQuiz?.(activity.id)} />
                        )}
                        {activity.type === 'resource' && <ResourcePanel activity={activity} />}
                    </div>
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/* Header info (icon, badge, meta text, toggle label) theo từng loại    */
/* ------------------------------------------------------------------ */

function getHeader(
    activity: Activity,
    submission: AssignmentSubmission | null,
    now: number
): { icon: ReactNode; badge: string; tone: Tone; metaText: string; buttonLabel: string } {
    if (activity.type === 'assignment') {
        const opens = new Date(activity.opensAt).getTime();
        const due = new Date(activity.dueAt).getTime();
        let badge = 'Not submitted';
        let tone: Tone = 'warning';
        if (submission) {
            badge = 'Submitted';
            tone = 'success';
        } else if (now < opens) {
            badge = 'Not open yet';
            tone = 'neutral';
        } else if (now > due) {
            badge = 'Overdue';
            tone = 'danger';
        }
        return {
            icon: <ClipboardCheck size={22} />,
            badge,
            tone,
            metaText: `Due ${formatDateTime(activity.dueAt)}`,
            buttonLabel: 'View assignment',
        };
    }

    if (activity.type === 'quiz') {
        const inWindow = now >= new Date(activity.opensAt).getTime() && now <= new Date(activity.closesAt).getTime();
        const usedUp = activity.attemptsUsed >= activity.attemptsAllowed;
        let badge = 'Not available';
        let tone: Tone = 'neutral';
        if (usedUp) {
            badge = 'Completed';
            tone = 'success';
        } else if (inWindow) {
            badge = 'Available now';
            tone = 'success';
        }
        return {
            icon: <FileQuestion size={22} />,
            badge,
            tone,
            metaText: `${activity.timeLimitMins} mins • Closes ${formatDateTime(activity.closesAt)}`,
            buttonLabel: 'View quiz',
        };
    }

    return {
        icon: <Folder size={22} />,
        badge: `${activity.files.length} files`,
        tone: 'neutral',
        metaText: '',
        buttonLabel: 'View files',
    };
}

/* ------------------------------------------------------------------ */
/* Banner trạng thái dùng chung (assignment + quiz)                     */
/* ------------------------------------------------------------------ */

function StatusBanner({
    tone,
    icon,
    title,
    subtitle,
}: {
    tone: Tone;
    icon: ReactNode;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className={`${styles.banner} ${toneClass[tone]}`}>
            <span className={styles.bannerIcon}>{icon}</span>
            <div className={styles.bannerText}>
                <span className={styles.bannerTitle}>{title}</span>
                {subtitle && <span className={styles.bannerSub}>{subtitle}</span>}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Assignment dropdown                                                  */
/* ------------------------------------------------------------------ */

interface AssignmentPanelProps {
    activity: AssignmentActivity;
    submission: AssignmentSubmission | null;
    now: number;
    onSave: (file: File) => void;
    onRemove: () => void;
}

type StepState = 'done' | 'current' | 'pending' | 'failed';

function AssignmentPanel({ activity, submission, now, onSave, onRemove }: AssignmentPanelProps) {
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
        {
            label: 'Submitted',
            state: submission ? 'done' : notOpen ? 'pending' : pastDue ? 'failed' : 'current',
        },
        { label: 'Graded', state: isGraded ? 'done' : 'pending' },
    ];

    const stepClass: Record<StepState, string> = {
        done: styles.stepDone,
        current: styles.stepCurrent,
        pending: '',
        failed: styles.stepFailed,
    };

    const pickFile = (file?: File) => {
        if (!file) return;
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setError(`File is larger than ${MAX_FILE_MB} MB.`);
            return;
        }
        setError('');
        setPendingFile(file);
    };

    const closeForm = () => {
        setMode('view');
        setPendingFile(null);
        setError('');
        setDragOver(false);
    };

    const handleSave = () => {
        if (!pendingFile) return;
        onSave(pendingFile);
        closeForm();
    };

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
                            {s.state === 'done' ? <Check size={14} strokeWidth={3} /> : s.state === 'failed' ? <X size={14} strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={styles.stepLabel}>{s.label}</span>
                    </li>
                ))}
            </ol>

            {/* Thời gian mở / hạn nộp */}
            <div className={styles.infoGrid}>
                <div className={styles.infoTile}>
                    <span className={styles.tileIcon}>
                        <CalendarDays size={18} />
                    </span>
                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>{notOpen ? 'Opens' : 'Opened'}</span>
                        <span className={styles.tileValue}>{formatDateTime(activity.opensAt)}</span>
                    </div>
                </div>
                <div className={`${styles.infoTile} ${pastDue && !submission ? styles.tileDanger : ''}`}>
                    <span className={styles.tileIcon}>
                        <CalendarClock size={18} />
                    </span>
                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>Due</span>
                        <span className={styles.tileValue}>{formatDateTime(activity.dueAt)}</span>
                    </div>
                </div>
            </div>

            {activity.templateFile && (
                <div className={styles.attachment}>
                    <span className={styles.attachIcon}>
                        <FileText size={18} />
                    </span>
                    <div className={styles.attachText}>
                        <span className={styles.attachName}>{activity.templateFile.name}</span>
                        <span className={styles.attachMeta}>Assignment file • {formatDateTime(activity.templateFile.uploadedAt)}</span>
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
                /* Form Add / Edit submission */
                <div className={`${styles.card} ${styles.form}`}>
                    <div>
                        <h4 className={styles.cardTitle}>{submission ? 'Replace your submission' : 'Upload your submission'}</h4>
                        <p className={styles.formSub}>
                            1 file, up to {MAX_FILE_MB} MB. You can edit it again until the deadline.
                        </p>
                    </div>

                    <div
                        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                inputRef.current?.click();
                            }
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            pickFile(e.dataTransfer.files?.[0]);
                        }}
                    >
                        <span className={styles.dropIcon}>
                            <UploadCloud size={26} />
                        </span>
                        <span className={styles.dropTitle}>Drag &amp; drop your file here</span>
                        <span className={styles.dropHint}>
                            or <u>click to browse</u> from your computer
                        </span>
                        <input
                            ref={inputRef}
                            type="file"
                            hidden
                            onChange={(e) => {
                                pickFile(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />
                    </div>

                    {pendingFile && (
                        <div className={styles.fileChip}>
                            <span className={styles.attachIcon}>
                                <FileText size={18} />
                            </span>
                            <div className={styles.attachText}>
                                <span className={styles.attachName}>{pendingFile.name}</span>
                                <span className={styles.attachMeta}>{formatFileSize(pendingFile.size)} • ready to upload</span>
                            </div>
                            <button type="button" className={styles.chipRemove} onClick={() => setPendingFile(null)} aria-label="Remove selected file">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.formActions}>
                        <button type="button" className={styles.btnSecondary} onClick={closeForm}>
                            Cancel
                        </button>
                        <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={!pendingFile}>
                            Save changes
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Quiz dropdown                                                        */
/* ------------------------------------------------------------------ */

interface QuizPanelProps {
    activity: QuizActivity;
    now: number;
    onStart: () => void;
}

function QuizPanel({ activity, now, onStart }: QuizPanelProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const opens = new Date(activity.opensAt).getTime();
    const closes = new Date(activity.closesAt).getTime();

    const inWindow =
        now >= opens &&
        now <= closes;

    const attemptsLeft =
        activity.attemptsAllowed -
        activity.attemptsUsed;

    const canStart =
        inWindow &&
        attemptsLeft > 0;

    const banner = ((): {
        tone: Tone;
        icon: ReactNode;
        title: string;
        subtitle: string;
    } => {
        if (now < opens) {
            return {
                tone: 'neutral',
                icon: <Lock size={20} />,
                title: 'This quiz is currently not available.',
                subtitle: `Opens in ${formatDuration(opens - now)}`,
            };
        }

        if (now > closes) {
            return {
                tone: 'neutral',
                icon: <Lock size={20} />,
                title: 'This quiz is currently not available.',
                subtitle: `Closed on ${formatDateTime(activity.closesAt)}`,
            };
        }

        if (attemptsLeft <= 0) {
            return {
                tone: 'success',
                icon: <CheckCircle2 size={22} />,
                title: 'You have used all of your attempts.',
                subtitle: 'Nothing more to do for this quiz.',
            };
        }

        const left = closes - now;

        return {
            tone: left < 3_600_000
                ? 'warning'
                : 'success',

            icon: <Clock size={20} />,
            title: 'Quiz is open',
            subtitle: `Closes in ${formatDuration(left)}`,
        };
    })();

    return (
        <>
            <StatusBanner {...banner} />

            <div className={styles.statGrid}>

                {/* Opens */}
                <div className={styles.infoTile}>
                    <span className={styles.tileIcon}>
                        <CalendarDays size={18} />
                    </span>

                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>
                            Opens
                        </span>

                        <span className={styles.tileValue}>
                            {formatDateTime(activity.opensAt)}
                        </span>
                    </div>
                </div>

                {/* Closes */}
                <div className={styles.infoTile}>
                    <span className={styles.tileIcon}>
                        <CalendarClock size={18} />
                    </span>

                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>
                            Closes
                        </span>

                        <span className={styles.tileValue}>
                            {formatDateTime(activity.closesAt)}
                        </span>
                    </div>
                </div>

                {/* Attempts */}
                <div className={styles.infoTile}>
                    <span className={styles.tileIcon}>
                        <Repeat size={18} />
                    </span>

                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>
                            Attempts
                        </span>

                        <span className={styles.tileValue}>
                            {activity.attemptsUsed} /{' '}
                            {activity.attemptsAllowed} used

                            <span
                                className={styles.dots}
                                aria-hidden="true"
                            >
                                {Array.from({
                                    length: Math.min(
                                        activity.attemptsAllowed,
                                        8
                                    ),
                                }).map((_, i) => (
                                    <i
                                        key={i}
                                        className={
                                            i < activity.attemptsUsed
                                                ? styles.dotUsed
                                                : styles.dot
                                        }
                                    />
                                ))}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Time */}
                <div className={styles.infoTile}>
                    <span className={styles.tileIcon}>
                        <Timer size={18} />
                    </span>

                    <div className={styles.tileText}>
                        <span className={styles.tileLabel}>
                            Time limit
                        </span>

                        <span className={styles.tileValue}>
                            {activity.timeLimitMins} minutes
                        </span>
                    </div>
                </div>
            </div>

            {/* START QUIZ */}
            {canStart && (
                <div className={styles.quizCta}>

                    <p className={styles.quizCtaText}>
                        <strong>Ready when you are.</strong>{' '}
                        The {activity.timeLimitMins}-minute timer
                        starts as soon as you begin.
                    </p>

                    <button
                        type="button"
                        className={`${styles.btnPrimary} ${styles.btnLarge}`}
                        onClick={() => setShowConfirm(true)}
                    >
                        <Play
                            size={16}
                            fill="currentColor"
                        />

                        Attempt quiz now
                    </button>
                </div>
            )}

            {/* CONFIRM MODAL */}
            {showConfirm && (
                <div
                    className={styles.quizModalOverlay}
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className={styles.quizModal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.quizModalIcon}>
                            <Play
                                size={24}
                                fill="currentColor"
                            />
                        </div>

                        <h2 className={styles.quizModalTitle}>
                            Start Quiz?
                        </h2>

                        <p className={styles.quizModalDescription}>
                            Please review the quiz information
                            before starting.
                        </p>

                        <div className={styles.quizModalInfo}>

                            <div className={styles.quizModalInfoItem}>
                                <div className={styles.quizModalInfoIcon}>
                                    <Timer size={20} />
                                </div>

                                <div>
                                    <span>
                                        Time limit
                                    </span>

                                    <strong>
                                        {activity.timeLimitMins} minutes
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.quizModalInfoItem}>
                                <div className={styles.quizModalInfoIcon}>
                                    <FileQuestion size={20} />
                                </div>

                                <div>
                                    <span>
                                        Questions
                                    </span>

                                    <strong>
                                        {activity.questionCount} questions
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.quizModalInfoItem}>
                                <div className={styles.quizModalInfoIcon}>
                                    <Repeat size={20} />
                                </div>

                                <div>
                                    <span>
                                        Attempts remaining
                                    </span>

                                    <strong>
                                        {attemptsLeft}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className={styles.quizModalNotice}>
                            <Clock size={17} />

                            <span>
                                The timer will start immediately
                                after you begin the quiz.
                            </span>
                        </div>

                        <div className={styles.quizModalActions}>

                            <button
                                type="button"
                                className={styles.quizCancelBtn}
                                onClick={() =>
                                    setShowConfirm(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className={styles.quizStartBtn}
                                onClick={() => {
                                    setShowConfirm(false);
                                    onStart();
                                }}
                            >
                                <Play
                                    size={17}
                                    fill="currentColor"
                                />

                                Start Quiz
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Resource (folder) dropdown                                           */
/* ------------------------------------------------------------------ */

function ResourcePanel({ activity }: { activity: ResourceActivity }) {
    return (
        <div className={styles.card}>
            <div className={styles.resourceTop}>
                <h4 className={styles.cardTitle}>Files ({activity.files.length})</h4>
                <a className={styles.btnPrimary} href={activity.folderUrl ?? '#'} download>
                    <Download size={16} /> Download folder
                </a>
            </div>
            <ul className={styles.fileList}>
                {activity.files.map((f) => (
                    <li key={f.name}>
                        <a className={styles.fileLink} href={f.url ?? '#'} download>
                            <span className={styles.attachIcon}>
                                <FileText size={16} />
                            </span>
                            <span className={styles.fileLinkName}>{f.name}</span>
                            <Download size={15} className={styles.fileLinkDl} />
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}