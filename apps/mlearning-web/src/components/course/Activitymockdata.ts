// mockData.ts

import type { Activity } from './Activitytypes';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const now = Date.now();

const iso = (offsetMs: number) =>
    new Date(now + offsetMs).toISOString();

export const activities: Activity[] = [
    // ==========================================
    // COURSE MATERIALS
    // ==========================================
    {
        id: 'course-materials',
        type: 'resource',
        title: 'Course Materials',
        description:
            'Materials and documents uploaded by your instructor.',

        files: [
            {
                name: 'Lecture 04 - Raft Consensus.pdf',
                url: '/materials/lecture-04-raft.pdf',
            },
            {
                name: 'Lab Guide - Raft Implementation.pdf',
                url: '/materials/lab-guide-raft.pdf',
            },
            {
                name: 'Week 4 - Consensus Algorithms.pptx',
                url: '/materials/week-4-consensus.pptx',
            },
        ],

        folderUrl: '/materials/course-materials.zip',
    },

    // ==========================================
    // ASSIGNMENT
    // ==========================================
    {
        id: 'ps3',
        type: 'assignment',
        title:
            'Problem Set 3: Building a Fault-Tolerant Raft Consensus Core in Go',

        description:
            'Implement leader election (Part 2A) and log agreement (Part 2B). Your implementation must pass the strict network-partition and dropped-RPC stress testing framework.',

        opensAt: iso(-10 * DAY),

        dueAt: iso(4 * DAY),

        templateFile: {
            name: 'PS3_Raft_Handout.pdf',
            uploadedAt: iso(-10 * DAY),
        },

        submission: null,

        gradingStatus: 'Not graded',
    },

    // ==========================================
    // QUIZ 1
    // ==========================================
    {
        id: 'quiz-m4',
        type: 'quiz',

        title: 'Module 4 Knowledge Check Quiz',

        description:
            'Short multiple-choice assessment covering Raft election conditions, state transitions, and safety guarantees.',

        opensAt: iso(-1 * HOUR),

        closesAt: iso(2 * DAY),

        attemptsAllowed: 2,

        attemptsUsed: 0,

        timeLimitMins: 15,

        questionCount: 20,
    },

    // ==========================================
    // QUIZ 2
    // ==========================================
    {
        id: 'quiz-m5',
        type: 'quiz',

        title: 'Module 5 Knowledge Check Quiz',

        description:
            'Short multiple-choice assessment covering Raft election conditions, state transitions, and safety guarantees.',

        opensAt: iso(2 * HOUR),

        closesAt: iso(4 * DAY),

        attemptsAllowed: 2,

        attemptsUsed: 0,

        timeLimitMins: 15,

        questionCount: 15,
    },
];