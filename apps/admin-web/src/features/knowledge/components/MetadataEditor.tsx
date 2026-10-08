import type { DocumentMetadata } from "../api/contracts";

type MetadataEditorProps = {
  value: DocumentMetadata;
  options: string[];
  indexed?: boolean;
  errors?: Record<string, string>;
  onChange: (value: DocumentMetadata) => void;
};

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
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

export function MetadataEditor({ value, onChange, options, indexed = false, errors = {} }: MetadataEditorProps) {
  const cohort = record(value.cohort);
  const scope = record(value.program_scope);
  const scopeType = text(scope.type);
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
    if (field === "type" && next === "") {
      update("program_scope", null);
      return;
    }
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
    <div className="split-row"><div><p className="eyebrow">{indexed ? "Indexed document" : "Awaiting review"}</p><h2 id="metadata-title">{indexed ? "Document metadata" : "Detected metadata - review and correct"}</h2></div>{!indexed && <span className="status-pill warning">draft</span>}</div>
    <div className="metadata-editor-grid">
      <label>Title<input value={text(value.title)} onChange={(event) => update("title", event.target.value)} />{errors.title && <span className="field-error" role="alert">{errors.title}</span>}</label>
      <label>Document type<input value={text(value.document_type)} onChange={(event) => update("document_type", event.target.value)} />{errors.document_type && <span className="field-error" role="alert">{errors.document_type}</span>}</label>
      <label>Document number<input value={text(value.document_number)} onChange={(event) => update("document_number", event.target.value)} />{errors.document_number && <span className="field-error" role="alert">{errors.document_number}</span>}</label>
      <label>Language<input value={text(value.language)} onChange={(event) => update("language", event.target.value)} />{errors.language && <span className="field-error" role="alert">{errors.language}</span>}</label>
      <label>Cohort start year<input type="number" min="1900" max="9999" value={fromYear} onChange={(event) => updateCohort("from_year", event.target.value)} />{errors.cohort && <span className="field-error" role="alert">{errors.cohort}</span>}</label>
      <label>Cohort end year<input type="number" min="1900" max="9999" value={toYear} onChange={(event) => updateCohort("to_year", event.target.value)} /></label>
      <label>Programme scope<select value={scopeType} onChange={(event) => updateScope("type", event.target.value)}><option value="">Not set</option>{scopeType && !options.includes(scopeType) && <option value={scopeType}>{scopeType.replaceAll("_", " ")}</option>}{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select>{errors.program_scope && <span className="field-error" role="alert">{errors.program_scope}</span>}</label>
      {scopeType === "specific_programs" && <label>Programmes (comma separated)<input value={programmeList(scope.programs)} onChange={(event) => updateScope("programs", event.target.value)} /></label>}
      <label className="wide-field">Description<textarea value={text(value.description)} onChange={(event) => update("description", event.target.value)} />{errors.description && <span className="field-error" role="alert">{errors.description}</span>}</label>
    </div>
    {cohortError && <p className="field-error" role="alert">{cohortError}</p>}
  </section>;
}
