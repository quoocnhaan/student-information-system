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
    category: string;
    tag: CourseTag | null;
    statusBadge: CourseStatusBadge | null;
    crn: string;
    code: string;
    title: string;
    description: string;
    instructor: CourseInstructor;
    schedule: string;
    progress: number;
    rating: CourseRating | null;
}

export const courses: Course[] = [
    {
        id: 1,
        banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
        category: 'CS & AI',
        tag: { label: 'Graduate Core', variant: 'primary' },
        statusBadge: { label: 'Enrolled', variant: 'success' },
        crn: 'CRN 40812',
        code: 'CS 408',
        title: 'CS 408: Distributed Systems & Cloud Architecture',
        description: 'Consensus protocols, Raft, Paxos, distributed transaction logging, and resilient cloud design.',
        instructor: {
            name: 'Prof. Dr. Elizabeth Vance',
            role: 'Chair, Cloud Research Lab',
            avatar: 'https://i.pravatar.cc/100?img=11',
            verified: true,
        },
        schedule: 'Mon/Wed 10:00 - 11:30 AM • Turing Hall B',
        progress: 72,
        rating: null,
    },
    {
        id: 2,
        banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop',
        category: 'Math & Stats',
        tag: { label: '4.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 30288',
        code: 'MATH 302',
        title: 'MATH 302: Applied Stochastic Processes & Queueing',
        description: 'Markov chains, Poisson arrival modeling, Brownian motion, and Monte Carlo algorithmic simulations.',
        instructor: {
            name: 'Dr. Marcus Chen',
            role: 'Institute for Applied Math',
            avatar: 'https://i.pravatar.cc/100?img=8',
            verified: true,
        },
        schedule: 'Tue/Thu 01:15 - 02:45 PM • Euler 104',
        progress: 54,
        rating: null,
    },
    {
        id: 3,
        banner: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop',
        category: 'CS & AI',
        tag: { label: 'Graduate Core', variant: 'primary' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 42005',
        code: 'CS 420',
        title: 'CS 420: Deep Learning & Neural Architectures',
        description: 'Transformer attention, diffusion models, reinforcement learning, and PyTorch acceleration.',
        instructor: {
            name: 'Prof. Aris Thorne',
            role: 'Lead AI Research Scientist',
            avatar: 'https://i.pravatar.cc/100?img=12',
            verified: true,
        },
        schedule: 'Fri 09:00 - 12:00 PM • CS Aud. 1',
        progress: 65,
        rating: null,
    },
    {
        id: 4,
        banner: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=600&auto=format&fit=crop',
        category: 'Bioinformatics',
        tag: { label: '3.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 21530',
        code: 'BIO 215',
        title: 'BIO 215: Computational Genomics & Sequence Analysis',
        description: 'Genome assembly pipelines, BLAST algorithmic heuristics, protein folding models, and phylogenetic trees.',
        instructor: {
            name: 'Dr. Elena Rostova',
            role: 'Genomics Institute',
            avatar: 'https://i.pravatar.cc/100?img=5',
            verified: true,
        },
        schedule: 'Wed 02:00 - 05:00 PM • BioLab 3',
        progress: 88,
        rating: { score: 4.7, count: 42 },
    },
    {
        id: 5,
        banner: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=600&auto=format&fit=crop',
        category: 'Physics',
        tag: { label: '4.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Waitlist', variant: 'outline' },
        crn: 'CRN 33110',
        code: 'PHYS 331',
        title: 'PHYS 331: Quantum Mechanics II',
        description: 'Perturbation theory, angular momentum coupling, scattering theory, and relativistic corrections.',
        instructor: {
            name: 'Prof. Hideo Tanaka',
            role: 'Dept. of Theoretical Physics',
            avatar: 'https://i.pravatar.cc/100?img=15',
            verified: true,
        },
        schedule: 'Mon/Wed/Fri 08:00 - 09:00 AM • Bohr Hall 2',
        progress: 40,
        rating: { score: 4.5, count: 27 },
    },
    {
        id: 6,
        banner: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop',
        category: 'CS & AI',
        tag: { label: 'Elective', variant: 'neutral' },
        statusBadge: { label: 'Enrolled', variant: 'success' },
        crn: 'CRN 41890',
        code: 'CS 418',
        title: 'CS 418: Computer Vision & Image Processing',
        description: 'Convolutional filters, feature extraction, object detection, and 3D scene reconstruction.',
        instructor: {
            name: 'Dr. Priya Nair',
            role: 'Vision & Robotics Lab',
            avatar: 'https://i.pravatar.cc/100?img=9',
            verified: true,
        },
        schedule: 'Tue/Thu 03:00 - 04:30 PM • CS Bldg 210',
        progress: 60,
        rating: { score: 4.8, count: 65 },
    },
    {
        id: 7,
        banner: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
        category: 'Economics',
        tag: { label: '3.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 25510',
        code: 'ECON 255',
        title: 'ECON 255: Econometrics & Time Series Analysis',
        description: 'Regression diagnostics, ARIMA modeling, causal inference, and panel data methods.',
        instructor: {
            name: 'Prof. Daniel Ferreira',
            role: 'School of Economics',
            avatar: 'https://i.pravatar.cc/100?img=20',
            verified: false,
        },
        schedule: 'Mon/Wed 01:00 - 02:30 PM • Keynes Hall',
        progress: 20,
        rating: { score: 4.2, count: 18 },
    },
    {
        id: 8,
        banner: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop',
        category: 'CS & AI',
        tag: { label: 'Graduate Core', variant: 'primary' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 43021',
        code: 'CS 430',
        title: 'CS 430: Database Systems & Query Optimization',
        description: 'Relational algebra, indexing structures, transaction isolation, and cost-based query planning.',
        instructor: {
            name: 'Dr. Laura Kim',
            role: 'Data Systems Group',
            avatar: 'https://i.pravatar.cc/100?img=32',
            verified: true,
        },
        schedule: 'Tue/Thu 09:00 - 10:30 AM • CS Bldg 118',
        progress: 33,
        rating: { score: 4.6, count: 51 },
    },
    {
        id: 9,
        banner: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop',
        category: 'Chemistry',
        tag: { label: '4.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 27740',
        code: 'CHEM 277',
        title: 'CHEM 277: Physical Chemistry & Thermodynamics',
        description: 'Statistical mechanics, chemical kinetics, phase equilibria, and quantum chemical modeling.',
        instructor: {
            name: 'Prof. Sofia Alvarez',
            role: 'Dept. of Chemistry',
            avatar: 'https://i.pravatar.cc/100?img=25',
            verified: true,
        },
        schedule: 'Mon/Wed 11:00 AM - 12:30 PM • Chem Bldg 4',
        progress: 15,
        rating: { score: 4.3, count: 22 },
    },
    {
        id: 10,
        banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop',
        category: 'CS & AI',
        tag: { label: 'Elective', variant: 'neutral' },
        statusBadge: { label: 'Enrolled', variant: 'success' },
        crn: 'CRN 44502',
        code: 'CS 445',
        title: 'CS 445: Natural Language Processing',
        description: 'Tokenization, embeddings, sequence-to-sequence models, and large language model fine-tuning.',
        instructor: {
            name: 'Dr. Omar Farouk',
            role: 'Language Technologies Lab',
            avatar: 'https://i.pravatar.cc/100?img=13',
            verified: true,
        },
        schedule: 'Fri 01:00 - 04:00 PM • CS Aud. 2',
        progress: 78,
        rating: { score: 4.9, count: 90 },
    },
    {
        id: 11,
        banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=600&auto=format&fit=crop',
        category: 'Engineering',
        tag: { label: '3.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Waitlist', variant: 'outline' },
        crn: 'CRN 36610',
        code: 'ENGR 366',
        title: 'ENGR 366: Control Systems & Robotics',
        description: 'State-space modeling, PID control, Kalman filtering, and autonomous navigation.',
        instructor: {
            name: 'Prof. Ingrid Larsen',
            role: 'Robotics & Automation Lab',
            avatar: 'https://i.pravatar.cc/100?img=28',
            verified: true,
        },
        schedule: 'Tue/Thu 11:00 AM - 12:30 PM • Eng Bldg 3',
        progress: 47,
        rating: { score: 4.4, count: 33 },
    },
    {
        id: 12,
        banner: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
        category: 'Bioinformatics',
        tag: { label: '3.0 Credits', variant: 'neutral' },
        statusBadge: { label: 'Open Seats', variant: 'outline' },
        crn: 'CRN 23890',
        code: 'BIO 238',
        title: 'BIO 238: Systems Biology & Network Modeling',
        description: 'Gene regulatory networks, protein interaction graphs, and dynamical systems simulation.',
        instructor: {
            name: 'Dr. Naomi Blackwood',
            role: 'Systems Biology Center',
            avatar: 'https://i.pravatar.cc/100?img=44',
            verified: false,
        },
        schedule: 'Mon 02:00 - 05:00 PM • BioLab 1',
        progress: 10,
        rating: { score: 4.1, count: 12 },
    },
];