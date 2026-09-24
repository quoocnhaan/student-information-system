import { useCallback, useEffect, useRef, useState } from "react";
import { KnowledgeError, statusMessageSchema, type DocumentResult, type JobStatus } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";
import { isTerminal } from "../model/jobPresentation";

export type ConnectionState = "connecting" | "live" | "polling" | "offline";

export type IngestionViewState = {
  job: JobStatus | null;
  result: DocumentResult | null;
  connection: ConnectionState;
  loading: boolean;
  error: Error | null;
};

function websocketUrl(jobId: string): string {
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}/v1/ws/jobs/${encodeURIComponent(jobId)}`;
}

export function useIngestionJob(jobId: string | undefined): IngestionViewState {
  const [state, setState] = useState<IngestionViewState>({
    job: null,
    result: null,
    connection: "connecting",
    loading: true,
    error: null,
  });
  const jobRef = useRef<JobStatus | null>(null);

  const acceptJob = useCallback((next: JobStatus) => {
    if (jobRef.current !== null && next.sequence <= jobRef.current.sequence) return;
    const type = next.type ?? jobRef.current?.type;
    const resolved = type === undefined ? next : { ...next, type };
    jobRef.current = resolved;
    setState((current) => ({ ...current, job: resolved, loading: false, error: null }));
  }, []);

  useEffect(() => {
    if (!jobId) {
      setState((current) => ({ ...current, loading: false, connection: "offline", error: new Error("A job ID is required.") }));
      return;
    }

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;
    let reconnectAttempts = 0;
    const controller = new AbortController();

    const loadSnapshot = async () => {
      try {
        const snapshot = await knowledgeClient.getJob(jobId, controller.signal);
        if (!cancelled) acceptJob(snapshot);
        return snapshot;
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error : new Error("Unable to load the job.") }));
        }
        return null;
      }
    };

    const schedulePoll = () => {
      if (cancelled || isTerminal(jobRef.current)) return;
      setState((current) => ({ ...current, connection: "polling" }));
      pollTimer = window.setTimeout(async () => {
        await loadSnapshot();
        schedulePoll();
      }, 3000);
    };

    const connect = () => {
      if (cancelled || isTerminal(jobRef.current)) return;
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      setState((current) => ({ ...current, connection: "connecting" }));
      socket = new WebSocket(websocketUrl(jobId));
      socket.onopen = () => {
        reconnectAttempts = 0;
        if (!cancelled) setState((current) => ({ ...current, connection: "live" }));
      };
      socket.onmessage = (message) => {
        if (message.data === "ping") {
          socket?.send("pong");
          return;
        }
        try {
          const event = statusMessageSchema.parse(JSON.parse(String(message.data)));
          acceptJob(event);
          if (isTerminal(event)) socket?.close();
        } catch {
          // Ignore a malformed transient event; the next REST snapshot remains authoritative.
        }
      };
      socket.onclose = async () => {
        if (cancelled || isTerminal(jobRef.current)) return;
        schedulePoll();
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 15_000);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(async () => {
          await loadSnapshot();
          connect();
        }, delay);
      };
      socket.onerror = () => socket?.close();
    };

    void loadSnapshot().then((snapshot) => {
      if (snapshot !== null && !isTerminal(snapshot)) connect();
    });

    return () => {
      cancelled = true;
      controller.abort();
      socket?.close();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
  }, [acceptJob, jobId]);

  useEffect(() => {
    if (!state.job || state.job.status !== "completed" || state.result !== null) return;
    const controller = new AbortController();
    void knowledgeClient.getDocumentResult(state.job.document_id, controller.signal)
      .then((result) => setState((current) => ({ ...current, result })))
      .catch((error: unknown) => {
        const message = error instanceof KnowledgeError && error.status === 409
          ? "OCR output is still being finalized."
          : "Unable to load the OCR result.";
        setState((current) => ({ ...current, error: new Error(message) }));
      });
    return () => controller.abort();
  }, [state.job, state.result]);

  return state;
}
