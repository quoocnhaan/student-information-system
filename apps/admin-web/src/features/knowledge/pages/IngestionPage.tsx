import { Link, useParams } from "react-router-dom";
import { DocumentReviewWorkspace } from "../components/DocumentReviewWorkspace";
import { JobProgress } from "../components/JobProgress";
import { useIngestionJob } from "../hooks/useIngestionJob";

export function IngestionPage() {
  const { jobId } = useParams();
  const { job, result, connection, loading, error } = useIngestionJob(jobId);

  if (loading) return <p className="loading">Loading ingestion job…</p>;
  if (!job) return <section className="card stack"><h1>Job unavailable</h1><p className="notice danger">{error?.message ?? "This job could not be found."}</p><Link className="primary-button" to="/knowledge/documents/new">Upload a PDF</Link></section>;
  return <section className="stack">
    <JobProgress job={job} connection={connection} />
    {job.status === "failed" && job.type !== "correct" && <section className="card stack"><h2>Processing could not complete</h2><p className="notice danger">{job.error ?? "The service could not process this document."}</p><Link className="primary-button" to="/knowledge/documents/new">Upload another PDF</Link></section>}
    {job.status === "failed" && job.type === "correct" && <p className="notice warning">LLM correction failed. You can review the raw OCR below.</p>}
    {error && job.status !== "failed" && <p className="notice warning" role="status">{error.message}</p>}
    {result && <DocumentReviewWorkspace initialResult={result} />}
    {job.type === "index" && job.status === "completed" && <Link className="primary-button" to={`/knowledge/documents/${encodeURIComponent(job.document_id)}`}>Open indexed document</Link>}
  </section>;
}
