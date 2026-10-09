import type { ActivityCardProps } from "./ActivityCard";
import type { QuizFormValues } from "./Quizform";

/** Định dạng datetime-local thành "dd/mm hh:mm" */
function formatDateTime(value: string): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month} ${hours}:${minutes}`;
}

/**
 * Chuyển dữ liệu QuizForm thành ActivityCardProps.
 */
export function quizFormToActivityCard(
    values: QuizFormValues
): ActivityCardProps {
    const questionCount = values.questions.length;

    const scheduleText =
        values.opensAt && values.closesAt
            ? `Mở từ: ${formatDateTime(values.opensAt)} đến ${formatDateTime(values.closesAt)}`
            : values.opensAt
                ? `Mở từ: ${formatDateTime(values.opensAt)}`
                : "Chưa đặt lịch mở";

    return {
        type: "quiz",

        statusLabel: "QUIZ MỚI TẠO",

        title: values.title,

        description:
            `Thời lượng: ${values.timeLimitMins} phút · ` +
            `${questionCount} câu hỏi · ` +
            `Điểm tối đa: ${values.maxScore}`,

        footer: scheduleText,

        primaryActionLabel: "Xem bảng đề & kết quả Quiz",

        secondaryActionLabel: "Ngân hàng câu hỏi",

        extraNote: JSON.stringify({
            opensAt: values.opensAt || null,
            closesAt: values.closesAt || null,
            timeLimitMins: values.timeLimitMins,
            maxScore: values.maxScore,
            questionCount,
            questions: values.questions,
        }),
    };
}