import type { DocumentMetadata } from "../api/contracts";

type MetadataEditorProps = {
  value: DocumentMetadata;
  onChange: (value: DocumentMetadata) => void;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function programmeList(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

export function MetadataEditor({ value, onChange }: MetadataEditorProps) {
  const cohort = record(value.cohort);
  const scope = record(value.program_scope);
  const scopeType = text(scope.type) || "all";
  const fromYear = text(cohort.from_year);
  const toYear = text(cohort.to_year);
  const cohortError = fromYear && toYear && Number(toYear) < Number(fromYear)
    ? "The end year must be the same as or later than the start year."
    : null;

  function update(field: keyof DocumentMetadata, next: unknown) {
    onChange({ ...value, [field]: next });
  }

  function updateCohort(field: "from_year" | "to_year", next: string) {
    const current = record(value.cohort);
    const parsed = next === "" ? undefined : Number(next);
    const updated = { ...current, [field]: parsed };
    if (updated.from_year === undefined && updated.to_year === undefined) update("cohort", null);
    else update("cohort", updated);
  }

  function updateScope(field: "type" | "programs", next: string) {
    const current = record(value.program_scope);
    const updated: Record<string, unknown> = { ...current };
    if (field === "programs") updated.programs = next.split(",").map((entry) => entry.trim()).filter(Boolean);
    else {
      updated.type = next;
      updated.programs = current.programs ?? [];
    }
    if (updated.type !== "specific_programs") updated.programs = [];
    update("program_scope", updated);
  }

  return <section className="card stack" aria-labelledby="metadata-title">
    <div className="split-row"><div><p className="eyebrow">Awaiting review</p><h2 id="metadata-title">Detected metadata - review and correct</h2></div><span className="status-pill warning">draft</span></div>
    <div className="metadata-editor-grid">
      <label>Title<input value={text(value.title)} onChange={(event) => update("title", event.target.value)} /></label>
      <label>Document type<input value={text(value.document_type)} onChange={(event) => update("document_type", event.target.value)} /></label>
      <label>Document number<input value={text(value.document_number)} onChange={(event) => update("document_number", event.target.value)} /></label>
      <label>Language<input value={text(value.language)} onChange={(event) => update("language", event.target.value)} /></label>
      <label>Cohort start year<input type="number" min="1900" max="9999" value={fromYear} onChange={(event) => updateCohort("from_year", event.target.value)} /></label>
      <label>Cohort end year<input type="number" min="1900" max="9999" value={toYear} onChange={(event) => updateCohort("to_year", event.target.value)} /></label>
      <label>Programme scope<select value={scopeType} onChange={(event) => updateScope("type", event.target.value)}><option value="all">All programmes</option><option value="non_language_major">Non-language major</option><option value="language_major">Language major</option><option value="specific_programs">Specific programmes</option></select></label>
      {scopeType === "specific_programs" && <label>Programmes (comma separated)<input value={programmeList(scope.programs)} onChange={(event) => updateScope("programs", event.target.value)} /></label>}
      <label className="wide-field">Description<textarea value={text(value.description)} onChange={(event) => update("description", event.target.value)} /></label>
    </div>
    {cohortError && <p className="field-error" role="alert">{cohortError}</p>}
  </section>;
}
