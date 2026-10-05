export function formatDateKey(date: Date) {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export interface CalendarDay {
    date: number;
    currentMonth: boolean;
    dateObject: Date;
}

export function getCalendarDays(
    year: number,
    month: number
): CalendarDay[] {

    // Ngày đầu tiên của tháng
    const firstDay = new Date(
        year,
        month,
        1
    );

    // Thứ của ngày đầu tháng
    // JavaScript:
    // Sunday = 0
    // Monday = 1
    // ...
    const jsDay = firstDay.getDay();

    // Calendar của bạn bắt đầu MONDAY
    const startOffset =
        jsDay === 0
            ? 6
            : jsDay - 1;

    // Tổng số ngày trong tháng
    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const days: CalendarDay[] = [];

    // =========================
    // NGÀY THÁNG TRƯỚC
    // =========================

    const previousMonthDays = new Date(
        year,
        month,
        0
    ).getDate();

    for (
        let i = startOffset - 1;
        i >= 0;
        i--
    ) {
        const date = previousMonthDays - i;

        days.push({
            date,
            currentMonth: false,

            dateObject: new Date(
                year,
                month - 1,
                date
            ),
        });
    }

    // =========================
    // NGÀY THÁNG HIỆN TẠI
    // =========================

    for (
        let date = 1;
        date <= daysInMonth;
        date++
    ) {
        days.push({
            date,
            currentMonth: true,

            dateObject: new Date(
                year,
                month,
                date
            ),
        });
    }

    // =========================
    // NGÀY THÁNG SAU
    // =========================

    let nextDate = 1;

    while (days.length < 42) {

        days.push({
            date: nextDate,
            currentMonth: false,

            dateObject: new Date(
                year,
                month + 1,
                nextDate
            ),
        });

        nextDate++;
    }

    return days;
}
export const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};

// Tuần bắt đầu từ Thứ 2
export const startOfWeek = (d: Date) => {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
    return r;
};

export const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);