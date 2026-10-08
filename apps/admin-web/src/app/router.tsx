import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { UploadPage } from "../features/knowledge/pages/UploadPage";
import { IngestionPage } from "../features/knowledge/pages/IngestionPage";
import { IndexedDocumentPage } from "../features/knowledge/pages/IndexedDocumentPage";

import { RetrievalPage } from "../features/knowledge/pages/RetrievalPage";
import { DocumentsPage } from "../features/knowledge/pages/DocumentsPage";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/knowledge/documents" replace /> },
      { path: "/knowledge/retrieval", element: <RetrievalPage /> },
      { path: "/knowledge/documents", element: <DocumentsPage /> },
      { path: "/knowledge/documents/new", element: <UploadPage /> },
      { path: "/knowledge/ingestions/:jobId", element: <IngestionPage /> },
      { path: "/knowledge/documents/:documentId", element: <IndexedDocumentPage /> },
    ],
  },
]);
