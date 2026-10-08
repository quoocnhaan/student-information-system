import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { retrievalClient, type RetrievalMode, type RetrievalResponse } from "../api/retrievalClient";
import { LiteralHighlight } from "../components/LiteralHighlight";

const labels: Record<RetrievalMode, string> = { search: "Semantic search", lookup: "Article / clause lookup", exact: "Exact text lookup" };

export function RetrievalPage() {
  const options = useQuery({ queryKey: ["retrieval-options"], queryFn: ({ signal }) => retrievalClient.options(signal) });
  const [mode, setMode] = useState<RetrievalMode>("search");
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState("");
  const [article, setArticle] = useState("");
  const [clause, setClause] = useState("");
  const [contextEnabled, setContextEnabled] = useState(false);
  const [cohort, setCohort] = useState("");
  const [major, setMajor] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchMode, setSearchMode] = useState("");
  const [size, setSize] = useState("");
  const [result, setResult] = useState<RetrievalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  const submitted = useRef<{ mode: RetrievalMode; body: Record<string, unknown> } | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  function switchMode(next: RetrievalMode) {
    active.current?.abort(); submitted.current = null;
    setMode(next); setResult(null); setError(null); setLoading(false); setSize("");
  }

  async function run(requestMode: RetrievalMode, body: Record<string, unknown>) {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    submitted.current = { mode: requestMode, body };
    setLoading(true); setResult(null); setError(null);
    try {
      const response = await retrievalClient.retrieve(requestMode, body, controller.signal);
      if (!controller.signal.aborted) setResult(response);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Retrieval failed.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    active.current?.abort(); setLoading(false); setResult(null);
    const config = options.data;
    if (!config) return;
    const body: Record<string, unknown> = {};
    if (contextEnabled) {
      if (!cohort.trim() || !Number.isInteger(Number(cohort)) || Number(cohort) < config.limits.cohort_min || Number(cohort) > config.limits.cohort_max || !config.majors.some((choice) => choice.key === major)) {
        setError("Choose a supported major and enter a valid cohort year."); return;
      }
      body.student_context = { cohort: Number(cohort), major };
    }
    if (mode === "lookup") {
      if (!number.trim() || !article || !Number.isInteger(Number(article)) || Number(article) < 1 || (clause && (!Number.isInteger(Number(clause)) || Number(clause) < 1))) {
        setError("Enter a document number and a positive article number; clause is optional."); return;
      }
      body.document_number = number; body.article = Number(article);
      if (clause) body.clause = Number(clause);
      if (documents[0]) body.document_id = documents[0];
    } else {
      if (!query.trim()) { setError("Enter a query with at least one non-whitespace character."); return; }
      body.query = query;
      if (documents.length) body.document_ids = documents;
    }
    const count = size ? Number(size) : mode === "search" ? config.defaults.limit : config.defaults.page_size;
    if (mode === "search") { body.limit = count; body.mode = searchMode || config.defaults.mode; }
    else { body.page = 1; body.page_size = count; }
    if (mode === "exact") body.case_sensitive = caseSensitive;
    void run(mode, body);
  }

  function paginate(page: number) {
    if (submitted.current) void run(submitted.current.mode, { ...submitted.current.body, page });
  }

  const config = options.data;
  return <div className="stack">
    <div><p className="eyebrow">Knowledge testing</p><h1>Retrieval</h1><p>Find passages and compare student applicability.</p></div>
    {options.isPending && <p role="status">Loading retrieval options...</p>}
    {options.isError && <p className="notice danger" role="alert">Retrieval options are unavailable. <button onClick={() => void options.refetch()}>Retry options</button></p>}
    {config && <>
      <form className="card stack" onSubmit={submit}>
        <label>Retrieval mode<select value={mode} onChange={(event) => switchMode(event.target.value as RetrievalMode)}>{config.modes.map((choice) => <option key={choice} value={choice}>{labels[choice]}</option>)}</select></label>
        {mode === "search" && config.search_modes.length > 1 && <label>Search ranking<select value={searchMode || config.defaults.mode} onChange={(event) => setSearchMode(event.target.value)}>{config.search_modes.map((choice) => <option key={choice}>{choice}</option>)}</select></label>}
        {mode === "lookup" ? <div className="metadata-editor-grid">
          <label>Document number<input value={number} maxLength={config.limits.document_number_length} onChange={(event) => setNumber(event.target.value)} /></label>
          <label>Article<input type="number" min="1" step="1" value={article} onChange={(event) => setArticle(event.target.value)} /></label>
          <label>Clause (optional)<input type="number" min="1" step="1" value={clause} onChange={(event) => setClause(event.target.value)} /></label>
        </div> : <label>Query<textarea value={query} maxLength={config.limits.query_length} onChange={(event) => setQuery(event.target.value)} /></label>}
        {mode === "exact" && <label><input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} /> Case sensitive</label>}
        <label><input type="checkbox" checked={contextEnabled} onChange={(event) => setContextEnabled(event.target.checked)} /> Apply student context</label>
        {contextEnabled ? <div className="metadata-editor-grid">
          <label>Student cohort<input type="number" min={config.limits.cohort_min} max={config.limits.cohort_max} value={cohort} onChange={(event) => setCohort(event.target.value)} /></label>
          <label>Student major<select value={major} onChange={(event) => setMajor(event.target.value)}><option value="">Choose a major</option>{config.majors.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}</select></label>
        </div> : <p className="notice">Admin exploration: cohort and major restrictions are not applied.</p>}
        <label>{mode === "lookup" ? "Document version (optional)" : "Documents (optional)"}<select multiple={mode !== "lookup"} value={mode === "lookup" ? documents[0] ?? "" : documents} onChange={(event) => setDocuments(Array.from(event.target.selectedOptions, (option) => option.value).filter(Boolean))}>
          {mode === "lookup" && <option value="">All document versions</option>}
          {config.documents.map((document) => <option key={document.document_id} value={document.document_id}>{document.title ?? document.document_id}{document.document_number ? ` (${document.document_number})` : ""}</option>)}
        </select></label>
        <label>{mode === "search" ? "Result limit" : "Matches per page"}<input type="number" min="1" max={mode === "search" ? config.limits.limit : config.limits.page_size} value={size || (mode === "search" ? config.defaults.limit : config.defaults.page_size)} onChange={(event) => setSize(event.target.value)} /></label>
        <button className="primary-button" type="submit">{loading ? "Searching..." : "Retrieve"}</button>
      </form>
      <details className="card"><summary>Search boundaries</summary>{config.boundaries.map((boundary) => <p key={boundary}>{boundary}</p>)}</details>
    </>}
    {loading && <p role="status">Searching indexed passages...</p>}
    {error && <p className="notice danger" role="alert">{error}</p>}
    {result && <section className="stack" aria-label="Retrieval results">
      <p role="status">{result.total === 0 ? "No matches." : `${result.total} matching passages${result.page ? ` · Page ${result.page}` : ""}.`}</p>
      <p>{result.filters.admin_exploration ? "Effective filters: active, indexed documents; admin exploration." : `Effective student context: ${JSON.stringify(result.filters.student_context)}`}</p>
      {result.warnings.map((warning) => <p className="notice" key={warning}>{warning}</p>)}
      {result.groups.length > 1 && <p>Document versions: {result.groups.map((group) => `${group.title ?? group.document_id} (${group.total})`).join("; ")}</p>}
      {result.items.map((item) => <article className="card stack" key={item.chunk_id}>
        <h2><Link to={`/knowledge/documents/${encodeURIComponent(item.document_id)}`}>{item.title ?? item.document_id}</Link></h2>
        <p>{item.document_number ?? "No document number"} · Pages {item.page_start}–{item.page_end} · Chunk {item.chunk_index}{item.hierarchy.article_no != null ? ` · Article ${item.hierarchy.article_no}` : ""}{item.hierarchy.clause_no != null ? ` · Clause ${item.hierarchy.clause_no}` : ""} · Embedding {item.embedding_status}</p>
        <p>Applicability: {item.cohort ? `${item.cohort.from_year}–${item.cohort.to_year ?? "ongoing"}` : "Any cohort"}; {item.program_scope ? `${String(item.program_scope.type).replaceAll("_", " ")}${Array.isArray(item.program_scope.programs) && item.program_scope.programs.length ? ` (${item.program_scope.programs.join(", ")})` : ""}` : "Scope unknown"}</p>
        {item.rank != null && <p>Rank {item.rank} · {Object.entries(item.scores).map(([name, score]) => `${name}: ${score.toFixed(4)}`).join(" · ")}</p>}
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><LiteralHighlight text={item.text} occurrences={item.occurrences} /></div>
        <a href={`${item.source_url}#page=${item.page_start}`} target="_blank" rel="noreferrer">Open source PDF</a>
      </article>)}
      {result.page != null && result.page_size != null && <div className="split-row">
        <button disabled={result.page <= 1} onClick={() => paginate(result.page! - 1)}>Previous</button>
        <button disabled={result.page * result.page_size >= result.total} onClick={() => paginate(result.page! + 1)}>Next</button>
      </div>}
    </section>}
  </div>;
}
