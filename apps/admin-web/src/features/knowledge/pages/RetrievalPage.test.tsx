// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { retrievalClient, type RetrievalOptions, type RetrievalResponse } from "../api/retrievalClient";
import { RetrievalPage } from "./RetrievalPage";

const options: RetrievalOptions = {
  modes: ["search", "lookup", "exact"], search_modes: ["semantic"],
  majors: [{ key: "chinese", label: "Chinese major" }, { key: "non_language", label: "Non-language major" }],
  defaults: { mode: "semantic", limit: 10, page_size: 20, case_sensitive: false },
  limits: { query_length: 4000, document_number_length: 200, limit: 100, page_size: 100, cohort_min: 1900, cohort_max: 9999 },
  documents: [{ document_id: "document:doc_abc", title: "Regulations", document_number: "QD/2021" }], boundaries: ["Indexed text only."],
};
const result: RetrievalResponse = {
  items: [{ chunk_id: "chunk:abc", text: "😀 Straße Straße <script>bad()</script>", document_id: "document:doc_abc", title: "Regulations",
    document_number: "QD/2021", cohort: { from_year: 2023, to_year: null }, program_scope: { type: "all", programs: [] },
    hierarchy: { article_no: 1, clause_no: 2 }, page_start: 1, page_end: 2, chunk_index: 0, embedding_status: "ok",
    source_url: "/v1/documents/document%3Adoc_abc/source", rank: null, scores: {}, occurrences: [{ start: 2, end: 8 }, { start: 9, end: 15 }] }],
  filters: { admin_exploration: true }, total: 21, page: 1, page_size: 20, groups: [], warnings: [],
};
beforeEach(() => { vi.spyOn(retrievalClient, "options").mockResolvedValue(options); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function open() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><RetrievalPage /></MemoryRouter></QueryClientProvider>);
  await screen.findByRole("button", { name: "Retrieve" });
}

it("uses API choices, validates context and submits normalized search inputs", async () => {
  const retrieve = vi.spyOn(retrievalClient, "retrieve").mockResolvedValue({ ...result, items: [], total: 0, page: null, page_size: null });
  await open();
  expect(screen.queryByText(/hybrid/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Query"), { target: { value: "English requirement" } });
  fireEvent.click(screen.getByLabelText("Apply student context"));
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a supported major");
  expect(retrieve).not.toHaveBeenCalled();
  expect(screen.getByRole("option", { name: "Non-language major" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Student cohort"), { target: { value: "2023" } });
  fireEvent.change(screen.getByLabelText("Student major"), { target: { value: "non_language" } });
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  await screen.findByText("No matches.");
  expect(retrieve).toHaveBeenCalledWith("search", { query: "English requirement", student_context: { cohort: 2023, major: "non_language" }, limit: 10, mode: "semantic" }, expect.any(AbortSignal));
});

it("renders code-point highlights safely and links sources with pagination", async () => {
  const retrieve = vi.spyOn(retrievalClient, "retrieve").mockResolvedValue(result);
  await open();
  fireEvent.change(screen.getByLabelText("Retrieval mode"), { target: { value: "exact" } });
  fireEvent.change(screen.getByLabelText("Query"), { target: { value: "strasse" } });
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  expect(await screen.findByRole("link", { name: "Regulations" })).toHaveAttribute("href", "/knowledge/documents/document%3Adoc_abc");
  expect(screen.getByRole("link", { name: "Open source PDF" })).toHaveAttribute("href", "/v1/documents/document%3Adoc_abc/source#page=1");
  expect(document.querySelectorAll("mark")).toHaveLength(2);
  expect(document.querySelector("mark")).toHaveTextContent("Straße");
  expect(document.querySelector("script")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(retrieve.mock.lastCall?.[1].page).toBe(2));
});

it("aborts stale requests on another submission and mode switching", async () => {
  let resolveOld: (value: RetrievalResponse) => void = () => {};
  const retrieve = vi.spyOn(retrievalClient, "retrieve").mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ ...result, total: 0, items: [] });
  await open();
  fireEvent.change(screen.getByLabelText("Query"), { target: { value: "first" } });
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  const firstSignal = retrieve.mock.calls[0][2]!;
  fireEvent.change(screen.getByLabelText("Query"), { target: { value: "second" } });
  fireEvent.click(screen.getByRole("button", { name: "Searching..." }));
  expect(firstSignal.aborted).toBe(true);
  await screen.findByText("No matches.");
  await act(async () => resolveOld(result));
  expect(screen.queryByRole("link", { name: "Regulations" })).not.toBeInTheDocument();
  retrieve.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  const lastSignal = retrieve.mock.lastCall![2]!;
  fireEvent.change(screen.getByLabelText("Retrieval mode"), { target: { value: "lookup" } });
  expect(lastSignal.aborted).toBe(true);
  expect(screen.queryByText("Searching indexed passages...")).not.toBeInTheDocument();
});

it("submits structured lookup with a version discriminator and shows dependency errors", async () => {
  const retrieve = vi.spyOn(retrievalClient, "retrieve").mockRejectedValue(new Error("Retrieval database is unavailable"));
  await open();
  fireEvent.change(screen.getByLabelText("Retrieval mode"), { target: { value: "lookup" } });
  fireEvent.change(screen.getByLabelText("Document number"), { target: { value: "QD/2021" } });
  fireEvent.change(screen.getByLabelText("Article"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Clause (optional)"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Document version (optional)"), { target: { value: "document:doc_abc" } });
  fireEvent.click(screen.getByRole("button", { name: "Retrieve" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retrieval database is unavailable");
  expect(retrieve).toHaveBeenCalledWith("lookup", { document_number: "QD/2021", article: 1, clause: 2, document_id: "document:doc_abc", page: 1, page_size: 20 }, expect.any(AbortSignal));
  expect(screen.queryByText("No matches.")).not.toBeInTheDocument();
});

it("shows option failures and retries", async () => {
  vi.mocked(retrievalClient.options).mockRejectedValueOnce(new Error("offline"));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><RetrievalPage /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Retrieval options are unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry options" }));
  await screen.findByRole("button", { name: "Retrieve" });
});
