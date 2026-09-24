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

  it("saves review metadata and only the changed OCR pages", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      document_id: "document:doc_abc",
      process_status: "review",
      source: { original_filename: "source.pdf", mime_type: "application/pdf" },
      page_count: 1,
      metadata: {
        title: "Corrected title", document_type: "regulation", document_number: null,
        description: null, cohort: null, program_scope: null, language: "en",
      },
      ocr_draft: {
        id: "ocr_draft:ocr_job_abc", status: "draft", revision: 2,
        pages: [{ page: 1, raw_text: "Original", reviewed_text: "# Corrected" }],
      },
    }), { status: 200 })));

    const result = await knowledgeClient.saveDocumentReviewDraft("document:doc_abc", {
      expected_revision: 1,
      metadata: {
        title: "Corrected title", document_type: "regulation", document_number: null,
        description: null, cohort: null, program_scope: null, language: "en",
      },
      pages: [{ page: 1, reviewed_text: "# Corrected" }],
    });

    expect(result.ocr_draft.revision).toBe(2);
    expect(fetch).toHaveBeenCalledWith(
      "/v1/documents/document%3Adoc_abc/review-draft",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
