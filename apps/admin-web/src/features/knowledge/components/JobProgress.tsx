import type { JobStatus } from "../api/contracts";
import { jobStepLabel, jobTone } from "../model/jobPresentation";
import type { ConnectionState } from "../hooks/useIngestionJob";

export function JobProgress({ job, connection }: { job: JobStatus; connection: ConnectionState }) {
  const tone = jobTone(job);
  const pageProgress = job.total_pages ? `${job.processed_pages} / ${job.total_pages} pages` : "Page count pending";
  return (
    <section className="card stack" aria-labelledby="job-progress-title">
      <div className="split-row">
        <div>
          <p className="eyebrow">Current job</p>
          <h1 id="job-progress-title">{jobStepLabel(job.step)}</h1>
        </div>
        <span className={`status-pill ${tone}`}>{job.status}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="OCR progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}>
        <span className={`progress-fill ${tone}`} style={{ width: `${job.progress}%` }} />
      </div>
      <div className="split-row muted"><span>{job.progress}% complete · {pageProgress}</span><span className={`connection ${connection}`}>{connection === "live" ? "Live updates" : connection === "polling" ? "Checking for updates" : connection === "connecting" ? "Connecting" : "Offline"}</span></div>
      <div className="job-details"><span>Attempt {job.attempts} of {job.max_attempts}</span><span>Job ID: <code>{job.id}</code></span></div>
      {job.next_attempt_at && <p className="notice warning">Retry scheduled for {new Date(job.next_attempt_at).toLocaleString()}.</p>}
    </section>
  );
}
