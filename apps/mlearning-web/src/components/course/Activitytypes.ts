// activityTypes.ts
// Kiểu dữ liệu cho các activity trong trang course (assignment / quiz / resource).
// Ngày giờ dùng chuỗi ISO 8601 (vd: '2026-10-15T09:00:00+07:00').

interface BaseActivity {
    id: string;
    title: string;
    description?: string;
}

export interface AssignmentSubmission {
    fileName: string;
    submittedAt: string;
    lastModified: string;
}

export interface AssignmentActivity extends BaseActivity {
    type: 'assignment';
    opensAt: string;
    dueAt: string;
    /** File đề bài giáo viên đính kèm (hiện trong khung INFO). */
    templateFile?: { name: string; uploadedAt: string };
    /** null = chưa nộp bài. */
    submission: AssignmentSubmission | null;
    gradingStatus: 'Not graded' | 'Graded';
}

export interface QuizActivity extends BaseActivity {
    type: 'quiz';
    opensAt: string;
    closesAt: string;
    attemptsAllowed: number;
    attemptsUsed: number;
    timeLimitMins: number;
    questionCount: number;
}

export interface ResourceFile {
    name: string;
    url?: string;
}

export interface ResourceActivity extends BaseActivity {
    type: 'resource';
    files: ResourceFile[];
    folderUrl?: string;
}

export type Activity = AssignmentActivity | QuizActivity | ResourceActivity;