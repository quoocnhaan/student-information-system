import { Link, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/knowledge/documents">Knowledge Review</Link>
        <nav className="library-nav" aria-label="Knowledge navigation"><Link to="/knowledge/documents">Documents</Link><Link to="/knowledge/documents/new">Upload</Link><Link to="/knowledge/retrieval">Retrieval</Link></nav>
        <span className="brand-detail">PDF ingestion and OCR comparison</span>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
