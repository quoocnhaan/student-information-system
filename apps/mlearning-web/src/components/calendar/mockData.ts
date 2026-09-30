import type { DeadlineItem, ScheduleItem } from './types';
import type { ClassSession } from './WeekGrid';
import { addDays, startOfWeek } from './calendarUtils';

/**
 * Mock data cho trang Academic Calendar.
 * Ngày được tính theo TUẦN HIỆN TẠI (Thứ 2 = offset 0) để luôn có dữ liệu khi thử.
 * Khi nối API thật, thay bằng dữ liệu trả về từ backend (key dạng 'YYYY-MM-DD').
 */

// Key theo giờ địa phương (không dùng toISOString vì bị lệch múi giờ)
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monday = startOfWeek(new Date());
const dayOfThisWeek = (offset: number) => dateKey(addDays(monday, offset));

export const scheduleByDate: Record<string, ScheduleItem[]> = {
  // Thứ 3
  [dayOfThisWeek(1)]: [
    {
      id: '1',
      courseCode: 'CS409',
      title: 'Software Engineering',
      time: '09:00 - 10:00',
      location: 'Room A101',
      category: 'lecture',
      actions: [{ label: 'View', primary: true }],
    },
    {
      id: '2',
      courseCode: 'BIO215',
      title: 'Biology Lecture',
      time: '13:00 - 15:00',
      location: 'Room B202',
      category: 'lecture',
      actions: [{ label: 'View', primary: false }],
    },
    {
      id: '3',
      courseCode: 'BIO215',
      title: 'Biology Lab',
      time: '15:30 - 17:30',
      location: 'Lab B203',
      category: 'lecture',
      actions: [{ label: 'View', primary: false }],
    },
  ],

  // Thứ 4
  [dayOfThisWeek(2)]: [
    {
      id: '4',
      courseCode: 'MATH240',
      title: 'Mathematics',
      time: '09:00 - 11:00',
      location: 'Room C301',
      category: 'lecture',
      actions: [{ label: 'View', primary: true }],
    },
  ],

  // Thứ 5
  [dayOfThisWeek(3)]: [
    {
      id: '5',
      courseCode: 'CS409',
      title: 'Midterm Examination',
      time: '08:00 - 10:00',
      location: 'Exam Hall A',
      category: 'exam',
      actions: [{ label: 'View', primary: true }],
    },
  ],

  // Thứ 6
  [dayOfThisWeek(4)]: [
    {
      id: '6',
      courseCode: 'MATH240',
      title: 'Midterm Examination',
      time: '08:00 - 10:00',
      location: 'Exam Hall B',
      category: 'exam',
      actions: [{ label: 'View', primary: true }],
    },
  ],
};

// Màu hiển thị trong WeekGrid theo loại lịch
const categoryColor: Record<string, string> = {
  lecture: '#2141d6',
  exam: '#dc2626',
};

/**
 * Danh sách môn cho WeekGrid, được suy ra từ scheduleByDate
 * nên hai view (tuần và panel Today) luôn dùng chung một nguồn dữ liệu.
 * Phải khai báo SAU scheduleByDate.
 */
export const sessions: ClassSession[] = Object.entries(scheduleByDate).flatMap(([date, items]) =>
  items.map((item) => {
    const [startTime, endTime] = item.time.split(' - ').map((t) => t.trim());
    return {
      id: `${date}-${item.id}`,
      subject: item.title,
      date,
      startTime,
      endTime,
      room: item.location,
      color: categoryColor[item.category] ?? '#2141d6',
    };
  })
);

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