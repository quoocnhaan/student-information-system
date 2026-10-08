// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentsPage } from "./DocumentsPage";
import { knowledgeClient } from "../api/knowledgeClient";

const result = { items: [{ document_id: "document:doc_abc", title: "Regulations", original_filename: "rules.pdf", document_type: "Policy", language: "en", page_count: 3, created_at: "2026-10-06T00:00:00Z" }], total: 21, page: 1, page_size: 20, document_types: ["Policy"], languages: ["en"] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("reopens stored documents and applies filters and pagination through the API", async () => {
  const list = vi.spyOn(knowledgeClient, "listIndexedDocuments").mockResolvedValue(result);
  render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "Regulations" })).toHaveAttribute("href", "/knowledge/documents/document%3Adoc_abc");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(list.mock.lastCall?.[0].get("page")).toBe("2"));
  fireEvent.change(screen.getByLabelText("Document type"), { target: { value: "Policy" } });
  await waitFor(() => { expect(list.mock.lastCall?.[0].get("document_type")).toBe("Policy"); expect(list.mock.lastCall?.[0].get("page")).toBe("1"); });
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
  await waitFor(() => expect(list.mock.lastCall?.[0].get("language")).toBe("en"));
  fireEvent.change(screen.getByLabelText("Search documents"), { target: { value: "rules" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(list.mock.lastCall?.[0].get("q")).toBe("rules"));
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await waitFor(() => expect(list.mock.lastCall?.[0].has("q")).toBe(false));
});
it("shows empty results", async () => {
  vi.spyOn(knowledgeClient, "listIndexedDocuments").mockResolvedValue({ ...result, items: [], total: 0 });
  render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
  expect(await screen.findByText("No indexed documents yet")).toBeInTheDocument();
});
it("retries a failed listing", async () => {
  vi.spyOn(knowledgeClient, "listIndexedDocuments").mockRejectedValueOnce(new Error("Library unavailable")).mockResolvedValue(result);
  render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Library unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: "Regulations" })).toBeInTheDocument();
});
