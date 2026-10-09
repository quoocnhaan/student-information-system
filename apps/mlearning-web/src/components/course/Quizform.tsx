import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Plus, MoreVertical } from 'lucide-react';
import { QuestionBank, type QuizQuestion } from './Questionbank';
import styles from './QuizForm.module.css';

export interface QuizFormValues {
  title: string;
  description: string;
  opensAt: string;
  closesAt: string;
  timeLimitMins: number;
  maxScore: number;
  questions: QuizQuestion[];
}

interface QuizFormProps {
  initialValues?: QuizFormValues;
  onSubmit: (values: QuizFormValues) => void;
  onCancel: () => void;
}

const defaultValues: QuizFormValues = {
  title: '',
  description: '',
  opensAt: '',
  closesAt: '',
  timeLimitMins: 60,
  maxScore: 10,
  questions: [],
};

export const QuizForm: React.FC<QuizFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<QuizFormValues>(
    initialValues ?? defaultValues
  );

  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const totalPoints = useMemo(() => {
    return formData.questions.reduce((sum, question) => {
      return sum + question.points;
    }, 0);
  }, [formData.questions]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'timeLimitMins' || name === 'maxScore'
          ? Number(value)
          : value,
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((question) => question.id !== id),
    }));

    setActiveMenuId(null);
  };

  const handleAddQuestions = (newQuestions: QuizQuestion[]) => {
    setFormData((prev) => {
      const existingIds = new Set(
        prev.questions.map((question) => question.id)
      );

      const addedQuestions = newQuestions.filter(
        (question) => !existingIds.has(question.id)
      );

      return {
        ...prev,
        questions: [...prev.questions, ...addedQuestions],
      };
    });

    setShowQuestionBank(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Vui lòng nhập tên Quiz');
      return;
    }

    if (
      formData.opensAt &&
      formData.closesAt &&
      new Date(formData.closesAt) < new Date(formData.opensAt)
    ) {
      alert('Hạn nộp không được trước thời gian mở');
      return;
    }

    if (formData.timeLimitMins <= 0) {
      alert('Thời gian làm bài phải lớn hơn 0');
      return;
    }

    if (formData.maxScore <= 0) {
      alert('Điểm tối đa phải lớn hơn 0');
      return;
    }

    onSubmit(formData);
  };

  const toggleMenu = (id: string) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.container}>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Tên Quiz <span className={styles.required}>*</span>
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            placeholder="VD: Problem Set 3 – Raft"
            required
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Mô tả</label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Kiểm tra kiến thức về Consensus..."
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Thời gian mở</label>

            <input
              type="datetime-local"
              name="opensAt"
              value={formData.opensAt}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Hạn nộp</label>

            <input
              type="datetime-local"
              name="closesAt"
              value={formData.closesAt}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Thời gian làm bài (phút)
            </label>

            <input
              type="number"
              name="timeLimitMins"
              value={formData.timeLimitMins}
              onChange={handleChange}
              className={styles.input}
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Điểm tối đa</label>

            <input
              type="number"
              name="maxScore"
              value={formData.maxScore}
              onChange={handleChange}
              className={styles.input}
              min="1"
            />
          </div>
        </div>

        <div className={styles.questionsSection}>
          <div className={styles.questionsHeader}>
            <h3 className={styles.questionsTitle}>CÂU HỎI</h3>

            <Button
              type="button"
              variant="secondary"
              iconLeft={<Plus size={16} />}
              onClick={() => setShowQuestionBank(true)}
            >
              Thêm từ ngân hàng
            </Button>
          </div>

          {formData.questions.length === 0 ? (
            <div className={styles.emptyQuestions}>
              Chưa có câu hỏi nào. Hãy thêm từ ngân hàng câu hỏi.
            </div>
          ) : (
            <div className={styles.questionList}>
              {formData.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={styles.questionItem}
                >
                  <div className={styles.questionIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className={styles.questionContent}>
                    {question.content}
                  </div>

                  <div className={styles.questionPoints}>
                    {question.points} điểm
                  </div>

                  <div className={styles.questionActions}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => toggleMenu(question.id)}
                      aria-label="Tùy chọn câu hỏi"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === question.id && (
                      <div className={styles.actionMenu}>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setActiveMenuId(null);
                          }}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className={`${styles.menuItem} ${styles.deleteMenuItem}`}
                          onClick={() =>
                            handleRemoveQuestion(question.id)
                          }
                        >
                          Xóa khỏi Quiz
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {formData.questions.length > 0 && (
            <div className={styles.totalScore}>
              Tổng: {totalPoints} điểm
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Hủy
          </Button>

          <Button type="submit" variant="primary">
            Tạo Quiz
          </Button>
        </div>
      </form>

      {showQuestionBank && (
        <div
          className={styles.bankOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuestionBank(false);
            }
          }}
        >
          <div className={styles.bankModal}>
            <QuestionBank
              onSelectQuestions={handleAddQuestions}
              onClose={() => setShowQuestionBank(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};