// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentResult } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { DocumentReviewWorkspace } from "./DocumentReviewWorkspace";

vi.mock("react-pdf", () => ({
  Document: ({ children }: { children: unknown }) => <div>{children as React.ReactNode}</div>,
  Page: () => <canvas aria-label="Source PDF page" />,
  pdfjs: { GlobalWorkerOptions: {} },
}));

const result: DocumentResult = {
  document_id: "document:doc_abc",
  process_status: "review",
  source: { original_filename: "source.pdf", mime_type: "application/pdf" },
  page_count: 1,
  metadata: {
    title: "Detected title", document_type: "regulation", document_number: null,
    description: null, cohort: null, program_scope: { type: "all", programs: [] }, language: "en",
  },
  ocr_draft: {
    id: "ocr_draft:ocr_job_abc", status: "draft", revision: 1,
    pages: [{ page: 1, raw_text: "Original OCR", reviewed_text: null }],
  },
};

afterEach(() => vi.restoreAllMocks());

describe("DocumentReviewWorkspace", () => {
  it("saves edited metadata and reviewed Markdown together", async () => {
    const save = vi.spyOn(knowledgeClient, "saveDocumentReviewDraft").mockResolvedValue({
      ...result,
      metadata: { ...result.metadata, title: "Corrected title" },
      ocr_draft: {
        ...result.ocr_draft,
        revision: 2,
        pages: [{ page: 1, raw_text: "Original OCR", reviewed_text: "# Corrected OCR" }],
      },
    });
    render(<DocumentReviewWorkspace initialResult={result} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Corrected title" } });
    fireEvent.change(screen.getByRole("textbox", { name: "OCR Markdown for page 1" }), {
      target: { value: "# Corrected OCR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review draft" }));

    await waitFor(() => expect(save).toHaveBeenCalledWith("document:doc_abc", {
      expected_revision: 1,
      metadata: expect.objectContaining({ title: "Corrected title" }),
      pages: [{ page: 1, reviewed_text: "# Corrected OCR" }],
    }));
    expect(await screen.findByText("Review draft saved.")).toBeInTheDocument();
  });
});
