import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { DocumentResult } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { OcrMarkdownEditor } from "./OcrMarkdownEditor";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type PdfComparisonWorkspaceProps = {
  result: DocumentResult;
  page: number;
  onPageChange: (page: number) => void;
  markdown: string;
  onMarkdownChange: (value: string) => void;
};

export function PdfComparisonWorkspace({ result, page, onPageChange, markdown, onMarkdownChange }: PdfComparisonWorkspaceProps) {
  const [pageCount, setPageCount] = useState(result.page_count ?? result.ocr_draft.pages.length);
  const [scale, setScale] = useState(1.15);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const sourceUrl = knowledgeClient.getDocumentSourceUrl(result.document_id);
  const maxPage = Math.max(1, pageCount);

  return <section className="comparison stack" aria-labelledby="comparison-title">
    <div className="split-row"><div><p className="eyebrow">Page-by-page review</p><h2 id="comparison-title">Source PDF and OCR draft</h2></div><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">Open original PDF</a></div>
    <div className="comparison-controls" aria-label="Document page controls">
      <button className="secondary-button" type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
      <span>Page {page} / {maxPage}</span>
      <button className="secondary-button" type="button" onClick={() => onPageChange(Math.min(maxPage, page + 1))} disabled={page === maxPage}>Next</button>
      <button className="icon-button" type="button" aria-label="Zoom out" onClick={() => setScale((current) => Math.max(0.7, current - 0.15))}>−</button>
      <button className="icon-button" type="button" aria-label="Zoom in" onClick={() => setScale((current) => Math.min(2, current + 0.15))}>+</button>
    </div>
    <div className="comparison-grid">
      <article className="comparison-pane pdf-pane"><h3>Original PDF</h3><div className="pdf-canvas"><Document key={`${sourceUrl}-${loadAttempt}`} file={sourceUrl} loading={<p>Loading source PDF...</p>} error={<div className="notice danger"><p>Unable to render the source PDF.</p><div className="inline-actions"><button className="secondary-button" type="button" onClick={() => { setPdfError(false); setLoadAttempt((current) => current + 1); }}>Retry</button><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">Open original PDF</a></div></div>} onLoadError={(error) => { setPdfError(true); console.warn("source_pdf_render_failed", error instanceof Error ? error.message : String(error)); }} onLoadSuccess={({ numPages }) => { setPdfError(false); setPageCount(numPages); onPageChange(Math.min(page, numPages)); }}><Page pageNumber={page} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} /></Document>{pdfError && <span className="sr-only">Source PDF render failed</span>}</div></article>
      <article className="comparison-pane"><h3>OCR draft</h3><p className="muted">Page {page} - Awaiting review</p><OcrMarkdownEditor page={page} value={markdown} onChange={onMarkdownChange} /></article>
    </div>
  </section>;
}
