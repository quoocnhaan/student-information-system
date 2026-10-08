import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KnowledgeError } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { PdfDropzone } from "../components/PdfDropzone";

const MAX_BYTES = 50 * 1024 * 1024;

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const chooseFile = (next: File) => {
    if (next.size === 0) return setError("Choose a non-empty PDF file.");
    if (next.size > MAX_BYTES) return setError("The PDF exceeds the 50 MiB upload limit.");
    if (next.type && next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      return setError("Choose a PDF file.");
    }
    setError(null);
    setFile(next);
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const accepted = await knowledgeClient.uploadPdf(file);
      navigate(`/knowledge/ingestions/${encodeURIComponent(accepted.job_id)}`);
    } catch (caught) {
      setError(caught instanceof KnowledgeError ? caught.message : "Unable to upload the PDF.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="stack page-intro">
      <div>
        <p className="eyebrow">Knowledge ingestion</p>
        <h1>Upload a PDF for OCR review</h1>
        <p className="lead">The service stores your source PDF, processes it in the background, then lets you compare each original page with its OCR draft.</p>
      </div>
      <Link className="secondary-button" to="/knowledge/documents">View indexed documents</Link>
      <div className="card stack">
        <PdfDropzone disabled={uploading} onFile={chooseFile} />
        {file && <div className="selected-file"><span>{file.name}</span><span className="muted">{(file.size / 1024 / 1024).toFixed(2)} MiB</span></div>}
        {error && <p className="notice danger" role="alert">{error}</p>}
        <button className="primary-button" type="button" disabled={!file || uploading} onClick={() => void submit()}>
          {uploading ? "Uploading PDF…" : "Start OCR"}
        </button>
      </div>

    </section>
  );
}
