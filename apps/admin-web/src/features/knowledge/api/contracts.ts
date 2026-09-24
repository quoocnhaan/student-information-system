import { z } from "zod";

const recordId = z.string().min(1);

export const uploadAcceptedSchema = z.object({
  document_id: recordId,
  job_id: recordId,
  status: z.string(),
});

export const jobStatusSchema = z.object({
  id: recordId,
  type: z.string().optional(),
  document_id: recordId,
  ocr_draft_id: recordId.nullable().optional(),
  status: z.string(),
  step: z.string(),
  progress: z.number().int().min(0).max(100),
  total_pages: z.number().int().positive().nullable().optional(),
  processed_pages: z.number().int().min(0),
  sequence: z.number().int().positive(),
  updated_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  attempts: z.number().int().min(0),
  max_attempts: z.number().int().positive(),
  next_attempt_at: z.string().nullable().optional(),
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
  metadata: z.object({
    title: z.string().nullable().optional(),
    document_type: z.string().nullable().optional(),
    document_number: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    cohort: z.record(z.unknown()).nullable().optional(),
    program_scope: z.record(z.unknown()).nullable().optional(),
    language: z.string().nullable().optional(),
  }),
  ocr_draft: z.object({
    id: recordId,
    status: z.string(),
    pages: z.array(z.object({
      page: z.number().int().positive(),
      raw_text: z.string(),
      reviewed_text: z.string().nullable().optional(),
    })),
  }),
});

export type UploadAccepted = z.infer<typeof uploadAcceptedSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type DocumentResult = z.infer<typeof documentResultSchema>;

export class KnowledgeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KnowledgeError";
  }
}
