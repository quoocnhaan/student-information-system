import type { ActivityCardProps } from "./ActivityCard";
import type { QuizFormValues } from "./Quizform";

/** Định dạng chuỗi datetime-local ("2025-11-20T08:00") thành "20/11 08:00" cho dễ đọc */
function formatDateTime(value: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
}

/** Nhãn số lần làm bài hiển thị cho người dùng */
function formatAttempts(attemptsAllowed: string): string {
    return attemptsAllowed === "unlimited" ? "Không giới hạn" : `${attemptsAllowed} lần`;
}

/**
 * quizFormToActivityCard - Chuyển dữ liệu từ QuizForm thành một ActivityCardProps
 * kiểu "quiz" để hiển thị ngay trong danh sách hoạt động của ModuleContent.
 */
export function quizFormToActivityCard(values: QuizFormValues): ActivityCardProps {
    const scheduleText =
        values.openAt && values.closeAt
            ? `Mở từ: ${formatDateTime(values.openAt)} đến ${formatDateTime(values.closeAt)}`
            : values.openAt
                ? `Mở từ: ${formatDateTime(values.openAt)}`
                : "Chưa đặt lịch mở";

    return {
        type: "quiz",
        statusLabel: "QUIZ MỚI TẠO",
        title: values.title,
        description: `Thời lượng: ${values.durationMinutes} phút · ${values.questionCount} câu hỏi · Điểm tối đa: ${values.totalPoints}`,
        footer: `${scheduleText} · Số lần làm bài: ${formatAttempts(values.attemptsAllowed)}`,
        primaryActionLabel: "Xem bảng đề & kết quả Quiz",
        secondaryActionLabel: "Ngân hàng câu hỏi",
    };
}