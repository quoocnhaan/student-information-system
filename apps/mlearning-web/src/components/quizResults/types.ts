// Shared types for the Quiz Results & Grade Detail dashboard

export interface HistogramBucket {
  range: string;
  count: number;
  colorKey: 'danger' | 'histpink' | 'histlav' | 'brand' | 'success';
}

export type BadgeTone = 'success' | 'warn' | 'danger' | 'neutral';

export interface StudentRow {
  id: string; // MSSV
  name: string;
  submittedAt: string;
  duration: string;
  attemptsNote: string;
  autoScore: number | null; // out of 10
  integrityScore: number | null; // out of 13
  integrityBadge: { label: string; tone: BadgeTone };
  lecturerAction: string;
}

export interface StatsData {
  submissionRate: { percent: number; submitted: number; total: number };
  averageScore: { value: number; max: number; min: number; median: number };
  averageTime: { value: string; fastest: string; slowest: string };
  hardestQuestion: { label: string; correctRate: number; link: string };
}
