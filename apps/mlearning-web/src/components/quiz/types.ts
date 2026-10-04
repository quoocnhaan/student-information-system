// Shared types for the Quiz Taking page

/** A piece of inline text; `code` renders it in a monospace pill (e.g. RPC names, field names). */
export interface TextSegment {
  value: string;
  code?: boolean;
}

export type RichText = TextSegment[];

export interface AnswerOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: RichText;
}

export interface QuestionData {
  number: number;
  totalQuestions: number;
  type: string; // e.g. "Single Choice"
  points: number;
  prompt: RichText;
  specTitle: string; // e.g. "FORMAL STATE SPECIFICATION (§5.2 LEADER ELECTION)"
  specLink: string; // e.g. "RFC Consensus Model"
  specLines: string[]; // raw monospace lines of the state-machine spec
  options: AnswerOption[];
  selectedOptionId: AnswerOption['id'] | null;
  citation: string;
}

export interface NavigatorState {
  totalQuestions: number;
  /** Display counts shown in the stat boxes (kept explicit so mock data can match a design 1:1). */
  answeredCount: number;
  flaggedCount: number;
  unansweredCount: number;
  /** Question numbers used to color the grid cells. */
  answeredIds: number[];
  flaggedIds: number[];
  current: number;
  nextUnanswered: number | null;
}
