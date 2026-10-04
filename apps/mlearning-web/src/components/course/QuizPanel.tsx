import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarClock, CalendarDays, CheckCircle2, Clock, Lock, Play, Repeat, Timer, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Activityitem.module.css';
import type { QuizActivity } from './Activitytypes';
import { formatDateTime, formatDuration } from './Activityutils';
import type { Tone } from './activityShared';
import StatusBanner from './StatusBanner';
import InfoTile from './InfoTile';
import QuizStartModal from './QuizStartModal';
import { useIsTeacher } from '../../hooks/useRole';
import QuestionBankModal from './Questionbankmodal';
import type { QuestionFormValues, QuestionItem } from './Questionform';

interface Props {
    activity: QuizActivity;
    now: number;
    onStart: () => void;
}

export default function QuizPanel({ activity: initialActivity, now, onStart }: Props) {
    const isTeacher = useIsTeacher();
    const navigate = useNavigate();
    const [activity, setActivity] = useState(initialActivity);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showQuestionBank, setShowQuestionBank] = useState(false);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);

    // Chế độ chỉnh sửa cho giáo viên
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        opensAt: activity.opensAt.substring(0, 16),
        closesAt: activity.closesAt.substring(0, 16),
        timeLimitMins: activity.timeLimitMins,
        attemptsAllowed: activity.attemptsAllowed,
    });

    const opens = new Date(activity.opensAt).getTime();
    const closes = new Date(activity.closesAt).getTime();
    const inWindow = now >= opens && now <= closes;
    const attemptsLeft = activity.attemptsAllowed - activity.attemptsUsed;
    const canStart = inWindow && attemptsLeft > 0;

    const banner = ((): { tone: Tone; icon: ReactNode; title: string; subtitle: string } => {
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
            tone: left < 3_600_000 ? 'warning' : 'success',
            icon: <Clock size={20} />,
            title: 'Quiz is open',
            subtitle: `Closes in ${formatDuration(left)}`,
        };
    })();

    const handleSave = () => {
        setActivity(prev => ({
            ...prev,
            opensAt: editValues.opensAt + ':00+07:00', // Đơn giản hóa timezone
            closesAt: editValues.closesAt + ':00+07:00',
            timeLimitMins: Number(editValues.timeLimitMins),
            attemptsAllowed: Number(editValues.attemptsAllowed)
        }));
        setIsEditing(false);
    };

    return (
        <>
            <StatusBanner {...banner} />

            <div className={styles.statGrid}>
                <div style={isEditing ? { gridColumn: '1 / -1' } : {}}>
                    <InfoTile icon={<CalendarDays size={18} />} label="Opens">
                        {isEditing ? (
                            <input
                                type="datetime-local"
                                value={editValues.opensAt}
                                onChange={(e) => setEditValues({ ...editValues, opensAt: e.target.value })}
                                className={styles.editInput}
                            />
                        ) : (
                            formatDateTime(activity.opensAt)
                        )}
                    </InfoTile>
                </div>

                <div style={isEditing ? { gridColumn: '1 / -1' } : {}}>
                    <InfoTile icon={<CalendarClock size={18} />} label="Closes">
                        {isEditing ? (
                            <input
                                type="datetime-local"
                                value={editValues.closesAt}
                                onChange={(e) => setEditValues({ ...editValues, closesAt: e.target.value })}
                                className={styles.editInput}
                            />
                        ) : (
                            formatDateTime(activity.closesAt)
                        )}
                    </InfoTile>
                </div>

                <div style={isEditing ? { gridColumn: '1 / -1' } : {}}>
                    <InfoTile icon={<Repeat size={18} />} label="Attempts">
                        {isEditing ? (
                            <input
                                type="number"
                                min="1"
                                value={editValues.attemptsAllowed}
                                onChange={(e) => setEditValues({ ...editValues, attemptsAllowed: Number(e.target.value) })}
                                className={styles.editInput}
                                style={{ width: '80px' }}
                            />
                        ) : (
                            <>
                                {activity.attemptsUsed} / {activity.attemptsAllowed} used
                                <span className={styles.dots} aria-hidden="true">
                                    {Array.from({ length: Math.min(activity.attemptsAllowed, 8) }).map((_, i) => (
                                        <i key={i} className={i < activity.attemptsUsed ? styles.dotUsed : styles.dot} />
                                    ))}
                                </span>
                            </>
                        )}
                    </InfoTile>
                </div>

                <div style={isEditing ? { gridColumn: '1 / -1' } : {}}>
                    <InfoTile icon={<Timer size={18} />} label="Time limit">
                        {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    value={editValues.timeLimitMins}
                                    onChange={(e) =>
                                        setEditValues({ ...editValues, timeLimitMins: Number(e.target.value) })}
                                    className={styles.editInput} style={{ width: '80px' }} />
                                <span style={{ fontSize: '13.5px', color: 'var(--on-surface-variant)' }}>
                                    minutes
                                </span>
                            </div>
                        ) : (
                            `${activity.timeLimitMins} minutes`
                        )}
                    </InfoTile>
                </div>
            </div>

            {isEditing && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={handleSave}
                        className={styles.btnPrimary}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Save size={16} /> Lưu
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={styles.btnSecondary}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <X size={16} /> Hủy
                    </button>
                </div>
            )}

            {!isEditing && (isTeacher || canStart) && (
                <div className={styles.quizCta}>
                    {isTeacher ? (
                        <>
                            <div className={styles.buttonRow}>
                                <button
                                    type="button"
                                    className={`${styles.btnSecondary} ${styles.btnLarge}`}
                                    onClick={() => navigate('/quiz-results')}
                                >
                                    Xem bảng điểm quiz
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.btnPrimary} ${styles.btnLarge}`}
                                    onClick={() => setShowQuestionBank(true)}
                                >
                                    Thêm câu hỏi / đáp án
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className={styles.quizCtaText}>
                                <strong>Ready when you are.</strong> The {activity.timeLimitMins}-minute timer starts as
                                soon as you begin.
                            </p>
                            <button
                                type="button"
                                className={`${styles.btnPrimary} ${styles.btnLarge}`}
                                onClick={() => setShowConfirm(true)}
                            >
                                <Play size={16} fill="currentColor" />
                                Attempt quiz now
                            </button>
                        </>
                    )}
                </div>
            )}

            {showConfirm && (
                <QuizStartModal
                    activity={activity}
                    attemptsLeft={attemptsLeft}
                    onCancel={() => setShowConfirm(false)}
                    onConfirm={() => {
                        setShowConfirm(false);
                        onStart();
                    }}
                />
            )}

            {showQuestionBank && (
                <QuestionBankModal
                    quizTitle={activity.title}
                    questions={questions}
                    onClose={() => setShowQuestionBank(false)}
                    onAddQuestion={(values) => {
                        const newQuestion: QuestionItem = {
                            id: `q-${Date.now()}`,
                            ...values
                        };
                        setQuestions(prev => [...prev, newQuestion]);
                    }}
                />
            )}
        </>
    );
}