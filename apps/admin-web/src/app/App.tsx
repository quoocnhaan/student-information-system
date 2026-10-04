import { Link, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/knowledge/documents/new">Knowledge Review</Link>
        <span className="brand-detail">PDF ingestion and OCR comparison</span>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
