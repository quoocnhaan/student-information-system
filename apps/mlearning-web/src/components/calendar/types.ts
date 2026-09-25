// Shared types used across the Academic Calendar & Schedule UI

export type EventCategory =
  | 'lecture'
  | 'deadline'
  | 'exam'
  | 'office-hours'
  | 'seminar'
  | 'institutional';

export interface CalendarEvent {
  id: string;
  title: string;
  time: string; // display string, e.g. "10:00a - 11:30a"
  category: EventCategory;
}

export interface DayCell {
  date: number;
  currentMonth: boolean;
  isToday?: boolean;
  events: CalendarEvent[];
}

export interface ScheduleItem {
  id: string;
  courseCode: string;
  time: string;
  title: string;
  location: string;
  category: EventCategory;
  actions: { label: string; primary?: boolean }[];
  note?: string; // used for assignment deadline warning text
}

export interface DeadlineItem {
  id: string;
  title: string;
  subtitle: string;
  dueLabel: string;
  urgent?: boolean;
}
