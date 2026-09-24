import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { JobProgress } from "../components/JobProgress";
import { MetadataPanel } from "../components/MetadataPanel";
import { useIngestionJob } from "../hooks/useIngestionJob";

const PdfComparisonWorkspace = lazy(async () => ({
  default: (await import("../components/PdfComparisonWorkspace")).PdfComparisonWorkspace,
}));

export function IngestionPage() {
  const { jobId } = useParams();
  const { job, result, connection, loading, error } = useIngestionJob(jobId);

  if (loading) return <p className="loading">Loading ingestion job…</p>;
  if (!job) return <section className="card stack"><h1>Job unavailable</h1><p className="notice danger">{error?.message ?? "This job could not be found."}</p><Link className="primary-button" to="/knowledge/documents/new">Upload a PDF</Link></section>;
  return <section className="stack">
    <JobProgress job={job} connection={connection} />
    {job.status === "failed" && <section className="card stack"><h2>OCR could not complete</h2><p className="notice danger">{job.error ?? "The service could not process this document."}</p><Link className="primary-button" to="/knowledge/documents/new">Upload another PDF</Link></section>}
    {error && job.status !== "failed" && <p className="notice warning" role="status">{error.message}</p>}
    {result && <><MetadataPanel result={result} /><Suspense fallback={<p className="loading">Loading PDF comparison…</p>}><PdfComparisonWorkspace result={result} /></Suspense></>}
  </section>;
}
