// activityUtils.ts

/** "Thursday, 24 September 2026, 7:00 AM" */
export function formatDateTime(value: string | number | Date): string {
    const d = new Date(value);
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${weekday}, ${date}, ${time}`;
}

/** 4500000 -> "1 hour" | 52 ngày 7 giờ -> "52 days 7 hours" */
export function formatDuration(ms: number): string {
    const totalMins = Math.max(0, Math.floor(ms / 60000));
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;

    const parts: string[] = [];
    if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (!days && mins) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);

    return parts.join(' ') || 'less than a minute';
}