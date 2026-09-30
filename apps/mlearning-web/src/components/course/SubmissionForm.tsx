import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import styles from './Activityitem.module.css';
import { MAX_FILE_MB, formatFileSize } from './activityShared';

interface Props {
    hasSubmission: boolean;
    onSave: (file: File) => void;
    onCancel: () => void;
}

export default function SubmissionForm({ hasSubmission, onSave, onCancel }: Props) {
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const pickFile = (file?: File) => {
        if (!file) return;
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setError(`File is larger than ${MAX_FILE_MB} MB.`);
            return;
        }
        setError('');
        setPendingFile(file);
    };

    return (
        <div className={`${styles.card} ${styles.form}`}>
            <div>
                <h4 className={styles.cardTitle}>
                    {hasSubmission ? 'Replace your submission' : 'Upload your submission'}
                </h4>
                <p className={styles.formSub}>
                    1 file, up to {MAX_FILE_MB} MB. You can edit it again until the deadline.
                </p>
            </div>

            <div
                className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFile(e.dataTransfer.files?.[0]);
                }}
            >
                <span className={styles.dropIcon}>
                    <UploadCloud size={26} />
                </span>
                <span className={styles.dropTitle}>Drag &amp; drop your file here</span>
                <span className={styles.dropHint}>
                    or <u>click to browse</u> from your computer
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                        pickFile(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
            </div>

            {pendingFile && (
                <div className={styles.fileChip}>
                    <span className={styles.attachIcon}>
                        <FileText size={18} />
                    </span>
                    <div className={styles.attachText}>
                        <span className={styles.attachName}>{pendingFile.name}</span>
                        <span className={styles.attachMeta}>{formatFileSize(pendingFile.size)} • ready to upload</span>
                    </div>
                    <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => setPendingFile(null)}
                        aria-label="Remove selected file"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={onCancel}>
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={!pendingFile}
                    onClick={() => pendingFile && onSave(pendingFile)}
                >
                    Save changes
                </button>
            </div>
        </div>
    );
}