import type { DeadlineItem } from './types';

// October 2025 month grid (MON-SUN). Replace with real data from your backend/API.

export const scheduleByDate = {
  '2026-09-22': [
    {
      id: '1',
      courseCode: 'CS409',
      title: 'Software Engineering',
      time: '09:00 - 10:00',
      location: 'Room A101',
      category: 'lecture',
      actions: [
        {
          label: 'View',
          primary: true,
        },
      ],
    },

    {
      id: '2',
      courseCode: 'BIO215',
      title: 'Biology Lecture',
      time: '13:00 - 15:00',
      location: 'Room B202',
      category: 'lecture',
      actions: [
        {
          label: 'View',
          primary: false,
        },
      ],
    },
    {
      id: '3',
      courseCode: 'BIO215',
      title: 'Biology Lecture',
      time: '13:00 - 15:00',
      location: 'Room B202',
      category: 'lecture',
      actions: [
        {
          label: 'View',
          primary: false,
        },
      ],
    },
  ],

  '2026-09-23': [
    {
      id: '3',
      courseCode: 'MATH240',
      title: 'Mathematics',
      time: '09:00 - 11:00',
      location: 'Room C301',
      category: 'lecture',
      actions: [
        {
          label: 'View',
          primary: true,
        },
      ],
    },
  ],

  '2026-09-24': [
    {
      id: '4',
      courseCode: 'CS409',
      title: 'Midterm Examination',
      time: '08:00 - 10:00',
      location: 'Exam Hall A',
      category: 'exam',
      actions: [
        {
          label: 'View',
          primary: true,
        },
      ],
    },
  ],
  '2026-09-25': [
    {
      id: '4',
      courseCode: 'CS409',
      title: 'Midterm Examination',
      time: '08:00 - 10:00',
      location: 'Exam Hall A',
      category: 'exam',
      actions: [
        {
          label: 'View',
          primary: true,
        },
      ],
    },
  ],
};

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
