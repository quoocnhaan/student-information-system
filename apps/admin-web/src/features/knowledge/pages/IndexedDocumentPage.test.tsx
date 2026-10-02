// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { KnowledgeError, type IndexedChunks } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { IndexedDocumentPage } from "./IndexedDocumentPage";

vi.mock("../hooks/useIngestionJob", () => ({
  useIngestionJob: () => ({ job: null, connection: "offline" }),
}));

const base: IndexedChunks = {
  document_id: "document:doc_test", pages: [{ page: 1, chunks: [{
    id: "chunk:chunk_test", text: "Original", hierarchy: {}, chunk_index: 0,
    page_start: 1, page_end: 2, embedding_status: "ok", updated_at: "now", suggestion: null,
  }] }],
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function open() {
  render(<MemoryRouter initialEntries={["/knowledge/documents/document:doc_test"]}>
    <Routes><Route path="/knowledge/documents/:documentId" element={<IndexedDocumentPage />} /></Routes>
  </MemoryRouter>);
}

it("requests correction, displays a diff, accepts, and shows re-embedding", async () => {
  const ready: IndexedChunks = { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0], suggestion: { id: "correction_suggestion:s1", status: "ready", base_text: "Original", suggested_text: "Corrected" },
  }] }] };
  const stale: IndexedChunks = { ...base, pages: [{ page: 1, chunks: [{ ...base.pages[0].chunks[0], text: "Corrected", embedding_status: "stale", suggestion: null }] }] };
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValueOnce(base).mockResolvedValueOnce(ready).mockResolvedValue(stale);
  const request = vi.spyOn(knowledgeClient, "requestCorrections").mockResolvedValue("job:job_correct");
  const accept = vi.spyOn(knowledgeClient, "acceptSuggestion").mockResolvedValue("job:job_reembed");
  open();
  fireEvent.click(await screen.findByRole("button", { name: /^Correct$/ }));
  await waitFor(() => expect(request).toHaveBeenCalledWith(base.document_id, ["chunk:chunk_test"]));
  expect(await screen.findByText("Suggested: Corrected")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }));
  await waitFor(() => expect(accept).toHaveBeenCalledWith("correction_suggestion:s1"));
  expect(await screen.findByText("Re-embedding...")).toBeInTheDocument();
});

it("shows an outdated message when an accept conflicts", async () => {
  const ready: IndexedChunks = { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0], suggestion: { id: "correction_suggestion:s1", status: "ready", base_text: "Original", suggested_text: "Corrected" },
  }] }] };
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(ready);
  vi.spyOn(knowledgeClient, "acceptSuggestion").mockRejectedValue(new KnowledgeError("Outdated", 409));
  open();
  fireEvent.click(await screen.findByRole("button", { name: /^Accept$/ }));
  expect(await screen.findByText(/Outdated: this chunk/)).toBeInTheDocument();
});
