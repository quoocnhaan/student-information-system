// courseData.ts
// Dữ liệu mẫu cho 12 khóa học, dùng để render CourseCard trong CourseCatalog

export type TagVariant = 'primary' | 'neutral';
export type StatusVariant = 'success' | 'outline';

export interface CourseTag {
    label: string;
    variant: TagVariant;
}

export interface CourseStatusBadge {
    label: string;
    variant: StatusVariant;
}

export interface CourseInstructor {
    name: string;
    role: string;
    avatar: string;
    verified: boolean;
}

export interface CourseRating {
    score: number;
    count: number;
}

export interface Course {
    id: number;
    banner: string;
    title: string;
}

export const courses: Course[] = [
    {
        id: 1,
        banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
        title: 'CS 408: Distributed Systems & Cloud Architecture',
    },
    {
        id: 2,
        banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop',
        title: 'MATH 302: Applied Stochastic Processes & Queueing',
    },
    {
        id: 3,
        banner: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop',
        title: 'CS 420: Deep Learning & Neural Architectures',
    },
    {
        id: 4,
        banner: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=600&auto=format&fit=crop',
        title: 'BIO 215: Computational Genomics & Sequence Analysis',
    },
    {
        id: 5,
        banner: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=600&auto=format&fit=crop',
        title: 'PHYS 331: Quantum Mechanics II',
    },
    {
        id: 6,
        banner: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop',
        title: 'CS 418: Computer Vision & Image Processing',
    },
    {
        id: 7,
        banner: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
        title: 'ECON 255: Econometrics & Time Series Analysis',
    },
    {
        id: 8,
        banner: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop',
        title: 'CS 430: Database Systems & Query Optimization',
    },
    {
        id: 9,
        banner: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop',
        title: 'CHEM 277: Physical Chemistry & Thermodynamics',
    },
    {
        id: 10,
        banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop',
        title: 'CS 445: Natural Language Processing',
    },
    {
        id: 11,
        banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=600&auto=format&fit=crop',
        title: 'ENGR 366: Control Systems & Robotics',
    },
    {
        id: 12,
        banner: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
        title: 'BIO 238: Systems Biology & Network Modeling',
    },
];