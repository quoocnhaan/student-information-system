import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { DocumentResult } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export function PdfComparisonWorkspace({ result }: { result: DocumentResult }) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(result.page_count ?? result.ocr_draft.pages.length);
  const [scale, setScale] = useState(1.15);
  const currentDraft = result.ocr_draft.pages.find((entry) => entry.page === page);
  const sourceUrl = knowledgeClient.getDocumentSourceUrl(result.document_id);
  const maxPage = Math.max(1, pageCount);

  return <section className="comparison stack" aria-labelledby="comparison-title">
    <div className="split-row"><div><p className="eyebrow">Page-by-page review</p><h2 id="comparison-title">Source PDF and OCR draft</h2></div><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">Open original PDF</a></div>
    <div className="comparison-controls" aria-label="Document page controls">
      <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
      <span>Page {page} / {maxPage}</span>
      <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.min(maxPage, current + 1))} disabled={page === maxPage}>Next</button>
      <button className="icon-button" type="button" aria-label="Zoom out" onClick={() => setScale((current) => Math.max(0.7, current - 0.15))}>−</button>
      <button className="icon-button" type="button" aria-label="Zoom in" onClick={() => setScale((current) => Math.min(2, current + 0.15))}>+</button>
    </div>
    <div className="comparison-grid">
      <article className="comparison-pane pdf-pane"><h3>Original PDF</h3><div className="pdf-canvas"><Document file={sourceUrl} loading={<p>Loading source PDF…</p>} error={<p className="notice danger">Unable to render the source PDF.</p>} onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPage((current) => Math.min(current, numPages)); }}><Page pageNumber={page} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} /></Document></div></article>
      <article className="comparison-pane"><h3>OCR draft</h3><p className="muted">Page {page} · Awaiting review</p><pre className="ocr-text">{currentDraft?.reviewed_text ?? currentDraft?.raw_text ?? "No OCR text is available for this page."}</pre></article>
    </div>
  </section>;
}
