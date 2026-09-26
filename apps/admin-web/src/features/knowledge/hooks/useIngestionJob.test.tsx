// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { JobStatus } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { useIngestionJob } from "./useIngestionJob";

const failedJob = (id: string, sequence: number): JobStatus => ({
  id,
  type: "ocr",
  document_id: "document:doc_a",
  status: "failed",
  step: "failed",
  progress: 100,
  processed_pages: 0,
  sequence,
  attempts: 1,
  max_attempts: 3,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("accepts a new job with a lower sequence after the job ID changes", async () => {
  vi.spyOn(knowledgeClient, "getJob").mockImplementation(async (id) =>
    id === "job:first" ? failedJob(id, 10) : failedJob(id, 1));

  const { result, rerender } = renderHook(({ jobId }) => useIngestionJob(jobId), {
    initialProps: { jobId: "job:first" },
  });
  await waitFor(() => expect(result.current.job?.id).toBe("job:first"));

  rerender({ jobId: "job:second" });
  await waitFor(() => expect(result.current.job?.id).toBe("job:second"));
  expect(result.current.job?.sequence).toBe(1);
});

it("can recover through a WebSocket snapshot after the first REST read fails", async () => {
  vi.spyOn(knowledgeClient, "getJob").mockRejectedValue(new Error("temporary database error"));
  class FakeWebSocket {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: (() => void) | null = null;

    constructor() {
      queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({
        ...failedJob("job:recovered", 1),
        id: undefined,
        event_type: "job.status_snapshot",
        job_id: "job:recovered",
      }) } as MessageEvent));
    }

    send() {}
    close() { this.onclose?.(); }
  }
  vi.stubGlobal("WebSocket", FakeWebSocket);

  const { result } = renderHook(() => useIngestionJob("job:recovered"));
  await waitFor(() => expect(result.current.job?.id).toBe("job:recovered"));
  expect(result.current.error).toBeNull();
});
