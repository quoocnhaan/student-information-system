import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KnowledgeError } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { PdfDropzone } from "../components/PdfDropzone";

const MAX_BYTES = 50 * 1024 * 1024;

type RecentIngestion = { jobId: string; documentId: string; filename: string; createdAt: string };

function loadRecent(): RecentIngestion[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem("knowledge-recent-ingestions") ?? "[]");
    return Array.isArray(stored) ? stored.filter((item): item is RecentIngestion => typeof item === "object" && item !== null) : [];
  } catch {
    return [];
  }
}

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState<RecentIngestion[]>(loadRecent);

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
      const entry = { jobId: accepted.job_id, documentId: accepted.document_id, filename: file.name, createdAt: new Date().toISOString() };
      const nextRecent = [entry, ...recent.filter((item) => item.jobId !== entry.jobId)].slice(0, 8);
      localStorage.setItem("knowledge-recent-ingestions", JSON.stringify(nextRecent));
      setRecent(nextRecent);
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
      <div className="card stack">
        <PdfDropzone disabled={uploading} onFile={chooseFile} />
        {file && <div className="selected-file"><span>{file.name}</span><span className="muted">{(file.size / 1024 / 1024).toFixed(2)} MiB</span></div>}
        {error && <p className="notice danger" role="alert">{error}</p>}
        <button className="primary-button" type="button" disabled={!file || uploading} onClick={() => void submit()}>
          {uploading ? "Uploading PDF…" : "Start OCR"}
        </button>
      </div>
      {recent.length > 0 && <section className="card stack">
        <h2>Recent uploads</h2>
        <ul className="recent-list">
          {recent.map((item) => <li key={item.jobId}><button type="button" className="text-button" onClick={() => navigate(`/knowledge/ingestions/${encodeURIComponent(item.jobId)}`)}>{item.filename}</button><span className="muted">{new Date(item.createdAt).toLocaleString()}</span></li>)}
        </ul>
      </section>}
    </section>
  );
}
