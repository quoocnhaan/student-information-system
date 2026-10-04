import type { ReactNode } from 'react';
import { ClipboardCheck, FileQuestion, Folder } from 'lucide-react';
import type { Activity, AssignmentSubmission } from './Activitytypes';
import { formatDateTime } from './Activityutils';
import type { Tone } from './activityShared';

export interface ActivityHeader {
    icon: ReactNode;
    badge: string;
    tone: Tone;
    metaText: string;
    buttonLabel: string;
}

export function getActivityHeader(
    activity: Activity,
    submission: AssignmentSubmission | null,
    now: number
): ActivityHeader {
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
        const inWindow =
            now >= new Date(activity.opensAt).getTime() && now <= new Date(activity.closesAt).getTime();
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