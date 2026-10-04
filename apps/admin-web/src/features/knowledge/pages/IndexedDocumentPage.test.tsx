// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
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

function open() {
  render(<MemoryRouter initialEntries={["/knowledge/documents/document:doc_test"]}>
    <Routes><Route path="/knowledge/documents/:documentId" element={<IndexedDocumentPage />} /></Routes>
  </MemoryRouter>);
}

it("requests an automatic correction without review controls", async () => {
  const pending: IndexedChunks = { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0], active_job_id: "job:job_correct", correction: { input_id: "chunk_correction_input:input_test", outcome: "pending", job: { id: "job:job_correct", type: "correct_chunks", document_id: base.document_id, status: "running", step: "correcting", progress: 10, sequence: 1, followup_job_ids: [] }, children: [], chunk_child_ids: [] },
  }] }] };
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValueOnce(base).mockResolvedValue(pending);
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
  progress: 100, sequence: 1, followup_job_ids: [],
});

function operation(parent: JobStatus, children: JobStatus[] = [], outcome: "pending" | "applied" | "unchanged" | "failed" = "applied"): IndexedChunks {
  return { ...base, pages: [{ page: 1, chunks: [{
    ...base.pages[0].chunks[0],
    active_job_id: parent.status === "running" ? parent.id : children.find((child) => child.status === "running")?.id,
    correction: { input_id: "chunk_correction_input:input_test", outcome, job: parent, children, chunk_child_ids: children.map((child) => child.id) },
  }] }] };
}

it.each([
  ["running", "pending", "Correcting..."],
  ["failed", "failed", "Correction failed. You can Correct again."],
  ["completed", "unchanged", "No changes needed."],
] as const)("recovers %s correction after reload", async (state, outcome, text) => {
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(operation(status("job:parent", state), [], outcome));
  open();
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
  open();
  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Correct$/ }).hasAttribute("disabled")).toBe(state === "running");
});

it("makes a stale vector without active work actionable", async () => {
  const data = structuredClone(base);
  data.pages[0].chunks[0].embedding_status = "stale";
  vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValue(data);
  open();
  expect(await screen.findByText("Index is stale. Correct again to refresh.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Correct$/ })).toBeEnabled();
});

it("waits for its child before reporting selected request indexed", async () => {
  const parent = { ...status("job:parent", "completed"), followup_job_ids: ["job:one"] };
  const children = [status("job:one", "running", "reembed")];
  const pending = operation(parent, children);
  const finished = operation(parent, children.map((child) => ({ ...child, status: "completed" })));
  const read = vi.spyOn(knowledgeClient, "getIndexedChunks").mockResolvedValueOnce(base).mockResolvedValue(pending);
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
