import type { ActivityCardProps } from "./ActivityCard";
import type { Activity } from "./Activitytypes";

const DAY = 24 * 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const makeId = () => `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Parse JSON stored in extraNote, return {} on failure */
function parseExtra(raw?: string): Record<string, unknown> {
    if (!raw) return {};
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

export function toActivity(card: ActivityCardProps): Activity {
    const base = {
        id: makeId(),
        title: card.title,
        description: card.description ?? "",
    };

    if (card.type === "assignment") {
        const extra = parseExtra(card.extraNote);
        const opensAt = typeof extra.opensAt === "string" && extra.opensAt
            ? new Date(extra.opensAt).toISOString()
            : iso(0);
        const dueAt = typeof extra.dueAt === "string" && extra.dueAt
            ? new Date(extra.dueAt).toISOString()
            : iso(7 * DAY);
        const fileNames = Array.isArray(extra.fileNames) ? (extra.fileNames as string[]) : [];
        return {
            ...base,
            type: "assignment",
            opensAt,
            dueAt,
            templateFiles: fileNames.length > 0
                ? fileNames.map((name) => ({ name, uploadedAt: new Date().toISOString() }))
                : undefined,
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
    const extra = parseExtra(card.extraNote);
    const fileNames = Array.isArray(extra.fileNames) ? (extra.fileNames as string[]) : [];
    return {
        ...base,
        type: "resource",
        files: fileNames.map((name) => ({ name })),
    };
}