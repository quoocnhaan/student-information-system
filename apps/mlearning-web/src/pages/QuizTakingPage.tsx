import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuizTopBar from '../components/quiz/QuizTopBar';
import ProgressBar from '../components/quiz/ProgressBar';
import QuestionCard from '../components/quiz/QuestionCard';
import CitationNote from '../components/quiz/CitationNote';
import QuestionNavigator from '../components/quiz/QuestionNavigator';
import SubmitPanel from '../components/quiz/SubmitPanel';
import SubmitConfirmDialog from '../components/quiz/Submitconfirmdialog';
import { questions, navigatorState as baseNavigatorState } from '../components/quiz/mockData';
import type { AnswerOption } from '../components/quiz/types';
import styles from './QuizTakingPage.module.css';

type Direction = 'next' | 'prev';
type OptionId = AnswerOption['id'];

const QUIZ_DURATION_SECONDS = 25 * 60 + 29; // 25:29, matches the original static UI

/**
 * Quiz Taking page — single question view with navigator sidebar.
 *
 * Answers and flags are owned HERE (not inside QuestionCard), keyed by
 * question number, so they survive navigating between questions and the
 * QuestionNavigator can reflect them live.
 *
 * Submission happens in two ways, both going through SubmitConfirmDialog:
 *  - manual: "Submit Quiz" on the last question opens the dialog with
 *    "Go back" + "Confirm Submit" (variant="manual")
 *  - timeout: when QuizTopBar's countdown reaches 0, the SAME dialog opens
 *    but locked — no "Go back", not dismissible, only "Confirm Submit"
 *    (variant="timeout")
 */
export function QuizTakingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>('next');

  const [answers, setAnswers] = useState<Record<number, OptionId | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.number, q.selectedOptionId]))
  );
  const [flaggedIds, setFlaggedIds] = useState<number[]>(baseNavigatorState.flaggedIds);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

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
  const percentComplete = Math.round((answeredCount / questions.length) * 100);

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

  const goToIndex = (index: number, dir: Direction) => {
    // Once time is up the quiz is locked — ignore any further navigation.
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
    setFlaggedIds((prev) => (prev.includes(num) ? prev.filter((flagId) => flagId !== num) : [...prev, num]));
  };

  const handleConfirmSubmit = () => {
    // TODO: wire this up to the real submit-quiz API call before navigating away.
    setShowSubmitConfirm(false);
    navigate(`/course/${id}`);
  };

  // Timer ran out: lock the quiz and open the confirm dialog in its
  // non-dismissible, single-button "timeout" variant.
  const handleTimeExpired = () => {
    setIsTimeUp(true);
    setShowSubmitConfirm(true);
  };

  // Shared by the "Submit Quiz" button on the last question AND the
  // "Submit Quiz & Finish" button in the sidebar SubmitPanel.
  const handleOpenSubmitConfirm = () => {
    if (isTimeUp) return;
    setShowSubmitConfirm(true);
  };

  return (
    <div className={styles.page}>
      <QuizTopBar durationSeconds={QUIZ_DURATION_SECONDS} onExpire={handleTimeExpired} />
      <ProgressBar
        currentQuestion={currentQuestion.number}
        total={currentQuestion.totalQuestions}
        isCurrentAnswered={currentAnswer !== null}
        percentComplete={percentComplete}
      />

      <div className={styles.content}>
        <main className={styles.main}>
          {/* key={currentQuestion.number} re-triggers the CSS entrance
              animation on every navigation. Answer state itself is
              controlled via `answers`, independent of this remount. */}
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
            <CitationNote citation={currentQuestion.citation} />
          </div>
        </main>

        <aside className={styles.sidebar}>
          <QuestionNavigator data={navigatorState} onSelect={handleJump} />
          <SubmitPanel
            unanswered={unansweredCount}
            flagged={navigatorState.flaggedCount}
            onSubmit={handleOpenSubmitConfirm}
            disabled={isTimeUp}
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
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}