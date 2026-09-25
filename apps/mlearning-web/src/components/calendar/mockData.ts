import type { DayCell, ScheduleItem, DeadlineItem } from './types';

// October 2025 month grid (MON-SUN). Replace with real data from your backend/API.
export const octoberDays: DayCell[] = [
  // Week 0 (tail of September)
  { date: 29, currentMonth: false, events: [] },
  { date: 30, currentMonth: false, events: [] },
  { date: 1, currentMonth: true, events: [{ id: 'e1', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' }] },
  { date: 2, currentMonth: true, events: [{ id: 'e2', title: 'CS 409', time: '02:00p - 03:00p', category: 'office-hours' }] },
  { date: 3, currentMonth: true, events: [] },
  { date: 4, currentMonth: true, events: [] },
  { date: 5, currentMonth: true, events: [] },

  // Week 1
  { date: 6, currentMonth: true, events: [{ id: 'e3', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' }] },
  { date: 7, currentMonth: true, events: [{ id: 'e4', title: 'CS 409', time: '02:00p - 03:00p', category: 'office-hours' }] },
  { date: 8, currentMonth: true, events: [] },
  { date: 9, currentMonth: true, events: [{ id: 'e5', title: 'BIO 215', time: '01:00p Quiz', category: 'exam' }] },
  { date: 10, currentMonth: true, events: [] },
  { date: 11, currentMonth: true, events: [] },
  { date: 12, currentMonth: true, events: [] },

  // Week 2
  { date: 13, currentMonth: true, events: [{ id: 'e6', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' }] },
  { date: 14, currentMonth: true, events: [{ id: 'e7', title: 'CS 409', time: '02:00p - 03:00p', category: 'office-hours' }] },
  { date: 15, currentMonth: true, events: [{ id: 'e8', title: 'PSET 2', time: 'Due 11:59p', category: 'deadline' }] },
  { date: 16, currentMonth: true, events: [] },
  { date: 17, currentMonth: true, events: [{ id: 'e9', title: 'Study Grp', time: '05:00p - 07:00p', category: 'seminar' }] },
  { date: 18, currentMonth: true, events: [] },
  { date: 19, currentMonth: true, events: [] },

  // Week 3 (includes today = 22)
  { date: 20, currentMonth: true, events: [{ id: 'e10', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' }] },
  { date: 21, currentMonth: true, events: [{ id: 'e11', title: 'MATH 240', time: '11:00a - 12:00p', category: 'lecture' }] },
  {
    date: 22,
    currentMonth: true,
    isToday: true,
    events: [
      { id: 'e12', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' },
      { id: 'e13', title: 'Code Review', time: '02:00p - 03:00p', category: 'office-hours' },
      { id: 'e14', title: 'PSET 2 Due', time: '11:59p Tonight', category: 'deadline' },
    ],
  },
  { date: 23, currentMonth: true, events: [{ id: 'e15', title: 'BIO 215', time: '10:00a - 12:00p Campus', category: 'exam' }] },
  { date: 24, currentMonth: true, events: [] },
  { date: 25, currentMonth: true, events: [{ id: 'e16', title: 'Office Hrs', time: '10:00a - 11:00a', category: 'office-hours' }] },
  { date: 26, currentMonth: true, events: [] },

  // Week 4
  { date: 27, currentMonth: true, events: [{ id: 'e17', title: 'CS 409', time: '10:00a - 11:30a', category: 'lecture' }] },
  { date: 28, currentMonth: true, events: [{ id: 'e18', title: 'MATH 240', time: 'PSET 4 Due', category: 'deadline' }] },
  { date: 29, currentMonth: true, events: [] },
  { date: 30, currentMonth: true, events: [{ id: 'e19', title: 'Campus Day', time: 'All Day', category: 'institutional' }] },
  { date: 31, currentMonth: true, events: [] },
  { date: 1, currentMonth: false, events: [] },
  { date: 2, currentMonth: false, events: [] },
];

export const todaySchedule: ScheduleItem[] = [
  {
    id: 's1',
    courseCode: 'CS 409B',
    time: '10:00 AM - 11:30 AM',
    title: 'Lecture 14: Consensus & Raft Protocol',
    location: 'Trung Building, Room 301',
    category: 'lecture',
    actions: [{ label: 'Lecture Notes' }, { label: 'View Syllabus' }],
  },
  {
    id: 's2',
    courseCode: 'CS 409B',
    time: '02:00 PM - 03:00 PM',
    title: 'Unit-4 Code Review: Leader Election Bug',
    location: 'Meeting ID: 882-104-XXX',
    category: 'office-hours',
    actions: [{ label: 'Join Call', primary: true }, { label: 'Reschedule' }],
  },
  {
    id: 's3',
    courseCode: 'ASSIGNMENT',
    time: '11:59 PM Tonight',
    title: 'Problem Set 2: Raft Engine Submission',
    location: 'Canvas assignment closes strictly at midnight',
    category: 'deadline',
    actions: [{ label: 'Submit on Canvas', primary: true }],
  },
];

export const upcomingDeadlines: DeadlineItem[] = [
  {
    id: 'd1',
    title: 'BIO 215 Midterm Exam 2',
    subtitle: 'Molecular Genetics + ID',
    dueLabel: 'Due Friday, In Person',
    urgent: true,
  },
  {
    id: 'd2',
    title: 'MATH 240 Problem Set 4',
    subtitle: 'Markov Chains, Stationary Distribution',
    dueLabel: 'Due in 3 days',
  },
  {
    id: 'd3',
    title: 'Final Project Proposal Draft',
    subtitle: 'CS 409 Distributed Systems',
    dueLabel: 'Due next week',
  },
];
