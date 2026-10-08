// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { JobStatus } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { useIngestionJob } from "./useIngestionJob";

const failedJob = (id: string, version: number): JobStatus => ({
  id,
  type: "ocr",
  document_id: "document:doc_a",
  status: "failed",
  step: "failed",
  progress: 100,
  followup_job_ids: [], version,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("ignores stale and equal WebSocket versions and accepts a newer update", async () => {
  vi.spyOn(knowledgeClient, "getJob").mockResolvedValue({ ...failedJob("job:live", 5), status: "running" });
  const sockets: FakeWebSocket[] = [];
  class FakeWebSocket {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: (() => void) | null = null;
    constructor() { sockets.push(this); }
    send() {}
    close() {}
    emit(version: number) {
      this.onmessage?.({ data: JSON.stringify({
        ...failedJob("job:live", version), status: "running",
        event_type: "job.status_changed", job_id: "job:live",
      }) } as MessageEvent);
    }
  }
  vi.stubGlobal("WebSocket", FakeWebSocket);
  const { result } = renderHook(() => useIngestionJob("job:live"));
  await waitFor(() => expect(result.current.job?.version).toBe(5));
  act(() => { sockets[0].emit(4); sockets[0].emit(5); });
  expect(result.current.job?.version).toBe(5);
  act(() => sockets[0].emit(6));
  expect(result.current.job?.version).toBe(6);
});

it("accepts a new job with a lower version after the job ID changes", async () => {
  vi.spyOn(knowledgeClient, "getJob").mockImplementation(async (id) =>
    id === "job:first" ? failedJob(id, 10) : failedJob(id, 1));

  const { result, rerender } = renderHook(({ jobId }) => useIngestionJob(jobId), {
    initialProps: { jobId: "job:first" },
  });
  await waitFor(() => expect(result.current.job?.id).toBe("job:first"));

  rerender({ jobId: "job:second" });
  await waitFor(() => expect(result.current.job?.id).toBe("job:second"));
  expect(result.current.job?.version).toBe(1);
});

it("loads raw review immediately when OCR completes", async () => {
  vi.spyOn(knowledgeClient, "getJob").mockResolvedValue({ ...failedJob("job:ocr", 2), status: "completed", error: null, progress: 100 });
  const rawReview = {
    document_id: "document:doc_a", process_status: "review", source: { original_filename: "test.pdf", mime_type: "application/pdf" },
    metadata: { title: "Raw title" }, ocr_draft: { id: "ocr_draft:test", status: "draft", revision: 1, pages: [{ page: 1, raw_text: "Raw text" }] },
  };
  const read = vi.spyOn(knowledgeClient, "getDocumentDraft").mockResolvedValue(rawReview);
  const { result } = renderHook(() => useIngestionJob("job:ocr"));
  await waitFor(() => expect(result.current.result).toEqual(rawReview));
  expect(read).toHaveBeenCalledWith("document:doc_a", expect.any(AbortSignal));
  expect(knowledgeClient.getJob).toHaveBeenCalledTimes(1);
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
