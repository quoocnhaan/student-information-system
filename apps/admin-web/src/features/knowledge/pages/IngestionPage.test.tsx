// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { knowledgeClient } from "../api/knowledgeClient";
import { useIngestionJob } from "../hooks/useIngestionJob";
import { IngestionPage } from "./IngestionPage";

vi.mock("../hooks/useIngestionJob", () => ({ useIngestionJob: vi.fn() }));

const job = {
  id: "job:job_a", document_id: "document:doc_a", type: "index", status: "failed",
  step: "failed", progress: 100, followup_job_ids: [], sequence: 2,
  retry_available: true, error: "Index commit timed out",
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

beforeEach(() => {
  vi.mocked(useIngestionJob).mockReturnValue({ job, result: null, loading: false, connection: "live", error: null });
});

it("retries indexing only after a click and reports rejection", async () => {
  const retry = vi.spyOn(knowledgeClient, "retryJob").mockRejectedValue(new Error("Confirmed input is missing"));
  render(<MemoryRouter><IngestionPage /></MemoryRouter>);
  expect(screen.getByText("Index commit timed out")).toBeInTheDocument();
  expect(retry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry indexing" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Confirmed input is missing"));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(retry).toHaveBeenCalledWith(job.id);
});

it("hides Retry when the job is ineligible", () => {
  vi.mocked(useIngestionJob).mockReturnValue({ job: { ...job, retry_available: false }, result: null, loading: false, connection: "live", error: null });
  render(<MemoryRouter><IngestionPage /></MemoryRouter>);
  expect(screen.queryByRole("button", { name: "Retry indexing" })).not.toBeInTheDocument();
});
