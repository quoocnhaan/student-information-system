import { students } from './mockData';

/** Một dòng sinh viên trong bảng (lấy type trực tiếp từ mockData). */
export type StudentRow = (typeof students)[number];

export interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    /** Vị trí (0-based) của đáp án đúng trong `options`. */
    correctIndex: number;
}

export interface AnswerDetail {
    question: QuizQuestion;
    /** Vị trí đáp án sinh viên chọn, hoặc null nếu bỏ trống. */
    selectedIndex: number | null;
    isCorrect: boolean;
}

/** Đã nộp bài = đã có điểm tự động. */
export function isSubmitted(s: StudentRow): boolean {
    return s.autoScore !== null;
}

/** Chuẩn hoá chuỗi để tìm kiếm không phân biệt hoa/thường và dấu tiếng Việt. */
export function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/** Đề Quiz 04 – Module 4: Consensus & Fault Tolerance (10 câu, mỗi câu 1 điểm). */
export const questions: QuizQuestion[] = [
    {
        id: 1,
        text: 'Định lý bất khả thi FLP phát biểu điều gì?',
        options: [
            'Mọi thuật toán đồng thuận đều cần đồng hồ vật lý đồng bộ chính xác',
            'Trong hệ thống bất đồng bộ, không có thuật toán đồng thuận tất định nào đảm bảo kết thúc nếu có thể có một tiến trình hỏng',
            'Paxos luôn kết thúc sau một số bước hữu hạn',
            'Đồng thuận chỉ khả thi khi không có nút nào bị lỗi',
        ],
        correctIndex: 1,
    },
    {
        id: 2,
        text: 'Để chịu được f nút hỏng kiểu crash, Raft/Paxos cần tối thiểu bao nhiêu nút?',
        options: ['f + 1', '2f', '2f + 1', '3f + 1'],
        correctIndex: 2,
    },
    {
        id: 3,
        text: 'Để chịu được f nút lỗi Byzantine, hệ thống cần tối thiểu bao nhiêu nút?',
        options: ['2f + 1', '3f', '4f', '3f + 1'],
        correctIndex: 3,
    },
    {
        id: 4,
        text: 'Trong Raft, một ứng viên (candidate) trở thành leader khi nào?',
        options: [
            'Khi nhận được phiếu bầu từ đa số các nút trong cụm',
            'Khi có log dài nhất trong cụm, không cần bỏ phiếu',
            'Khi nhận được phiếu bầu từ tất cả các nút',
            'Khi nó là nút có địa chỉ IP nhỏ nhất',
        ],
        correctIndex: 0,
    },
    {
        id: 5,
        text: 'Vai trò của "term" trong Raft là gì?',
        options: [
            'Đếm số lệnh đã được commit',
            'Xác định kích thước tối đa của log',
            'Đặt thời gian chờ cho client',
            'Đóng vai trò đồng hồ logic để phát hiện leader cũ và thông tin lỗi thời',
        ],
        correctIndex: 3,
    },
    {
        id: 6,
        text: 'Hai pha của Paxos cơ bản (single-decree) là gì?',
        options: [
            'Vote request và Commit',
            'Prepare/Promise và Accept/Accepted',
            'Pre-commit và Do-commit',
            'Propose và Rollback',
        ],
        correctIndex: 1,
    },
    {
        id: 7,
        text: 'Heartbeat do leader gửi trong Raft nhằm mục đích gì?',
        options: [
            'Đồng bộ đồng hồ vật lý giữa các nút',
            'Nén log của follower',
            'Duy trì quyền leader và ngăn follower bắt đầu cuộc bầu cử mới',
            'Báo cho client biết cụm đang hoạt động',
        ],
        correctIndex: 2,
    },
    {
        id: 8,
        text: 'Nhược điểm chính của Two-Phase Commit (2PC) là gì?',
        options: [
            'Không đảm bảo tính nguyên tử',
            'Có thể bị chặn (blocking) khi coordinator hỏng sau pha prepare',
            'Cần ít nhất 3f + 1 nút tham gia',
            'Không thể dùng với cơ sở dữ liệu quan hệ',
        ],
        correctIndex: 1,
    },
    {
        id: 9,
        text: 'Vì sao hai quorum đa số luôn đảm bảo an toàn cho đồng thuận?',
        options: [
            'Vì mọi nút trong quorum đều có cùng log',
            'Vì quorum đa số luôn chứa leader',
            'Vì giao của hai quorum đa số luôn khác rỗng',
            'Vì quorum đa số không bao giờ chứa nút lỗi',
        ],
        correctIndex: 2,
    },
    {
        id: 10,
        text: 'Điểm khác biệt chính giữa lỗi crash và lỗi Byzantine là gì?',
        options: [
            'Nút lỗi Byzantine có thể gửi thông tin sai hoặc mâu thuẫn, còn nút crash chỉ dừng hoạt động',
            'Lỗi crash khó phát hiện hơn lỗi Byzantine',
            'Lỗi Byzantine chỉ xảy ra ở tầng mạng',
            'Hai loại lỗi này không có khác biệt về mô hình',
        ],
        correctIndex: 0,
    },
];

/** Hash chuỗi -> số nguyên không âm, dùng làm seed cố định cho dữ liệu mẫu. */
function hashSeed(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Bộ sinh số giả ngẫu nhiên cố định (mulberry32). */
function rng(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * DỮ LIỆU MẪU: sinh đáp án của sinh viên sao cho khớp với điểm tự động
 * (số câu đúng = điểm làm tròn). Cùng một MSSV luôn cho cùng kết quả.
 * Khi có API thật, thay hàm này bằng lời gọi lấy bài làm của sinh viên.
 */
export function getStudentAnswers(studentId: string, score: number): AnswerDetail[] {
    const total = questions.length;
    const correctCount = Math.max(0, Math.min(total, Math.round(score)));
    const rand = rng(hashSeed(studentId));

    // Chọn ngẫu nhiên (cố định) những câu bị sai.
    const order = questions.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    const wrong = new Set(order.slice(0, total - correctCount));

    return questions.map((question, i) => {
        if (!wrong.has(i)) {
            return { question, selectedIndex: question.correctIndex, isCorrect: true };
        }
        const wrongChoices = question.options
            .map((_, idx) => idx)
            .filter((idx) => idx !== question.correctIndex);
        const selectedIndex = wrongChoices[Math.floor(rand() * wrongChoices.length)];
        return { question, selectedIndex, isCorrect: false };
    });
}