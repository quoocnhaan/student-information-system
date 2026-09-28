import {
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    FileArchive,
    FileSpreadsheet,
    Presentation,
} from 'lucide-react';

import styles from './CourseMaterials.module.css';

export interface CourseMaterial {
    id: string;
    name: string;
    type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'zip' | 'other';
    size: string;
    uploadedAt: string;
    url: string;
}

interface CourseMaterialsProps {
    materials: CourseMaterial[];
}

function getFileIcon(type: CourseMaterial['type']) {
    switch (type) {
        case 'pdf':
            return <FileText size={22} />;

        case 'ppt':
            return <Presentation size={22} />;

        case 'excel':
            return <FileSpreadsheet size={22} />;

        case 'zip':
            return <FileArchive size={22} />;

        default:
            return <FileText size={22} />;
    }
}

function getFileTypeLabel(type: CourseMaterial['type']) {
    switch (type) {
        case 'pdf':
            return 'PDF';

        case 'doc':
            return 'DOCX';

        case 'ppt':
            return 'PPTX';

        case 'excel':
            return 'XLSX';

        case 'zip':
            return 'ZIP';

        default:
            return 'FILE';
    }
}

export default function CourseMaterials({
    materials,
}: CourseMaterialsProps) {
    return (
        <section className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        <BookOpen size={22} />
                    </div>

                    <div>
                        <h2 className={styles.title}>
                            Course Materials
                        </h2>

                        <p className={styles.subtitle}>
                            Materials uploaded by your instructor
                        </p>
                    </div>
                </div>

                <span className={styles.count}>
                    {materials.length} Resources
                </span>
            </div>

            {/* Materials */}
            <div className={styles.list}>
                {materials.length === 0 ? (
                    <div className={styles.empty}>
                        <BookOpen size={34} />

                        <h3>No materials available</h3>

                        <p>
                            Your instructor has not uploaded any
                            materials yet.
                        </p>
                    </div>
                ) : (
                    materials.map((material) => (
                        <div
                            key={material.id}
                            className={styles.material}
                        >
                            {/* File icon */}
                            <div className={styles.fileIcon}>
                                {getFileIcon(material.type)}
                            </div>

                            {/* Information */}
                            <div className={styles.info}>
                                <div className={styles.nameRow}>
                                    <h3 className={styles.name}>
                                        {material.name}
                                    </h3>

                                    <span className={styles.type}>
                                        {getFileTypeLabel(
                                            material.type
                                        )}
                                    </span>
                                </div>

                                <p className={styles.meta}>
                                    Uploaded {material.uploadedAt}
                                    <span>•</span>
                                    {material.size}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className={styles.actions}>
                                <a
                                    href={material.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.viewButton}
                                >
                                    <ExternalLink size={16} />
                                    View
                                </a>

                                <a
                                    href={material.url}
                                    download
                                    className={styles.downloadButton}
                                    aria-label={`Download ${material.name}`}
                                >
                                    <Download size={17} />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}