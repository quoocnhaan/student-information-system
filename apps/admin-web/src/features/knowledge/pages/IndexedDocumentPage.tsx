import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { KnowledgeError, type IndexedChunks, type IndexedMetadata } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { IndexedMetadataWorkspace } from "../components/IndexedMetadataWorkspace";
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
  return <IndexedDocumentContent key={documentId} documentId={documentId} />;
}

function IndexedDocumentContent({ documentId }: { documentId?: string }) {
  const [header, setHeader] = useState<IndexedMetadata | null>(null);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<IndexedChunks | null>(null);
  const [activeJobId, setActiveJobId] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { job, connection } = useIngestionJob(activeJobId);
  const reload = useCallback(async (signal?: AbortSignal) => {
    if (!documentId) return;
    const next = await knowledgeClient.getIndexedChunks(documentId, signal);
    if (!signal?.aborted) setData(next);
  }, [documentId]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setHeader(null); setActiveJobId(undefined); setMessage(null); setBusy(false);
    if (documentId) void knowledgeClient.getIndexedDocument(documentId, controller.signal).then((next) => {
      if (!controller.signal.aborted) { setHeader(next); setData({ document_id: next.document_id, pages: next.pages }); }
    }).catch((error: unknown) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Unable to load document."); });
    return () => controller.abort();
  }, [documentId, retry]);
  useEffect(() => {
    if (!header) return;
    const controller = new AbortController();
    if (job && !active(job.status)) void reload(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [job, reload, header]);
  useEffect(() => {
    if (!header) return;
    const controller = new AbortController();
    let fetching = false;
    const timer = window.setInterval(() => {
      if (fetching) return;
      fetching = true;
      void reload(controller.signal).catch(() => undefined).finally(() => { fetching = false; });
    }, 1500);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [reload, header]);

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
    <Link className="text-button" to="/knowledge/documents">Back to documents</Link>
    <h1>{header?.metadata.title || header?.source.original_filename || "Indexed document"}</h1>
    <p className="muted">Corrections are applied automatically, then each changed chunk is re-indexed.</p>
    {message && <p className="notice warning" role="status">{message}</p>}
    {header && <IndexedMetadataWorkspace key={documentId} initial={header} onSaved={setHeader} />}
    {job && <JobProgress job={job} connection={connection} />}
    {selectedIndexed && <p className="notice">Selected request indexed.</p>}
    {!data && <p>{message ? "Document unavailable." : "Loading document..."}</p>}
    {!data && message && <button onClick={() => setRetry((value) => value + 1)}>Retry document</button>}
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
