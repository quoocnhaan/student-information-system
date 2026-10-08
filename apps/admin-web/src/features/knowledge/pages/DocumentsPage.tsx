import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type IndexedDocumentList } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";

const PAGE_SIZE = 20;

export function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const documentType = params.get("document_type") ?? "";
  const language = params.get("language") ?? "";
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [query, setQuery] = useState(search);
  const [data, setData] = useState<IndexedDocumentList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { setQuery(search); }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    const request = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) request.set("q", search);
    if (documentType) request.set("document_type", documentType);
    if (language) request.set("language", language);
    void knowledgeClient.listIndexedDocuments(request, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((caught: unknown) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load documents.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, documentType, language, page, refresh]);

  function update(field: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(field, value); else next.delete(field);
    if (field !== "page") next.delete("page");
    setParams(next);
  }
  const types = [...new Set([...(data?.document_types ?? []), ...(documentType ? [documentType] : [])])];
  const languages = [...new Set([...(data?.languages ?? []), ...(language ? [language] : [])])];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return <section className="stack">
    <div className="split-row">
      <div><p className="eyebrow">Knowledge library</p><h1>Indexed documents</h1>
        <p className="lead">Browse your indexed PDFs and reopen their content.</p></div>
      <Link className="primary-button" to="/knowledge/documents/new">Upload a PDF</Link>
    </div>
    <form className="card document-filters" onSubmit={(event) => { event.preventDefault(); update("q", query.trim()); }}>
      <label>Search documents<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, filename or document number" /></label>
      <label>Document type<select value={documentType} onChange={(event) => update("document_type", event.target.value)}>
        <option value="">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}
      </select></label>
      <label>Language<select value={language} onChange={(event) => update("language", event.target.value)}>
        <option value="">All languages</option>{languages.map((item) => <option key={item} value={item}>{item}</option>)}
      </select></label>
      <button className="primary-button" type="submit">Search</button>
      <button className="secondary-button" type="button" onClick={() => { setQuery(""); setParams({}); }}>Clear filters</button>
    </form>
    <div className="split-row"><p className="muted" role="status">{loading ? "Loading documents..." : error ? "Documents unavailable" : `${data?.total ?? 0} indexed documents`}</p>
      <button className="secondary-button" type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh</button></div>
    {error && <div className="notice danger" role="alert"><p>{error}</p><button className="text-button" type="button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
    {!loading && !error && data && <>
      {data.items.length === 0 ? <div className="card stack"><h2>{search || documentType || language ? "No matching documents" : page > 1 ? "No documents on this page" : "No indexed documents yet"}</h2>
        <p>{search || documentType || language ? "Try another search or clear the filters." : page > 1 ? "Go back to an earlier page." : "Upload a PDF, review it, and confirm indexing to see it here."}</p></div>
        : <div className="card document-table-wrap"><table className="document-table"><caption className="sr-only">Indexed documents</caption>
          <thead><tr><th scope="col">Document</th><th scope="col">Type</th><th scope="col">Language</th><th scope="col">Pages</th><th scope="col">Uploaded</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={item.document_id}>
            <td><Link className="document-title" to={`/knowledge/documents/${encodeURIComponent(item.document_id)}`}>{item.title || item.original_filename}</Link>
              <small className="muted document-filename">{item.original_filename}{item.document_number ? ` · ${item.document_number}` : ""}</small></td>
            <td>{item.document_type || "—"}</td><td>{item.language || "—"}</td><td>{item.page_count ?? "—"}</td>
            <td>{Number.isNaN(Date.parse(item.created_at)) ? "—" : new Date(item.created_at).toLocaleDateString()}</td>
          </tr>)}</tbody></table></div>}
      <nav className="split-row" aria-label="Document pagination">
        <button className="secondary-button" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>Previous</button>
        <span>Page {page} of {Math.max(page, totalPages)}</span>
        <button className="secondary-button" disabled={page >= totalPages} onClick={() => update("page", String(page + 1))}>Next</button>
      </nav>
    </>}
  </section>;
}
