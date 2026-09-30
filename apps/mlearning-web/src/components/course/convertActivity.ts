import type { ActivityCardProps } from "./ActivityCard";
import type { Activity } from "./Activitytypes";

const DAY = 24 * 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const makeId = () => `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function toActivity(card: ActivityCardProps): Activity {
    const base = {
        id: makeId(),
        title: card.title,
        description: card.description ?? "",
    };

    if (card.type === "assignment") {
        return {
            ...base,
            type: "assignment",
            opensAt: iso(0),
            dueAt: iso(7 * DAY),
            submission: null,
            gradingStatus: "Not graded",
        };
    }

    if (card.type === "quiz") {
        return {
            ...base,
            type: "quiz",
            opensAt: iso(0),
            closesAt: iso(7 * DAY),
            attemptsAllowed: 1,
            attemptsUsed: 0,
            timeLimitMins: 30,
            questionCount: 0,
        };
    }

    // "document" -> "resource"
    return {
        ...base,
        type: "resource",
        files: [],
    };
}