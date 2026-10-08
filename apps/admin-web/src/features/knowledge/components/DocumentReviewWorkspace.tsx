import { useEffect, useMemo, useState } from "react";
import { KnowledgeError, type DocumentMetadata, type DocumentResult } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { normalizeMetadata, metadataErrors } from "../model/metadata";
import { useMetadataOptions } from "../hooks/useMetadataOptions";
import { MetadataEditor } from "./MetadataEditor";
import { PdfComparisonWorkspace } from "./PdfComparisonWorkspace";

type SaveState = "idle" | "error" | "conflict";

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function DocumentReviewWorkspace({ initialResult, onConfirmed }: { initialResult: DocumentResult; onConfirmed?: (jobId: string) => void }) {
  const options = useMetadataOptions();
  const [result, setResult] = useState(initialResult);
  const [metadata, setMetadata] = useState<DocumentMetadata>(initialResult.metadata);
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [selectedPages, setSelectedPages] = useState<Set<number>>(() => new Set(initialResult.ocr_draft.pages.map((entry) => entry.page)));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setResult(initialResult); setMetadata(initialResult.metadata); setEdits({}); setSelectedPages(new Set(initialResult.ocr_draft.pages.map((entry) => entry.page))); setSaveState("idle"); setMessage(null);
  }, [initialResult]);

  const currentPage = result.ocr_draft.pages.find((entry) => entry.page === page) ?? result.ocr_draft.pages[0];
  const pageText = currentPage === undefined ? "" : edits[currentPage.page] ?? currentPage.raw_text;
  const metadataDirty = !same(normalizeMetadata(metadata), normalizeMetadata(result.metadata));
  const changedPages = useMemo(() => result.ocr_draft.pages.flatMap((entry) => {
    const next = edits[entry.page];
    return next !== undefined && next !== (entry.raw_text) ? [{ page: entry.page, reviewed_text: next }] : [];
  }), [edits, result.ocr_draft.pages]);
  const selectionDirty = result.ocr_draft.pages.some((entry) => !selectedPages.has(entry.page));
  const dirty = metadataDirty || changedPages.length > 0 || selectionDirty;
  const hasIndexableSelection = result.ocr_draft.pages.some((entry) => selectedPages.has(entry.page) && (edits[entry.page] ?? entry.raw_text).trim() !== "");

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function editPage(next: string) {
    if (currentPage === undefined) return;
    const baseline = currentPage.raw_text;
    setEdits((current) => {
      if (next === baseline) {
        const rest = { ...current };
        delete rest[currentPage.page];
        return rest;
      }
      return { ...current, [currentPage.page]: next };
    });
    setSaveState("idle"); setMessage(null);
  }

  async function confirm() {
    setConfirming(true); setMessage(null);
    try {
      const jobId = await knowledgeClient.confirmDocument(result.document_id, {
        expected_revision: result.ocr_draft.revision, metadata: normalizeMetadata(metadata),
        page_edits: changedPages, selected_pages: [...selectedPages].sort((a, b) => a - b),
      });
      if (onConfirmed) onConfirmed(jobId);
      else window.location.assign(`/knowledge/ingestions/${encodeURIComponent(jobId)}`);
    } catch (error) {
      setSaveState(error instanceof KnowledgeError && error.status === 409 ? "conflict" : "error");
      setMessage(error instanceof Error ? error.message : "Unable to confirm review.");
    } finally {
      setConfirming(false);
    }
  }

  async function reloadLatest() {
    if (dirty && !window.confirm("Reloading will discard your unsaved changes. Continue?")) return;
    try {
      const next = await knowledgeClient.getDocumentDraft(result.document_id);
      setResult(next); setMetadata(next.metadata); setEdits({}); setSaveState("idle"); setMessage(null);
    } catch (error) {
      setSaveState("error"); setMessage(error instanceof Error ? error.message : "Unable to reload the latest review draft.");
    }
  }

  return <section className="stack review-workspace">
    <MetadataEditor options={options.values?.program_scope_types ?? []} majors={options.values?.majors ?? []} errors={metadataErrors(metadata)} value={metadata} onChange={(next) => { setMetadata(next); setSaveState("idle"); setMessage(null); }} />
    {options.error && <p className="notice danger">{options.error} <button onClick={options.retry}>Retry metadata options</button></p>}
    <div className="review-save-bar"><span className={dirty ? "dirty-state" : "muted"}>{dirty ? "Unsaved changes" : "Ready to confirm"}</span><button className="primary-button" type="button" disabled={confirming || !hasIndexableSelection || !options.values || Object.keys(metadataErrors(metadata)).length > 0} onClick={() => void confirm()}>{confirming ? "Confirming..." : `Confirm and index (${selectedPages.size} selected)`}</button></div>
    {message && <div className={saveState === "error" || saveState === "conflict" ? "notice danger split-row" : "notice warning"} role="status"><span>{message}</span>{saveState === "conflict" && <button className="secondary-button" type="button" onClick={() => void reloadLatest()}>Reload latest version</button>}</div>}
    <PdfComparisonWorkspace result={result} page={page} onPageChange={setPage} markdown={pageText} onMarkdownChange={editPage} included={currentPage !== undefined && selectedPages.has(currentPage.page)} onIncludedChange={(included) => { if (currentPage === undefined) return; setSelectedPages((current) => { const next = new Set(current); if (included) next.add(currentPage.page); else next.delete(currentPage.page); return next; }); setSaveState("idle"); setMessage(null); }} />
  </section>;
}
