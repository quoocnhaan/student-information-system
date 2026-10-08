import { useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";
import { KnowledgeError, type IndexedMetadata, type DocumentMetadata } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { useMetadataOptions } from "../hooks/useMetadataOptions";
import { metadataErrors, normalizeMetadata } from "../model/metadata";
import { MetadataEditor } from "./MetadataEditor";

function NavigationGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Discard unsaved metadata changes and leave?")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  return null;
}

function readable(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not set";
}

export function IndexedMetadataWorkspace({ initial, onSaved }: { initial: IndexedMetadata; onSaved: (saved: IndexedMetadata) => void }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<DocumentMetadata>(initial.metadata);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const mounted = useRef(true);
  const submitting = useRef(false);
  const options = useMetadataOptions();
  const router = useContext(UNSAFE_DataRouterContext);
  const dirty = editing && JSON.stringify(normalizeMetadata(draft)) !== JSON.stringify(normalizeMetadata(saved.metadata));
  const errors = metadataErrors(draft);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (submitting.current || !dirty || !options.values || needsReload || Object.keys(errors).length) return;
    submitting.current = true; setSaving(true); setMessage(null);
    try {
      const next = await knowledgeClient.updateMetadata(saved.document_id, saved.version, normalizeMetadata(draft));
      if (!mounted.current) return;
      setSaved(next); setDraft(next.metadata); onSaved(next); setEditing(false); setNeedsReload(false); setMessage("Metadata saved.");
    } catch (error) {
      if (!mounted.current) return;
      setNeedsReload(!(error instanceof KnowledgeError) || error.status !== 422);
      setMessage(error instanceof KnowledgeError && error.status === 409
        ? `${error.message} Your edits have been kept.`
        : "Metadata could not be saved. Your edits have been kept. Reload the stored metadata before trying again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function reload() {
    if (dirty && !window.confirm("Reloading will discard your unsaved metadata changes. Continue?")) return;
    try {
      const next = await knowledgeClient.getIndexedDocument(saved.document_id);
      if (!mounted.current) return;
      setSaved(next); setDraft(next.metadata); onSaved(next); setNeedsReload(false); setMessage(null);
    } catch {
      if (mounted.current) setMessage("Unable to reload metadata. Your edits have been kept.");
    }
  }

  const cohort = saved.metadata.cohort;
  const scope = saved.metadata.program_scope;
  return <section className="stack">
    {router && <NavigationGuard dirty={dirty} />}
    {editing ? <>
      <fieldset disabled={saving} style={{ border: 0, padding: 0 }}>
        <MetadataEditor indexed value={draft} onChange={setDraft} options={options.values?.program_scope_types ?? []} majors={options.values?.majors ?? []} errors={errors} />
      </fieldset>
      {options.error && <p className="notice danger">{options.error} <button onClick={options.retry}>Retry metadata options</button></p>}
      <div className="split-row">
        <button className="primary-button" disabled={saving || !dirty || !options.values || needsReload || Object.keys(errors).length > 0} onClick={() => void save()}>{saving ? "Saving..." : "Save metadata"}</button>
        <button className="secondary-button" disabled={saving} onClick={() => { setDraft(saved.metadata); setEditing(false); setMessage(null); }}>Cancel</button>
      </div>
    </> : <section className="card stack">
      <div className="split-row"><h2>Document metadata</h2><button className="secondary-button" onClick={() => { setDraft(saved.metadata); setEditing(true); setMessage(null); }}>Edit metadata</button></div>
      <dl className="metadata-editor-grid">
        {([ ["Title", saved.metadata.title], ["Document type", saved.metadata.document_type], ["Document number", saved.metadata.document_number], ["Language", saved.metadata.language], ["Description", saved.metadata.description] ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{readable(value)}</dd></div>)}
        <div><dt>Cohort</dt><dd>{cohort ? `${String(cohort.from_year)}${cohort.to_year ? ` - ${String(cohort.to_year)}` : ""}` : "Not set"}</dd></div>
        <div><dt>Programme scope</dt><dd>{scope ? `${String(scope.type).replaceAll("_", " ")}${Array.isArray(scope.programs) && scope.programs.length ? `: ${scope.programs.join(", ")}` : ""}` : "Not set"}</dd></div>
        <div><dt>Original filename</dt><dd>{saved.source.original_filename}</dd></div>
        <div><dt>Page count</dt><dd>{saved.page_count ?? "Not set"}</dd></div>
        <div><dt>Uploaded</dt><dd>{saved.created_at}</dd></div>
        <div><dt>Last updated</dt><dd>{saved.updated_at}</dd></div>
        <div><dt>Process status</dt><dd>{saved.process_status}</dd></div>
      </dl>
    </section>}
    {message && <p className="notice" role="status">{message}</p>}
    {needsReload && <button className="secondary-button" disabled={saving} onClick={() => void reload()}>Reload latest metadata</button>}
  </section>;
}
