import {
  documentResultSchema,
  indexedChunksSchema,
  jobAcceptedSchema,
  jobStatusSchema,
  KnowledgeError,
  type DocumentResult,
  type JobStatus,
  type IndexedChunks,
  type ReviewDraftUpdate,
  type UploadAccepted,
  uploadAcceptedSchema,
} from "./contracts";

async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    if (response.status === 413) {
      detail = "The PDF exceeds the 50 MiB upload limit.";
    }
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // A non-JSON error still receives a clear status message.
    }
    throw new KnowledgeError(detail, response.status);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new KnowledgeError("The service returned an invalid response.", response.status);
  }
}

export const knowledgeClient = {
  async uploadPdf(file: File, signal?: AbortSignal, skipLlmCorrection = false): Promise<UploadAccepted> {
    const form = new FormData();
    form.append("file", file);
    form.append("skip_llm_correction", String(skipLlmCorrection));
    const body = await responseJson(await fetch("/v1/documents", { method: "POST", body: form, signal }));
    return uploadAcceptedSchema.parse(body);
  },

  async getJob(jobId: string, signal?: AbortSignal): Promise<JobStatus> {
    const body = await responseJson(await fetch(`/v1/jobs/${encodeURIComponent(jobId)}`, { signal }));
    return jobStatusSchema.parse(body);
  },

  async getDocumentResult(documentId: string, signal?: AbortSignal): Promise<DocumentResult> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/result`, { signal }));
    return documentResultSchema.parse(body);
  },

  async saveDocumentReviewDraft(
    documentId: string,
    update: ReviewDraftUpdate,
    signal?: AbortSignal,
  ): Promise<DocumentResult> {
    const body = await responseJson(await fetch(
      `/v1/documents/${encodeURIComponent(documentId)}/review-draft`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
        signal,
      },
    ));
    return documentResultSchema.parse(body);
  },

  async confirmDocument(documentId: string, expectedRevision: number): Promise<string> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_revision: expectedRevision }),
    }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  async getIndexedChunks(documentId: string): Promise<IndexedChunks> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/chunks`));
    return indexedChunksSchema.parse(body);
  },

  async requestCorrections(documentId: string, chunkIds: string[]): Promise<string> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/corrections`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chunk_ids: chunkIds }),
    }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  async acceptSuggestion(suggestionId: string): Promise<string> {
    const body = await responseJson(await fetch(`/v1/corrections/${encodeURIComponent(suggestionId)}/accept`, { method: "POST" }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  async rejectSuggestion(suggestionId: string): Promise<void> {
    await responseJson(await fetch(`/v1/corrections/${encodeURIComponent(suggestionId)}/reject`, { method: "POST" }));
  },

  getDocumentSourceUrl(documentId: string): string {
    return `/v1/documents/${encodeURIComponent(documentId)}/source`;
  },
};
