import type { JobStatus } from "../api/contracts";

const stepLabels: Record<string, string> = {
  queued: "Queued for processing",
  claimed: "Worker claimed the job",
  ocr: "Reading PDF pages",
  detecting_metadata: "Detecting metadata",
  saving_draft: "Saving OCR draft",
  retry_scheduled: "Retry scheduled",
  completed: "Completed",
  failed: "Failed",
};

export function jobStepLabel(step: string): string {
  return stepLabels[step] ?? step.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function jobTone(job: JobStatus): "active" | "success" | "warning" | "danger" {
  if (job.status === "completed") return "success";
  if (job.status === "failed") return "danger";
  if (job.step === "retry_scheduled") return "warning";
  return "active";
}

export function isTerminal(job: JobStatus | null): boolean {
  return job?.status === "completed" || job?.status === "failed";
}
