import QuizTopBar from '../components/quiz/QuizTopBar';
import ProgressBar from '../components/quiz/ProgressBar';
import QuestionCard from '../components/quiz/QuestionCard';
import CitationNote from '../components/quiz/CitationNote';
import QuestionNavigator from '../components/quiz/QuestionNavigator';
import IntegrityStatus from '../components/quiz/IntegrityStatus';
import SubmitPanel from '../components/quiz/SubmitPanel';
import { questionData, navigatorState } from '../components/quiz/mockData';
import styles from './QuizTakingPage.module.css';

/**
 * Quiz Taking page — single question view with navigator sidebar.
 * Static UI only — wire `mockData.ts` up to real quiz state/API as needed.
 */
export function QuizTakingPage() {
  const percentComplete = Math.round((navigatorState.answeredCount / navigatorState.totalQuestions) * 100);

  return (
    <div className={styles.page}>
      <QuizTopBar />
      <ProgressBar
        currentQuestion={questionData.number}
        total={questionData.totalQuestions}
        isCurrentAnswered={questionData.selectedOptionId !== null}
        percentComplete={percentComplete}
      />

      <div className={styles.content}>
        <main className={styles.main}>
          <QuestionCard question={questionData} />
          <CitationNote citation={questionData.citation} />
        </main>

        <aside className={styles.sidebar}>
          <QuestionNavigator data={navigatorState} />
          <IntegrityStatus courseCode="CS 408" warningsRemaining={1} />
          <SubmitPanel unanswered={navigatorState.unansweredCount} flagged={navigatorState.flaggedCount} />
        </aside>
      </div>
    </div>
  );
}
