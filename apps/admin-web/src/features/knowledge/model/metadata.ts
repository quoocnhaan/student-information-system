import type { DocumentMetadata } from "../api/contracts";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function normalizeMetadata(metadata: DocumentMetadata): DocumentMetadata {
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
    cohort: fromYear === undefined && toYear === undefined ? null : { from_year: fromYear, to_year: toYear ?? null },
    program_scope: scopeType === undefined ? null : { type: scopeType, programs: scopeType === "specific_programs" ? scopePrograms : [] },
  };
}


export function metadataErrors(value: DocumentMetadata): Record<string, string> {
  const errors: Record<string, string> = {};
  const limits: Record<string, number> = { title: 500, document_type: 120, document_number: 200, description: 10000, language: 12 };
  for (const [field, limit] of Object.entries(limits)) {
    const entry = value[field as keyof DocumentMetadata];
    if (typeof entry === "string" && entry.trim().length > limit) errors[field] = `Maximum ${limit} characters.`;
  }
  if (value.language?.trim() && value.language.trim().length < 2) errors.language = "Use at least two characters.";
  const cohort = asRecord(value.cohort);
  if (value.cohort) {
    if (!Number.isInteger(cohort.from_year) || Number(cohort.from_year) < 1900 || Number(cohort.from_year) > 9999) errors.cohort = "Enter a start year between 1900 and 9999.";
    if (cohort.to_year != null && (!Number.isInteger(cohort.to_year) || Number(cohort.to_year) < Number(cohort.from_year) || Number(cohort.to_year) > 9999)) errors.cohort = "Enter an end year at or after the start year (up to 9999).";
  }
  const scope = asRecord(value.program_scope);
  if (scope.type === "specific_programs" && (!Array.isArray(scope.programs) || scope.programs.length === 0)) errors.program_scope = "Enter at least one programme.";
  return errors;
}
