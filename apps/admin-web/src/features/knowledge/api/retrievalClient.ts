import { z } from "zod";
import { KnowledgeError, majorOptionSchema } from "./contracts";

export const retrievalOptionsSchema = z.object({
  modes: z.array(z.enum(["search", "lookup", "exact"])), search_modes: z.array(z.string()),
  majors: z.array(majorOptionSchema),
  defaults: z.object({ mode: z.string(), limit: z.number(), page_size: z.number(), case_sensitive: z.boolean() }),
  limits: z.record(z.number()),
  documents: z.array(z.object({ document_id: z.string(), title: z.string().nullable(), document_number: z.string().nullable() })),
  boundaries: z.array(z.string()),
});
export const retrievalResponseSchema = z.object({
  items: z.array(z.object({
    chunk_id: z.string(), text: z.string(), document_id: z.string(), title: z.string().nullable(),
    document_number: z.string().nullable(), cohort: z.record(z.unknown()).nullable(), program_scope: z.record(z.unknown()).nullable(),
    hierarchy: z.record(z.unknown()), page_start: z.number(), page_end: z.number(), chunk_index: z.number(),
    embedding_status: z.string(), source_url: z.string(), rank: z.number().nullable(), scores: z.record(z.number()),
    occurrences: z.array(z.object({ start: z.number().int(), end: z.number().int() })),
  })),
  filters: z.record(z.unknown()), total: z.number(), page: z.number().nullable(), page_size: z.number().nullable(),
  groups: z.array(z.object({ document_id: z.string(), title: z.string().nullable(), total: z.number() })),
  warnings: z.array(z.string()),
});
export type RetrievalOptions = z.infer<typeof retrievalOptionsSchema>;
export type RetrievalResponse = z.infer<typeof retrievalResponseSchema>;
export type RetrievalMode = "search" | "lookup" | "exact";

async function json(response: Response): Promise<unknown> {
  if (!response.ok) {
    let message = `Retrieval request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (response.status === 422) message = "Check the query, student context and document filters.";
    } catch { /* Keep a readable fallback for proxy errors. */ }
    throw new KnowledgeError(message, response.status);
  }
  return response.json();
}

export const retrievalClient = {
  async options(signal?: AbortSignal): Promise<RetrievalOptions> {
    return retrievalOptionsSchema.parse(await json(await fetch("/v1/retrieval/options", { signal })));
  },
  async retrieve(mode: RetrievalMode, body: Record<string, unknown>, signal?: AbortSignal): Promise<RetrievalResponse> {
    return retrievalResponseSchema.parse(await json(await fetch(`/v1/retrieval/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
    })));
  },
};
