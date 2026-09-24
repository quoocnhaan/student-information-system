import { describe, expect, it } from "vitest";
import { isTerminal, jobStepLabel, jobTone } from "./jobPresentation";
import type { JobStatus } from "../api/contracts";

const job: JobStatus = {
  id: "job:job_abc",
  type: "ocr",
  document_id: "document:doc_abc",
  status: "running",
  step: "ocr",
  progress: 50,
  processed_pages: 1,
  sequence: 2,
  attempts: 1,
  max_attempts: 3,
};

describe("job presentation", () => {
  it("uses a stable label and active tone for OCR", () => {
    expect(jobStepLabel(job.step)).toBe("Reading PDF pages");
    expect(jobTone(job)).toBe("active");
    expect(isTerminal(job)).toBe(false);
  });

  it("recognizes terminal completed work", () => {
    const completed = { ...job, status: "completed", step: "completed" };
    expect(jobTone(completed)).toBe("success");
    expect(isTerminal(completed)).toBe(true);
  });
});
