import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionCard from '../components/quiz/QuestionCard';
import QuestionNavigator from '../components/quiz/QuestionNavigator';
import SubmitConfirmDialog from '../components/quiz/Submitconfirmdialog';
import { questions, navigatorState as baseNavigatorState } from '../components/quiz/mockData';
import type { AnswerOption } from '../components/quiz/types';
import styles from './QuizTakingPage.module.css';

type Direction = 'next' | 'prev';
type OptionId = AnswerOption['id'];

const QUIZ_DURATION_SECONDS = 23 * 60 + 29; // 25:29

export function QuizTakingPage() {
  const navigate = useNavigate();
  const { id, quizId } = useParams<{ id: string; quizId: string }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>('next');

  const [answers, setAnswers] = useState<Record<number, OptionId | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.number, q.selectedOptionId]))
  );
  const [flaggedIds, setFlaggedIds] = useState<number[]>(baseNavigatorState.flaggedIds);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ---------- Timer ----------
  const [endTime] = useState(() => Date.now() + QUIZ_DURATION_SECONDS * 1000);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_DURATION_SECONDS);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    if (isTimeUp) return;

    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setIsTimeUp(true);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, isTimeUp]);

  // Hết giờ -> tự mở dialog nộp bài
  useEffect(() => {
    if (isTimeUp) setShowSubmitConfirm(true);
  }, [isTimeUp]);

  // ---------- Derived state ----------
  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion.number] ?? null;
  const isCurrentFlagged = flaggedIds.includes(currentQuestion.number);

  const answeredIds = Object.entries(answers)
    .filter(([, optionId]) => optionId !== null)
    .map(([questionNumber]) => Number(questionNumber));
  const answeredCount = answeredIds.length;
  const unansweredCount = questions.length - answeredCount;

  const navigatorState = {
    ...baseNavigatorState,
    totalQuestions: questions.length,
    current: currentQuestion.number,
    answeredCount,
    unansweredCount,
    answeredIds,
    flaggedIds,
    flaggedCount: flaggedIds.length,
  };

  // ---------- Handlers ----------
  const goToIndex = (index: number, dir: Direction) => {
    if (isTimeUp) return;
    if (index < 0 || index >= questions.length || index === currentIndex) return;
    setDirection(dir);
    setCurrentIndex(index);
  };

  const handlePrevious = () => goToIndex(currentIndex - 1, 'prev');
  const handleNext = () => goToIndex(currentIndex + 1, 'next');

  const handleJump = (questionNumber: number) => {
    const index = questions.findIndex((q) => q.number === questionNumber);
    if (index === -1) return;
    goToIndex(index, index > currentIndex ? 'next' : 'prev');
  };

  const handleSelectOption = (optionId: OptionId) => {
    if (isTimeUp) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.number]: optionId }));
  };

  const handleClearSelection = () => {
    if (isTimeUp) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.number]: null }));
  };

  const handleToggleFlag = () => {
    if (isTimeUp) return;
    const num = currentQuestion.number;
    setFlaggedIds((prev) =>
      prev.includes(num) ? prev.filter((flagId) => flagId !== num) : [...prev, num]
    );
  };

  const handleConfirmSubmit = () => {
    console.log('submit quiz', quizId, 'of course', id);
    // TODO: gọi API nộp bài với quizId
    setShowSubmitConfirm(false);
    navigate(`/course/${id}`);
  };

  const handleOpenSubmitConfirm = () => {
    if (isTimeUp) return;
    setShowSubmitConfirm(true);
  };

  const handleCancelSubmit = () => {
    // Hết giờ thì không cho đóng dialog, bắt buộc nộp bài
    if (isTimeUp) return;
    setShowSubmitConfirm(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <main className={styles.main}>
          <div
            key={currentQuestion.number}
            className={direction === 'next' ? styles.questionEnterNext : styles.questionEnterPrev}
          >
            <QuestionCard
              question={currentQuestion}
              selectedOptionId={currentAnswer}
              onSelectOption={handleSelectOption}
              onClearSelection={handleClearSelection}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmitClick={handleOpenSubmitConfirm}
              isFirst={isFirst}
              isLast={isLast}
              isFlagged={isCurrentFlagged}
              onToggleFlag={handleToggleFlag}
            />
          </div>
        </main>

        <aside className={styles.sidebar}>
          <QuestionNavigator
            data={navigatorState}
            secondsLeft={secondsLeft}
            onSelect={handleJump}
          />
        </aside>
      </div>

      <SubmitConfirmDialog
        open={showSubmitConfirm}
        variant={isTimeUp ? 'timeout' : 'manual'}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedIds.length}
        onCancel={handleCancelSubmit}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}