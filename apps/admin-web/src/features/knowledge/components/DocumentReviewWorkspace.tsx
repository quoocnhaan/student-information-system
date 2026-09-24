import { useEffect, useMemo, useState } from "react";
import { KnowledgeError, type DocumentMetadata, type DocumentResult } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { MetadataEditor } from "./MetadataEditor";
import { PdfComparisonWorkspace } from "./PdfComparisonWorkspace";

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeMetadata(metadata: DocumentMetadata): DocumentMetadata {
  const cohort = asRecord(metadata.cohort);
  const fromYear = typeof cohort.from_year === "number" ? cohort.from_year : undefined;
  const toYear = typeof cohort.to_year === "number" ? cohort.to_year : undefined;
  const scope = asRecord(metadata.program_scope);
  const scopeType = typeof scope.type === "string" ? scope.type : undefined;
  const scopePrograms = Array.isArray(scope.programs)
    ? scope.programs.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    : [];
  return {
    title: nullableText(metadata.title), document_type: nullableText(metadata.document_type),
    document_number: nullableText(metadata.document_number), description: nullableText(metadata.description),
    language: nullableText(metadata.language),
    cohort: fromYear === undefined ? null : { from_year: fromYear, to_year: toYear ?? null },
    program_scope: scopeType === undefined ? null : { type: scopeType, programs: scopeType === "specific_programs" ? scopePrograms : [] },
  };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function DocumentReviewWorkspace({ initialResult }: { initialResult: DocumentResult }) {
  const [result, setResult] = useState(initialResult);
  const [metadata, setMetadata] = useState<DocumentMetadata>(initialResult.metadata);
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setResult(initialResult); setMetadata(initialResult.metadata); setEdits({}); setSaveState("idle"); setMessage(null);
  }, [initialResult]);

  const currentPage = result.ocr_draft.pages.find((entry) => entry.page === page) ?? result.ocr_draft.pages[0];
  const pageText = currentPage === undefined ? "" : edits[currentPage.page] ?? currentPage.reviewed_text ?? currentPage.raw_text;
  const metadataDirty = !same(normalizeMetadata(metadata), normalizeMetadata(result.metadata));
  const changedPages = useMemo(() => result.ocr_draft.pages.flatMap((entry) => {
    const next = edits[entry.page];
    return next !== undefined && next !== (entry.reviewed_text ?? entry.raw_text) ? [{ page: entry.page, reviewed_text: next }] : [];
  }), [edits, result.ocr_draft.pages]);
  const dirty = metadataDirty || changedPages.length > 0;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function editPage(next: string) {
    if (currentPage === undefined) return;
    const baseline = currentPage.reviewed_text ?? currentPage.raw_text;
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

  async function save() {
    if (!dirty || saveState === "saving") return;
    setSaveState("saving"); setMessage(null);
    try {
      const next = await knowledgeClient.saveDocumentReviewDraft(result.document_id, {
        expected_revision: result.ocr_draft.revision, metadata: normalizeMetadata(metadata), pages: changedPages,
      });
      setResult(next); setMetadata(next.metadata); setEdits({}); setSaveState("saved"); setMessage("Review draft saved.");
    } catch (error) {
      if (error instanceof KnowledgeError && error.status === 409) {
        setSaveState("conflict"); setMessage("This review draft has changed. Reload the latest version before saving.");
      } else {
        setSaveState("error"); setMessage(error instanceof Error ? error.message : "Unable to save the review draft.");
      }
    }
  }

  async function reloadLatest() {
    if (dirty && !window.confirm("Reloading will discard your unsaved changes. Continue?")) return;
    try {
      const next = await knowledgeClient.getDocumentResult(result.document_id);
      setResult(next); setMetadata(next.metadata); setEdits({}); setSaveState("idle"); setMessage(null);
    } catch (error) {
      setSaveState("error"); setMessage(error instanceof Error ? error.message : "Unable to reload the latest review draft.");
    }
  }

  return <section className="stack review-workspace">
    <MetadataEditor value={metadata} onChange={(next) => { setMetadata(next); setSaveState("idle"); setMessage(null); }} />
    <div className="review-save-bar"><span className={dirty ? "dirty-state" : "muted"}>{dirty ? "Unsaved changes" : "All changes saved"}</span><button className="primary-button" type="button" disabled={!dirty || saveState === "saving"} onClick={() => void save()}>{saveState === "saving" ? "Saving..." : "Save review draft"}</button></div>
    {message && <div className={saveState === "error" || saveState === "conflict" ? "notice danger split-row" : "notice warning"} role="status"><span>{message}</span>{saveState === "conflict" && <button className="secondary-button" type="button" onClick={() => void reloadLatest()}>Reload latest version</button>}</div>}
    <PdfComparisonWorkspace result={result} page={page} onPageChange={setPage} markdown={pageText} onMarkdownChange={editPage} />
  </section>;
}
