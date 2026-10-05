// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { UploadPage } from "./UploadPage";
import { knowledgeClient } from "../api/knowledgeClient";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it("uploads a PDF and opens OCR without a skip-correction control", async () => {
  const upload = vi.spyOn(knowledgeClient, "uploadPdf").mockResolvedValue({ document_id: "document:test", job_id: "job:ocr", status: "processing" });
  const { container } = render(<MemoryRouter initialEntries={["/upload"]}><Routes>
    <Route path="/upload" element={<UploadPage />} />
    <Route path="/knowledge/ingestions/:jobId" element={<p>OCR job opened</p>} />
  </Routes></MemoryRouter>);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  const file = new File(["%PDF-test"], "test.pdf", { type: "application/pdf" });
  fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: { item: () => file } } });
  fireEvent.click(screen.getByRole("button", { name: "Start OCR" }));
  await waitFor(() => expect(upload).toHaveBeenCalledWith(file));
  expect(await screen.findByText("OCR job opened")).toBeInTheDocument();
});
