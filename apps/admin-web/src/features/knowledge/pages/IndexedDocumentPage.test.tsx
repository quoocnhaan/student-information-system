// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { KnowledgeError, indexedChunksSchema, jobStatusSchema, type IndexedChunks, type JobStatus } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { IndexedDocumentPage } from "./IndexedDocumentPage";

vi.mock("../hooks/useIngestionJob", () => ({
  useIngestionJob: () => ({ job: null, connection: "offline" }),
}));

const base: IndexedChunks = {
  document_id: "document:doc_test", pages: [{ page: 1, chunks: [{
    id: "chunk:chunk_test", text: "Original", hierarchy: {}, chunk_index: 0,
    page_start: 1, page_end: 2, embedding_status: "ok", updated_at: "now", correction: null,
  }] }],
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const header = { document_id: base.document_id, process_status: "indexed", source: { original_filename: "test.pdf", mime_type: "application/pdf" }, page_count: 2, created_at: "uploaded", updated_at: "updated", version: "v1", metadata: { title: "Stored title", document_type: "Policy", document_number: null, description: null, language: "en", cohort: null, program_scope: null } };
beforeEach(() => { vi.spyOn(knowledgeClient, "getMetadataOptions").mockResolvedValue({ program_scope_types: ["all", "specific_programs"], majors: [{ key: "english", label: "English major" }, { key: "chinese", label: "Chinese major" }] }); });

function open(data: IndexedChunks = base) {
  vi.spyOn(knowledgeClient, "getIndexedDocument").mockResolvedValue({ ...header, pages: data.pages });
  render(<MemoryRouter initialEntries={["/knowledge/documents/document:doc_test"]}>
    <Routes><Route path="/knowledge/documents/:documentId" element={<IndexedDocumentPage />} /></Routes>
  </MemoryRouter>);
}

it("requests an automatic correction without review controls", async () => {
  const pending: IndexedChunks = { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0], active_job_id: "job:job_correct", correction: { outcome: "pending", job: { id: "job:job_correct", type: "correct_chunks", document_id: base.document_id, status: "running", step: "correcting", progress: 10, version: 1, followup_job_ids: [] }, children: [], chunk_child_ids: [] },
  }] }] };
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(pending);
  const request = vi.spyOn(knowledgeClient, "requestCorrections").mockResolvedValue("job:job_correct");
  open();
  fireEvent.click(await screen.findByRole("button", { name: /^Correct$/ }));
  await waitFor(() => expect(request).toHaveBeenCalledWith(base.document_id, "chunk:chunk_test"));
  expect(await screen.findByText("Correcting...")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Correct page$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Accept$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
});

it("shows an active automatic correction conflict", async () => {
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(base);
  vi.spyOn(knowledgeClient, "requestCorrections").mockRejectedValue(new KnowledgeError("Busy", 409));
  open();
  fireEvent.click(await screen.findByRole("button", { name: /^Correct$/ }));
  expect(await screen.findByText(/already active/)).toBeInTheDocument();
});

const status = (id: string, state: string, type = "correct_chunks"): JobStatus => ({
  id, type, document_id: base.document_id, status: state, step: state,
  progress: 100, version: 1, followup_job_ids: [],
});

function operation(parent: JobStatus, children: JobStatus[] = [], outcome: "pending" | "applied" | "unchanged" | "failed" = "applied"): IndexedChunks {
  return { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0],
    active_job_id: parent.status === "running" ? parent.id : children.find((child) => child.status === "running")?.id,
    correction: { outcome, job: parent, children, chunk_child_ids: children.map((child) => child.id) },
  }] }] };
}

it.each([
  ["running", "pending", "Correcting..."],
  ["failed", "failed", "Correction failed. You can Correct again."],
  ["completed", "unchanged", "No changes needed."],
] as const)("recovers %s correction after reload", async (state, outcome, text) => {
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(operation(status("job:parent", state), [], outcome));
  open(operation(status("job:parent", state), [], outcome));
  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Correct$/ }).hasAttribute("disabled")).toBe(state === "running");
});

it.each([
  ["running", "Updating index..."],
  ["failed", "Indexing failed. Correct again to retry."],
] as const)("recovers %s indexing after reload", async (state, text) => {
  const data = operation(status("job:parent", "completed"), [status("job:child", state, "reembed")]);
  data.pages[0].chunks[0].embedding_status = "stale";
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(data);
  open(data);
  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Correct$/ }).hasAttribute("disabled")).toBe(state === "running");
});

it("makes a stale vector without active work actionable", async () => {
  const data = structuredClone(base);
  data.pages[0].chunks[0].embedding_status = "stale";
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(data);
  open(data);
  expect(await screen.findByText("Index is stale. Correct again to refresh.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Correct$/ })).toBeEnabled();
});

it("waits for its child before reporting selected request indexed", async () => {
  const parent = { ...status("job:parent", "completed"), followup_job_ids: ["job:one"] };
  const children = [status("job:one", "running", "reembed")];
  const pending = operation(parent, children);
  const finished = operation(parent, children.map((child) => ({ ...child, status: "completed" })));
  const read = vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(pending);
  vi.spyOn(knowledgeClient, "requestCorrections").mockResolvedValue(parent.id);
  open();
  fireEvent.click(await screen.findByRole("button", { name: /^Correct$/ }));
  expect(await screen.findByText("Updating index...")).toBeInTheDocument();
  expect(screen.queryByText("Selected request indexed.")).not.toBeInTheDocument();
  read.mockResolvedValue(finished);
  expect(await screen.findByText("Selected request indexed.", {}, { timeout: 3000 })).toBeInTheDocument();
});

it("requires durable operation data and followup arrays in contracts", () => {
  expect(indexedChunksSchema.parse(operation(status("job:parent", "failed"), [], "failed"))).toBeTruthy();
  const { followup_job_ids: omitted, ...incomplete } = status("job:parent", "failed");
  expect(omitted).toEqual([]);
  expect(jobStatusSchema.safeParse(incomplete).success).toBe(false);
});


it("fetches combined detail once and keeps a dirty draft through chunk polling", async () => {
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(base);
  open();
  expect(await screen.findByRole("heading", { name: "Stored title" })).toBeInTheDocument();
  expect(knowledgeClient.getIndexedDocument).toHaveBeenCalledTimes(1);
  expect(knowledgeClient.getIndexedChunks).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit metadata" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Unsaved" } });
  await waitFor(() => expect(knowledgeClient.getIndexedChunks).toHaveBeenCalled(), { timeout: 2500 });
  expect(screen.getByLabelText("Title")).toHaveValue("Unsaved");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getAllByText("Stored title").length).toBeGreaterThan(0);
});

it("saves metadata using its version and uses the saved response", async () => {
  const save = vi.spyOn(knowledgeClient, "updateMetadata").mockResolvedValue({ ...header, version: "v2", metadata: { ...header.metadata, title: "Saved title" } });
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Edit metadata" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: " Saved title " } });
  fireEvent.click(screen.getByRole("button", { name: "Save metadata" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(base.document_id, "v1", { ...header.metadata, title: "Saved title" }));
  expect(await screen.findByText("Metadata saved.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Saved title" })).toBeInTheDocument();
});

it("retains conflicting edits until the user accepts reloading", async () => {
  vi.spyOn(knowledgeClient, "updateMetadata").mockRejectedValue(new KnowledgeError("Metadata version is stale.", 409));
  const discard = vi.spyOn(window, "confirm").mockReturnValue(false);
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Edit metadata" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Unsaved" } });
  fireEvent.click(screen.getByRole("button", { name: "Save metadata" }));
  fireEvent.click(await screen.findByRole("button", { name: "Reload latest metadata" }));
  expect(discard).toHaveBeenCalled();
  expect(screen.getByLabelText("Title")).toHaveValue("Unsaved");
  discard.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Reload latest metadata" }));
  await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Stored title"));
});
