import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { KnowledgeError, type IndexedChunks } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { JobProgress } from "../components/JobProgress";
import { useIngestionJob } from "../hooks/useIngestionJob";

const active = (status: string) => status === "queued" || status === "running";
type Chunk = IndexedChunks["pages"][number]["chunks"][number];
function chunkState(chunk: Chunk): string | null {
  const correction = chunk.correction;
  if (correction && active(correction.job.status)) return "Correcting...";
  if (correction?.job.status === "failed") return "Correction failed. You can Correct again.";
  const children = correction?.children.filter((child) => correction.chunk_child_ids.includes(child.id)) ?? [];
  if (children.some((child) => active(child.status))) return "Updating index...";
  if (children.some((child) => child.status === "failed")) return "Indexing failed. Correct again to retry.";
  if (chunk.embedding_status === "stale") return "Index is stale. Correct again to refresh.";
  if (correction?.outcome === "unchanged" && children.length === 0) return "No changes needed.";
  if (children.length > 0 && children.every((child) => child.status === "completed")) return "Indexed.";
  return null;
}

export function IndexedDocumentPage() {
  const { documentId } = useParams();
  const [data, setData] = useState<IndexedChunks | null>(null);
  const [activeJobId, setActiveJobId] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { job, connection } = useIngestionJob(activeJobId);
  const reload = useCallback(async () => {
    if (documentId) setData(await knowledgeClient.getIndexedChunks(documentId));
  }, [documentId]);
  useEffect(() => {
    setData(null); setActiveJobId(undefined);
    void reload().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load document."));
  }, [reload]);
  useEffect(() => {
    if (job && !active(job.status)) void reload().catch(() => undefined);
  }, [job, reload]);
  // Poll the durable read model, including after reconnect or a missed event.
  useEffect(() => {
    const timer = window.setInterval(() => { void reload().catch(() => undefined); }, 1500);
    return () => window.clearInterval(timer);
  }, [reload]);

  async function run(chunkId: string) {
    if (busy || !documentId) return;
    setBusy(true); setMessage(null);
    try {
      setActiveJobId(await knowledgeClient.requestCorrections(documentId, chunkId));
      await reload();
    } catch (error) {
      setMessage(error instanceof KnowledgeError && error.status === 409
        ? "A correction or index update is already active for this chunk."
        : error instanceof Error ? error.message : "Correction could not be requested.");
      await reload().catch(() => undefined);
    } finally { setBusy(false); }
  }
  const selected = data?.pages.flatMap((page) => page.chunks).find((chunk) => chunk.correction?.job.id === activeJobId)?.correction;
  const selectedIndexed = selected?.job.status === "completed" && selected.children.length > 0
    && selected.children.length === selected.job.followup_job_ids.length
    && selected.children.every((child) => child.status === "completed");

  if (!documentId) return <p className="notice danger">Document ID is missing.</p>;
  return <section className="stack">
    <h1>Indexed document</h1>
    <p className="muted">Corrections are applied automatically, then each changed chunk is re-indexed.</p>
    {message && <p className="notice warning" role="status">{message}</p>}
    {job && <JobProgress job={job} connection={connection} />}
    {selectedIndexed && <p className="notice">Selected request indexed.</p>}
    {!data && <p>Loading chunks...</p>}
    {data?.pages.map((page) => <section className="card stack" key={page.page}>
      <h2>Page {page.page}</h2>
      {page.chunks.map((chunk) => <article className="stack" key={chunk.id}>
        <div className="split-row"><h3>Chunk {chunk.chunk_index + 1}</h3><button type="button" className="secondary-button" disabled={busy || Boolean(chunk.active_job_id)} onClick={() => void run(chunk.id)}>Correct</button></div>
        {chunk.page_end > chunk.page_start && <small>Continues on page {chunk.page_end}</small>}
        {chunkState(chunk) && <p className="notice" role="status">{chunkState(chunk)}</p>}
        {chunk.correction?.job.error && <small>{chunk.correction.job.error}</small>}
        {chunk.correction?.children.filter((child) => chunk.correction?.chunk_child_ids.includes(child.id) && child.error).map((child) => <small key={child.id}>{child.error}</small>)}
        <pre className="ocr-text">{chunk.text}</pre>
      </article>)}
    </section>)}
  </section>;
}
