import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import {
    Folder,
    Plus,
    Pencil,
    Trash2,
    FolderOpen,
    ArrowLeft,
    X,
} from 'lucide-react';
import styles from './Questionbank.module.css';
import QuestionForm, {
    type QuestionFormValues,
    type QuestionItem,
} from './Questionform';

interface QuestionBankItem {
    id: string;
    name: string;
    description?: string;
    topic?: string;
    questionCount: number;
    updatedAt: string;
    questions: QuestionItem[];
}

const mockBanks: QuestionBankItem[] = [
    {
        id: '1',
        name: 'Chương 1 – Hệ phân tán',
        description: 'Các khái niệm cơ bản về hệ phân tán',
        topic: 'Hệ phân tán',
        questionCount: 2,
        updatedAt: 'Cập nhật 2 ngày trước',
        questions: [],
    },
    {
        id: '2',
        name: 'Chương 2 – Kiến trúc hệ thống',
        description: 'Kiến trúc client-server và p2p',
        topic: 'Hệ phân tán',
        questionCount: 0,
        updatedAt: 'Cập nhật hôm qua',
        questions: [],
    },
];

export interface QuizQuestion {
    id: string;
    content: string;
    points: number;
}

interface QuestionBankProps {
    onSelectQuestions?: (questions: QuizQuestion[]) => void;
    onClose?: () => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
    onSelectQuestions,
    onClose,
}) => {
    const [banks, setBanks] = useState<QuestionBankItem[]>(mockBanks);
    const [activeBank, setActiveBank] =
        useState<QuestionBankItem | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBank, setEditingBank] =
        useState<QuestionBankItem | null>(null);

    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingQuestion, setEditingQuestion] =
        useState<QuestionItem | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        topic: '',
    });

    // =========================
    // BỘ CÂU HỎI
    // =========================

    const handleOpenModal = (bank?: QuestionBankItem) => {
        if (bank) {
            setEditingBank(bank);

            setFormData({
                name: bank.name,
                description: bank.description || '',
                topic: bank.topic || '',
            });
        } else {
            setEditingBank(null);

            setFormData({
                name: '',
                description: '',
                topic: '',
            });
        }

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBank(null);

        setFormData({
            name: '',
            description: '',
            topic: '',
        });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) return;

        if (editingBank) {
            const updatedBank: QuestionBankItem = {
                ...editingBank,
                ...formData,
                updatedAt: 'Cập nhật vừa xong',
            };

            setBanks((prev) =>
                prev.map((bank) =>
                    bank.id === editingBank.id
                        ? updatedBank
                        : bank
                )
            );

            if (activeBank?.id === editingBank.id) {
                setActiveBank(updatedBank);
            }
        } else {
            const newBank: QuestionBankItem = {
                id: Date.now().toString(),
                ...formData,
                questionCount: 0,
                updatedAt: 'Cập nhật vừa xong',
                questions: [],
            };

            setBanks((prev) => [...prev, newBank]);
        }

        handleCloseModal();
    };

    const handleDelete = (
        id: string,
        name: string
    ) => {
        if (
            window.confirm(
                `Bạn có chắc chắn muốn xóa bộ câu hỏi "${name}"?`
            )
        ) {
            setBanks((prev) =>
                prev.filter((bank) => bank.id !== id)
            );

            if (activeBank?.id === id) {
                setActiveBank(null);
            }
        }
    };

    // =========================
    // CÂU HỎI
    // =========================

    const handleOpenQuestionForm = (
        question?: QuestionItem
    ) => {
        setEditingQuestion(question ?? null);
        setShowQuestionForm(true);
    };

    const handleCloseQuestionForm = () => {
        setShowQuestionForm(false);
        setEditingQuestion(null);
    };

    const handleAddQuestion = (
        values: QuestionFormValues
    ) => {
        if (!activeBank) return;

        // =========================
        // SỬA CÂU HỎI
        // =========================

        if (editingQuestion) {
            const updatedQuestion: QuestionItem = {
                ...editingQuestion,
                ...values,
            };

            const updatedQuestions =
                activeBank.questions.map((question) =>
                    question.id === editingQuestion.id
                        ? updatedQuestion
                        : question
                );

            const updatedBank: QuestionBankItem = {
                ...activeBank,
                questions: updatedQuestions,
                questionCount: updatedQuestions.length,
                updatedAt: 'Cập nhật vừa xong',
            };

            setBanks((prev) =>
                prev.map((bank) =>
                    bank.id === activeBank.id
                        ? updatedBank
                        : bank
                )
            );

            setActiveBank(updatedBank);
            handleCloseQuestionForm();

            return;
        }

        // =========================
        // THÊM CÂU HỎI
        // =========================

        const newQuestion: QuestionItem = {
            id: `q-${Date.now()}`,
            ...values,
        };

        const updatedBank: QuestionBankItem = {
            ...activeBank,
            questions: [
                ...activeBank.questions,
                newQuestion,
            ],
            questionCount:
                activeBank.questions.length + 1,
            updatedAt: 'Cập nhật vừa xong',
        };

        setBanks((prev) =>
            prev.map((bank) =>
                bank.id === activeBank.id
                    ? updatedBank
                    : bank
            )
        );

        setActiveBank(updatedBank);
        handleCloseQuestionForm();
    };

    const handleDeleteQuestion = (
        questionId: string
    ) => {
        if (!activeBank) return;

        const updatedQuestions =
            activeBank.questions.filter(
                (question) =>
                    question.id !== questionId
            );

        const updatedBank: QuestionBankItem = {
            ...activeBank,
            questions: updatedQuestions,
            questionCount: updatedQuestions.length,
            updatedAt: 'Cập nhật vừa xong',
        };

        setBanks((prev) =>
            prev.map((bank) =>
                bank.id === activeBank.id
                    ? updatedBank
                    : bank
            )
        );

        setActiveBank(updatedBank);
    };

    // =========================
    // CHỌN CÂU HỎI CHO QUIZ
    // =========================

    const handleSelectQuestions = () => {
        if (!onSelectQuestions || !activeBank) return;

        const selectedQuestions: QuizQuestion[] =
            activeBank.questions.map((question) => ({
                id: question.id,
                content: question.content,
                points: question.points,
            }));

        onSelectQuestions(selectedQuestions);
    };

    // =========================
    // MODAL TẠO / SỬA BỘ CÂU HỎI
    // =========================

    const renderBankModal = () => {
        if (!isModalOpen) return null;

        return createPortal(
            <div
                className={styles.modalOverlay}
                onClick={handleCloseModal}
            >
                <div
                    className={styles.modalContent}
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >
                    <div
                        className={styles.modalHeader}
                    >
                        <h3
                            className={
                                styles.modalTitle
                            }
                        >
                            {editingBank
                                ? 'Sửa bộ câu hỏi'
                                : 'Tạo bộ câu hỏi'}
                        </h3>

                        <button
                            type="button"
                            className={
                                styles.closeButton
                            }
                            onClick={
                                handleCloseModal
                            }
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form
                        onSubmit={handleSave}
                        className={styles.modalForm}
                    >
                        <div
                            className={
                                styles.formGroup
                            }
                        >
                            <label
                                className={
                                    styles.label
                                }
                            >
                                Tên bộ câu hỏi *
                            </label>

                            <input
                                type="text"
                                className={
                                    styles.input
                                }
                                value={
                                    formData.name
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target
                                            .value,
                                    })
                                }
                                placeholder="Nhập tên bộ câu hỏi..."
                                required
                                autoFocus
                            />
                        </div>

                        <div
                            className={
                                styles.formGroup
                            }
                        >
                            <label
                                className={
                                    styles.label
                                }
                            >
                                Mô tả
                            </label>

                            <textarea
                                className={
                                    styles.textarea
                                }
                                value={
                                    formData.description
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description:
                                            e.target
                                                .value,
                                    })
                                }
                                placeholder="Mô tả ngắn gọn (tùy chọn)"
                            />
                        </div>

                        <div
                            className={
                                styles.formGroup
                            }
                        >
                            <label
                                className={
                                    styles.label
                                }
                            >
                                Chủ đề
                            </label>

                            <input
                                type="text"
                                className={
                                    styles.input
                                }
                                value={
                                    formData.topic
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        topic: e.target
                                            .value,
                                    })
                                }
                                placeholder="VD: Toán, Lập trình..."
                            />
                        </div>

                        <div
                            className={
                                styles.modalFooter
                            }
                        >
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={
                                    handleCloseModal
                                }
                            >
                                Hủy
                            </Button>

                            <Button
                                type="submit"
                                variant="primary"
                            >
                                {editingBank
                                    ? 'Lưu thay đổi'
                                    : 'Tạo bộ câu hỏi'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        );
    };

    // =========================
    // MODAL THÊM / SỬA CÂU HỎI
    // =========================

    const renderQuestionForm = () => {
        if (!showQuestionForm || !activeBank) {
            return null;
        }

        return createPortal(
            <div
                className={styles.formOverlay}
                onClick={handleCloseQuestionForm}
            >
                <div
                    className={styles.formModal}
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >
                    <div
                        className={
                            styles.formHeader
                        }
                    >
                        <div>
                            <h3>
                                {editingQuestion
                                    ? 'Sửa câu hỏi'
                                    : 'Thêm câu hỏi'}
                            </h3>

                            <p>
                                {editingQuestion
                                    ? `Chỉnh sửa câu hỏi trong: ${activeBank.name}`
                                    : `Thêm vào: ${activeBank.name}`}
                            </p>
                        </div>

                        <button
                            type="button"
                            className={
                                styles.closeButton
                            }
                            onClick={
                                handleCloseQuestionForm
                            }
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div
                        className={
                            styles.formBody
                        }
                    >
                        <QuestionForm
                            initialValues={
                                editingQuestion
                                    ? {
                                        content:
                                            editingQuestion.content,
                                        type:
                                            editingQuestion.type,
                                        options:
                                            editingQuestion.options,
                                        points:
                                            editingQuestion.points,
                                        explanation:
                                            editingQuestion.explanation,
                                    }
                                    : undefined
                            }
                            onSubmit={
                                handleAddQuestion
                            }
                            onCancel={
                                handleCloseQuestionForm
                            }
                        />
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    // =========================
    // CHI TIẾT BỘ CÂU HỎI
    // =========================

    if (activeBank) {
        return (
            <>
                <div
                    className={
                        styles.container
                    }
                >
                    <button
                        type="button"
                        className={
                            styles.backButton
                        }
                        onClick={() => {
                            setActiveBank(null);
                            handleCloseQuestionForm();
                        }}
                    >
                        <ArrowLeft size={16} />
                        Quay lại danh sách
                    </button>

                    <div
                        className={
                            styles.expandedHeader
                        }
                    >
                        <div
                            className={
                                styles.expandedTitleArea
                            }
                        >
                            <h2
                                className={
                                    styles.title
                                }
                            >
                                {activeBank.name}
                            </h2>

                            <p
                                className={
                                    styles.subtitle
                                }
                            >
                                {
                                    activeBank
                                        .questions
                                        .length
                                }{' '}
                                câu hỏi •{' '}
                                {
                                    activeBank.updatedAt
                                }
                            </p>
                        </div>

                        <div
                            className={
                                styles.headerActions
                            }
                        >
                            {onSelectQuestions && (
                                <Button
                                    onClick={
                                        handleSelectQuestions
                                    }
                                    variant="primary"
                                    disabled={
                                        activeBank
                                            .questions
                                            .length ===
                                        0
                                    }
                                >
                                    Chọn câu hỏi vào Quiz
                                </Button>
                            )}

                            <Button
                                iconLeft={
                                    <Plus
                                        size={16}
                                    />
                                }
                                onClick={() =>
                                    handleOpenQuestionForm()
                                }
                            >
                                Thêm câu hỏi
                            </Button>
                        </div>
                    </div>

                    <div
                        className={
                            styles.questionList
                        }
                    >
                        {activeBank.questions
                            .length === 0 ? (
                            <div
                                className={
                                    styles.emptyState
                                }
                            >
                                <p>
                                    Chưa có câu hỏi
                                    nào trong bộ
                                    này.
                                </p>

                                <Button
                                    iconLeft={
                                        <Plus
                                            size={16}
                                        />
                                    }
                                    onClick={() =>
                                        handleOpenQuestionForm()
                                    }
                                >
                                    Thêm câu hỏi đầu
                                    tiên
                                </Button>
                            </div>
                        ) : (
                            <div
                                className={
                                    styles.questions
                                }
                            >
                                {activeBank.questions.map(
                                    (
                                        question,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                question.id
                                            }
                                            className={
                                                styles.questionItem
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.questionContent
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.questionNumber
                                                    }
                                                >
                                                    Câu{' '}
                                                    {index +
                                                        1}
                                                </div>

                                                <div>
                                                    <p
                                                        className={
                                                            styles.questionText
                                                        }
                                                    >
                                                        {
                                                            question.content
                                                        }
                                                    </p>

                                                    <span
                                                        className={
                                                            styles.questionPoints
                                                        }
                                                    >
                                                        {
                                                            question.points
                                                        }{' '}
                                                        điểm
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    styles.questionActions
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.editQuestionButton
                                                    }
                                                    onClick={() =>
                                                        handleOpenQuestionForm(
                                                            question
                                                        )
                                                    }
                                                    title="Sửa câu hỏi"
                                                >
                                                    <Pencil
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={
                                                        styles.deleteQuestionButton
                                                    }
                                                    onClick={() =>
                                                        handleDeleteQuestion(
                                                            question.id
                                                        )
                                                    }
                                                    title="Xóa câu hỏi"
                                                >
                                                    <Trash2
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {renderQuestionForm()}
            </>
        );
    }

    // =========================
    // DANH SÁCH BỘ CÂU HỎI
    // =========================

    return (
        <>
            <div
                className={styles.container}
            >
                <div
                    className={styles.header}
                >
                    <div>
                        <h2
                            className={
                                styles.title
                            }
                        >
                            Ngân hàng câu hỏi
                        </h2>

                        <p
                            className={
                                styles.subtitle
                            }
                        >
                            Quản lý các bộ câu hỏi
                            và câu hỏi của giảng
                            viên
                        </p>
                    </div>

                    <div
                        className={
                            styles.headerActions
                        }
                    >
                        {onClose && (
                            <Button
                                variant="ghost"
                                onClick={onClose}
                            >
                                <X size={16} />
                                Đóng
                            </Button>
                        )}

                        <Button
                            iconLeft={
                                <Plus size={16} />
                            }
                            onClick={() =>
                                handleOpenModal()
                            }
                        >
                            Thêm bộ câu hỏi
                        </Button>
                    </div>
                </div>

                <div
                    className={styles.grid}
                >
                    {banks.map((bank) => (
                        <div
                            key={bank.id}
                            className={
                                styles.card
                            }
                        >
                            <div
                                className={
                                    styles.cardHeader
                                }
                            >
                                <Folder
                                    className={
                                        styles.cardIcon
                                    }
                                    size={24}
                                />

                                <div>
                                    <h3
                                        className={
                                            styles.cardTitle
                                        }
                                    >
                                        {bank.name}
                                    </h3>

                                    <div
                                        className={
                                            styles.cardMeta
                                        }
                                    >
                                        <span>
                                            {
                                                bank
                                                    .questions
                                                    .length
                                            }{' '}
                                            câu hỏi
                                        </span>

                                        <span>
                                            {
                                                bank.updatedAt
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={
                                    styles.cardActions
                                }
                            >
                                <Button
                                    variant="ghost"
                                    iconLeft={
                                        <FolderOpen
                                            size={16}
                                        />
                                    }
                                    onClick={() =>
                                        setActiveBank(
                                            bank
                                        )
                                    }
                                    style={{
                                        flex: 1,
                                        padding:
                                            '0.5rem',
                                    }}
                                >
                                    Mở
                                </Button>

                                <Button
                                    variant="ghost"
                                    iconLeft={
                                        <Pencil
                                            size={16}
                                        />
                                    }
                                    onClick={() =>
                                        handleOpenModal(
                                            bank
                                        )
                                    }
                                    style={{
                                        flex: 1,
                                        padding:
                                            '0.5rem',
                                    }}
                                >
                                    Sửa
                                </Button>

                                <Button
                                    variant="destructive"
                                    iconLeft={
                                        <Trash2
                                            size={16}
                                        />
                                    }
                                    onClick={() =>
                                        handleDelete(
                                            bank.id,
                                            bank.name
                                        )
                                    }
                                    style={{
                                        flex: 1,
                                        padding:
                                            '0.5rem',
                                    }}
                                >
                                    Xóa
                                </Button>
                            </div>
                        </div>
                    ))}

                    {banks.length === 0 && (
                        <div
                            className={
                                styles.emptyState
                            }
                            style={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        >
                            <p>
                                Chưa có bộ câu hỏi
                                nào. Hãy tạo mới!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {renderBankModal()}
        </>
    );
};