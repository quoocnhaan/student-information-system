import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarClock, CalendarDays, CheckCircle2, Clock, Lock, Play, Repeat, Timer } from 'lucide-react';
import styles from './Activityitem.module.css';
import type { QuizActivity } from './Activitytypes';
import { formatDateTime, formatDuration } from './Activityutils';
import type { Tone } from './activityShared';
import StatusBanner from './StatusBanner';
import InfoTile from './InfoTile';
import QuizStartModal from './QuizStartModal';

interface Props {
    activity: QuizActivity;
    now: number;
    onStart: () => void;
}

export default function QuizPanel({ activity, now, onStart }: Props) {
    const [showConfirm, setShowConfirm] = useState(false);

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

    return (
        <>
            <StatusBanner {...banner} />

            <div className={styles.statGrid}>
                <InfoTile icon={<CalendarDays size={18} />} label="Opens">
                    {formatDateTime(activity.opensAt)}
                </InfoTile>

                <InfoTile icon={<CalendarClock size={18} />} label="Closes">
                    {formatDateTime(activity.closesAt)}
                </InfoTile>

                <InfoTile icon={<Repeat size={18} />} label="Attempts">
                    {activity.attemptsUsed} / {activity.attemptsAllowed} used
                    <span className={styles.dots} aria-hidden="true">
                        {Array.from({ length: Math.min(activity.attemptsAllowed, 8) }).map((_, i) => (
                            <i key={i} className={i < activity.attemptsUsed ? styles.dotUsed : styles.dot} />
                        ))}
                    </span>
                </InfoTile>

                <InfoTile icon={<Timer size={18} />} label="Time limit">
                    {activity.timeLimitMins} minutes
                </InfoTile>
            </div>

            {canStart && (
                <div className={styles.quizCta}>
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
        </>
    );
}