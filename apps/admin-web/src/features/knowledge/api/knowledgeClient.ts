import {
  documentResultSchema,
  indexedDocumentSchema, indexedMetadataSchema, metadataOptionsSchema, indexedMetadataUpdateSchema,
  type IndexedDocument, type IndexedMetadata, type DocumentMetadata,
  indexedDocumentListSchema,
  type IndexedDocumentList,
  indexedChunksSchema,
  jobAcceptedSchema,
  jobStatusSchema,
  KnowledgeError,
  type DocumentResult,
  type JobStatus,
  type IndexedChunks,
  type ConfirmRequest,
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
  async listIndexedDocuments(params: URLSearchParams, signal?: AbortSignal): Promise<IndexedDocumentList> {
    const body = await responseJson(await fetch(`/v1/documents?${params.toString()}`, { signal }));
    return indexedDocumentListSchema.parse(body);
  },

  async uploadPdf(file: File, signal?: AbortSignal): Promise<UploadAccepted> {
    const form = new FormData();
    form.append("file", file);
    const body = await responseJson(await fetch("/v1/documents", { method: "POST", body: form, signal }));
    return uploadAcceptedSchema.parse(body);
  },

  async getJob(jobId: string, signal?: AbortSignal): Promise<JobStatus> {
    const body = await responseJson(await fetch(`/v1/jobs/${encodeURIComponent(jobId)}`, { signal }));
    return jobStatusSchema.parse(body);
  },

  async retryJob(jobId: string): Promise<string> {
    const body = await responseJson(await fetch(`/v1/jobs/${encodeURIComponent(jobId)}/retry`, { method: "POST" }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  async getDocumentDraft(documentId: string, signal?: AbortSignal): Promise<DocumentResult> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/draft`, { signal }));
    return documentResultSchema.parse(body);
  },

  async confirmDocument(documentId: string, confirmation: ConfirmRequest): Promise<string> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(confirmation),
    }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  async getIndexedChunks(documentId: string, signal?: AbortSignal): Promise<IndexedChunks> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/chunks`, { signal }));
    return indexedChunksSchema.parse(body);
  },

  async getIndexedDocument(documentId: string, signal?: AbortSignal): Promise<IndexedDocument> {
    return indexedDocumentSchema.parse(await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}`, { signal })));
  },

  async getMetadataOptions(signal?: AbortSignal): Promise<string[]> {
    return metadataOptionsSchema.parse(await responseJson(await fetch("/v1/documents/metadata-options", { signal }))).program_scope_types;
  },

  async updateMetadata(documentId: string, expectedVersion: string, metadata: DocumentMetadata): Promise<IndexedMetadata> {
    const request = indexedMetadataUpdateSchema.parse({ expected_version: expectedVersion, metadata });
    return indexedMetadataSchema.parse(await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/metadata`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
    })));
  },

  async requestCorrections(documentId: string, chunkId: string): Promise<string> {
    const body = await responseJson(await fetch(`/v1/documents/${encodeURIComponent(documentId)}/corrections`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chunk_id: chunkId }),
    }));
    return jobAcceptedSchema.parse(body).job_id;
  },

  getDocumentSourceUrl(documentId: string): string {
    return `/v1/documents/${encodeURIComponent(documentId)}/source`;
  },
};
