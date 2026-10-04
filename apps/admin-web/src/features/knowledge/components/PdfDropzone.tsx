import { useId, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function PdfDropzone({ disabled = false, onFile }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (files: FileList | null) => {
    const file = files?.item(0);
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files); }}
    >
      <input
        id={inputId}
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        onChange={(event) => selectFile(event.target.files)}
      />
      <p className="dropzone-title">Drop a PDF here</p>
      <p className="muted">or choose one from your computer (maximum 50 MiB)</p>
      <button className="secondary-button" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Choose PDF
      </button>
    </div>
  );
}
