import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgeError, statusMessageSchema } from "./contracts";
import { knowledgeClient } from "./knowledgeClient";

afterEach(() => vi.unstubAllGlobals());

describe("knowledgeClient", () => {
  it("turns a proxy-generated 413 response into an actionable upload message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("payload too large", { status: 413 })));

    await expect(knowledgeClient.getJob("job:job_abc")).rejects.toEqual(
      new KnowledgeError("The PDF exceeds the 50 MiB upload limit.", 413),
    );
  });

  it("accepts a broker status event without inventing a job type", () => {
    const event = statusMessageSchema.parse({
      event_type: "job.status_changed",
      job_id: "job:job_59f0c6c42cfa4d4785b6039b32cd5377",
      document_id: "document:doc_8306eba316ca45deb232655ba484c20c",
      sequence: 11,
      status: "completed",
      step: "completed",
      progress: 100,
      processed_pages: 4,
      total_pages: 4,
      attempts: 1,
      max_attempts: 3,
      error: null,
      updated_at: "2026-09-23T16:11:31Z",
    });

    expect(event.id).toBe("job:job_59f0c6c42cfa4d4785b6039b32cd5377");
    expect(event.status).toBe("completed");
    expect(event.type).toBeUndefined();
  });
});
