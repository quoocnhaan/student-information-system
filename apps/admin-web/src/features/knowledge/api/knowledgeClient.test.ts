import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgeError, statusMessageSchema } from "./contracts";
import { knowledgeClient } from "./knowledgeClient";

afterEach(() => vi.unstubAllGlobals());

describe("knowledgeClient", () => {
  it("posts one chunk ID for correction", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ job_id: "job:correction" }), { status: 202 })));
    await knowledgeClient.requestCorrections("document:doc_test", "chunk:chunk_test");
    expect(fetch).toHaveBeenCalledWith("/v1/documents/document%3Adoc_test/corrections", expect.objectContaining({
      method: "POST", body: JSON.stringify({ chunk_id: "chunk:chunk_test" }),
    }));
  });

  it("turns a proxy-generated 413 response into an actionable upload message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("payload too large", { status: 413 })));

    await expect(knowledgeClient.getJob("job:job_abc")).rejects.toEqual(
      new KnowledgeError("The PDF exceeds the 50 MiB upload limit.", 413),
    );
  });

  it("accepts a database status event without inventing a job type", () => {
    const event = statusMessageSchema.parse({
      event_type: "job.status_changed",
      job_id: "job:job_59f0c6c42cfa4d4785b6039b32cd5377",
      document_id: "document:doc_8306eba316ca45deb232655ba484c20c",
      sequence: 11,
      status: "completed",
      step: "completed",
      progress: 100,
      followup_job_ids: [], error: null,
      updated_at: "2026-09-23T16:11:31Z",
    });

    expect(event.id).toBe("job:job_59f0c6c42cfa4d4785b6039b32cd5377");
    expect(event.status).toBe("completed");
    expect(event.type).toBeUndefined();
  });

  it("posts the complete confirmation payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      document_id: "document:doc_abc", job_id: "job:job_index",
    }), { status: 202 })));

    const jobId = await knowledgeClient.confirmDocument("document:doc_abc", {
      expected_revision: 1,
      metadata: {
        title: "Corrected title", document_type: "regulation", document_number: null,
        description: null, cohort: null, program_scope: null, language: "en",
      },
      page_edits: [{ page: 1, reviewed_text: "# Corrected" }],
      selected_pages: [1],
    });

    expect(jobId).toBe("job:job_index");
    expect(fetch).toHaveBeenCalledWith(
      "/v1/documents/document%3Adoc_abc/confirm",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
