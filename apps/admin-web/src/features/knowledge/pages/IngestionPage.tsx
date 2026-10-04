import { useState } from "react";
import { knowledgeClient } from "../api/knowledgeClient";
import { Link, useParams } from "react-router-dom";
import { DocumentReviewWorkspace } from "../components/DocumentReviewWorkspace";
import { JobProgress } from "../components/JobProgress";
import { useIngestionJob } from "../hooks/useIngestionJob";

export function IngestionPage() {
  const { jobId } = useParams();
  const { job, result, connection, loading, error } = useIngestionJob(jobId);

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  async function retry() {
    if (!job || retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      await knowledgeClient.retryJob(job.id);
      window.location.reload();
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Unable to retry indexing.");
      setRetrying(false);
    }
  }

  if (loading) return <p className="loading">Loading ingestion job…</p>;
  if (!job) return <section className="card stack"><h1>Job unavailable</h1><p className="notice danger">{error?.message ?? "This job could not be found."}</p><Link className="primary-button" to="/knowledge/documents/new">Upload a PDF</Link></section>;
  return <section className="stack">
    <JobProgress job={job} connection={connection} />
    {job.status === "failed" && <section className="card stack"><h2>Processing could not complete</h2><p className="notice danger">{job.error ?? "The service could not process this document."}</p>{job.retry_available && <button className="primary-button" disabled={retrying} onClick={() => void retry()}>{retrying ? "Retrying?" : "Retry indexing"}</button>}{retryError && <p className="notice danger" role="alert">{retryError}</p>}<Link className="primary-button" to="/knowledge/documents/new">Upload another PDF</Link></section>}
    {error && job.status !== "failed" && <p className="notice warning" role="status">{error.message}</p>}
    {result && <DocumentReviewWorkspace initialResult={result} />}
    {job.type === "index" && job.status === "completed" && <Link className="primary-button" to={`/knowledge/documents/${encodeURIComponent(job.document_id)}`}>Open indexed document</Link>}
  </section>;
}
