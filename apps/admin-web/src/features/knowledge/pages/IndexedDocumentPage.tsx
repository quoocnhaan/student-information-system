import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { KnowledgeError, type IndexedChunks } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { JobProgress } from "../components/JobProgress";
import { useIngestionJob } from "../hooks/useIngestionJob";

export function IndexedDocumentPage() {
  const { documentId } = useParams();
  const [data, setData] = useState<IndexedChunks | null>(null);
  const [activeJobId, setActiveJobId] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { job, connection } = useIngestionJob(activeJobId);
  const lastFinished = useRef<string>();

  const reload = useCallback(async () => {
    if (!documentId) return;
    setData(await knowledgeClient.getIndexedChunks(documentId));
  }, [documentId]);

  useEffect(() => { void reload().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load document.")); }, [reload]);
  useEffect(() => {
    if (!job || !["completed", "failed"].includes(job.status) || lastFinished.current === job.id) return;
    lastFinished.current = job.id;
    void reload().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to refresh document."));
  }, [job, reload]);

  async function run(action: () => Promise<string | void>) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const jobId = await action();
      if (jobId) setActiveJobId(jobId);
      await reload();
    } catch (error) {
      setMessage(error instanceof KnowledgeError && error.status === 409
        ? "Outdated: this chunk or suggestion changed. Reload the current version."
        : error instanceof Error ? error.message : "Action failed.");
      await reload().catch(() => undefined);
    } finally { setBusy(false); }
  }

  if (!documentId) return <p className="notice danger">Document ID is missing.</p>;
  return <section className="stack">
    <h1>Indexed document</h1>
    {message && <p className="notice warning" role="status">{message}</p>}
    {job && <JobProgress job={job} connection={connection} />}
    {!data && <p>Loading chunks...</p>}
    {data?.pages.map((page) => <section className="card stack" key={page.page}>
      <div className="split-row"><h2>Page {page.page}</h2><button type="button" className="secondary-button" disabled={busy || page.chunks.some((chunk) => chunk.suggestion?.status === "pending" || chunk.suggestion?.status === "ready")} onClick={() => void run(() => knowledgeClient.requestCorrections(documentId, page.chunks.map((chunk) => chunk.id)))}>Correct page</button></div>
      {page.chunks.map((chunk) => <article className="stack" key={chunk.id}>
        <div className="split-row"><h3>Chunk {chunk.chunk_index + 1}</h3><button type="button" className="secondary-button" disabled={busy || chunk.suggestion?.status === "pending" || chunk.suggestion?.status === "ready"} onClick={() => void run(() => knowledgeClient.requestCorrections(documentId, [chunk.id]))}>Correct</button></div>
        {chunk.page_end > chunk.page_start && <small>Continues on page {chunk.page_end}</small>}
        {chunk.embedding_status === "stale" && <span className="notice warning">Re-embedding...</span>}
        <pre className="ocr-text">{chunk.text}</pre>
        {chunk.suggestion?.status === "pending" && <p>Correction pending...</p>}
        {chunk.suggestion?.status === "outdated" && <p className="notice warning">Outdated suggestion</p>}
        {chunk.suggestion?.status === "failed" && <p className="notice warning">Correction failed</p>}
        {chunk.suggestion?.status === "ready" && <div className="stack">
          <h4>Suggested correction</h4>
          <div className="split-row"><pre className="ocr-text">Current: {chunk.text}</pre><pre className="ocr-text">Suggested: {chunk.suggestion.suggested_text}</pre></div>
          <div className="split-row"><button type="button" className="primary-button" disabled={busy} onClick={() => void run(() => knowledgeClient.acceptSuggestion(chunk.suggestion!.id))}>Accept</button><button type="button" className="secondary-button" disabled={busy} onClick={() => void run(() => knowledgeClient.rejectSuggestion(chunk.suggestion!.id))}>Reject</button></div>
        </div>}
      </article>)}
      {page.chunks.some((chunk) => chunk.suggestion?.status === "ready") && <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(async () => { let lastJobId: string | undefined; for (const chunk of page.chunks) { if (chunk.suggestion?.status === "ready") lastJobId = await knowledgeClient.acceptSuggestion(chunk.suggestion.id); } return lastJobId; })}>Accept all on page</button>}
    </section>)}
  </section>;
}
