import { z } from "zod";

const recordId = z.string().min(1);

export const documentMetadataSchema = z.object({
  title: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cohort: z.record(z.unknown()).nullable().optional(),
  program_scope: z.record(z.unknown()).nullable().optional(),
  language: z.string().nullable().optional(),
});

export const uploadAcceptedSchema = z.object({
  document_id: recordId,
  job_id: recordId,
  status: z.string(),
});

export const jobStatusSchema = z.object({
  id: recordId,
  type: z.string().optional(),
  document_id: recordId,
  next_job_id: recordId.nullable().optional(),
  followup_job_ids: z.array(recordId),
  status: z.string(),
  step: z.string(),
  progress: z.number().int().min(0).max(100),
  sequence: z.number().int().positive(),
  updated_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  retry_available: z.boolean().optional(),
});

export const statusMessageSchema = jobStatusSchema.omit({ id: true }).extend({
  event_type: z.enum(["job.status_snapshot", "job.status_changed"]),
  job_id: recordId,
}).transform((value) => ({
  ...value,
  id: value.job_id,
}));

export const documentResultSchema = z.object({
  document_id: recordId,
  process_status: z.string(),
  source: z.object({
    original_filename: z.string(),
    mime_type: z.string(),
  }),
  page_count: z.number().int().positive().nullable().optional(),
  metadata: documentMetadataSchema,
  ocr_draft: z.object({
    id: recordId,
    status: z.string(),
    revision: z.number().int().positive().default(1),
    pages: z.array(z.object({
      page: z.number().int().positive(),
      raw_text: z.string(),
    })),
  }),
});

export const confirmRequestSchema = z.object({
  expected_revision: z.number().int().positive(),
  metadata: documentMetadataSchema,
  page_edits: z.array(z.object({
    page: z.number().int().positive(),
    reviewed_text: z.string(),
  })),
  selected_pages: z.array(z.number().int().positive()).min(1),
});

export const jobAcceptedSchema = z.object({ job_id: recordId });
export const indexedChunksSchema = z.object({
  document_id: recordId,
  pages: z.array(z.object({
    page: z.number().int().positive(),
    chunks: z.array(z.object({
      id: recordId, text: z.string(), hierarchy: z.record(z.unknown()),
      chunk_index: z.number().int(), page_start: z.number().int(), page_end: z.number().int(),
      embedding_status: z.enum(["ok", "stale"]), updated_at: z.string(),
      active_job_id: recordId.nullable().optional(),
      last_embedding_job_id: recordId.nullable().optional(),
      correction: z.object({
        input_id: recordId, outcome: z.enum(["pending", "applied", "unchanged", "failed"]),
        job: jobStatusSchema, children: z.array(jobStatusSchema), chunk_child_ids: z.array(recordId),
      }).nullable(),
    })),
  })),
});

export type UploadAccepted = z.infer<typeof uploadAcceptedSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type DocumentResult = z.infer<typeof documentResultSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type ConfirmRequest = z.infer<typeof confirmRequestSchema>;
export type IndexedChunks = z.infer<typeof indexedChunksSchema>;

export class KnowledgeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KnowledgeError";
  }
}
