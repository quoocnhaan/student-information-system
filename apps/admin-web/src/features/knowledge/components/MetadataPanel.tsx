import type { DocumentResult } from "../api/contracts";

const labels: Array<[keyof DocumentResult["metadata"], string]> = [
  ["title", "Title"], ["document_type", "Document type"], ["document_number", "Document number"],
  ["language", "Language"], ["cohort", "Cohort"], ["program_scope", "Programme scope"], ["description", "Description"],
];

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not detected";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function MetadataPanel({ result }: { result: DocumentResult }) {
  return <section className="card stack" aria-labelledby="metadata-title">
    <div className="split-row"><div><p className="eyebrow">Awaiting review</p><h2 id="metadata-title">Detected metadata</h2></div><span className="status-pill warning">{result.ocr_draft.status}</span></div>
    <dl className="metadata-grid">{labels.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{display(result.metadata[field])}</dd></div>)}</dl>
  </section>;
}
